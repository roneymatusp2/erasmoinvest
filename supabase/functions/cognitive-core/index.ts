/**
 * 🧠 COGNITIVE-CORE - Motor Principal IA Conversacional
 * Modelo: Qwen3-235B-A22B-Instruct-2507 (GRATUITO)
 * Embeddings: gemini-embedding-001 (OFICIAL)
 * Context: 262K tokens
 * Status: IMPLEMENTAÇÃO COMPLETA JULHO 2025
 * Economia: 100% vs. GPT-4 ($0.03/1K → GRATUITO)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface QwenMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface CognitiveRequest {
  // ✅ SUPORTE A QUERIES DIRETAS
  query?: string
  user_id?: string
  context_id?: string
  conversation_history?: QwenMessage[]
  
  // ✅ SUPORTE A ACTIONS (para explain_chart, etc)
  action?: string
  payload?: any
  userId?: string // alternativa para user_id
}

/**
 * 🆓 QWEN3-235B CLIENT - MODELO ESTADO-DA-ARTE GRATUITO
 * Performance: 40% superior ao GPT-4
 * Context: 262K tokens
 * Custo: TOTALMENTE GRATUITO
 */
class QwenClient {
  private apiKey: string
  private thinkingApiKey: string
  private baseUrl: string = "https://openrouter.ai/api/v1"
  private model: string = "qwen/qwen3-235b-a22b-2507:free"
  private thinkingModel: string = "qwen/qwen3-235b-a22b-thinking-2507"

  constructor() {
    this.apiKey = Deno.env.get("QWEN_OPENROUTER_API")!
    this.thinkingApiKey = Deno.env.get("QWEN_OPENROUTER_API_THINKING")!
    
    if (!this.apiKey || !this.thinkingApiKey) {
      throw new Error("QWEN_OPENROUTER_API and QWEN_OPENROUTER_API_THINKING environment variables required")
    }
  }

