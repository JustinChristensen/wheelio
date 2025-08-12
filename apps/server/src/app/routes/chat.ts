import { FastifyInstance } from 'fastify';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { CarFilters, CarFiltersSchema } from 'car-data';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

interface ChatRequest {
  message: string;
  conversationId?: string;
  currentFilters?: CarFilters;
}

interface ChatResponse {
  response: string;
  conversationId: string;
  updatedFilters?: CarFilters;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

export default async function (fastify: FastifyInstance) {
  // System prompt to keep the agent focused on car shopping
  const SYSTEM_PROMPT = `You are an AI car sales assistant helping customers find their perfect vehicle. Your role is to:

1. Understand the customer's car needs through natural conversation
2. Translate their requirements into specific filter criteria
3. Update the car search filters based on their preferences
4. Provide helpful guidance on car features, makes, models, and options
5. Keep the conversation focused on finding the right car for their needs

When a customer mentions preferences like:
- Budget ranges → Update priceMin/priceMax filters
- Car types (sedan, SUV, etc.) → Update bodyType filter
- Fuel preferences → Update fuelType filter
- Safety requirements → Update safetyRating filter
- Brand preferences → Update make filter
- Seating needs → Update seats filter
- Year preferences → Update yearMin/yearMax filters

Always explain why you're adjusting the filters and ask clarifying questions to better understand their needs. Be friendly, knowledgeable, and focused on helping them find the perfect car.`;

  // Create a tool for updating car filters using the schema from car-data
  const updateFilters = tool(
    async ({ filters, reasoning }) => {
      // Store the filters in the conversation context
      return `Updated car search filters: ${reasoning}. Filters applied: ${JSON.stringify(filters, null, 2)}`;
    },
    {
      name: "update_car_filters",
      description: "Update the car search filters based on customer preferences",
      schema: z.object({
        filters: CarFiltersSchema,
        reasoning: z.string().describe("Explanation of why these filters were applied based on the customer's request")
      }),
    }
  );

  // Initialize OpenAI
  const model = new ChatOpenAI({
    modelName: 'gpt-3.5-turbo',
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  // Create memory checkpointer for conversation persistence
  const memory = new MemorySaver();

  // Create the React agent with tools and memory
  const agent = createReactAgent({
    llm: model,
    tools: [updateFilters],
    checkpointSaver: memory,
  });

  fastify.post<{ 
    Body: ChatRequest; 
    Reply: ChatResponse | ErrorResponse 
  }>('/chat', async (request, reply) => {
    try {
      const { message, conversationId, currentFilters = {} } = request.body;

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

      // Prepare messages with system prompt and current filter context
      const messages = [
        new SystemMessage(SYSTEM_PROMPT),
        new HumanMessage(`Current car search filters: ${JSON.stringify(currentFilters, null, 2)}\n\nUser message: ${message}`)
      ];

      // Run the React agent with the user message and current filter context
      const result = await agent.invoke(
        { messages },
        config
      );

      // Extract the AI response and any filter updates from tool calls
      const aiResponse = result.messages[result.messages.length - 1];
      const responseContent = typeof aiResponse.content === 'string' 
        ? aiResponse.content 
        : JSON.stringify(aiResponse.content);

      // Look for filter updates in the conversation result
      let updatedFilters: CarFilters | undefined;
      
      // Check if any tool calls were made that updated filters
      for (const msg of result.messages) {
        if (msg.additional_kwargs?.tool_calls) {
          for (const toolCall of msg.additional_kwargs.tool_calls) {
            if (toolCall.function?.name === 'update_car_filters') {
              try {
                const args = JSON.parse(toolCall.function.arguments);
                updatedFilters = args.filters;
              } catch (e) {
                fastify.log.warn('Failed to parse tool call arguments:', e);
              }
            }
          }
        }
      }

      const response: ChatResponse = {
        response: responseContent,
        conversationId: id,
      };

      // Only include updatedFilters if they were actually changed
      if (updatedFilters) {
        response.updatedFilters = updatedFilters;
      }

      return reply.send(response);
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
