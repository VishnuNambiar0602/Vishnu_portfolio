import OpenAI from 'openai';

export interface LLMOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface RateLimitError extends Error {
  statusCode: number;
  retryAfter?: number;
}

export class LLMProvider {
  private client: OpenAI;
  private defaultModel = 'mistralai/devstral-2512:free';

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENROUTER_API_KEY;
    
    if (!key) {
      throw new Error('OpenRouter API key is required. Set OPENROUTER_API_KEY environment variable.');
    }

    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: key,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/mlops-automation-agent',
        'X-Title': 'MLOps Automation Agent',
      },
    });
  }

  /**
   * Send a request to the LLM and get a response
   */
  async sendRequest(prompt: string, options?: Partial<LLMOptions>): Promise<string> {
    const model = options?.model || this.defaultModel;
    const temperature = options?.temperature ?? 0.7;
    const maxTokens = options?.maxTokens ?? 4096;

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: maxTokens,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error('LLM request failed:', error.message);
      throw error;
    }
  }

  /**
   * Send a streaming request to the LLM
   */
  async *sendStreamingRequest(
    prompt: string,
    options?: Partial<LLMOptions>
  ): AsyncIterator<string> {
    const model = options?.model || this.defaultModel;
    const temperature = options?.temperature ?? 0.7;
    const maxTokens = options?.maxTokens ?? 4096;

    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error: any) {
      console.error('LLM streaming request failed:', error.message);
      throw error;
    }
  }

  /**
   * Handle rate limit errors with exponential backoff
   */
  async handleRateLimit(error: RateLimitError): Promise<void> {
    const retryAfter = error.retryAfter || 1;
    const delay = retryAfter * 1000;
    
    console.log(`Rate limit hit. Waiting ${retryAfter}s before retry...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Retry a request with exponential backoff
   */
  async retryWithBackoff<T>(
    request: () => Promise<T>,
    maxRetries: number = 5
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await request();
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a rate limit error
        if (error.statusCode === 429 || error.status === 429) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s, 8s, 16s
          console.log(`Rate limit error. Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // For other errors, throw immediately
        throw error;
      }
    }
    
    // If we exhausted all retries, throw the last error
    console.error(`Failed after ${maxRetries} retries`);
    throw lastError || new Error('Request failed after maximum retries');
  }
}
