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
  guidedMode?: boolean;
}

interface ChatResponse {
  response: string;
  conversationId: string;
  updatedFilters?: CarFilters;
  guidedMode?: boolean;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

export default async function (fastify: FastifyInstance) {
  // System prompt that handles both modes and mode switching
  const SYSTEM_PROMPT = `You are an AI car sales assistant helping customers find their perfect vehicle. You can operate in two modes:

**NORMAL MODE** (default): Free-form conversation where you:
1. Understand the customer's car needs through natural conversation
2. Use the update_car_filters tool to translate their requirements into specific filter criteria
3. Always merge new filter preferences with existing ones rather than replacing them entirely
4. Provide helpful guidance on car features, makes, models, and options
5. Ask clarifying questions to better understand their needs

**GUIDED MODE**: Systematic question-by-question guidance where you:
1. Look at the current filters to see what has already been determined
2. ALWAYS use the update_car_filters tool first to apply any car preferences mentioned in the user's message
3. Ask ONE focused question about the most important missing criteria using SPECIFIC terminology
4. Use the update_car_filters tool to apply their answer to the search
5. Move to the next most relevant question based on their response
6. Keep questions simple and focused on one aspect at a time

**GUIDED MODE QUESTION EXAMPLES** (use these specific terms):
- Body Type: "What body type are you looking for? (sedan, SUV, truck, hatchback, coupe, convertible, etc.)"
- Budget: "What's your maximum budget or price range?"
- Make/Brand: "Do you have a preferred car brand or manufacturer?"
- Fuel Type: "What fuel type do you prefer? (gasoline, electric, hybrid, diesel)"
- Year Range: "What year range are you considering?"
- Mileage: "What's your maximum acceptable mileage?"
- Features: "Are there any specific features you need?"

**MODE SWITCHING**:
- Use the set_guided_mode tool when customers say things like "guide me", "help me step by step", "I don't know what I want", etc.
- When entering guided mode, IMMEDIATELY ask the first specific question from the priority list (body type first if not already set)
- Exit guided mode when they say "stop guiding", "I want to browse freely", "exit guide mode", etc.
- In guided mode, question priority: body type → budget → make → fuel type → year → mileage → features

**CRITICAL FILTER HANDLING RULES**:
- When using update_car_filters, you MUST include ALL existing filters plus any new filters from the user's message
- NEVER remove or ignore existing filters unless the user explicitly asks to remove them
- You MUST use the update_car_filters tool whenever the user mentions ANY car preferences (make, model, type, price, etc.)
- When entering guided mode, IMMEDIATELY ask the first specific question from the priority list (body type first if not already set)
- If currently in guided mode, ALWAYS use update_car_filters FIRST if the message contains car preferences, then ask ONE focused question using the EXACT terminology from the guided mode examples above
- NEVER ask vague questions like "What kind of vehicle?" or "What would you like to focus on?" - always be specific: "What body type?" or "What fuel type?" etc.

When updating filters, ALWAYS include both the existing filters and any new preferences. Only remove existing filters if explicitly requested.

Be friendly, knowledgeable, and focused on helping them find the perfect car.`;

  // Create a tool for updating car filters using the schema from car-data
  const updateFilters = tool(
    async ({ filters, reasoning }) => {
      // Store the filters in the conversation context
      return `Updated car search filters: ${reasoning}. Filters applied: ${JSON.stringify(filters, null, 2)}`;
    },
    {
      name: "update_car_filters",
      description: "Update the car search filters based on customer preferences. ALWAYS include both existing filters and new preferences unless the customer explicitly wants to remove something.",
      schema: z.object({
        filters: CarFiltersSchema.describe("Complete set of car search filters including both existing filters and any new customer preferences. Do not replace existing filters unless explicitly requested by the customer."),
        reasoning: z.string().describe("Explanation of why these filters were applied based on the customer's request")
      }),
    }
  );

  // Create a tool for controlling guided mode state
  const setGuidedMode = tool(
    async ({ enabled, reasoning }) => {
      return `${enabled ? 'Entered' : 'Exited'} guided mode: ${reasoning}`;
    },
    {
      name: "set_guided_mode",
      description: "Control whether the conversation is in guided mode. Use this when the customer explicitly asks to be guided through the car selection process or wants to exit guided mode.",
      schema: z.object({
        enabled: z.boolean().describe("Whether guided mode should be enabled (true) or disabled (false)"),
        reasoning: z.string().describe("Explanation of why guided mode is being enabled or disabled")
      }),
    }
  );

  // Initialize OpenAI
  const model = new ChatOpenAI({
    modelName: 'gpt-3.5-turbo',
    temperature: 0.1,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  // Create memory checkpointer for conversation persistence
  const memory = new MemorySaver();

  // Create the React agent with tools and memory
  const agent = createReactAgent({
    llm: model,
    tools: [updateFilters, setGuidedMode],
    checkpointSaver: memory,
  });

  fastify.post<{ 
    Body: ChatRequest; 
    Reply: ChatResponse | ErrorResponse 
  }>('/chat', async (request, reply) => {
    try {
      const { message, conversationId, currentFilters = {}, guidedMode = false } = request.body;

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

      // Prepare messages with system prompt and context about current mode and filters
      const messages = [
        new SystemMessage(SYSTEM_PROMPT),
        new HumanMessage(`Current State:
- Guided Mode: ${guidedMode ? 'ENABLED' : 'DISABLED'}
- Current Filters: ${JSON.stringify(currentFilters, null, 2)}

User Message: ${message}`)
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

      // Look for filter updates and guided mode changes in the conversation result
      let updatedFilters: CarFilters | undefined;
      let newGuidedMode: boolean | undefined;
      
      // Check if any tool calls were made that updated filters or guided mode
      for (const msg of result.messages) {
        if (msg.additional_kwargs?.tool_calls) {
          for (const toolCall of msg.additional_kwargs.tool_calls) {
            if (toolCall.function?.name === 'update_car_filters') {
              try {
                const args = JSON.parse(toolCall.function.arguments);
                // Merge the new filters with existing filters instead of replacing
                updatedFilters = {
                  ...currentFilters,
                  ...args.filters
                };
              } catch (e) {
                fastify.log.warn('Failed to parse update_car_filters arguments:', e);
              }
            } else if (toolCall.function?.name === 'set_guided_mode') {
              try {
                const args = JSON.parse(toolCall.function.arguments);
                newGuidedMode = args.enabled;
              } catch (e) {
                fastify.log.warn('Failed to parse set_guided_mode arguments:', e);
              }
            }
          }
        }
      }

      const response: ChatResponse = {
        response: responseContent,
        conversationId: id,
      };

      // Include updated filters if they were changed
      if (updatedFilters) {
        response.updatedFilters = updatedFilters;
      }

      // Include guided mode state - use the new state if changed, otherwise preserve current state
      if (newGuidedMode !== undefined) {
        response.guidedMode = newGuidedMode;
      } else {
        response.guidedMode = guidedMode;
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
