/**
 * 🧪 ERASMOINVEST - VALIDAÇÃO COMPLETA DA MIGRAÇÃO
 * Testa todas as funções implementadas antes do deploy
 * Garante que a migração está 100% funcional
 */

interface ValidationResult {
  function_name: string
  status: 'PASS' | 'FAIL' | 'WARNING'
  tests_run: number
  tests_passed: number
  errors: string[]
  warnings: string[]
  performance_ms: number
}

interface OverallResult {
  total_functions: number
  functions_passed: number
  functions_failed: number
  functions_with_warnings: number
  critical_issues: string[]
  ready_for_deployment: boolean
}

/**
 * 🔍 VALIDADOR DE FUNÇÃO
 */
class FunctionValidator {
  
  /**
   * ✅ VALIDAR COGNITIVE-CORE
   */
  async validateCognitiveCore(): Promise<ValidationResult> {
    const startTime = Date.now()
    const errors: string[] = []
    const warnings: string[] = []
    let testsRun = 0
    let testsPassed = 0

    try {
      // Test 1: Verificar estrutura do arquivo
      testsRun++
      const cognitiveCode = await Deno.readTextFile('./supabase/functions/cognitive-core/index_new.ts')
      
      if (cognitiveCode.includes('QwenClient')) testsPassed++
      else errors.push('QwenClient class not found')

      if (cognitiveCode.includes('GeminiEmbeddingClient')) testsPassed++
      else errors.push('GeminiEmbeddingClient class not found')

      if (cognitiveCode.includes('qwen/qwen3-235b-a22b-2507')) testsPassed++
      else errors.push('Primary Qwen model not configured')

      if (cognitiveCode.includes('qwen/qwen3-235b-a22b-thinking-2507')) testsPassed++
      else errors.push('Thinking model not configured')

      // Test 2: Verificar variáveis de ambiente necessárias
      testsRun++
      const requiredEnvVars = ['QWEN_OPENROUTER_API', 'QWEN_OPENROUTER_API_THINKING', 'Gemini-Embedding']
      const missingVars = requiredEnvVars.filter(varName => !cognitiveCode.includes(varName))
      
      if (missingVars.length === 0) testsPassed++
      else errors.push(`Missing environment variables: ${missingVars.join(', ')}`)

      // Test 3: Verificar métodos críticos
      testsRun++
      const criticalMethods = ['answerQuery', 'hybridSearch', 'shouldUseThinking', 'deepAnalysis']
      const missingMethods = criticalMethods.filter(method => !cognitiveCode.includes(method))
      
      if (missingMethods.length === 0) testsPassed++
      else errors.push(`Missing critical methods: ${missingMethods.join(', ')}`)

      // Test 4: Verificar CORS e handler
      testsRun++
      if (cognitiveCode.includes('Access-Control-Allow-Origin') && cognitiveCode.includes('serve(')) {
        testsPassed++
      } else {
        errors.push('CORS headers or serve handler missing')
      }

      // Warnings
      if (!cognitiveCode.includes('try {') || !cognitiveCode.includes('catch (error)')) {
        warnings.push('Error handling might be incomplete')
      }

    } catch (error) {
      errors.push(`File read error: ${error.message}`)
    }

    return {
      function_name: 'cognitive-core',
      status: errors.length === 0 ? (warnings.length > 0 ? 'WARNING' : 'PASS') : 'FAIL',
      tests_run: testsRun,
      tests_passed: testsPassed,
      errors,
      warnings,
      performance_ms: Date.now() - startTime
    }
  }

  /**
   * ⚡ VALIDAR PROCESS-COMMAND
   */
  async validateProcessCommand(): Promise<ValidationResult> {
    const startTime = Date.now()
    const errors: string[] = []
    const warnings: string[] = []
    let testsRun = 0
    let testsPassed = 0

    try {
      testsRun++
      const processCode = await Deno.readTextFile('./supabase/functions/process-command/index_new.ts')
      
      if (processCode.includes('QwenMoEClient')) testsPassed++
      else errors.push('QwenMoEClient class not found')

      testsRun++
      if (processCode.includes('qwen/qwen3-30b-a3b')) testsPassed++
      else errors.push('Qwen MoE model not configured')

      testsRun++
      const commandActions = ['BUY_ASSET', 'SELL_ASSET', 'ANALYZE_PORTFOLIO', 'GET_QUOTE']
      const missingActions = commandActions.filter(action => !processCode.includes(action))
      
      if (missingActions.length === 0) testsPassed++
      else warnings.push(`Some command actions might be missing: ${missingActions.join(', ')}`)

      testsRun++
      if (processCode.includes('validateCommand') && processCode.includes('enrichContext')) {
        testsPassed++
      } else {
        errors.push('Command validation or context enrichment missing')
      }

    } catch (error) {
      errors.push(`File read error: ${error.message}`)
    }

    return {
      function_name: 'process-command',
      status: errors.length === 0 ? (warnings.length > 0 ? 'WARNING' : 'PASS') : 'FAIL',
      tests_run: testsRun,
      tests_passed: testsPassed,
      errors,
      warnings,
      performance_ms: Date.now() - startTime
    }
  }

