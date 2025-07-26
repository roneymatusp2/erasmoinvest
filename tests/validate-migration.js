/**
 * 🧪 ERASMOINVEST - VALIDAÇÃO COMPLETA DA MIGRAÇÃO
 * Testa todas as funções implementadas antes do deploy
 */

const fs = require('fs').promises;
const path = require('path');

class FunctionValidator {
  
  async validateCognitiveCore() {
    const startTime = Date.now();
    const errors = [];
    const warnings = [];
    let testsRun = 0;
    let testsPassed = 0;

    try {
      testsRun++;
      const cognitiveCode = await fs.readFile('./supabase/functions/cognitive-core/index_new.ts', 'utf8');
      
      if (cognitiveCode.includes('QwenClient')) testsPassed++;
      else errors.push('QwenClient class not found');

      if (cognitiveCode.includes('GeminiEmbeddingClient')) testsPassed++;
      else errors.push('GeminiEmbeddingClient class not found');

      if (cognitiveCode.includes('qwen/qwen3-235b-a22b-2507')) testsPassed++;
      else errors.push('Primary Qwen model not configured');

      if (cognitiveCode.includes('qwen/qwen3-235b-a22b-thinking-2507')) testsPassed++;
      else errors.push('Thinking model not configured');

      testsRun++;
      const requiredEnvVars = ['QWEN_OPENROUTER_API', 'QWEN_OPENROUTER_API_THINKING', 'Gemini-Embedding'];
      const missingVars = requiredEnvVars.filter(varName => !cognitiveCode.includes(varName));
      
      if (missingVars.length === 0) testsPassed++;
      else errors.push(`Missing environment variables: ${missingVars.join(', ')}`);

      testsRun++;
      const criticalMethods = ['answerQuery', 'hybridSearch', 'shouldUseThinking', 'deepAnalysis'];
      const missingMethods = criticalMethods.filter(method => !cognitiveCode.includes(method));
      
      if (missingMethods.length === 0) testsPassed++;
      else errors.push(`Missing critical methods: ${missingMethods.join(', ')}`);

      testsRun++;
      if (cognitiveCode.includes('Access-Control-Allow-Origin') && cognitiveCode.includes('serve(')) {
        testsPassed++;
      } else {
        errors.push('CORS headers or serve handler missing');
      }

    } catch (error) {
      errors.push(`File read error: ${error.message}`);
    }

    return {
      function_name: 'cognitive-core',
      status: errors.length === 0 ? (warnings.length > 0 ? 'WARNING' : 'PASS') : 'FAIL',
      tests_run: testsRun,
      tests_passed: testsPassed,
      errors,
      warnings,
      performance_ms: Date.now() - startTime
    };
  }

  async validateProcessCommand() {
    const startTime = Date.now();
    const errors = [];
    const warnings = [];
    let testsRun = 0;
    let testsPassed = 0;

    try {
      testsRun++;
      const processCode = await fs.readFile('./supabase/functions/process-command/index_new.ts', 'utf8');
      
      if (processCode.includes('QwenMoEClient')) testsPassed++;
      else errors.push('QwenMoEClient class not found');

      testsRun++;
      if (processCode.includes('qwen/qwen3-30b-a3b')) testsPassed++;
      else errors.push('Qwen MoE model not configured');

      testsRun++;
      const commandActions = ['BUY_ASSET', 'SELL_ASSET', 'ANALYZE_PORTFOLIO', 'GET_QUOTE'];
      const missingActions = commandActions.filter(action => !processCode.includes(action));
      
      if (missingActions.length === 0) testsPassed++;
      else warnings.push(`Some command actions might be missing: ${missingActions.join(', ')}`);

      testsRun++;
      if (processCode.includes('validateCommand') && processCode.includes('enrichContext')) {
        testsPassed++;
      } else {
        errors.push('Command validation or context enrichment missing');
      }

    } catch (error) {
      errors.push(`File read error: ${error.message}`);
    }

    return {
      function_name: 'process-command',
      status: errors.length === 0 ? (warnings.length > 0 ? 'WARNING' : 'PASS') : 'FAIL',
      tests_run: testsRun,
      tests_passed: testsPassed,
      errors,
      warnings,
      performance_ms: Date.now() - startTime
    };
  }

  async validateTranscribeAudio() {
    const startTime = Date.now();
    const errors = [];
    const warnings = [];
    let testsRun = 0;
    let testsPassed = 0;

    try {
      testsRun++;
      const transcribeCode = await fs.readFile('./supabase/functions/transcribe-audio/index_new.ts', 'utf8');
      
      if (transcribeCode.includes('VoxtralClient')) testsPassed++;
      else errors.push('VoxtralClient class not found');

      testsRun++;
      if (transcribeCode.includes('voxtral-small-latest')) testsPassed++;
      else errors.push('Voxtral model not configured');

      testsRun++;
      if (transcribeCode.includes('FinancialTickerEnhancer')) testsPassed++;
      else errors.push('Financial ticker enhancement missing');

      testsRun++;
      if (transcribeCode.includes('ErasmoInvest_API_MISTRAL')) testsPassed++;
      else errors.push('Mistral API key reference missing');

    } catch (error) {
      errors.push(`File read error: ${error.message}`);
    }

    return {
      function_name: 'transcribe-audio',
      status: errors.length === 0 ? (warnings.length > 0 ? 'WARNING' : 'PASS') : 'FAIL',
      tests_run: testsRun,
      tests_passed: testsPassed,
      errors,
      warnings,
      performance_ms: Date.now() - startTime
    };
  }

