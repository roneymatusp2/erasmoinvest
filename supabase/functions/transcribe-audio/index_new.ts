/**
 * 🎤 TRANSCRIBE-AUDIO - Transcrição de Áudio Financeiro
 * Modelo: Voxtral Small (24B) - ÚNICO SERVIÇO PAGO
 * Custo: $0.001/minuto vs. OpenAI Whisper $0.006/minuto (83% economia)
 * Especialidade: Português brasileiro + Correção automática de tickers
 * Status: IMPLEMENTAÇÃO COMPLETA JULHO 2025
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface TranscriptionRequest {
  audio_data: string // Base64 encoded audio
  user_id: string
  format?: 'webm' | 'mp3' | 'wav' | 'ogg'
  language?: string
  context?: 'financial' | 'general'
  enhance_tickers?: boolean
}

interface TranscriptionResult {
  transcript: string
  confidence: number
  duration_seconds: number
  detected_language: string
  enhanced_tickers: string[]
  estimated_cost: number
}

/**
 * 💰 VOXTRAL CLIENT - ÚNICO SERVIÇO PAGO OTIMIZADO
 * Performance: 25% melhor que OpenAI Whisper
 * Custo: 83% menor ($0.001/min vs. $0.006/min)
 * Especialidade: Multilingual + Baixa latência
 */
class VoxtralClient {
  private apiKey: string
  private baseUrl: string = "https://api.mistral.ai/v1"

  constructor() {
    this.apiKey = Deno.env.get("ErasmoInvest_API_MISTRAL")!
    if (!this.apiKey) {
      throw new Error("ErasmoInvest_API_MISTRAL environment variable required")
    }
  }