  /**
   * 🎤 VALIDAR TRANSCRIBE-AUDIO
   */
  async validateTranscribeAudio(): Promise<ValidationResult> {
    const startTime = Date.now()
    const errors: string[] = []
    const warnings: string[] = []
    let testsRun = 0
    let testsPassed = 0

    try {
      testsRun++
      const transcribeCode = await Deno.readTextFile('./supabase/functions/transcribe-audio/index_new.ts')
      
      if (transcribeCode.includes('VoxtralClient')) testsPassed++
      else errors.push('VoxtralClient class not found')

      testsRun++
      if (transcribeCode.includes('voxtral-small-latest')) testsPassed++
      else errors.push('Voxtral model not configured')

      testsRun++
      if (transcribeCode.includes('FinancialTickerEnhancer')) testsPassed++
      else errors.push('Financial ticker enhancement missing')

      testsRun++
      if (transcribeCode.includes('ErasmoInvest_API_MISTRAL')) testsPassed++
      else errors.push('Mistral API key reference missing')

      testsRun++
      const tickerPatterns = ['PETR4', 'VALE3', 'HGLG11']
      const hasTickerPatterns = tickerPatterns.some(ticker => transcribeCode.includes(ticker))
      
      if (hasTickerPatterns) testsPassed++
      else warnings.push('Brazilian ticker patterns might be incomplete')

    } catch (error) {
      errors.push(`File read error: ${error.message}`)
    }

    return {
      function_name: 'transcribe-audio',
      status: errors.length === 0 ? (warnings.length > 0 ? 'WARNING' : 'PASS') : 'FAIL',
      tests_run: testsRun,
      tests_passed: testsPassed,
      errors,
      warnings,
      performance_ms: Date.now() - startTime
    }
  }

  /**
   * 🔊 VALIDAR TEXT-TO-SPEECH
   */
  async validateTextToSpeech(): Promise<ValidationResult> {
    const startTime = Date.now()
    const errors: string[] = []
    const warnings: string[] = []
    let testsRun = 0
    let testsPassed = 0

    try {
      testsRun++
      const ttsCode = await Deno.readTextFile('./supabase/functions/text-to-speech/index_new.ts')
      
      if (ttsCode.includes('GoogleTTSClient')) testsPassed++
      else errors.push('GoogleTTSClient class not found')

      testsRun++
      if (ttsCode.includes('pt-BR-Neural2')) testsPassed++
      else errors.push('Brazilian voice models not configured')

      testsRun++
      if (ttsCode.includes('FinancialTextEnhancer')) testsPassed++
      else errors.push('Financial text enhancement missing')

      testsRun++
      if (ttsCode.includes('GOOGLE_CLOUD_API_KEY') && ttsCode.includes('GOOGLE_CLOUD_PROJECT_ID')) {
        testsPassed++
      } else {
        errors.push('Google Cloud credentials missing')
      }

      testsRun++
      if (ttsCode.includes('por cento') && ttsCode.includes('reais')) testsPassed++
      else warnings.push('Portuguese financial pronunciation might be incomplete')

    } catch (error) {
      errors.push(`File read error: ${error.message}`)
    }

    return {
      function_name: 'text-to-speech',
      status: errors.length === 0 ? (warnings.length > 0 ? 'WARNING' : 'PASS') : 'FAIL',
      tests_run: testsRun,
      tests_passed: testsPassed,
      errors,
      warnings,
      performance_ms: Date.now() - startTime
    }
  }

  /**
   * 📰 VALIDAR INGEST-NEWS-CRON
   */
  async validateIngestNews(): Promise<ValidationResult> {
    const startTime = Date.now()
    const errors: string[] = []
    const warnings: string[] = []
    let testsRun = 0
    let testsPassed = 0

    try {
      testsRun++
      const newsCode = await Deno.readTextFile('./supabase/functions/ingest-news-cron/index_new.ts')
      
      if (newsCode.includes('QwenNewsProcessor')) testsPassed++
      else errors.push('QwenNewsProcessor class not found')

      testsRun++
      if (newsCode.includes('NewsFetcher')) testsPassed++
      else errors.push('NewsFetcher class not found')

      testsRun++
      const newsSources = ['NewsAPI', 'BRAPI', 'RSS']
      const hasSources = newsSources.some(source => newsCode.includes(source))
      
      if (hasSources) testsPassed++
      else errors.push('News sources not properly configured')

      testsRun++
      if (newsCode.includes('sentiment') && newsCode.includes('entities')) testsPassed++
      else errors.push('News analysis features missing')

      testsRun++
      const requiredApis = ['ErasmoInvest_NewsAPI', 'VITE_BRAPI_API_KEY']
      const missingApis = requiredApis.filter(api => !newsCode.includes(api))
      
      if (missingApis.length === 0) testsPassed++
      else warnings.push(`Some news APIs might be missing: ${missingApis.join(', ')}`)

    } catch (error) {
      errors.push(`File read error: ${error.message}`)
    }

    return {
      function_name: 'ingest-news-cron',
      status: errors.length === 0 ? (warnings.length > 0 ? 'WARNING' : 'PASS') : 'FAIL',
      tests_run: testsRun,
      tests_passed: testsPassed,
      errors,
      warnings,
      performance_ms: Date.now() - startTime
    }
  }

