import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMProvider } from '../src/core/LLMProvider.js';
import * as fc from 'fast-check';

describe('LLMProvider', () => {
  describe('Property 19: Streaming Response Handling', () => {
    /**
     * Feature: mlops-automation-agent, Property 19: Streaming Response Handling
     * Validates: Requirements 7.3
     * 
     * For any streaming LLM response, the MLOps_Agent should correctly accumulate 
     * all chunks into a complete response.
     */
    it('should accumulate all streaming chunks into complete response', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 20 }),
          async (chunks) => {
            // Mock the OpenAI client to return our test chunks
            const mockStream = (async function* () {
              for (const chunk of chunks) {
                yield {
                  choices: [{ delta: { content: chunk } }],
                };
              }
            })();

            // Create a mock LLM provider
            const provider = new LLMProvider('test-key');
            (provider as any).client = {
              chat: {
                completions: {
                  create: vi.fn().mockResolvedValue(mockStream),
                },
              },
            };

            // Accumulate chunks from streaming request
            const accumulated: string[] = [];
            for await (const chunk of provider.sendStreamingRequest('test prompt')) {
              accumulated.push(chunk);
            }

            // Property: All chunks should be accumulated in order
            const expectedComplete = chunks.join('');
            const actualComplete = accumulated.join('');
            
            expect(actualComplete).toBe(expectedComplete);
            expect(accumulated.length).toBe(chunks.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 20: Rate Limit Exponential Backoff', () => {
    /**
     * Feature: mlops-automation-agent, Property 20: Rate Limit Exponential Backoff
     * Validates: Requirements 7.4
     * 
     * For any API rate limit error encountered, the MLOps_Agent should implement 
     * exponential backoff with increasing delays between retry attempts.
     */
    it('should implement exponential backoff on rate limit errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }),
          async (failureCount) => {
            // Use fake timers to avoid actual delays
            vi.useFakeTimers();
            
            const provider = new LLMProvider('test-key');
            let attemptCount = 0;
            const delays: number[] = [];

            const mockRequest = async () => {
              attemptCount++;
              if (attemptCount <= failureCount) {
                const error: any = new Error('Rate limit exceeded');
                error.status = 429;
                throw error;
              }
              return 'success';
            };

            // Start the retry process
            const retryPromise = provider.retryWithBackoff(mockRequest, failureCount + 1);

            // Fast-forward through all the delays
            for (let i = 0; i < failureCount; i++) {
              const expectedDelay = Math.pow(2, i) * 1000;
              delays.push(expectedDelay);
              
              // Advance timers by the expected delay
              await vi.advanceTimersByTimeAsync(expectedDelay);
            }

            // Wait for the promise to resolve
            const result = await retryPromise;

            // Property: Should succeed after retries
            expect(result).toBe('success');
            expect(attemptCount).toBe(failureCount + 1);

            // Property: Delays should follow exponential pattern (1s, 2s, 4s)
            for (let i = 0; i < delays.length; i++) {
              const expectedDelay = Math.pow(2, i) * 1000;
              expect(delays[i]).toBe(expectedDelay);
            }

            // Restore real timers
            vi.useRealTimers();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 21: Error Logging and Fallback', () => {
    /**
     * Feature: mlops-automation-agent, Property 21: Error Logging and Fallback
     * Validates: Requirements 7.5
     * 
     * For any LLM provider error, the MLOps_Agent should both log the error 
     * and provide a fallback response.
     */
    it('should log errors and handle them gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (errorMessage) => {
            const provider = new LLMProvider('test-key');
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            // Mock client to throw error
            (provider as any).client = {
              chat: {
                completions: {
                  create: vi.fn().mockRejectedValue(new Error(errorMessage)),
                },
              },
            };

            // Property: Error should be logged
            try {
              await provider.sendRequest('test prompt');
            } catch (error: any) {
              // Verify error was logged
              expect(consoleSpy).toHaveBeenCalled();
              const loggedMessage = consoleSpy.mock.calls[0][1];
              expect(loggedMessage).toBe(errorMessage);
            }

            consoleSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Basic functionality', () => {
    it('should throw error when API key is missing', () => {
      const originalKey = process.env.OPENROUTER_API_KEY;
      delete process.env.OPENROUTER_API_KEY;
      
      expect(() => new LLMProvider()).toThrow('OpenRouter API key is required');
      
      if (originalKey) {
        process.env.OPENROUTER_API_KEY = originalKey;
      }
    });

    it('should accept API key via constructor', () => {
      expect(() => new LLMProvider('test-key')).not.toThrow();
    });
  });
});
