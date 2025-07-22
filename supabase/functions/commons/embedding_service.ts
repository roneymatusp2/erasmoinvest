// /supabase/functions/commons/embedding_service.ts
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Usar OpenRouter para gerar embeddings com um modelo compatível
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('QWEN_OPENROUTER_API')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/text-embedding-3-small',
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Erro ao gerar embedding:', error);
    // Retornar um vetor vazio em caso de erro para não quebrar o fluxo
    return new Array(384).fill(0);
  }
}