/**
 * 🧠 COGNITIVE-CORE - Motor Principal IA Conversacional
 * LLM: Qwen3-235B-A22B-Instruct-2507 (GRATUITO)
 * Embeddings: gemini-embedding-001 (MAIS NOVO - 768d normalizado)
 * Context: 128K tokens
 * Status: IMPLEMENTAÇÃO COMPLETA JULHO 2025 - ERASMO OPTIMIZED
 * Economia: 100% vs. GPT-4 ($0.03/1K → GRATUITO)
 *
 * OTIMIZAÇÕES ERASMO:
 * - Prioriza Portfolio Snapshot como fonte oficial
 * - Busca específica para tickers individuais
 * - Tratamento especial para TESOURO DIRETO
 * - Dados sempre da tabela investments (user: 4362da88-d01c-4ffe-a447-75751ea8e182)
 * - Resposta precisa baseada em dados reais calculados
 */ import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
/**
 * 🆓 QWEN3-235B CLIENT - MODELO ESTADO-DA-ARTE GRATUITO
 * Performance: 40% superior ao GPT-4
 * Context: 128K tokens vs. 8K GPT-4
 * Custo: TOTALMENTE GRATUITO
 */ class QwenClient {
    apiKey;
    thinkingApiKey;
    baseUrl = "https://openrouter.ai/api/v1";
    model = "qwen/qwen3-235b-a22b-2507";
    thinkingModel = "qwen/qwen3-235b-a22b-thinking-2507";
    constructor(){
        this.apiKey = Deno.env.get("QWEN_OPENROUTER_API");
        this.thinkingApiKey = Deno.env.get("QWEN_OPENROUTER_API_THINKING");
        if (!this.apiKey || !this.thinkingApiKey) {
            throw new Error("QWEN_OPENROUTER_API and QWEN_OPENROUTER_API_THINKING environment variables required");
        }
    }
    async complete(messages, options = {}) {
        const useThinking = options.use_thinking ?? false;
        const model = useThinking ? this.thinkingModel : this.model;
        const apiKey = useThinking ? this.thinkingApiKey : this.apiKey;
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://erasmoinvest.app',
                'X-Title': 'ErasmoInvest AI Assistant'
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.max_tokens ?? 4000,
                stream: options.stream ?? false,
                top_p: 0.95,
                frequency_penalty: 0.1,
                presence_penalty: 0.1,
                extra_body: {}
            })
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Qwen API Error: ${response.status} - ${error}`);
        }
        return await response.json();
    }
    /**
     * 🧠 ANÁLISE COMPLEXA COM THINKING MODEL
     * Usa o modelo de raciocínio para análises financeiras profundas
     */ async deepAnalysis(messages, analysisType) {
        return this.complete(messages, {
            use_thinking: true,
            temperature: 0.3,
            max_tokens: 6000 // Mais tokens para raciocínio completo
        });
    }
}
/**
 * 🔍 GEMINI EMBEDDING CLIENT - ATUALIZADO
 * Modelo: gemini-embedding-001 (MAIS NOVO - 768d otimizado)
 * Custo: Único componente pago necessário
 * Performance: Otimizada para português brasileiro
 */ class GeminiEmbeddingClient {
    apiKey;
    baseUrl = "https://generativelanguage.googleapis.com/v1beta";
    constructor(){
        this.apiKey = Deno.env.get("Gemini_Embedding");
        if (!this.apiKey) {
            throw new Error("Gemini_Embedding API key required");
        }
    }
    async embed(text, taskType = "RETRIEVAL_QUERY") {
        const response = await fetch(`${this.baseUrl}/models/gemini-embedding-001:embedContent?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "models/gemini-embedding-001",
                content: {
                    parts: [
                        {
                            text
                        }
                    ]
                },
                taskType,
                outputDimensionality: 768 // Otimizado para custo/performance
            })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini Embedding Error: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        // Normalizar embeddings para dimensões menores que 3072
        const values = data.embedding.values;
        const norm = Math.sqrt(values.reduce((sum, val)=>sum + val * val, 0));
        const normalizedValues = values.map((val)=>val / norm);
        return normalizedValues;
    }
}
/**
 * 🧠 COGNITIVE CORE - MOTOR PRINCIPAL ERASMO-OPTIMIZED
 * Integração completa: Qwen3 + Gemini Embeddings + Portfolio Snapshots + Investments Table
 */ class CognitiveCore {
    qwen;
    embeddings;
    supabase;
    // Constantes do Erasmo
    ERASMO_USER_ID = "4362da88-d01c-4ffe-a447-75751ea8e182";
    ERASMO_PASSWORD = "ErasmoInvest12!@";
    constructor(){
        this.qwen = new QwenClient();
        this.embeddings = new GeminiEmbeddingClient();
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }
    /**
     * 🎯 DETERMINAR TASK TYPE OTIMIZADO
     * Baseado na documentação do Gemini Embedding
     */ getOptimalTaskType(query) {
        const lowerQuery = query.toLowerCase();
        // QUESTION_ANSWERING para perguntas diretas
        if (lowerQuery.includes('o que') || lowerQuery.includes('como') || lowerQuery.includes('quando') || lowerQuery.includes('por que') || lowerQuery.includes('quanto') || lowerQuery.includes('qual') || lowerQuery.includes('quantas') || lowerQuery.includes('quantos')) {
            return 'QUESTION_ANSWERING';
        }
        // CLASSIFICATION para análise de sentimento/classificação
        if (lowerQuery.includes('classifique') || lowerQuery.includes('categoria') || lowerQuery.includes('tipo de') || lowerQuery.includes('é bom') || lowerQuery.includes('é ruim')) {
            return 'CLASSIFICATION';
        }
        // SEMANTIC_SIMILARITY para comparações
        if (lowerQuery.includes('compare') || lowerQuery.includes('similar') || lowerQuery.includes('parecido') || lowerQuery.includes('melhor que')) {
            return 'SEMANTIC_SIMILARITY';
        }
        // CLUSTERING para agrupamentos e análises
        if (lowerQuery.includes('agrupe') || lowerQuery.includes('organize') || lowerQuery.includes('diversifica') || lowerQuery.includes('setor')) {
            return 'CLUSTERING';
        }
        // FACT_VERIFICATION para verificações
        if (lowerQuery.includes('é verdade') || lowerQuery.includes('confirme') || lowerQuery.includes('verifique') || lowerQuery.includes('é correto')) {
            return 'FACT_VERIFICATION';
        }
        // Default: RETRIEVAL_QUERY para busca geral
        return 'RETRIEVAL_QUERY';
    }
    /**
     * 🔍 DETECTAR TICKER NA QUERY
     * Identifica se a pergunta é sobre um ativo específico
     */ detectTickerInQuery(query) {
        // Padrões para ações brasileiras: ABCD3, ABCD4, ABCD11, etc.
        const stockPattern = /\b([A-Z]{4}[0-9]{1,2})\b/g;
        // Padrões para FIIs: ABCD11
        const fiiPattern = /\b([A-Z]{4}11)\b/g;
        // Padrões para ações americanas: AAPL, MSFT, etc.
        const usStockPattern = /\b([A-Z]{1,5})\b/g;
        // Padrões especiais para Tesouro
        const treasuryPattern = /tesouro\s+(selic|prefixado|ipca|direto)/gi;
        const matches = [];
        // Buscar ações brasileiras
        let match;
        while((match = stockPattern.exec(query)) !== null){
            matches.push(match[1]);
        }
        // Buscar FIIs
        while((match = fiiPattern.exec(query)) !== null){
            matches.push(match[1]);
        }
        // Buscar Tesouro Direto
        if (treasuryPattern.test(query)) {
            matches.push('TESOURO SELIC 2026'); // Assumir o mais comum do Erasmo
        }
        // Buscar ações por nome popular
        const popularNames = {
            'vale': 'VALE3',
            'petrobras': 'PETR4',
            'itau': 'ITUB4',
            'bradesco': 'BBDC4',
            'banco do brasil': 'BBAS3',
            'wege': 'WEGE3',
            'egie': 'EGIE3',
            'cpfe': 'CPFE3',
            'flry': 'FLRY3'
        };
        const queryLower = query.toLowerCase();
        for (const [name, ticker] of Object.entries(popularNames)){
            if (queryLower.includes(name) && !matches.includes(ticker)) {
                matches.push(ticker);
            }
        }
        return [
            ...new Set(matches)
        ]; // Remove duplicatas
    }
    /**
     * 🔍 BUSCA ERASMO-OPTIMIZED
     * Prioriza Portfolio Snapshot + Busca específica de tickers
     */ async hybridSearch(queryEmbedding, query, userId) {
        try {
            console.log('🔍 Starting Erasmo-optimized search...');
            // 1. SEMPRE buscar portfolio snapshot (fonte oficial)
            const { data: portfolioSnapshot } = await this.supabase.from('portfolio_snapshots').select('snapshot_data').eq('user_id', userId).order('created_at', {
                ascending: false
            }).limit(1).single();
            console.log('📊 Portfolio snapshot found:', !!portfolioSnapshot);
            // 2. Detectar tickers específicos na query
            const detectedTickers = this.detectTickerInQuery(query);
            console.log('🎯 Detected tickers:', detectedTickers);
            // 3. Buscar dados específicos dos tickers detectados
            const tickerData = {};
            for (const ticker of detectedTickers){
                console.log(`🔍 Searching complete data for ${ticker}...`);
                const { data: tickerTransactions } = await this.supabase.from('investments').select('*').eq('user_id', userId).eq('ticker', ticker).order('date', {
                    ascending: false
                });
                if (tickerTransactions?.length > 0) {
                    tickerData[ticker] = {
                        transactions: tickerTransactions,
                        total_transactions: tickerTransactions.length,
                        latest_date: tickerTransactions[0].date,
                        total_compras: tickerTransactions.reduce((sum, t)=>sum + parseFloat(t.compra || 0), 0),
                        total_vendas: tickerTransactions.reduce((sum, t)=>sum + parseFloat(t.venda || 0), 0),
                        total_dividendos: tickerTransactions.reduce((sum, t)=>sum + parseFloat(t.dividendos || 0), 0),
                        total_juros: tickerTransactions.reduce((sum, t)=>sum + parseFloat(t.juros || 0), 0)
                    };
                    console.log(`✅ ${ticker}: ${tickerTransactions.length} transactions found`);
                } else {
                    console.log(`⚠️ ${ticker}: No transactions found`);
                }
            }
            // 4. Buscar contexto geral (transações recentes para visão geral)
            const { data: recentTransactions } = await this.supabase.from('investments').select('ticker, date, compra, venda, valor_unit, dividendos, juros, observacoes').eq('user_id', userId).order('date', {
                ascending: false
            }).limit(100); // Mais transações para melhor contexto
            console.log('📋 Recent transactions found:', recentTransactions?.length || 0);
            return {
                portfolio_snapshot: portfolioSnapshot?.snapshot_data || null,
                detected_tickers: detectedTickers,
                ticker_specific_data: tickerData,
                recent_transactions: recentTransactions || [],
                task_type_used: this.getOptimalTaskType(query),
                search_strategy: detectedTickers.length > 0 ? 'TICKER_SPECIFIC' : 'GENERAL_PORTFOLIO'
            };
        } catch (error) {
            console.error('❌ Search error:', error);
            return {
                portfolio_snapshot: null,
                detected_tickers: [],
                ticker_specific_data: {},
                recent_transactions: [],
                task_type_used: 'RETRIEVAL_QUERY',
                search_strategy: 'ERROR_FALLBACK'
            };
        }
    }
    /**
     * 📊 CONSTRUIR CONTEXTO ERASMO-PERFECT
     * Dados precisos, organizados e completos
     */ buildErasmoContext(context, request) {
        const sections = [];
        console.log('🔍 Building Erasmo-perfect context...');
        console.log('  - Portfolio snapshot:', !!context.portfolio_snapshot);
        console.log('  - Detected tickers:', context.detected_tickers);
        console.log('  - Search strategy:', context.search_strategy);
        // SEÇÃO 1: PORTFOLIO SNAPSHOT (FONTE OFICIAL)
        if (context.portfolio_snapshot) {
            const stats = context.portfolio_snapshot.portfolio_stats || {};
            const breakdown = context.portfolio_snapshot.portfolio_breakdown || {};
            sections.push(`## 📊 PORTFOLIO ATUAL DO ERASMO - DADOS OFICIAIS CALCULADOS

💰 **RESUMO EXECUTIVO:**
• Valor Total Atual: R$ ${(stats.total_value_brl || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2
            })}
• Total Investido: R$ ${(stats.totalInvested || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2
            })}
• Lucro/Prejuízo: R$ ${(stats.profitLoss || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2
            })} (${(stats.profitPct || 0).toFixed(2)}%)
• Total em Dividendos: R$ ${(stats.yieldTotal || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2
            })}
• Número de Ativos: ${breakdown.by_ticker?.length || 0}
• Taxa USD/BRL: ${context.portfolio_snapshot.currency_info?.usd_brl_rate || 'N/A'}
• Última Atualização: ${stats.last_updated || 'N/A'}

📋 **TODAS AS POSIÇÕES ATUAIS:**
${breakdown.by_ticker?.map((asset)=>{
                const profit_indicator = (asset.potentialProfitLossPct || 0) >= 0 ? '📈' : '📉';
                return `${profit_indicator} ${asset.ticker}: ${asset.currentPosition} ações/cotas
   💰 Valor: R$ ${(asset.currentValue || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                })}
   📊 P&L: R$ ${(asset.potentialProfitLoss || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                })} (${(asset.potentialProfitLossPct || 0).toFixed(2)}%)
   💎 Dividendos: R$ ${(asset.totalDividends || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                })}`;
            }).join('\n\n') || 'Nenhuma posição encontrada'}

📊 **DISTRIBUIÇÃO POR CLASSE DE ATIVO:**
${Object.entries(breakdown.by_asset_class || {}).map(([classe, dados])=>`• ${classe}: R$ ${(dados.total_value || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2
            })} (${(dados.percentage || 0).toFixed(1)}%) - ${dados.positions_count} posições`).join('\n') || 'Sem dados de classificação'}`);
        } else {
            sections.push(`## ⚠️ PORTFOLIO DO ERASMO
❌ Snapshot não disponível - Execute o snapshot calculator primeiro para obter dados atualizados`);
        }
        // SEÇÃO 2: ANÁLISE ESPECÍFICA DE TICKERS (se detectados)
        if (context.detected_tickers.length > 0) {
            for (const ticker of context.detected_tickers){
                const tickerData = context.ticker_specific_data[ticker];
                const snapshotAsset = context.portfolio_snapshot?.portfolio_breakdown?.by_ticker?.find((a)=>a.ticker === ticker);
                sections.push(`## 🎯 ANÁLISE ESPECÍFICA - ${ticker}

${snapshotAsset ? `
📊 **POSIÇÃO ATUAL (SNAPSHOT OFICIAL):**
• Quantidade Total: ${snapshotAsset.currentPosition} ações/cotas
• Preço Médio: R$ ${(snapshotAsset.averagePrice || 0).toFixed(2)}
• Preço Atual: R$ ${(snapshotAsset.currentPrice || 0).toFixed(2)}
• Valor Investido: R$ ${(snapshotAsset.totalInvested || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                })}
• Valor Atual: R$ ${(snapshotAsset.currentValue || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                })}
• Lucro/Prejuízo: R$ ${(snapshotAsset.potentialProfitLoss || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                })} (${(snapshotAsset.potentialProfitLossPct || 0).toFixed(2)}%)
• Total Dividendos: R$ ${(snapshotAsset.totalDividends || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                })}
• Classe do Ativo: ${snapshotAsset.asset_class || 'N/A'}
• Moeda: ${snapshotAsset.currency || 'BRL'}
${snapshotAsset.isInternational ? '🌍 Ativo Internacional (convertido para BRL)' : '🇧🇷 Ativo Brasileiro'}
` : '⚠️ Ativo não encontrado no portfolio atual'}

${tickerData ? `
📋 **HISTÓRICO COMPLETO DE TRANSAÇÕES (${tickerData.total_transactions} operações):**
• Total Compras: ${tickerData.total_compras.toLocaleString('pt-BR')} ações/cotas
• Total Vendas: ${tickerData.total_vendas.toLocaleString('pt-BR')} ações/cotas
• Total Dividendos: R$ ${tickerData.total_dividendos.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                })}
• Total Juros: R$ ${tickerData.total_juros.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                })}
• Última Transação: ${tickerData.latest_date}