  async transcribe(audioData: string, options: {
    format?: string
    language?: string
    response_format?: string
    temperature?: number
  } = {}): Promise<any> {
    // Converter base64 para blob
    const audioBytes = this.base64ToUint8Array(audioData)
    
    const formData = new FormData()
    formData.append('file', new Blob([audioBytes], { 
      type: `audio/${options.format || 'webm'}` 
    }), `audio.${options.format || 'webm'}`)
    
    formData.append('model', 'voxtral-small-latest')
    formData.append('language', options.language || 'pt')
    formData.append('response_format', options.response_format || 'verbose_json')
    
    if (options.temperature !== undefined) {
      formData.append('temperature', options.temperature.toString())
    }

    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Voxtral API Error: ${response.status} - ${error}`)
    }

    return await response.json()
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    // Remove data URL prefix if present
    const cleanBase64 = base64.replace(/^data:audio\/[^;]+;base64,/, '')
    const binaryString = atob(cleanBase64)
    const bytes = new Uint8Array(binaryString.length)
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    return bytes
  }
}

/**
 * 📈 FINANCIAL TICKER ENHANCER
 * Corretor automático de tickers financeiros brasileiros
 * Exemplos: "HGLG 11" → "HGLG11", "Petrobras 4" → "PETR4"
 */
class FinancialTickerEnhancer {
  private tickerPatterns: Map<string, string>
  private supabase: any

  constructor(supabase: any) {
    this.supabase = supabase
    this.initializePatterns()
  }

  private initializePatterns() {
    // Padrões comuns de correção de tickers
    this.tickerPatterns = new Map([
      // FIIs - Espaço entre código e número
      ['([A-Z]{4,6})\\s+(\\d{1,2})', '$1$2'],
      
      // Ações - Variações comuns
      ['petrobras\\s*4', 'PETR4'],
      ['petrobras\\s*3', 'PETR3'], 
      ['vale\\s*3', 'VALE3'],
      ['itau\\s*4', 'ITUB4'],
      ['banco\\s+do\\s+brasil', 'BBAS3'],
      ['bradesco\\s*4', 'BBDC4'],
      ['magazine\\s+luiza', 'MGLU3'],
      ['via\\s+varejo', 'VIIA3'],
      
      // FIIs populares
      ['hash\\s*11', 'HGLG11'],
      ['btg\\s*pactual\\s*11', 'BTLG11'],
      ['xp\\s*malls', 'XPML11'],
      ['bb\\s*seguros', 'BBSE3'],
      
      // Tesouro Direto
      ['tesouro\\s+selic', 'TESOURO_SELIC'],
      ['tesouro\\s+prefixado', 'TESOURO_PREFIXADO'],
      ['tesouro\\s+ipca', 'TESOURO_IPCA'],
      
      // ETFs
      ['small\\s+cap', 'SMAL11'],
      ['bovespa', 'BOVA11'],
      ['ifix', 'IFIX11']
    ])
  }

  async enhanceTranscript(transcript: string): Promise<{
    enhanced_transcript: string
    detected_tickers: string[]
    corrections_made: number
  }> {
    let enhanced = transcript.toLowerCase()
    const detectedTickers: Set<string> = new Set()
    let correctionsMade = 0

    // Aplicar padrões de correção
    for (const [pattern, replacement] of this.tickerPatterns) {
      const regex = new RegExp(pattern, 'gi')
      const matches = enhanced.match(regex)
      
      if (matches) {
        enhanced = enhanced.replace(regex, replacement)
        correctionsMade += matches.length
        
        // Extrair ticker resultante
        const tickerMatch = replacement.match(/[A-Z]{4,6}\d{0,2}/)
        if (tickerMatch) {
          detectedTickers.add(tickerMatch[0])
        }
      }
    }

    // Buscar tickers no banco de dados para validação
    const validatedTickers = await this.validateTickers(Array.from(detectedTickers))

    return {
      enhanced_transcript: enhanced,
      detected_tickers: validatedTickers,
      corrections_made: correctionsMade
    }
  }

  private async validateTickers(tickers: string[]): Promise<string[]> {
    if (tickers.length === 0) return []

    try {
      const { data: validTickers } = await this.supabase
        .from('market_tickers')
        .select('symbol')
        .in('symbol', tickers)

      return validTickers?.map((t: any) => t.symbol) || []
    } catch (error) {
      console.error('Error validating tickers:', error)
      return tickers // Retorna os tickers não validados em caso de erro
    }
  }
}

/**
 * 🎯 AUDIO TRANSCRIBER - PROCESSADOR PRINCIPAL
 * Integração: Voxtral + Enhancement + Validação + Cache
 */
class AudioTranscriber {
  private voxtral: VoxtralClient
  private enhancer: FinancialTickerEnhancer
  private supabase: any

  constructor() {
    this.voxtral = new VoxtralClient()
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    this.supabase = createClient(supabaseUrl, supabaseKey)
    
    this.enhancer = new FinancialTickerEnhancer(this.supabase)
  }

  /**
   * 🎤 TRANSCREVER ÁUDIO PRINCIPAL
   */
  async transcribeAudio(request: TranscriptionRequest): Promise<TranscriptionResult> {
    const startTime = Date.now()

    try {
      // 1. Verificar cache (opcional - para áudios recorrentes)
      const cacheKey = await this.generateCacheKey(request.audio_data)
      const cached = await this.getCachedTranscription(cacheKey)
      
      if (cached) {
        console.log('Cache hit for transcription')
        return {
          ...cached,
          estimated_cost: 0 // Cache não tem custo
        }
      }

      // 2. Transcrever com Voxtral
      const transcriptionOptions = {
        format: request.format || 'webm',
        language: request.language || 'pt',
        response_format: 'verbose_json',
        temperature: 0.1 // Baixa temperatura para mais precisão
      }

      const voxtralResult = await this.voxtral.transcribe(
        request.audio_data,
        transcriptionOptions
      )

      // 3. Processar resultado base
      const baseTranscript = voxtralResult.text || ''
      const duration = voxtralResult.duration || 0
      const confidence = this.calculateConfidence(voxtralResult)

      // 4. Melhorar tickers financeiros se solicitado
      let enhancedTranscript = baseTranscript
      let detectedTickers: string[] = []

      if (request.enhance_tickers !== false && request.context === 'financial') {
        const enhancement = await this.enhancer.enhanceTranscript(baseTranscript)
        enhancedTranscript = enhancement.enhanced_transcript
        detectedTickers = enhancement.detected_tickers
      }

      // 5. Calcular custo
      const estimatedCost = this.calculateCost(duration)

      // 6. Resultado final
      const result: TranscriptionResult = {
        transcript: enhancedTranscript,
        confidence,
        duration_seconds: duration,
        detected_language: voxtralResult.language || 'pt',
        enhanced_tickers: detectedTickers,
        estimated_cost: estimatedCost
      }

      // 7. Salvar no cache e histórico
      await Promise.all([
        this.cacheTranscription(cacheKey, result),
        this.saveTranscriptionHistory(request, result, Date.now() - startTime)
      ])

      return result

    } catch (error) {
      console.error('Transcription error:', error)
      
      // Fallback para erro
      await this.saveErrorHistory(request, error.message)
      
      throw new Error(`Falha na transcrição: ${error.message}`)
    }
  }

  /**
   * 📊 CALCULAR CONFIANÇA
   */
  private calculateConfidence(voxtralResult: any): number {
    // Voxtral não retorna confidence score diretamente
    // Estimamos baseado em outros fatores
    let confidence = 0.8 // Base

    // Ajustar baseado na duração (áudios muito curtos ou longos são menos confiáveis)
    const duration = voxtralResult.duration || 0
    if (duration > 1 && duration < 30) {
      confidence += 0.1
    } else if (duration > 60) {
      confidence -= 0.1
    }

    // Ajustar baseado na presença de segmentos
    if (voxtralResult.segments && voxtralResult.segments.length > 0) {
      confidence += 0.05
    }

    return Math.min(Math.max(confidence, 0), 1)
  }

  /**
   * 💰 CALCULAR CUSTO
   */
  private calculateCost(durationSeconds: number): number {
    const minutes = durationSeconds / 60
    const costPerMinute = 0.001 // $0.001/minuto Voxtral vs. $0.006 OpenAI
    return Math.max(minutes * costPerMinute, 0.001) // Mínimo $0.001
  }

  /**
   * 🔑 GERAR CHAVE DE CACHE
   */
  private async generateCacheKey(audioData: string): Promise<string> {
    // Hash simples do áudio para cache
    const encoder = new TextEncoder()
    const data = encoder.encode(audioData.substring(0, 1000)) // Primeiros 1000 chars
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * 📥 CACHE DE TRANSCRIÇÕES
   */
  private async getCachedTranscription(cacheKey: string): Promise<TranscriptionResult | null> {
    try {
      const { data } = await this.supabase
        .from('transcription_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // 24h TTL
        .single()

      return data ? {
        transcript: data.transcript,
        confidence: data.confidence,
        duration_seconds: data.duration_seconds,
        detected_language: data.detected_language,
        enhanced_tickers: data.enhanced_tickers || [],
        estimated_cost: data.estimated_cost
      } : null
    } catch {
      return null
    }
  }

  private async cacheTranscription(cacheKey: string, result: TranscriptionResult) {
    try {
      await this.supabase.from('transcription_cache').upsert({
        cache_key: cacheKey,
        transcript: result.transcript,
        confidence: result.confidence,
        duration_seconds: result.duration_seconds,
        detected_language: result.detected_language,
        enhanced_tickers: result.enhanced_tickers,
        estimated_cost: result.estimated_cost,
        created_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to cache transcription:', error)
    }
  }

  /**
   * 📝 SALVAR HISTÓRICO
   */
  private async saveTranscriptionHistory(
    request: TranscriptionRequest, 
    result: TranscriptionResult, 
    processingTimeMs: number
  ) {
    try {
      await this.supabase.from('transcription_history').insert({
        user_id: request.user_id,
        transcript: result.transcript,
        confidence: result.confidence,
        duration_seconds: result.duration_seconds,
        detected_language: result.detected_language,
        enhanced_tickers: result.enhanced_tickers,
        estimated_cost: result.estimated_cost,
        processing_time_ms: processingTimeMs,
        context: request.context,
        model_used: 'voxtral-small-latest',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to save transcription history:', error)
    }
  }

  private async saveErrorHistory(request: TranscriptionRequest, errorMessage: string) {
    try {
      await this.supabase.from('transcription_errors').insert({
        user_id: request.user_id,
        error_message: errorMessage,
        context: request.context,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to save error history:', error)
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
    const transcriber = new AudioTranscriber()
    const request: TranscriptionRequest = await req.json()

    // Validação básica
    if (!request.audio_data || !request.user_id) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Missing required fields: audio_data, user_id' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Definir contexto padrão como financeiro
    if (!request.context) {
      request.context = 'financial'
    }

    const startTime = Date.now()
    const result = await transcriber.transcribeAudio(request)

    return new Response(JSON.stringify({
      success: true,
      data: result,
      model: "voxtral-small-latest",
      cost_usd: result.estimated_cost,
      savings_vs_openai: `${((0.006 - 0.001) / 0.006 * 100).toFixed(1)}%`,
      processing_time_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error('Transcribe Audio Handler Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      model: "voxtral-small-latest",
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