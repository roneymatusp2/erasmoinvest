import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * 🚀 SNAPSHOT CALCULATOR - A "Usina de Dados" Assíncrona V2
 * Esta função é a responsável pelo trabalho pesado. Ela é chamada para pré-calcular
 * e salvar um "snapshot" consolidado do portfólio do usuário.
 * O cognitive-core então apenas lê este resultado, tornando a resposta quase instantânea.
 */
class SnapshotCalculator {
  private supabase: SupabaseClient

  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Chave de serviço para permissões elevadas
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  private async getUSDToBRLRate(): Promise<number> {
    const fallbackRate = 5.30 // Centralizado para fácil manutenção
    try {
      const { data: cachedRate } = await this.supabase
        .from('currency_rates')
        .select('rate, updated_at')
        .eq('pair', 'USDBRL')
        .gte('updated_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()) // Cache de 4 horas
        .single()

      if (cachedRate?.rate) {
        console.log(`💱 Usando cotação Dólar do cache: ${cachedRate.rate}`)
        return parseFloat(cachedRate.rate)
      }
    } catch (cacheError) {
      console.log('Cache de cotação do dólar não encontrado, buscando na API.')
    }

    try {
      // 1) Preferir PTAX oficial via função dedicada
      try {
        const { data, error } = await this.supabase.functions.invoke('bacen-ptax', { body: { action: 'current' } })
        if (!error && data?.data?.usd_brl_rate) {
          const rate = Number(data.data.usd_brl_rate)
          if (rate > 0) {
            await this.supabase.from('currency_rates').upsert({ pair: 'USDBRL', rate: rate.toString(), updated_at: new Date().toISOString() })
            return rate
          }
        }
      } catch (_) {}

      // 2) Fallback para ExchangeRate se PTAX indisponível
      const apiKey = Deno.env.get("EXCHANGERATE_API_KEY")
      if (!apiKey) throw new Error('Secret EXCHANGERATE_API_KEY não encontrada.')
      const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`Falha na API de cotação: ${response.status} - ${errorBody}`)
      }
      const data = await response.json()
      if (data.result !== 'success') throw new Error(`API de cotação retornou erro: ${data['error-type']}`)
      const rate = data.conversion_rates?.BRL
      if (typeof rate !== 'number') throw new Error(`Taxa BRL inválida na resposta da API.`)
      await this.supabase.from('currency_rates').upsert({ pair: 'USDBRL', rate: rate.toString(), updated_at: new Date().toISOString() })
      return rate
    } catch (apiError) {
      console.error('CRÍTICO: Não foi possível buscar a cotação do Dólar. Usando fallback.', apiError)
      return fallbackRate
    }
  }

  /**
   * 🔥🔥🔥 O CORAÇÃO DA USINA DE DADOS 🔥🔥🔥
   * Gera o snapshot completo, processando e convertendo os dados do SQL.
   */
  async generateSnapshot(userId: string) {
    console.log(`🚀 Iniciando geração de snapshot para o usuário: ${userId}`)
    try {
      // 1. Obter todos os dados necessários em paralelo
      const [usdBrlRate, overviewResult, investmentsResult] = await Promise.all([
        this.getUSDToBRLRate(),
        this.supabase.rpc('get_portfolio_overview', { p_user_id: userId }),
        this.supabase.rpc('get_investments_by_user_id', { p_user_id: userId })
      ])

      if (overviewResult.error) throw new Error(`Erro ao buscar overview: ${overviewResult.error.message}`)
      if (investmentsResult.error) throw new Error(`Erro ao buscar investimentos: ${investmentsResult.error.message}`)

      const overview = overviewResult.data?.[0] || {}
      const investments = investmentsResult.data || []

      if (investments.length === 0) {
        console.warn("Nenhum investimento encontrado para gerar snapshot.")
        // Ainda assim, salva um snapshot vazio para consistência
        await this.supabase.from('user_investment_context').upsert({
          user_id: userId,
          snapshot_data: { portfolio_stats: { total_value_brl: 0 }, portfolio_breakdown: { by_ticker: [] } },
          last_updated: new Date().toISOString()
        })
        return { success: true, message: 'Snapshot vazio gerado com sucesso.' }
      }

      // 2. Processar e converter valores para BRL
      let totalValueBRL = 0
      let totalInvestedBRL = 0

      const processedTickers = investments.map(inv => {
        const conversionRate = inv.currency === 'USD' ? usdBrlRate : 1
        const currentValueBRL = (inv.current_value || 0) * conversionRate
        const totalInvestedConv = (inv.total_invested || 0) * conversionRate
        
        totalValueBRL += currentValueBRL
        totalInvestedBRL += totalInvestedConv

        return {
          ...inv,
          current_value_brl: currentValueBRL,
          total_invested_brl: totalInvestedConv,
          profit_loss_brl: currentValueBRL - totalInvestedConv,
          profit_loss_pct: totalInvestedConv > 0 ? ((currentValueBRL - totalInvestedConv) / totalInvestedConv) * 100 : 0,
          conversion_rate: conversionRate
        }
      })

      const profitLossBRL = totalValueBRL - totalInvestedBRL
      const profitPctBRL = totalInvestedBRL > 0 ? (profitLossBRL / totalInvestedBRL) * 100 : 0

      // 3. Montar o objeto final do snapshot
      const snapshotData = {
        portfolio_stats: {
          total_invested_brl: totalInvestedBRL,
          current_value_brl: totalValueBRL,
          profit_loss_brl: profitLossBRL,
          profit_percentage_brl: profitPctBRL,
          yield_total: overview.yield_total || 0,
          total_positions: investments.length,
          last_updated: new Date().toISOString(),
        },
        portfolio_breakdown: {
          by_ticker: processedTickers, // Agora com dados em BRL
        },
        usd_brl_rate: usdBrlRate,
        version: '4.0-SQL-processed-snapshot',
      }

      // 4. Salvar o snapshot no banco de dados
      const { error: upsertError } = await this.supabase
        .from('user_investment_context')
        .upsert({
          user_id: userId,
          snapshot_data: snapshotData,
          last_updated: new Date().toISOString()
        }, { onConflict: 'user_id' })

      if (upsertError) throw new Error(`Erro ao salvar snapshot: ${JSON.stringify(upsertError, null, 2)}`)

      console.log(`✅ Snapshot para ${userId} gerado com sucesso! Valor total: R$ ${totalValueBRL.toFixed(2)}`)
      return { success: true, message: 'Snapshot gerado com sucesso.', data: snapshotData }

    } catch (error) {
      console.error(`ERRO CRÍTICO ao gerar snapshot para ${userId}:`, error)
      return { success: false, message: error.message }
    }
  }
}

serve(async (req) => {
  try {
    // ID fixo do sistema, mas aceita override via query param `user_id` por compatibilidade
    const defaultUserId = '4362da88-d01c-4ffe-a447-75751ea8e182'
    let userId = defaultUserId

    try {
      const url = new URL(req.url)
      const qp = url.searchParams.get('user_id')
      if (qp && qp.length > 0) userId = qp
    } catch (_) {
      // ignora erros de parse da URL
    }

    // Também suporta body JSON opcional { user_id }
    if (req.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await req.json()
        if (typeof body?.user_id === 'string' && body.user_id.length > 0) {
          userId = body.user_id
        }
      } catch (_) {
        // ignore body parse when not provided
      }
    }

    const calculator = new SnapshotCalculator()
    const result = await calculator.generateSnapshot(userId)

    if (!result.success) {
      throw new Error(result.message)
    }

    return new Response(
      JSON.stringify(result),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
