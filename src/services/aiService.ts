import axios from 'axios';
import { ChatRequest, ChatResponse, AIService } from '../types/index.js';

export class AIServiceManager {
  private getApiKeys(): Record<AIService, string | undefined> {
    return {
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
      google: process.env.GOOGLE_API_KEY,
      perplexity: process.env.PERPLEXITY_API_KEY,
      groq: process.env.GROQ_API_KEY,
      mistral: process.env.MISTRAL_API_KEY,
    };
  }

  private endpoints: Record<AIService, string> = {
    openai: 'https://api.openai.com/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages',
    google: 'https://generativelanguage.googleapis.com/v1beta/models',
    perplexity: 'https://api.perplexity.ai/chat/completions',
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    mistral: 'https://api.mistral.ai/v1/chat/completions',
  };

  async sendChatRequest(service: AIService, request: ChatRequest): Promise<ChatResponse> {
    const apiKeys = this.getApiKeys();
    const apiKey = apiKeys[service];
    
    if (!apiKey) {
      throw new Error(`API key for ${service} is not configured`);
    }

    try {
      let response;
      
      switch (service) {
        case 'openai':
        case 'perplexity':
        case 'groq':
        case 'mistral':
          response = await this.sendOpenAICompatibleRequest(service, request, apiKey);
          break;
        case 'anthropic':
          response = await this.sendAnthropicRequest(request, apiKey);
          break;
        case 'google':
          response = await this.sendGoogleRequest(request, apiKey);
          break;
        default:
          throw new Error(`Unsupported AI service: ${service}`);
      }
      
      return response;
    } catch (error: any) {
      console.error(`Error calling ${service}:`, error.response?.data || error.message);
      if (error.response?.data) {
        console.error(`Full error response for ${service}:`, JSON.stringify(error.response.data, null, 2));
      }
      throw new Error(`Failed to call ${service}: ${error.message}`);
    }
  }

  private async sendOpenAICompatibleRequest(
    service: AIService,
    request: ChatRequest,
    apiKey: string
  ): Promise<ChatResponse> {
    const endpoint = this.endpoints[service];
    
    const response = await axios.post(
      endpoint,
      {
        messages: request.messages,
        model: request.model || this.getDefaultModel(service),
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        stream: false,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return response.data;
  }

  private async sendAnthropicRequest(
    request: ChatRequest,
    apiKey: string
  ): Promise<ChatResponse> {
    const endpoint = this.endpoints.anthropic;
    
    const anthropicMessages = request.messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      }));
    
    const systemMessage = request.messages.find(msg => msg.role === 'system');
    
    const response = await axios.post(
      endpoint,
      {
        messages: anthropicMessages,
        model: request.model || this.getDefaultModel('anthropic'),
        max_tokens: request.max_tokens || 1024,
        temperature: request.temperature,
        system: systemMessage?.content,
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      }
    );
    
    return {
      id: response.data.id,
      object: 'chat.completion',
      created: Date.now() / 1000,
      model: response.data.model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: response.data.content[0].text,
        },
        finish_reason: response.data.stop_reason || 'stop',
      }],
      usage: response.data.usage,
    };
  }

  private async sendGoogleRequest(
    request: ChatRequest,
    apiKey: string
  ): Promise<ChatResponse> {
    const model = request.model || this.getDefaultModel('google');
    const endpoint = `${this.endpoints.google}/${model}:generateContent?key=${apiKey}`;
    
    const googleMessages = request.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
    
    const response = await axios.post(
      endpoint,
      {
        contents: googleMessages,
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.max_tokens,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    const candidate = response.data.candidates[0];
    
    return {
      id: `google-${Date.now()}`,
      object: 'chat.completion',
      created: Date.now() / 1000,
      model: model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: candidate.content.parts[0].text,
        },
        finish_reason: candidate.finishReason || 'stop',
      }],
      usage: response.data.usageMetadata,
    };
  }

  private getDefaultModel(service: AIService): string {
    const defaultModels: Record<AIService, string> = {
      openai: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      anthropic: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      google: process.env.GOOGLE_MODEL || 'gemini-2.5-flash-lite',
      perplexity: process.env.PERPLEXITY_MODEL || 'sonar',
      groq: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      mistral: process.env.MISTRAL_MODEL || 'mistral-small-latest',
    };

    return defaultModels[service];
  }

  getAvailableServices(): AIService[] {
    const apiKeys = this.getApiKeys();
    return Object.keys(apiKeys)
      .filter(service => apiKeys[service as AIService])
      .map(service => service as AIService);
  }
}