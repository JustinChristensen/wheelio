import React, { useState, useRef, useEffect } from 'react';
import { CarFilters, Car } from 'car-data';
import { ApiService } from '../../services/api';
import { calculateCarRanks, sortCarsByRank } from '../../utils/carRanking';
import { useCallQueue } from '../../hooks/useCallQueue';
import CallStatus from '../CallStatus/CallStatus';

interface Message {
  id: string;
  type: 'ai' | 'user';
  content: string;
  timestamp: Date;
}

interface AISalesAgentProps {
  isOpen: boolean;
  onToggle: () => void;
  onFiltersUpdate: (filters: CarFilters) => void;
  currentFilters: CarFilters;
  cars: Car[];
}

const AISalesAgent: React.FC<AISalesAgentProps> = ({ isOpen, onToggle, onFiltersUpdate, currentFilters, cars }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hi there! I'm your AI sales assistant, and I'm here to help you find the perfect car. Feel free to tell me a bit about what you're looking for, or if you'd prefer, just say \"Guide me\" and I'll help you narrow it down step by step!",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [isGuidedMode, setIsGuidedMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Call queue functionality
  const { callState, connect: connectToQueue, disconnect: disconnectFromQueue, isConnected: isCallConnected } = useCallQueue();

  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await ApiService.sendChatMessage({
        message: currentInput,
        conversationId,
        currentFilters,
        guidedMode: isGuidedMode,
      });

      let aiResponseContent = response.response;

      // Update guided mode if the AI changed it
      if (response.guidedMode !== undefined) {
        setIsGuidedMode(response.guidedMode);
      }

      // If the AI returned updated filters, check for perfect match scenarios
      if (response.updatedFilters) {
        // Check if there are actually any active filters
        const hasActiveFilters = Object.keys(response.updatedFilters).length > 0;

        // Override AI response if there are active filters
        if (hasActiveFilters) {
          // Calculate what the filtered results would be
          const rankedCars = calculateCarRanks(cars, response.updatedFilters);
          const sortedCars = sortCarsByRank(rankedCars);
          const perfectMatches = sortedCars.filter(car => car.matchType === 'perfect');

          // Override AI response based on perfect match count
          if (perfectMatches.length === 0) {
            aiResponseContent = "Unfortunately there are no cars that perfectly match all your criteria right now. Would you like me to adjust some of your requirements or reset the filters to see more options? I can help you find cars that come close to what you're looking for.";
            // Exit guided mode when we hit this scenario
            setIsGuidedMode(false);
          } else if (perfectMatches.length === 1) {
            const perfectCar = perfectMatches[0];
            // Filter out price-related reasons since we're already showing the price
            const nonPriceReasons = perfectCar.matchedReasons.filter(reason => 
              !reason.toLowerCase().includes('price')
            );
            const matchReasons = nonPriceReasons.join(', ').toLowerCase();
            aiResponseContent = `Perfect! I found exactly one car that matches all your criteria: the ${perfectCar.year} ${perfectCar.make} ${perfectCar.model} for ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(perfectCar.price)}. This car is ideal because ${matchReasons}. This looks like an excellent choice for you - would you like to move forward with this vehicle or would you like me to help you contact a sales representative?`;
            // Exit guided mode when we hit this scenario
            setIsGuidedMode(false);
          }
        }

        // Apply the filters from AI
        onFiltersUpdate(response.updatedFilters);
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponseContent,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setConversationId(response.conversationId);

    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* Floating Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -left-12 top-4 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:shadow-lg transition-all duration-200"
        title={isOpen ? "Collapse chat" : "Expand chat"}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          )}
        </svg>
      </button>

      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white flex items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              AI Sales Assistant
              {isGuidedMode && (
                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                  Guided Mode
                </span>
              )}
            </h3>
            <p className="text-xs text-green-600 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
              Online
            </p>
          </div>
        </div>
      </div>

      {isOpen && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-auto p-4 space-y-4 min-h-0">
            {/* Call Status */}
            {isCallConnected && (
              <CallStatus 
                callState={callState} 
                onDisconnect={disconnectFromQueue}
              />
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs text-gray-500">AI is typing...</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="p-4 border-t border-gray-100">
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-700 mb-2">
                {isGuidedMode ? 'Guided Mode Options:' : 'Quick Questions:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {!isGuidedMode ? (
                  <>
                    <button
                      onClick={() => setInputMessage("Guide me")}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors font-medium"
                    >
                      <span role="img" aria-label="guide">📋</span> Guide me
                    </button>
                    <button
                      onClick={() => setInputMessage("I need a family SUV under $40,000")}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      Family SUV
                    </button>
                    <button
                      onClick={() => setInputMessage("Show me electric vehicles")}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      Electric Cars
                    </button>
                    <button
                      onClick={() => setInputMessage("I want a luxury sedan")}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      Luxury Sedan
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setInputMessage("I'm not sure")}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      I'm not sure
                    </button>
                    <button
                      onClick={() => setInputMessage("Skip this question")}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      Skip this
                    </button>
                    <button
                      onClick={() => setInputMessage("I want to browse freely")}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
                    >
                      Exit guided mode
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex space-x-2">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about cars you're interested in..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
            
            <div className="mt-3 flex items-center justify-between">
              <button className="flex items-center space-x-2 px-3 py-1 text-xs text-gray-600 hover:text-gray-800 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span>Voice Chat</span>
              </button>
              
              <button 
                onClick={isCallConnected ? disconnectFromQueue : connectToQueue}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  isCallConnected 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isCallConnected ? 'End Call' : 'Talk to Human Agent'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Collapsed State */}
      {!isOpen && (
        <div className="p-4 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-xs text-gray-600">Click to chat</p>
        </div>
      )}
    </div>
  );
};

export default AISalesAgent;
