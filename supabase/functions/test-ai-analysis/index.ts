import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NEWS_API_KEY = Deno.env.get('ErasmoInvest_NewsAPI');
const QWEN_API_KEY = Deno.env.get('QWEN_OPENROUTER_API');
const NEWS_API_URL = `https://newsapi.org/v2/everything?q=economia%20OR%20investimentos%20OR%20finan%C3%A7as&language=pt&sortBy=publishedAt&apiKey=${NEWS_API_KEY}`;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function getRealNews() {
  const response = await fetch(NEWS_API_URL);
  if (!response.ok) throw new Error(`NewsAPI Error: ${response.statusText}`);
  const data = await response.json();
  return (data.articles || []).slice(0, 1); // Apenas 1 artigo para teste
}

serve(async (_req) => {
  const logs: string[] = [];
  try {
    logs.push('Starting AI analysis diagnostic...');

    // 1. Get a news article
    const newsItems = await getRealNews();
    if (newsItems.length === 0) {
      logs.push('No news articles found to test with.');
      return new Response(JSON.stringify({ status: 'No articles', logs }), { headers: corsHeaders });
    }
    const article = newsItems[0];
    logs.push(`Processing article: "${article.title}"`);

    // 2. Clean and prepare content
    const cleanContent = (article.content || article.description || '').replace(/["\n\r]/g, ' ').substring(0, 500);
    logs.push(`Cleaned content (first 100 chars): ${cleanContent.substring(0, 100)}...`);

    // 3. Construct the prompt
    const analysisPrompt = `
      Analyze the following news article content. Respond with ONLY a valid JSON object.
      Content: "${cleanContent}"
      
      Provide this exact JSON structure:
      {
        "sentiment": "<Positive, Negative, or Neutral>",
        "entities": ["<Company or Ticker 1>", "<Company or Ticker 2>"],
        "summary": "<A concise one-sentence summary>"
      }
    `;
    logs.push('--- PROMPT BEING SENT TO AI ---');
    logs.push(analysisPrompt);
    logs.push('--- END PROMPT ---');

    // 4. Attempt AI API call
    logs.push('Attempting OpenRouter API call...');
    const aiResponse = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${QWEN_API_KEY}` },
      body: JSON.stringify({
        model: 'qwen/qwen3-32b-instruct',
        messages: [{ role: 'user', content: analysisPrompt }],
        response_format: { type: 'json_object' },
      }),
    });

    logs.push(`OpenRouter API Status: ${aiResponse.status}`);
    const aiResponseBody = await aiResponse.text();
    logs.push(`OpenRouter API Response Body: ${aiResponseBody}`);

    if (!aiResponse.ok) {
      logs.push(`AI analysis FAILED. Status: ${aiResponse.status}, Body: ${aiResponseBody}`);
      return new Response(JSON.stringify({ status: 'AI Analysis Failed', logs }), { status: 500, headers: corsHeaders });
    }

    logs.push('AI analysis SUCCESS. Attempting to parse JSON...');
    const aiData = JSON.parse(aiResponseBody);
    const analysisResult = JSON.parse(aiData.choices[0].message.content);
    logs.push(`Parsed AI Result: ${JSON.stringify(analysisResult)}`);

    logs.push('Diagnostic complete. AI analysis successful.');
    return new Response(JSON.stringify({ status: 'Success', logs, analysisResult }), { headers: corsHeaders });

  } catch (error) {
    logs.push(`CRITICAL ERROR during diagnostic: ${error.message}`);
    console.error('CRITICAL ERROR during diagnostic:', error);
    return new Response(JSON.stringify({ status: 'Error', logs, error: error.message }), { status: 500, headers: corsHeaders });
  }
});