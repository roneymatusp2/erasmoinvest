// /supabase/functions/commons/embedding_service.ts
import { pipeline } from 'npm:@xenova/transformers';
console.log("Initializing embedding pipeline...");
const embedder = await pipeline('feature-extraction', 'Xenova/e5-small-v2');
console.log("Embedding pipeline initialized.");
export async function generateEmbedding(text) {
  const output = await embedder(text, {
    pooling: 'mean',
    normalize: true
  });
  return Array.from(output.data);
}