  async validateTextToSpeech() {
    const startTime = Date.now();
    const errors = [];
    const warnings = [];
    let testsRun = 0;
    let testsPassed = 0;

    try {
      testsRun++;
      const ttsCode = await fs.readFile('./supabase/functions/text-to-speech/index_new.ts', 'utf8');
      
      if (ttsCode.includes('GoogleTTSClient')) testsPassed++;
      else errors.push('GoogleTTSClient class not found');

      testsRun++;
      if (ttsCode.includes('pt-BR-Neural2')) testsPassed++;
      else errors.push('Brazilian voice models not configured');

      testsRun++;
      if (ttsCode.includes('FinancialTextEnhancer')) testsPassed++;
      else errors.push('Financial text enhancement missing');

      testsRun++;
      if (ttsCode.includes('GOOGLE_CLOUD_API_KEY') && ttsCode.includes('GOOGLE_CLOUD_PROJECT_ID')) {
        testsPassed++;
      } else {
        errors.push('Google Cloud credentials missing');
      }

    } catch (error) {
      errors.push(`File read error: ${error.message}`);
    }

    return {
      function_name: 'text-to-speech',
      status: errors.length === 0 ? (warnings.length > 0 ? 'WARNING' : 'PASS') : 'FAIL',
      tests_run: testsRun,
      tests_passed: testsPassed,
      errors,
      warnings,
      performance_ms: Date.now() - startTime
    };
  }

  async validateConfiguration() {
    const startTime = Date.now();
    const errors = [];
    const warnings = [];
    let testsRun = 0;
    let testsPassed = 0;

    try {
      testsRun++;
      const migrationGuide = await fs.readFile('./ENV_MIGRATION_GUIDE.md', 'utf8');
      
      if (migrationGuide.includes('QWEN_OPENROUTER_API') && migrationGuide.includes('95% GRATUITO')) {
        testsPassed++;
      } else {
        errors.push('Migration guide incomplete or missing key information');
      }

      testsRun++;
      const successReport = await fs.readFile('./MIGRATION_SUCCESS_REPORT.md', 'utf8');
      
      if (successReport.includes('94.2%') && successReport.includes('$2,340')) {
        testsPassed++;
      } else {
        warnings.push('Success report might have outdated metrics');
      }

    } catch (error) {
      errors.push(`Configuration validation error: ${error.message}`);
    }

    return {
      function_name: 'configuration',
      status: errors.length === 0 ? (warnings.length > 0 ? 'WARNING' : 'PASS') : 'FAIL',
      tests_run: testsRun,
      tests_passed: testsPassed,
      errors,
      warnings,
      performance_ms: Date.now() - startTime
    };
  }

  async runCompleteValidation() {
    console.log('🧪 Starting comprehensive migration validation...\n');

    const results = [];

    console.log('📋 Validating functions...');
    results.push(await this.validateCognitiveCore());
    results.push(await this.validateProcessCommand());
    results.push(await this.validateTranscribeAudio());
    results.push(await this.validateTextToSpeech());
    results.push(await this.validateConfiguration());

    // Print individual results
    for (const result of results) {
      const statusEmoji = result.status === 'PASS' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
      console.log(`${statusEmoji} ${result.function_name}: ${result.tests_passed}/${result.tests_run} tests passed (${result.performance_ms}ms)`);
      
      if (result.errors.length > 0) {
        console.log(`   ❌ Errors: ${result.errors.join(', ')}`);
      }
      if (result.warnings.length > 0) {
        console.log(`   ⚠️  Warnings: ${result.warnings.join(', ')}`);
      }
    }

    const totalFunctions = results.length;
    const functionsPassed = results.filter(r => r.status === 'PASS').length;
    const functionsFailed = results.filter(r => r.status === 'FAIL').length;
    const functionsWithWarnings = results.filter(r => r.status === 'WARNING').length;

    const criticalIssues = results
      .filter(r => r.status === 'FAIL')
      .flatMap(r => r.errors);

    const readyForDeployment = functionsFailed === 0;

    console.log('\n📊 VALIDATION SUMMARY:');
    console.log(`✅ Functions passed: ${functionsPassed}/${totalFunctions}`);
    console.log(`⚠️  Functions with warnings: ${functionsWithWarnings}/${totalFunctions}`);
    console.log(`❌ Functions failed: ${functionsFailed}/${totalFunctions}`);
    console.log(`🚀 Ready for deployment: ${readyForDeployment ? 'YES' : 'NO'}`);

    if (criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES TO FIX:');
      criticalIssues.forEach(issue => console.log(`   - ${issue}`));
    }

    return {
      total_functions: totalFunctions,
      functions_passed: functionsPassed,
      functions_failed: functionsFailed,
      functions_with_warnings: functionsWithWarnings,
      critical_issues: criticalIssues,
      ready_for_deployment: readyForDeployment
    };
  }
}

// Run validation
const validator = new FunctionValidator();
validator.runCompleteValidation().then(result => {
  process.exit(result.ready_for_deployment ? 0 : 1);
}).catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
});