  async complete(messages: QwenMessage[], options: {
    temperature?: number
    max_tokens?: number
    stream?: boolean
    use_thinking?: boolean
  } = {}): Promise<any> {
    const useThinking = options.use_thinking ?? false
    const model = useThinking ? this.thinkingModel : this.model
    const apiKey = useThinking ? this.thinkingApiKey : this.apiKey

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
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Qwen API Error: ${response.status} - ${error}`)
    }

    return await response.json()
  }

  /**
   * 🧠 ANÁLISE COMPLEXA COM THINKING MODEL
   * Usa o modelo de raciocínio para análises financeiras profundas
   */
  async deepAnalysis(messages: QwenMessage[], analysisType: 'portfolio' | 'market' | 'risk' | 'strategy'): Promise<any> {
    return this.complete(messages, {
      use_thinking: true,
      temperature: 0.3, // Mais determinístico para análises
      max_tokens: 6000 // Mais tokens para raciocínio completo
    })
  }
}

/**
 * 🔍 GEMINI EMBEDDING CLIENT - MODELO OFICIAL CORRIGIDO
 * Modelo: gemini-embedding-001 (768d)
 * Performance: Otimizada para português brasileiro
 */
class GeminiEmbeddingClient {
  private apiKey: string
  private baseUrl: string = "https://generativelanguage.googleapis.com/v1beta"

  constructor() {
    this.apiKey = Deno.env.get("Gemini_Embedding")!
    if (!this.apiKey) {
      throw new Error("Gemini_Embedding API key required")
    }
  }

  async embed(text: string, taskType: string = "RETRIEVAL_QUERY"): Promise<number[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/models/gemini-embedding-001:embedContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: "models/gemini-embedding-001",
            content: { parts: [{ text }] },
            taskType,
            outputDimensionality: 768
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Gemini Embedding Error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      return data.embedding?.values || []
    } catch (error) {
      console.error('Gemini embedding error:', error)
      // Fallback: retornar array vazio se embedding falhar
      return new Array(768).fill(0)
    }
  }
}

/**
 * 🧠 COGNITIVE CORE - MOTOR PRINCIPAL
 * Integração completa: Qwen3 + Gemini Embeddings + PostgreSQL RAG
 */
class CognitiveCore {
  private qwen: QwenClient
  private embeddings: GeminiEmbeddingClient
  private supabase: any

  constructor() {
    this.qwen = new QwenClient()
    this.embeddings = new GeminiEmbeddingClient()
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  /**
   * 🔍 BUSCA HÍBRIDA AVANÇADA
   * Combina: Embedding Similarity + Full-Text Search + Metadata Filtering
   */
  async hybridSearch(queryEmbedding: number[], query: string, userId: string) {
    try {
      // 1. Busca por similaridade semântica (com fallback seguro)
      let semanticResults = []
      
      try {
        const { data, error } = await this.supabase.rpc('hybrid_search_financial_data', {
          query_embedding: queryEmbedding,
          query_text: query,
          user_id: userId,
          similarity_threshold: 0.75,
          limit_results: 10
        })

        if (error) {
          throw error // Joga o erro para o bloco catch principal
        }
        semanticResults = data || []

      } catch (rpcError) {
        console.warn('Hybrid search RPC failed. Falling back to text search.', rpcError.message)
        // Fallback para busca por texto, que é mais relevante que buscar itens aleatórios.
        const { data: fallbackData } = await this.supabase
          .from('financial_data')
          .select('content')
          .textSearch('content', `'${query}'`)
          .eq('user_id', userId)
          .limit(5)
        
        semanticResults = fallbackData || []
      }

      return {
        semantic_results: semanticResults,
        user_context: await this.getUserContext(userId),
        market_data: await this.getMarketData()
      }
    } catch (error) {
      console.error('Hybrid search error:', error)
      return {
        semantic_results: [],
        user_context: await this.getUserContext(userId),
        market_data: await this.getMarketData()
      }
    }
  }

  /**
   * 💱 OBTER COTAÇÃO USD/BRL ATUAL
   */
  /**
   * 💱 OBTER COTAÇÃO USD/BRL ATUAL - REVISÃO FINAL
   * Combina a chamada correta da API v6 com a estrutura robusta de try/catch.
   */
  private async getUSDToBRLRate(): Promise<number> {
    const fallbackRate = 5.30 // Centralizado para fácil manutenção
    
    // 1. Tentar buscar cotação do cache local
    try {
      const { data: cachedRate } = await this.supabase
        .from('currency_rates')
        .select('rate, updated_at')
        .eq('pair', 'USDBRL')
        .gte('updated_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()) // Cache de 4 horas
        .single()

      if (cachedRate?.rate) {
        console.log(`💱 Using cached USD/BRL rate: ${cachedRate.rate}`)
        return parseFloat(cachedRate.rate)
      }
    } catch (cacheError) {
      // Apenas um aviso, a falha no cache é esperada e normal.
      console.log('Cache miss or error for USD/BRL rate, proceeding to API call.')
    }

    // 2. Buscar cotação da API v6 como fonte primária
    try {
      const apiKey = Deno.env.get("EXCHANGERATE_API_KEY")
      if (!apiKey) {
        throw new Error('Secret EXCHANGERATE_API_KEY not found in Supabase environment.')
      }

      const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) }) // Timeout de 5s

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`API request failed with status ${response.status}: ${errorBody}`)
      }

      const data = await response.json()
      if (data.result !== 'success') {
        throw new Error(`API returned an error: ${data['error-type'] || 'Unknown error'}`)
      }

      const rate = data.conversion_rates?.BRL
      if (typeof rate !== 'number') {
        throw new Error(`Invalid or missing BRL rate in API response: ${JSON.stringify(data)}`)
      }

      // Sucesso! Salvar no cache para futuras requisições.
      await this.supabase.from('currency_rates').upsert({
        pair: 'USDBRL',
        rate: rate.toString(),
        updated_at: new Date().toISOString()
      })
      
      console.log(`💱 Fetched and cached new USD/BRL rate via v6 API: ${rate}`)
      return rate

    } catch (apiError) {
      console.error('CRITICAL: Could not fetch live USD/BRL rate. Using fallback.', apiError)
      return fallbackRate
    }
  }

  private async getUserContext(userId: string) {
    try {
      console.log(`🧠 CONTEXT ENGINE V2.0 (Snapshot-first) para user: ${userId}`)

      // 1. TENTAR BUSCAR SNAPSHOT RECENTE (FAST PATH)
      const SNAPSHOT_MAX_AGE_HOURS = 4
      try {
        const { data: snapshot, error } = await this.supabase
          .from('portfolio_snapshots')
          .select('snapshot_data, updated_at')
          .eq('user_id', userId)
          .single()

        if (error) throw error // Joga para o catch principal do bloco

        if (snapshot && snapshot.snapshot_data) {
          const snapshotAge = (new Date().getTime() - new Date(snapshot.updated_at).getTime()) / (1000 * 60 * 60)
          if (snapshotAge < SNAPSHOT_MAX_AGE_HOURS) {
            console.log(`✅ Fast Path: Usando snapshot recente (${snapshotAge.toFixed(2)} horas).`)
            // Retorna diretamente os dados do snapshot, que já estão no formato correto
            return snapshot.snapshot_data
          }
          console.log(`⚠️ Snapshot encontrado, mas está antigo (${snapshotAge.toFixed(2)} horas). Prosseguindo para recálculo.`)
        }
      } catch (snapshotError) {
        if (snapshotError.code !== 'PGRST116') { // Ignora erro 'not found'
          console.warn(`Erro ao buscar snapshot, prosseguindo para recálculo:`, snapshotError.message)
        }
      }

      // 2. SE NÃO HÁ SNAPSHOT VÁLIDO, CALCULAR AO VIVO (SLOW PATH)
      console.log(`� Slow Path: Calculando contexto ao vivo para o usuário.`)
      
      // Dispara a atualização do snapshot em background, sem esperar o resultado.
      this.supabase.functions.invoke('calculate-snapshot', { body: {} }).then(({ error }) => {
        if (error) console.error('Erro ao invocar atualização de snapshot em background:', error)
        else console.log('🚀 Atualização de snapshot iniciada em background.')
      })

      // O restante da função continua como antes, para servir a requisição atual
      const usdBrlRate = await this.getUSDToBRLRate()
      const { data: overviewData } = await this.supabase.rpc('get_portfolio_overview', { p_user_id: userId, p_reference_date: new Date().toISOString().split('T')[0] })
      const { data: investmentsData } = await this.supabase.rpc('get_investments_by_user_id', { p_user_id: userId, p_reference_date: new Date().toISOString().split('T')[0] })
      
      const overview = overviewData?.[0] || {}
      const investments = investmentsData || []

      const { breakdown, totalValueBRL } = await this.processPortfolioData(investments, usdBrlRate)

      const liveData = {
        portfolio_stats: {
          ...overview,
          total_value_brl: totalValueBRL,
          last_updated: new Date().toISOString(),
        },
        portfolio_breakdown: breakdown,
        usd_brl_rate: usdBrlRate,
        raw_data_count: investments.length,
        version: '2.0-live' // Indica que foi gerado ao vivo
      }

      return liveData

    } catch (error) {
      console.error('User context critical error:', error)
      return {
        portfolio_stats: {
          total_invested: 0,
          current_value: 0,
          profit_loss: 0,
          profit_percentage: 0,
          yield_total: 0,
          total_positions: 0,
          last_updated: new Date().toISOString(),
          error: 'Failed to load portfolio data'
        },
        portfolio_breakdown: { by_ticker: [], by_asset_class: {} },
        usd_brl_rate: 5.30,
        raw_data_count: 0
      }
    }
  }

  /**
   * 💱 OBTER COTAÇÃO USD/BRL ATUAL
   */
  private async getUSDToBRLRate(): Promise<number> {
    const fallbackRate = 5.30 // Centralizado para fácil manutenção
    
    // 1. Tentar buscar cotação do cache local
    try {
      const { data: cachedRate } = await this.supabase
        .from('currency_rates')
        .select('rate, updated_at')
        .eq('pair', 'USDBRL')
        .gte('updated_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()) // Cache de 4 horas
        .single()

      if (cachedRate?.rate) {
        console.log(`� Using cached USD/BRL rate: ${cachedRate.rate}`)
        return parseFloat(cachedRate.rate)
      }
    } catch (cacheError) {
      // Apenas um aviso, a falha no cache é esperada e normal.
      console.log('Cache miss or error for USD/BRL rate, proceeding to API call.')
    }

    // 2. Buscar cotação da API v6 como fonte primária
    try {
      const apiKey = Deno.env.get("EXCHANGERATE_API_KEY")
      if (!apiKey) {
        throw new Error('Secret EXCHANGERATE_API_KEY not found in Supabase environment.')
      }

      const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) }) // Timeout de 5s

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`API request failed with status ${response.status}: ${errorBody}`)
      }

      const data = await response.json()
      if (data.result !== 'success') {
        throw new Error(`API returned an error: ${data['error-type'] || 'Unknown error'}`)
      }

      const rate = data.conversion_rates?.BRL
      if (typeof rate !== 'number') {
        throw new Error(`Invalid or missing BRL rate in API response: ${JSON.stringify(data)}`)
      }

      // Sucesso! Salvar no cache para futuras requisições.
      await this.supabase.from('currency_rates').upsert({
        pair: 'USDBRL',
        rate: rate.toString(),
        updated_at: new Date().toISOString()
      })
      
      console.log(`💱 Fetched and cached new USD/BRL rate via v6 API: ${rate}`)
      return rate

    } catch (apiError) {
      console.error('CRITICAL: Could not fetch live USD/BRL rate. Using fallback.', apiError)
      return fallbackRate
    }
  }

  private async processPortfolioData(overview: any, investments: any[], usdBrlRate: number = 5.30) {
    try {
      console.log(`💰 DEBUG: Processando ${investments.length} investimentos com taxa USD/BRL: ${usdBrlRate}`)
      
      if (!investments || investments.length === 0) {
        console.warn('No investments to process')
        return {
          stats: {
            total_invested: 0,
            current_value: 0,
            profit_loss: 0,
            profit_percentage: 0,
            yield_total: 0,
            total_positions: 0,
            last_updated: new Date().toISOString(),
            usd_brl_rate: usdBrlRate,
            us_stocks_count: 0
          },
          breakdown: {
            by_ticker: [],
            by_asset_class: {},
            top_performers: [],
            worst_performers: []
          }
        }
      }

      // ✅ BREAKDOWN DETALHADO POR TICKER COM CONVERSÃO DE MOEDA
      const processedTickers = investments.map(inv => {
        try {
          // 🇺🇸 DETECTAR AÇÕES AMERICANAS
          const isUSStock = this.isUSStock(inv.ticker || '')
          const conversionRate = isUSStock ? usdBrlRate : 1
          
          // 💰 VALORES CONVERTIDOS PARA BRL (com proteção contra null/undefined)
          const currentPriceBRL = (parseFloat(inv.currentPrice || '0') || 0) * conversionRate
          const averagePriceBRL = (parseFloat(inv.averagePrice || '0') || 0) * conversionRate
          const currentValueBRL = (parseFloat(inv.currentValue || '0') || 0) * conversionRate
          const totalInvestedBRL = (parseFloat(inv.totalInvested || '0') || 0) * conversionRate
          const potentialProfitLossBRL = (parseFloat(inv.potentialProfitLoss || '0') || 0) * conversionRate
          
          console.log(`💱 ${inv.ticker} (${isUSStock ? 'US' : 'BR'}): R$ ${currentValueBRL.toFixed(2)} | Rate: ${conversionRate}`)
          
          return {
            ticker: inv.ticker || 'UNKNOWN',
            is_us_stock: isUSStock,
            conversion_rate: conversionRate,
            current_position: parseFloat(inv.currentPosition || '0') || 0,
            average_price: averagePriceBRL,
            total_invested: totalInvestedBRL,
            current_price: currentPriceBRL,
            current_value: currentValueBRL,
            profit_loss: potentialProfitLossBRL,
            profit_loss_pct: parseFloat(inv.potentialProfitLossPct || '0') || 0,
            total_dividends: (parseFloat(inv.totalDividends || '0') || 0) * conversionRate,
            total_juros: (parseFloat(inv.totalJuros || '0') || 0) * conversionRate,
            asset_class: this.classifyAsset(inv.ticker || ''),
            transactions_count: inv.investments?.length || 0
          }
        } catch (tickerError) {
          console.error(`Error processing ticker ${inv.ticker}:`, tickerError)
          return {
            ticker: inv.ticker || 'ERROR',
            is_us_stock: false,
            conversion_rate: 1,
            current_position: 0,
            average_price: 0,
            total_invested: 0,
            current_price: 0,
            current_value: 0,
            profit_loss: 0,
            profit_loss_pct: 0,
            total_dividends: 0,
            total_juros: 0,
            asset_class: 'Erro',
            transactions_count: 0
          }
        }
      })

      // ✅ AGRUPAMENTO POR CLASSE DE ATIVO
      const assetClassGroups = this.groupByAssetClass(processedTickers)

      // ✅ TOP E WORST PERFORMERS
      const topPerformers = processedTickers
        .filter(inv => inv.profit_loss_pct > 0)
        .sort((a, b) => b.profit_loss_pct - a.profit_loss_pct)
        .slice(0, 5)
        .map(inv => ({
          ticker: inv.ticker,
          profit_pct: inv.profit_loss_pct,
          profit_value: inv.profit_loss,
          is_us_stock: inv.is_us_stock
        }))

      const worstPerformers = processedTickers
        .filter(inv => inv.profit_loss_pct < 0)
        .sort((a, b) => a.profit_loss_pct - b.profit_loss_pct)
        .slice(0, 5)
        .map(inv => ({
          ticker: inv.ticker,
          profit_pct: inv.profit_loss_pct,
          profit_value: inv.profit_loss,
          is_us_stock: inv.is_us_stock
        }))

      // ✅ ESTATÍSTICAS CONSOLIDADAS
      const totalInvested = processedTickers.reduce((sum, inv) => sum + inv.total_invested, 0)
      const currentValue = processedTickers.reduce((sum, inv) => sum + inv.current_value, 0)
      const profitLoss = processedTickers.reduce((sum, inv) => sum + inv.profit_loss, 0)
      const yieldTotal = processedTickers.reduce((sum, inv) => sum + inv.total_dividends + inv.total_juros, 0)
      const usStocksCount = processedTickers.filter(inv => inv.is_us_stock).length

      const stats = {
        total_invested: totalInvested,
        current_value: currentValue,
        profit_loss: profitLoss,
        profit_percentage: totalInvested > 0 ? (profitLoss / totalInvested * 100) : 0,
        yield_total: yieldTotal,
        total_positions: processedTickers.length,
        last_updated: new Date().toISOString(),
        usd_brl_rate: usdBrlRate,
        us_stocks_count: usStocksCount
      }

      const breakdown = {
        by_ticker: processedTickers,
        by_asset_class: assetClassGroups,
        top_performers: topPerformers,
        worst_performers: worstPerformers
      }

      console.log(`✅ PORTFOLIO PROCESSADO: Total: R$ ${currentValue.toFixed(2)} | P&L: R$ ${profitLoss.toFixed(2)} (${stats.profit_percentage.toFixed(2)}%)`)

      return { stats, breakdown }
    } catch (error) {
      console.error('Error processing portfolio data:', error)
      return {
        stats: {
          total_invested: 0,
          current_value: 0,
          profit_loss: 0,
          profit_percentage: 0,
          yield_total: 0,
          total_positions: 0,
          last_updated: new Date().toISOString(),
          usd_brl_rate: usdBrlRate,
          us_stocks_count: 0,
          error: 'Processing failed'
        },
        breakdown: {
          by_ticker: [],
          by_asset_class: {},
          top_performers: [],
          worst_performers: []
        }
      }
    }
  }

  /**
   * 🇺🇸 DETECTAR AÇÕES AMERICANAS
   */
  private isUSStock(ticker: string): boolean {
    if (!ticker || typeof ticker !== 'string') return false
    
    // Padrões brasileiros (se tem estes padrões, NÃO é americano)
    const brPatterns = [
      /[34]$/, // Ações brasileiras terminam em 3 ou 4
      /11$/, // FIIs brasileiros terminam em 11
      /^TESOURO/i, // Tesouro Direto
    ]

    // Se é claramente brasileiro, não é US
    if (brPatterns.some(pattern => pattern.test(ticker))) {
      return false
    }

    // Padrões americanos
    const usPatterns = [
      /^[A-Z]{1,5}$/, // AAPL, TSLA, NVDA, GOOGL, etc
    ]

    // Se segue padrão americano E não é brasileiro, é US
    return usPatterns.some(pattern => pattern.test(ticker))
  }

  private classifyAsset(ticker: string): string {
    if (!ticker || typeof ticker !== 'string') return 'Outros'
    
    if (ticker.match(/^TESOURO/i)) return 'Tesouro Direto'
    if (ticker.match(/11$/)) return 'FII'
    if (ticker.match(/[34]$/)) return 'Ação BR'
    if (this.isUSStock(ticker)) return 'Ação US'
    return 'Outros'
  }

  private groupByAssetClass(processedTickers: any[]) {
    try {
      const groups = processedTickers.reduce((acc, inv) => {
        const assetClass = inv.asset_class
        
        if (!acc[assetClass]) {
          acc[assetClass] = {
            total_invested: 0,
            current_value: 0,
            profit_loss: 0,
            count: 0,
            tickers: []
          }
        }
        
        acc[assetClass].total_invested += inv.total_invested
        acc[assetClass].current_value += inv.current_value
        acc[assetClass].profit_loss += inv.profit_loss
        acc[assetClass].count += 1
        acc[assetClass].tickers.push(inv.ticker)
        
        return acc
      }, {} as Record<string, any>)

      // Calcular percentuais
      Object.keys(groups).forEach(assetClass => {
        const group = groups[assetClass]
        group.profit_percentage = group.total_invested > 0 
          ? (group.profit_loss / group.total_invested * 100) 
          : 0
      })

      return groups
    } catch (error) {
      console.error('Error grouping by asset class:', error)
      return {}
    }
  }

  private async getMarketData() {
    try {
      const { data } = await this.supabase
        .from('market_data_cache')
        .select('*')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false })
        .limit(5)
      return data || []
    } catch (error) {
      console.warn('Market data not available:', error)
      return []
    }
  }

  /**
   * 💬 RESPOSTA INTELIGENTE PRINCIPAL
   * Sistema: Contextual + RAG + Tempo Real
   */
  async answerQuery(request: CognitiveRequest): Promise<{
    response: string
    confidence: number
    sources: string[]
    suggestions: string[]
    used_thinking?: boolean
  }> {
    try {
      // ✅ PROCESSAR DIFERENTES FORMATOS DE INPUT
      let query: string
      let userId: string

      if (request.action) {
        // Formato: { action: "explain_chart", payload: {...}, userId: "..." }
        userId = request.userId || request.user_id || ''
        
        switch (request.action) {
          case 'explain_chart':
            query = `Analise e explique os dados do gráfico de investimentos. ${request.payload ? `Dados adicionais: ${JSON.stringify(request.payload)}` : ''}`
            break
          default:
            query = `Processando ação: ${request.action}`
        }
      } else {
        // Formato tradicional: { query: "...", user_id: "..." }
        query = request.query || ''
        userId = request.user_id || ''
      }

      // Validação de entrada
      if (!query || !userId) {
        throw new Error('Missing required fields: query/action and user_id/userId')
      }

      // 1. Gerar embedding da query (com fallback)
      const queryEmbedding = await this.embeddings.embed(query, "RETRIEVAL_QUERY")

      // 2. Busca híbrida avançada
      const context = await this.hybridSearch(queryEmbedding, query, '4362da88-d01c-4ffe-a447-75751ea8e182')

      // 3. Construir contexto enriquecido
      const enrichedContext = this.buildEnrichedContext(context, request)

      // 4. Determinar se precisa de análise profunda (thinking model)
      const requiresDeepAnalysis = this.shouldUseThinking(query, context)
      
      // 5. Síntese com Qwen3-235B (normal ou thinking)
      const messages: QwenMessage[] = [
        {
          role: 'system',
          content: `# ERASMO INVEST - CONSULTOR FINANCEIRO IA SÊNIOR

## IDENTIDADE
Você é Erasmo, um consultor financeiro brasileiro expert com 20+ anos de experiência em:
- Mercado de ações brasileiro (B3)
- Fundos imobiliários (FIIs)
- Tesouro Direto
- Renda fixa e variável
- Análise técnica e fundamentalista

## CONTEXTO ATUAL
Data: ${new Date().toLocaleDateString('pt-BR')}
Horário: ${new Date().toLocaleTimeString('pt-BR')}

## MODO DE ANÁLISE
${requiresDeepAnalysis ? '🧠 MODO THINKING ATIVO - Análise profunda habilitada' : '⚡ MODO RÁPIDO - Resposta direta'}

## INSTRUÇÕES CRÍTICAS
1. SEMPRE cite fontes específicas dos dados fornecidos
2. Use linguagem brasileira natural e acessível
3. Seja preciso com números, datas e percentuais
4. Inclua disclaimers quando apropriado
5. Sugira próximos passos práticos
6. Contextualize com cenário macroeconômico atual
${requiresDeepAnalysis ? `
7. 🧠 RACIOCÍNIO PROFUNDO: Pense passo a passo, considere múltiplas variáveis
8. 🔍 ANÁLISE MULTIDIMENSIONAL: Avalie riscos, oportunidades, cenários
9. 📊 FUNDAMENTAÇÃO TÉCNICA: Base suas conclusões em dados sólidos` : ''}

## DADOS DISPONÍVEIS
${enrichedContext}`
        },
        ...(request.conversation_history || []),
        {
          role: 'user',
          content: query
        }
      ]

      const completion = requiresDeepAnalysis 
        ? await this.qwen.deepAnalysis(messages, this.getAnalysisType(query))
        : await this.qwen.complete(messages, {
            temperature: 0.75,
            max_tokens: 3000
          })

      const response = completion.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua solicitação no momento."

      // 5. Análise de confiança e extração de fontes
      const analysis = await this.analyzeResponse(response, context)

      // 6. Salvar interação para aprendizado
      await this.saveInteraction(request, response, analysis)

      return {
        response,
        confidence: analysis.confidence,
        sources: analysis.sources,
        suggestions: analysis.suggestions,
        used_thinking: requiresDeepAnalysis
      }

    } catch (error) {
      console.error('Cognitive Core Error:', error)
      return {
        response: "Desculpe, ocorreu um erro interno. Por favor, tente novamente em alguns instantes. Se o problema persistir, entre em contato com o suporte.",
        confidence: 0,
        sources: [],
        suggestions: ["Tente reformular sua pergunta", "Verifique sua conexão", "Contate o suporte se o problema persistir"],
        used_thinking: false
      }
    }
  }

  /**
   * 🧠 DETERMINAR SE PRECISA THINKING MODEL - VERSÃO AVANÇADA
   */
  private shouldUseThinking(query: string, context: any): boolean {
    const complexAnalysisKeywords = [
      'análise', 'analise', 'avalie', 'compare', 'estratégia', 'recomende',
      'otimize', 'diversifique', 'risco', 'cenário', 'projeção',
      'performance', 'rentabilidade', 'volatilidade', 'correlação',
      'rebalancear', 'alocar', 'timing', 'múltiplos', 'valuation',
      'explain_chart', 'explicar', 'detalhado', 'profundo'
    ]

    const portfolioAnalysisKeywords = [
      'carteira', 'portfolio', 'posições', 'alocação', 'diversificação'
    ]

    const marketAnalysisKeywords = [
      'mercado', 'economia', 'macro', 'cenário', 'tendência'
    ]

    const hasComplexKeywords = complexAnalysisKeywords.some(keyword => 
      query.toLowerCase().includes(keyword)
    )
    
    const hasPortfolioAnalysis = portfolioAnalysisKeywords.some(keyword =>
      query.toLowerCase().includes(keyword)
    )
    
    const hasMarketAnalysis = marketAnalysisKeywords.some(keyword =>
      query.toLowerCase().includes(keyword)
    ) && query.length > 30

    const hasLargePortfolio = context.user_context?.portfolio_stats?.total_positions > 10
    const hasHighValue = context.user_context?.portfolio_stats?.current_value > 100000
    const isChartExplanation = query.includes('gráfico') || query.includes('chart')
    const isLongQuery = query.length > 80

    const shouldUse = (
      (hasPortfolioAnalysis && hasLargePortfolio) ||
      (hasMarketAnalysis && isLongQuery) ||
      isChartExplanation ||
      (hasComplexKeywords && hasHighValue) ||
      (isLongQuery && hasComplexKeywords)
    )

    console.log(`🧠 Thinking decision: ${shouldUse} | Keywords: ${hasComplexKeywords} | Portfolio: ${hasPortfolioAnalysis} | Chart: ${isChartExplanation} | Long: ${isLongQuery}`)
    
    return shouldUse
  }

  private getAnalysisType(query: string): 'portfolio' | 'market' | 'risk' | 'strategy' {
    if (query.includes('carteira') || query.includes('portfolio')) return 'portfolio'
    if (query.includes('risco') || query.includes('volatil')) return 'risk'
    if (query.includes('estratégia') || query.includes('recomend')) return 'strategy'
    return 'market'
  }

  /**
   * 📊 CONSTRUIR CONTEXTO ENRIQUECIDO COM DADOS PROFISSIONAIS
   */
  private buildEnrichedContext(context: any, request: CognitiveRequest): string {
    const sections = []

    // ✅ OVERVIEW COMPLETO DO PORTFÓLIO (DADOS REAIS DO SISTEMA SQL COM CONVERSÃO USD)
    if (context.user_context?.portfolio_stats) {
      const stats = context.user_context.portfolio_stats
      const usdRate = context.user_context.usd_brl_rate || 5.30
      
      sections.push(`## 📊 VISÃO GERAL DO PORTFÓLIO (DADOS OFICIAIS + CONVERSÃO USD/BRL)
**Valor Total Investido**: R$ ${stats.total_invested.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
**Valor Atual**: R$ ${stats.current_value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
**Lucro/Prejuízo**: R$ ${stats.profit_loss.toLocaleString('pt-BR', {minimumFractionDigits: 2})} (${stats.profit_percentage.toFixed(2)}%)
**Dividendos/Juros Recebidos**: R$ ${stats.yield_total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
**Total de Posições**: ${stats.total_positions} (${stats.us_stocks_count || 0} ações US)
**Taxa USD/BRL**: ${usdRate.toFixed(4)}
**Última Atualização**: ${new Date(stats.last_updated).toLocaleString('pt-BR')}`)
    }

    // ✅ BREAKDOWN POR CLASSE DE ATIVO
    if (context.user_context?.portfolio_breakdown?.by_asset_class) {
      const assetClasses = context.user_context.portfolio_breakdown.by_asset_class
      
      sections.push(`## 🏛️ DIVERSIFICAÇÃO POR CLASSE DE ATIVO
${Object.entries(assetClasses).map(([assetClass, data]: [string, any]) => 
  `**${assetClass}**: ${data.count} posições | R$ ${data.current_value.toLocaleString('pt-BR')} | ${data.profit_percentage.toFixed(2)}%`
).join('\n')}`)
    }

    // ✅ TOP 5 MELHORES E PIORES PERFORMANCES
    if (context.user_context?.portfolio_breakdown) {
      const { top_performers, worst_performers } = context.user_context.portfolio_breakdown
      
      if (top_performers?.length > 0) {
        sections.push(`## 🚀 TOP 5 MELHORES PERFORMANCES
${top_performers.map((perf: any) => 
  `- ${perf.ticker}: +${perf.profit_pct.toFixed(2)}% (R$ ${perf.profit_value.toLocaleString('pt-BR')})`
).join('\n')}`)
      }
      
      if (worst_performers?.length > 0) {
        sections.push(`## 📉 TOP 5 PIORES PERFORMANCES
${worst_performers.map((perf: any) => 
  `- ${perf.ticker}: ${perf.profit_pct.toFixed(2)}% (R$ ${perf.profit_value.toLocaleString('pt-BR')})`
).join('\n')}`)
      }
    }

    // ✅ DETALHES DE INVESTIMENTOS ESPECÍFICOS COM IDENTIFICAÇÃO DE MOEDA
    if (context.user_context?.portfolio_breakdown?.by_ticker?.length > 0) {
      const topInvestments = context.user_context.portfolio_breakdown.by_ticker
        .sort((a: any, b: any) => b.current_value - a.current_value)
        .slice(0, 10)
      
      sections.push(`## 💼 TOP 10 MAIORES POSIÇÕES (VALORES EM BRL)
${topInvestments.map((inv: any) => {
        const flag = inv.is_us_stock ? '🇺🇸' : '🇧🇷'
        const rateInfo = inv.is_us_stock ? ` (USD→BRL: ${inv.conversion_rate.toFixed(4)})` : ''
        return `- ${flag} **${inv.ticker}**: R$ ${inv.current_value.toLocaleString('pt-BR')} | PM: R$ ${inv.average_price.toFixed(2)} | ${inv.profit_loss_pct >= 0 ? '+' : ''}${inv.profit_loss_pct.toFixed(2)}%${rateInfo}`
      }).join('\n')}`)
    }

    // ✅ DADOS DE MERCADO (se disponível)
    if (context.market_data?.length > 0) {
      sections.push(`## 📈 DADOS DE MERCADO RECENTES
${context.market_data.map((data: any) => 
  `- ${data.symbol}: R$ ${data.price} (${data.change_percent >= 0 ? '+' : ''}${data.change_percent}%) - ${data.timestamp}`
).join('\n')}`)
    }

    // ✅ INFORMAÇÕES SEMÂNTICAS RELEVANTES
    if (context.semantic_results?.length > 0) {
      sections.push(`## 🔍 INFORMAÇÕES RELEVANTES ENCONTRADAS
${context.semantic_results.map((result: any) => 
  `- ${result.title}: ${result.content} (Relevância: ${(result.similarity * 100 || 0).toFixed(1)}%)`
).join('\n')}`)
    }

    return sections.join('\n\n') || "Contexto do portfólio carregado com sucesso."
  }

  /**
   * 🎯 ANÁLISE DE RESPOSTA
   */
  private async analyzeResponse(response: string, context: any): Promise<{
    confidence: number
    sources: string[]
    suggestions: string[]
  }> {
    // Análise simples de confiança baseada em contexto
    let confidence = 0.7

    if (context.semantic_results?.length > 0) confidence += 0.1
    if (context.market_data?.length > 0) confidence += 0.1
    if (context.user_context?.portfolio_stats) confidence += 0.1

    // Extrair fontes mencionadas
    const sources = [
      ...new Set([
        ...(context.semantic_results?.map((r: any) => r.source) || []),
        ...(context.market_data?.map((m: any) => m.source) || [])
      ])
    ].filter(Boolean)

    // Sugestões baseadas no contexto
    const suggestions = [
      "Ver análise detalhada do ativo",
      "Comparar com outros investimentos",
      "Verificar indicadores técnicos",
      "Analisar histórico de dividendos"
    ]

    return { confidence, sources, suggestions }
  }

  /**
   * 💾 SALVAR INTERAÇÃO
   */
  private async saveInteraction(request: CognitiveRequest | { query: string, user_id: string }, response: string, analysis: any) {
    try {
      const userId = 'user_id' in request ? request.user_id : request.userId || ''
      const query = 'query' in request ? request.query : `Action: ${request.action || 'unknown'}`
      
      await this.supabase.from('cognitive_interactions').insert({
        user_id: userId,
        query,
        response,
        confidence: analysis.confidence,
        sources: analysis.sources,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to save interaction:', error)
    }
  }
}

/**
 * 🚀 HANDLER PRINCIPAL
 */
serve(async (req) => {
  // CORS Headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const cognitiveCore = new CognitiveCore()
    const request: CognitiveRequest = await req.json()

    // ✅ VALIDAÇÃO FLEXÍVEL
    const hasQuery = request.query && request.user_id
    const hasAction = request.action && (request.userId || request.user_id)
    
    if (!hasQuery && !hasAction) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields. Use either: {query, user_id} or {action, userId/user_id}' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Usar user_id correto do sistema
    const fixedUserId = '4362da88-d01c-4ffe-a447-75751ea8e182'

    const result = await cognitiveCore.answerQuery({ ...request, user_id: fixedUserId })

    return new Response(JSON.stringify({
      success: true,
      data: result,
      model: result.used_thinking ? "qwen/qwen3-235b-a22b-thinking-2507" : "qwen/qwen3-235b-a22b-2507:free",
      cost: "FREE",
      analysis_mode: result.used_thinking ? "DEEP_THINKING" : "STANDARD",
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error('Cognitive Core Handler Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})