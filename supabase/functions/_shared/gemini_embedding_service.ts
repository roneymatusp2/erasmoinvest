/**
 * @deprecated This file is deprecated. Please use the client from './clients/gemini.ts' directly.
 * This service now acts as a proxy to the new centralized GeminiEmbeddingClient.
 */
import { gemini } from './clients/gemini.ts';

// Re-export the singleton instance for backward compatibility
export const geminiClient = gemini;

// Re-export the main embedding function for backward compatibility
export const generateSpecializedEmbedding = gemini.embed.bind(gemini);