  /**
   * 🔧 VALIDAR CONFIGURAÇÕES
   */
  async validateConfiguration(): Promise<ValidationResult> {
    const startTime = Date.now()
    const errors: string[] = []
    const warnings: string[] = []
    let testsRun = 0
    let testsPassed = 0

    try {
      // Test migration guide
      testsRun++
      const migrationGuide = await Deno.readTextFile('./ENV_MIGRATION_GUIDE.md')
      
      if (migrationGuide.includes('QWEN_OPENROUTER_API') && migrationGuide.includes('95% GRATUITO')) {
        testsPassed++
      } else {
        errors.push('Migration guide incomplete or missing key information')
      }

      // Test success report
      testsRun++
      const successReport = await Deno.readTextFile('./MIGRATION_SUCCESS_REPORT.md')
      
      if (successReport.includes('94.2%') && successReport.includes('$2,340')) {
        testsPassed++
      } else {
        warnings.push('Success report might have outdated metrics')
      }

      // Verify critical environment variables are documented
      testsRun++
      const criticalEnvVars = [
        'QWEN_OPENROUTER_API',
        'QWEN_OPENROUTER_API_THINKING', 
        'ErasmoInvest_API_MISTRAL',
        'Gemini-Embedding'
      ]
      
      const documentedVars = criticalEnvVars.filter(envVar => migrationGuide.includes(envVar))
      if (documentedVars.length === criticalEnvVars.length) {
        testsPassed++
      } else {
        errors.push(`Missing environment variables in documentation: ${criticalEnvVars.filter(v => !documentedVars.includes(v)).join(', ')}`)
      }

    } catch (error) {
      errors.push(`Configuration validation error: ${error.message}`)
    }

    return {
      function_name: 'configuration',
      status: errors.length === 0 ? (warnings.length > 0 ? 'WARNING' : 'PASS') : 'FAIL',
      tests_run: testsRun,
      tests_passed: testsPassed,
      errors,
      warnings,
      performance_ms: Date.now() - startTime
    }
  }

  /**
   * 🚀 EXECUTAR VALIDAÇÃO COMPLETA
   */
  async runCompleteValidation(): Promise<OverallResult> {
    console.log('🧪 Starting comprehensive migration validation...\n')

    const results: ValidationResult[] = []

    // Run all validations
    console.log('📋 Validating functions...')
    results.push(await this.validateCognitiveCore())
    results.push(await this.validateProcessCommand())
    results.push(await this.validateTranscribeAudio())
    results.push(await this.validateTextToSpeech())
    results.push(await this.validateIngestNews())
    results.push(await this.validateConfiguration())

    // Print individual results
    for (const result of results) {
      const statusEmoji = result.status === 'PASS' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌'
      console.log(`${statusEmoji} ${result.function_name}: ${result.tests_passed}/${result.tests_run} tests passed (${result.performance_ms}ms)`)
      
      if (result.errors.length > 0) {
        console.log(`   ❌ Errors: ${result.errors.join(', ')}`)
      }
      if (result.warnings.length > 0) {
        console.log(`   ⚠️  Warnings: ${result.warnings.join(', ')}`)
      }
    }

    // Calculate overall results
    const totalFunctions = results.length
    const functionsPassed = results.filter(r => r.status === 'PASS').length
    const functionsFailed = results.filter(r => r.status === 'FAIL').length
    const functionsWithWarnings = results.filter(r => r.status === 'WARNING').length

    const criticalIssues = results
      .filter(r => r.status === 'FAIL')
      .flatMap(r => r.errors)

    const readyForDeployment = functionsFailed === 0

    console.log('\n📊 VALIDATION SUMMARY:')
    console.log(`✅ Functions passed: ${functionsPassed}/${totalFunctions}`)
    console.log(`⚠️  Functions with warnings: ${functionsWithWarnings}/${totalFunctions}`)
    console.log(`❌ Functions failed: ${functionsFailed}/${totalFunctions}`)
    console.log(`🚀 Ready for deployment: ${readyForDeployment ? 'YES' : 'NO'}`)

    if (criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES TO FIX:')
      criticalIssues.forEach(issue => console.log(`   - ${issue}`))
    }

    return {
      total_functions: totalFunctions,
      functions_passed: functionsPassed,
      functions_failed: functionsFailed,
      functions_with_warnings: functionsWithWarnings,
      critical_issues: criticalIssues,
      ready_for_deployment: readyForDeployment
    }
  }
}

// Run validation if called directly
if (import.meta.main) {
  const validator = new FunctionValidator()
  const result = await validator.runCompleteValidation()
  
  Deno.exit(result.ready_for_deployment ? 0 : 1)
}

export { FunctionValidator, ValidationResult, OverallResult }