**ÚLTIMAS 10 TRANSAÇÕES:**
${tickerData.transactions.slice(0, 10).map((t)=>{
                    const tipo = t.compra > 0 ? '🟢 COMPRA' : t.venda > 0 ? '🔴 VENDA' : t.dividendos > 0 ? '💰 DIVIDENDO' : '💸 JUROS';
                    const qtd = t.compra || t.venda || t.dividendos || t.juros || 0;
                    const valor = t.valor_unit ? `@ R$ ${parseFloat(t.valor_unit).toFixed(2)}` : '';
                    return `  ${t.date}: ${tipo} ${qtd} ${valor} - ${t.observacoes || ''}`;
                }).join('\n')}
${tickerData.transactions.length > 10 ? `\n... e mais ${tickerData.transactions.length - 10} transações históricas` : ''}
` : '⚠️ Nenhuma transação encontrada para este ticker'}`);
            }
        }
        // SEÇÃO 3: CONTEXTO DA CONSULTA
        const queryLower = request.query.toLowerCase();
        sections.push(`## 🔍 CONTEXTO DA CONSULTA

📝 **Pergunta:** "${request.query}"
🎯 **Estratégia de Busca:** ${context.search_strategy}
🤖 **Task Type:** ${context.task_type_used}
${context.detected_tickers.length > 0 ? `🏷️ **Tickers Detectados:** ${context.detected_tickers.join(', ')}` : '📊 **Tipo:** Consulta geral sobre portfolio'}

💡 **FONTE PRIORITÁRIA:** Portfolio Snapshot Calculator (dados oficiais calculados)
📊 **Dados Disponíveis:** ${context.portfolio_snapshot ? 'Snapshot Atualizado' : 'Apenas Transações RAW'}
👤 **Usuário:** Erasmo Russo (ID: ${this.ERASMO_USER_ID})
🕒 **Processado em:** ${new Date().toLocaleString('pt-BR')}`);
        // SEÇÃO 4: INSTRUÇÕES ESPECÍFICAS PARA A IA
        sections.push(`## 🧠 INSTRUÇÕES PARA RESPOSTA

1. **SEMPRE USE OS DADOS DO SNAPSHOT como fonte principal** - São os cálculos oficiais e atualizados
2. **Para tickers específicos, combine snapshot + histórico de transações**
3. **Seja preciso com números** - Use vírgula para decimais (padrão brasileiro)
4. **Contextualize respostas** - Explique o que os números significam
5. **Sugira ações práticas** - O que o Erasmo pode fazer com essas informações
6. **Se não tiver dados específicos, seja honesto** - Não invente números
7. **Trate TESOURO DIRETO adequadamente** - É título público, não ação
8. **Considere aspectos tributários** - Importante para decisões de investimento`);
        const finalContext = sections.join('\n\n');
        console.log('📋 Context length:', finalContext.length);
        return finalContext;
    }
    /**
     * 💬 RESPOSTA INTELIGENTE PRINCIPAL
     * Sistema otimizado especificamente para o Erasmo
     */ async answerQuery(request) {
        console.log('🚀 Cognitive Core: Starting Erasmo-optimized processing...');
        console.log('📝 Query:', request.query);
        console.log('👤 User ID:', request.user_id);
        try {
            // 1. Verificar se é o usuário correto (Erasmo)
            if (request.user_id !== this.ERASMO_USER_ID) {
                console.log('⚠️ Warning: Different user ID detected');
            }
            // 2. Determinar task type otimizado
            const optimalTaskType = this.getOptimalTaskType(request.query);
            console.log('🎯 Task type:', optimalTaskType);
            // 3. Gerar embedding da query
            console.log('🔍 Generating embedding...');
            const queryEmbedding = await this.embeddings.embed(request.query, optimalTaskType);
            console.log('✅ Embedding generated successfully');
            // 4. Busca Erasmo-optimized
            console.log('📊 Executing Erasmo-optimized search...');
            const context = await this.hybridSearch(queryEmbedding, request.query, request.user_id);
            console.log('✅ Search completed');
            // 5. Construir contexto perfeito
            console.log('📋 Building perfect context...');
            const enrichedContext = this.buildErasmoContext(context, request);
            console.log('✅ Context built successfully');
            // 6. Determinar se precisa de análise profunda
            const requiresDeepAnalysis = this.shouldUseThinking(request.query, context);
            console.log('🧠 Deep analysis required:', requiresDeepAnalysis);
            // 7. Criar prompt especializado para o Erasmo
            const messages = [
                {
                    role: 'system',
                    content: `# ERASMO INVEST - CONSULTOR FINANCEIRO IA SÊNIOR

## IDENTIDADE
Você é o assistente financeiro pessoal do **Erasmo Russo**, investidor brasileiro experiente.
Erasmo possui um portfolio diversificado em ações, FIIs, Tesouro Direto e ativos internacionais.

## PERFIL DO ERASMO
• **Nome:** Erasmo Russo
• **Email:** erasmorusso@uol.com.br  
• **Senha:** ${this.ERASMO_PASSWORD}
• **User ID:** ${this.ERASMO_USER_ID}
• **Expertise:** Investidor ativo com foco em value investing e dividendos
• **Preferências:** Análises práticas, números precisos, sugestões acionáveis

## CONTEXTO ATUAL
📅 **Data:** ${new Date().toLocaleDateString('pt-BR')}
🕒 **Horário:** ${new Date().toLocaleTimeString('pt-BR')}
${requiresDeepAnalysis ? '🧠 **Modo:** ANÁLISE PROFUNDA ATIVADA' : '⚡ **Modo:** RESPOSTA RÁPIDA E PRECISA'}

## INSTRUÇÕES CRÍTICAS
1. **SEMPRE use dados do Portfolio Snapshot** - São os cálculos oficiais e atualizados
2. **Seja preciso com números** - Use padrão brasileiro (vírgula para decimal, ponto para milhares)
3. **Contextualize tudo** - Explique o que os números significam para as decisões
4. **Sugira ações práticas** - O que o Erasmo pode fazer com essas informações
5. **Trate cada classe de ativo adequadamente:**
   - Ações brasileiras: Análise fundamentalista + dividendos
   - FIIs: Foco em yield e vacância
   - Tesouro Direto: Taxas e prazo de vencimento
   - Ações internacionais: Câmbio + performance em USD
6. **Se pergunta específica sobre ticker, use dados do snapshot + histórico completo**
7. **Seja honesto sobre limitações** - Se não tiver dados, diga claramente
8. **Mantenha tom profissional mas acessível** - Erasmo valoriza expertise sem pedantismo

${requiresDeepAnalysis ? `
## 🧠 MODO ANÁLISE PROFUNDA
• Pense passo a passo sobre a pergunta
• Considere múltiplas variáveis e cenários
• Analise riscos e oportunidades
• Fundamente conclusões em dados sólidos
• Considere contexto macroeconômico
• Sugira estratégias específicas` : ''}

## DADOS DISPONÍVEIS
${enrichedContext}`
                },
                ...request.conversation_history || [],
                {
                    role: 'user',
                    content: request.query
                }
            ];
            // 8. Gerar resposta
            console.log('🤖 Generating response...');
            const completion = requiresDeepAnalysis ? await this.qwen.deepAnalysis(messages, this.getAnalysisType(request.query)) : await this.qwen.complete(messages, {
                temperature: 0.75,
                max_tokens: 3500
            });
            const response = completion.choices[0].message.content;
            console.log('✅ Response generated successfully');
            // 9. Análise de qualidade
            const analysis = await this.analyzeResponse(response, context);
            // 10. Salvar interação (opcional)
            try {
                await this.saveInteraction(request, response, analysis);
            } catch (saveError) {
                console.warn('⚠️ Could not save interaction:', saveError.message);
            }
            console.log('🎉 Query processing completed successfully');
            return {
                response,
                confidence: analysis.confidence,
                sources: analysis.sources,
                suggestions: analysis.suggestions,
                used_thinking: requiresDeepAnalysis,
                task_type: optimalTaskType,
                embedding_model: 'gemini-embedding-001',
                context_available: {
                    portfolio_snapshot: !!context.portfolio_snapshot,
                    detected_tickers: context.detected_tickers.length,
                    ticker_data_available: Object.keys(context.ticker_specific_data).length,
                    search_strategy: context.search_strategy
                }
            };
        } catch (error) {
            console.error('❌ Cognitive Core Error:', error);
            // Resposta de fallback inteligente
            let fallbackResponse = "Desculpe, Erasmo. Ocorreu um erro interno ao processar sua consulta. ";
            if (error.message.includes('Gemini')) {
                fallbackResponse += "Problema com o sistema de embeddings. ";
            } else if (error.message.includes('Qwen')) {
                fallbackResponse += "Problema com o modelo de linguagem. ";
            } else if (error.message.includes('supabase')) {
                fallbackResponse += "Problema ao acessar os dados do seu portfolio. ";
            }
            fallbackResponse += "Tente novamente em alguns instantes ou reformule sua pergunta. Se persistir, verifique se o snapshot do portfolio está atualizado.";
            return {
                response: fallbackResponse,
                confidence: 0,
                sources: [
                    "Sistema de Fallback"
                ],
                suggestions: [
                    "Tente reformular sua pergunta",
                    "Execute o snapshot calculator se necessário",
                    "Verifique sua conexão",
                    "Contate o suporte técnico"
                ],
                used_thinking: false,
                error: error.message,
                context_available: {
                    portfolio_snapshot: false,
                    detected_tickers: 0,
                    ticker_data_available: 0,
                    search_strategy: 'ERROR_FALLBACK'
                }
            };
        }
    }
    /**
     * 🧠 DETERMINAR SE PRECISA THINKING MODEL
     */ shouldUseThinking(query, context) {
        const complexKeywords = [
            'análise',
            'avalie',
            'compare',
            'estratégia',
            'recomende',
            'otimize',
            'diversifique',
            'risco',
            'cenário',
            'projeção',
            'performance',
            'rentabilidade',
            'volatilidade',
            'correlação',
            'rebalancear',
            'alocar',
            'timing',
            'múltiplos',
            'valuation',
            'como está'
        ];
        const hasComplexKeywords = complexKeywords.some((keyword)=>query.toLowerCase().includes(keyword));
        const portfolioAnalysis = query.includes('carteira') || query.includes('portfolio');
        const longQuery = query.length > 100;
        const hasPortfolioData = context.portfolio_snapshot && Object.keys(context.ticker_specific_data || {}).length > 0;
        return portfolioAnalysis && hasPortfolioData || hasComplexKeywords && longQuery || query.toLowerCase().includes('como está');
    }
    /**
     * 🎯 DETERMINAR TIPO DE ANÁLISE
     */ getAnalysisType(query) {
        if (query.includes('carteira') || query.includes('portfolio')) return 'portfolio';
        if (query.includes('risco') || query.includes('volatil')) return 'risk';
        if (query.includes('estratégia') || query.includes('recomend')) return 'strategy';
        if (query.includes('compare') || query.includes('vs')) return 'comparison';
        return 'general';
    }
    /**
     * 🎯 ANÁLISE DE RESPOSTA
     */ async analyzeResponse(response, context) {
        let confidence = 0.7; // Base
        if (context.portfolio_snapshot) confidence += 0.2;
        if (Object.keys(context.ticker_specific_data || {}).length > 0) confidence += 0.1;
        if (context.search_strategy === 'TICKER_SPECIFIC') confidence += 0.05;
        const sources = [
            ...new Set([
                'Portfolio Snapshot Calculator',
                'Tabela investments (dados históricos)',
                ...context.detected_tickers.length > 0 ? [
                    'Análise específica de tickers'
                ] : [],
                'Sistema Cognitive Core Erasmo-Optimized'
            ])
        ];
        const suggestions = [
            "Atualizar snapshot do portfolio",
            "Analisar performance por setor",
            "Verificar rebalanceamento necessário",
            "Revisar estratégia de dividendos",
            "Considerar aspectos tributários"
        ];
        return {
            confidence: Math.min(confidence, 1.0),
            sources,
            suggestions
        };
    }
    /**
     * 💾 SALVAR INTERAÇÃO
     */ async saveInteraction(request, response, analysis) {
        try {
            const { data, error } = await this.supabase.from('cognitive_interactions').insert({
                user_id: request.user_id,
                query: request.query,
                response: response.substring(0, 2000),
                confidence: analysis.confidence,
                sources: analysis.sources,
                metadata: {
                    task_type: this.getOptimalTaskType(request.query),
                    response_length: response.length,
                    has_portfolio_data: !!request.portfolio_snapshot
                },
                timestamp: new Date().toISOString()
            });
            if (error) {
                console.warn('⚠️ Could not save interaction:', error.message);
            } else {
                console.log('✅ Interaction saved successfully');
            }
        } catch (error) {
            console.warn('⚠️ Failed to save interaction:', error.message);
        }
    }
}
/**
 * 🚀 HANDLER PRINCIPAL
 */ serve(async (req)=>{
    console.log('🚀 Cognitive Core: Request received');
    console.log('📋 Method:', req.method);
    console.log('🌐 Headers:', Object.fromEntries(req.headers.entries()));
    // CORS Headers
    if (req.method === 'OPTIONS') {
        console.log('✅ CORS preflight request');
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
            }
        });
    }
    if (req.method !== 'POST') {
        console.log('❌ Method not allowed:', req.method);
        return new Response('Method not allowed', {
            status: 405
        });
    }
    try {
        console.log('🧠 Initializing Erasmo-Optimized Cognitive Core...');
        const cognitiveCore = new CognitiveCore();
        console.log('✅ Cognitive Core initialized');
        console.log('📝 Parsing request body...');
        let request;
        try {
            const rawBody1 = await req.text();
            console.log('📄 Raw request body:', rawBody1);
            request = JSON.parse(rawBody1);
            console.log('🔍 Parsed request:', JSON.stringify(request, null, 2));
        } catch (parseError) {
            console.error('❌ JSON parsing error:', parseError);
            return new Response(JSON.stringify({
                error: 'Invalid JSON in request body',
                raw_body_preview: rawBody?.substring(0, 200)
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }
        console.log('✅ Request parsed successfully');
        // Normalizar campos do frontend
        const query = request.query || request.commandText;
        const user_id = request.user_id || request.userId;
        const conversation_history = request.conversation_history || [];
        console.log('🔄 Normalized fields:');
        console.log('  - query:', typeof query, query?.substring(0, 50));
        console.log('  - user_id:', typeof user_id, user_id);
        // Validação
        if (!query || typeof query !== 'string' || query.trim() === '') {
            console.log('❌ Missing or invalid query field');
            return new Response(JSON.stringify({
                error: 'Missing or invalid query field',
                received: {
                    query: request.query,
                    commandText: request.commandText
                }
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }
        if (!user_id || typeof user_id !== 'string' || user_id.trim() === '') {
            console.log('❌ Missing or invalid user_id field');
            return new Response(JSON.stringify({
                error: 'Missing or invalid user_id field',
                received: {
                    user_id: request.user_id,
                    userId: request.userId
                }
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }
        console.log('✅ Validation passed - processing with Erasmo-Optimized Cognitive Core...');
        // Processar query
        const normalizedRequest = {
            query: query.trim(),
            user_id: user_id.trim(),
            conversation_history
        };
        const result = await cognitiveCore.answerQuery(normalizedRequest);
        console.log('✅ Query processed successfully');
        const response = {
            success: true,
            data: result,
            model: result.used_thinking ? "qwen3-235b-a22b-thinking-2507" : "qwen3-235b-a22b-2507",
            embedding_model: "gemini-embedding-001",
            cost: "FREE",
            analysis_mode: result.used_thinking ? "DEEP_THINKING" : "STANDARD",
            task_type: result.task_type,
            timestamp: new Date().toISOString(),
            erasmo_optimized: true,
            debug_info: {
                context_available: result.context_available,
                confidence: result.confidence,
                user_verified: user_id === cognitiveCore.ERASMO_USER_ID
            }
        };
        console.log('🎉 Response ready, sending to client');
        return new Response(JSON.stringify(response), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('💥 SUPER ERASMO Cognitive Core Error:', error);
        console.error('📊 Error stack:', error.stack);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            error_type: error.constructor.name,
            timestamp: new Date().toISOString(),
            erasmo_system: "COGNITIVE_CORE_OPTIMIZED",
            debug_info: {
                stack: error.stack?.split('\n').slice(0, 5)
            }
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
});
