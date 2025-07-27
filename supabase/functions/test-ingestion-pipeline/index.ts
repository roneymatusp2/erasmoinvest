
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Helper function to ensure we always return a valid response
const createResponse = (body: object, status = 200) => {
    return new Response(JSON.stringify(body, null, 2), {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
        status,
    });
};

serve(async (_req) => {
    console.log('[TEST-PIPELINE] Starting diagnostic run...');
    const logs: string[] = [];

    try {
        // 1. Initialize Supabase Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!supabaseUrl || !serviceRoleKey) {
            logs.push('ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are not set.');
            console.error('ERROR: Supabase credentials not found.');
            return createResponse({ status: 'Failed', logs }, 500);
        }
        const supabaseClient = createClient(supabaseUrl, serviceRoleKey);
        logs.push('Step 1: Supabase client initialized successfully.');
        console.log('[TEST-PIPELINE] Supabase client initialized.');

        // 2. Fetch News from NewsAPI
        const newsApiKey = Deno.env.get('ErasmoInvest_NewsAPI');
        if (!newsApiKey) {
            logs.push('ERROR: ErasmoInvest_NewsAPI key is missing.');
            console.error('ERROR: NewsAPI key not found.');
            return createResponse({ status: 'Failed', logs }, 500);
        }
        logs.push('Step 2: Found NewsAPI key. Fetching news...');
        console.log('[TEST-PIPELINE] Fetching news from NewsAPI...');

        const newsResponse = await fetch(`https://newsapi.org/v2/top-headlines?country=br&category=business&apiKey=${newsApiKey}`);
        logs.push(`NewsAPI response status: ${newsResponse.status}`);
        console.log(`[TEST-PIPELINE] NewsAPI status: ${newsResponse.status}`);

        if (!newsResponse.ok) {
            const errorText = await newsResponse.text();
            logs.push(`ERROR: Failed to fetch news. Details: ${errorText}`);
            console.error(`[TEST-PIPELINE] NewsAPI error: ${errorText}`);
            return createResponse({ status: 'Failed', logs }, 500);
        }

        const newsData = await newsResponse.json();
        const articles = newsData.articles || [];
        logs.push(`Step 2 SUCCESS: Found ${articles.length} articles.`);
        console.log(`[TEST-PIPELINE] Found ${articles.length} articles.`);

        if (articles.length === 0) {
            logs.push('WARNING: No articles returned from NewsAPI. Pipeline will stop, but this might be normal.');
            console.warn('[TEST-PIPELINE] No articles found.');
            return createResponse({ status: 'Completed without data', logs });
        }

        const articleToProcess = articles.find(a => a.content) || articles[0];
        logs.push(`Selected article to process: "${articleToProcess.title}"`);
        console.log(`[TEST-PIPELINE] Processing article: "${articleToProcess.title}"`);


        // 3. Analyze with AI (Qwen)
        const qwenApiKey = Deno.env.get('QWEN_OPENROUTER_API');
        if (!qwenApiKey) {
            logs.push('ERROR: QWEN_OPENROUTER_API key is missing.');
            console.error('ERROR: Qwen API key not found.');
            return createResponse({ status: 'Failed', logs }, 500);
        }
        logs.push('Step 3: Found Qwen API key. Analyzing news content...');
        console.log('[TEST-PIPELINE] Analyzing with Qwen...');

        const analysisPrompt = `Analyze the following news article and extract information in JSON format. Article: Title: ${articleToProcess.title}, Content: ${articleToProcess.content || articleToProcess.description}. Extract: "sentiment" (Positive, Negative, Neutral), "entities" (list of companies or tickers), and "summary" (one-sentence summary). Return ONLY the JSON object.`;
        const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${qwenApiKey}` },
            body: JSON.stringify({ model: 'qwen/qwen3-32b-instruct', messages: [{ role: 'user', content: analysisPrompt }], response_format: { type: 'json_object' } }),
        });

        logs.push(`AI analysis response status: ${aiResponse.status}`);
        console.log(`[TEST-PIPELINE] Qwen status: ${aiResponse.status}`);

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            logs.push(`ERROR: AI analysis failed. Details: ${errorText}`);
            console.error(`[TEST-PIPELINE] Qwen error: ${errorText}`);
            return createResponse({ status: 'Failed', logs }, 500);
        }
        const aiData = await aiResponse.json();
        const analysis = JSON.parse(aiData.choices[0].message.content);
        logs.push(`Step 3 SUCCESS: AI analysis complete. Sentiment: ${analysis.sentiment}`);
        console.log(`[TEST-PIPELINE] AI analysis successful.`);


        // 4. Generate Embedding with Gemini
        const geminiApiKey = Deno.env.get('Gemini_Embedding');
        if (!geminiApiKey) {
            logs.push('ERROR: Gemini_Embedding key is missing.');
            console.error('ERROR: Gemini API key not found.');
            return createResponse({ status: 'Failed', logs }, 500);
        }
        logs.push('Step 4: Found Gemini API key. Generating embedding...');
        console.log('[TEST-PIPELINE] Generating embedding with Gemini...');

        const embeddingText = `${articleToProcess.title} - ${articleToProcess.content}`;
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: "models/text-embedding-004", content: { parts: [{ text: embeddingText }] }, taskType: "RETRIEVAL_DOCUMENT", outputDimensionality: 768 }),
        });

        logs.push(`Gemini embedding response status: ${geminiResponse.status}`);
        console.log(`[TEST-PIPELINE] Gemini status: ${geminiResponse.status}`);

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            logs.push(`ERROR: Gemini embedding failed. Details: ${errorText}`);
            console.error(`[TEST-PIPELINE] Gemini error: ${errorText}`);
            return createResponse({ status: 'Failed', logs }, 500);
        }
        const geminiData = await geminiResponse.json();
        const embedding = geminiData.embedding?.values;
        logs.push(`Step 4 SUCCESS: Embedding generated with ${embedding?.length || 0} dimensions.`);
        console.log(`[TEST-PIPELINE] Embedding generation successful.`);


        // 5. Insert into Database
        logs.push('Step 5: Preparing to insert data into "news" and "nodes" tables...');
        console.log('[TEST-PIPELINE] Preparing to insert into database...');

        // Insert into 'news' table
        const newsEntry = {
            title: articleToProcess.title,
            source: articleToProcess.source.name,
            url: articleToProcess.url,
            content: articleToProcess.content || articleToProcess.description,
            published_at: articleToProcess.publishedAt,
            sentiment: analysis.sentiment,
            summary: analysis.summary,
        };
        const { error: newsError } = await supabaseClient.from('news').insert(newsEntry);
        if (newsError) {
            logs.push(`ERROR inserting into 'news' table: ${newsError.message}`);
            console.error(`[TEST-PIPELINE] DB 'news' insert error: ${newsError.message}`);
            return createResponse({ status: 'Failed', logs }, 500);
        }
        logs.push("Step 5a SUCCESS: Inserted into 'news' table.");
        console.log("[TEST-PIPELINE] 'news' table insert successful.");

        // Insert into 'nodes' table
        const nodeEntry = {
            id: `news_${new Date(articleToProcess.publishedAt).getTime()}`,
            type: 'news',
            label: `Notícia: ${articleToProcess.title.substring(0, 50)}...`,
            properties: { ...analysis, source: articleToProcess.source.name, url: articleToProcess.url },
            embedding: embedding,
        };
        const { error: nodeError } = await supabaseClient.from('nodes').insert(nodeEntry);
        if (nodeError) {
            logs.push(`ERROR inserting into 'nodes' table: ${nodeError.message}`);
            console.error(`[TEST-PIPELINE] DB 'nodes' insert error: ${nodeError.message}`);
            return createResponse({ status: 'Failed', logs }, 500);
        }
        logs.push("Step 5b SUCCESS: Inserted into 'nodes' table.");
        console.log("[TEST-PIPELINE] 'nodes' table insert successful.");

        logs.push('--- DIAGNOSTIC COMPLETE: ALL STEPS SUCCEEDED ---');
        return createResponse({ status: 'Success', logs });

    } catch (error) {
        console.error('[TEST-PIPELINE] A critical unhandled error occurred:', error);
        logs.push(`CRITICAL ERROR: ${error.message}`);
        return createResponse({ status: 'Failed', logs, error: error.stack }, 500);
    }
});
