import { FastifyInstance } from 'fastify';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
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

// Simple in-memory conversation storage (replace with proper storage in production)
const conversations = new Map<string, Array<HumanMessage | AIMessage>>();

export default async function (fastify: FastifyInstance) {
  // Initialize OpenAI
  const model = new ChatOpenAI({
    modelName: 'gpt-3.5-turbo',
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  // Create the React agent (no tools for now, just basic chat)
  const agent = createReactAgent({
    llm: model,
    tools: [], // We'll add car-specific tools later
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

      // Get existing conversation or create new one
      const existingMessages = conversations.get(id) || [];

      // Add user message
      const userMessage = new HumanMessage(message);
      const currentMessages = [...existingMessages, userMessage];

      // Run the React agent
      const result = await agent.invoke({
        messages: currentMessages,
      });

      // Store the updated conversation
      conversations.set(id, result.messages);

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
    const { id } = request.params;
    const messages = conversations.get(id) || [];
    
    return reply.send({
      conversationId: id,
      messages: messages.map(msg => ({
        type: msg instanceof HumanMessage ? 'user' : 'ai',
        content: msg.content,
      })),
    });
  });
}
