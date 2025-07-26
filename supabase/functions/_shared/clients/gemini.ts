/**
 * 🔍 GEMINI EMBEDDING CLIENT - MODELO OFICIAL CORRIGIDO
 * Centralized client for generating embeddings using Google's Gemini API.
 * Model: gemini-embedding-001
 * Secret: Gemini_Embedding
 */
export class GeminiEmbeddingClient {
  private apiKey: string;
  private baseUrl = "https://generativelanguage.googleapis.com/v1beta";

  constructor() {
    this.apiKey = Deno.env.get("Gemini_Embedding");
    if (!this.apiKey) {
      throw new Error("Environment variable 'Gemini_Embedding' is required.");
    }
  }

  /**
   * Generates embeddings for a given text.
   * @param text The text to embed.
   * @param taskType The task type for the embedding, as per Gemini API docs.
   * @returns A promise that resolves to an array of numbers representing the embedding.
   */
  async embed(text: string, taskType: string = "RETRIEVAL_QUERY"): Promise<number[]> {
    const validTaskTypes = [
      "RETRIEVAL_QUERY", "RETRIEVAL_DOCUMENT", "SEMANTIC_SIMILARITY",
      "CLASSIFICATION", "CLUSTERING", "CODE_RETRIEVAL_QUERY",
      "QUESTION_ANSWERING", "FACT_VERIFICATION"
    ];

    if (!validTaskTypes.includes(taskType)) {
      console.warn(`[GeminiClient] Invalid taskType: ${taskType}. Defaulting to RETRIEVAL_QUERY.`);
      taskType = "RETRIEVAL_QUERY";
    }

    try {
      const response = await fetch(`${this.baseUrl}/models/gemini-embedding-001:embedContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text }] },
          taskType,
          outputDimensionality: 768
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini Embedding API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.embedding.values;
    } catch (error) {
      console.error(`[GeminiClient] Failed to generate embedding:`, error);
      throw error;
    }
  }
}

// Export a singleton instance for easy use across functions
export const gemini = new GeminiEmbeddingClient();
