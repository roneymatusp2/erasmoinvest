// /supabase/functions/commons/openrouter_client.ts
import { OpenAI } from 'npm:openai';

// Cliente para o Agente-Chefe (Cérebro)
export const qwenClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: Deno.env.get('QWEN_OPENROUTER_API'),
  defaultHeaders: {
    "HTTP-Referer": "https://gjvtncdjcslnkfctqnfy.supabase.co",
    "X-Title": "ErasmoInvest",
  }
});

// Cliente para os Agentes de Tarefas (Músculos)
export const gemmaClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: Deno.env.get('GEMMA3_OPENROUTERAPI'),
  defaultHeaders: {
    "HTTP-Referer": "https://gjvtncdjcslnkfctqnfy.supabase.co",
    "X-Title": "ErasmoInvest",
  }
});
