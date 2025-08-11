import { FastifyInstance } from 'fastify';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

interface ChatRequest {
  message: string;
  conversationId?: string;
}

interface ChatResponse {
  response: string;
  conversationId: string;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

export default async function (fastify: FastifyInstance) {
  // Initialize OpenAI
  const model = new ChatOpenAI({
    modelName: 'gpt-3.5-turbo',
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  // Create memory checkpointer for conversation persistence
  const memory = new MemorySaver();

  // Create the React agent with memory
  const agent = createReactAgent({
    llm: model,
    tools: [], // We'll add car-specific tools later
    checkpointSaver: memory,
  });

  fastify.post<{ 
    Body: ChatRequest; 
    Reply: ChatResponse | ErrorResponse 
  }>('/chat', async (request, reply) => {
    try {
      const { message, conversationId } = request.body;

      if (!message) {
        return reply.code(400).send({ error: 'Message is required' });
      }

      // Generate conversation ID if not provided
      const id = conversationId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create thread configuration for this conversation
      const config = {
        configurable: {
          thread_id: id,
        },
      };

      // Run the React agent with the user message
      const result = await agent.invoke(
        {
          messages: [new HumanMessage(message)],
        },
        config
      );

      // Get the AI response (last message should be from the AI)
      const aiResponse = result.messages[result.messages.length - 1];
      const responseContent = typeof aiResponse.content === 'string' 
        ? aiResponse.content 
        : JSON.stringify(aiResponse.content);

      return reply.send({
        response: responseContent,
        conversationId: id,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get conversation history
  fastify.get<{ Params: { id: string } }>('/chat/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      // Get the conversation state from memory
      const config = {
        configurable: {
          thread_id: id,
        },
      };

      const state = await agent.getState(config);
      const messages = state.values.messages || [];
      
      return reply.send({
        conversationId: id,
        messages: messages.map((msg: HumanMessage | AIMessage) => ({
          type: msg instanceof HumanMessage ? 'user' : 'ai',
          content: msg.content,
        })),
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Failed to retrieve conversation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
