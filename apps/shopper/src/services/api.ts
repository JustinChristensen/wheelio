import { Car, CarFilters } from 'car-data';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  error?: string;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  currentFilters?: CarFilters;
  guidedMode?: boolean;
}

export interface ChatResponse {
  response: string;
  conversationId: string;
  updatedFilters?: CarFilters;
  guidedMode?: boolean;
  callAction?: 'start' | 'end';
}

export class ApiService {
  private static async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        data: null as T,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async getCars(): Promise<ApiResponse<Car[]>> {
    return this.request<Car[]>('/cars');
  }

  static async sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Chat API request failed:', error);
      throw error;
    }
  }
}
