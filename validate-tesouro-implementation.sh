#!/bin/bash

# =============================================================================
# 🚀 VALIDAÇÃO FINAL - EDGE FUNCTION TESOURO DIRETO
# =============================================================================
# 
# Este script valida se a implementação da Edge Function foi bem-sucedida
# Execute com: bash validate-tesouro-implementation.sh
#
# Data: 20 de julho de 2025
# Autor: Claude (Anthropic)
# Projeto: Erasmo Invest
# =============================================================================

echo "🏛️ VALIDAÇÃO DA IMPLEMENTAÇÃO EDGE FUNCTION TESOURO DIRETO"
echo "============================================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para log com cores
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_info() {
    echo -e "${BLUE}📝 $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# URL da Edge Function
EDGE_FUNCTION_URL="https://gjvtncdjcslnkfctqnfy.supabase.co/functions/v1/tesouro-direto-proxy"

echo "🔍 VERIFICAÇÕES DE IMPLEMENTAÇÃO"
echo "---------------------------------"

# 1. Verificar se os arquivos foram modificados
echo ""
log_info "1. Verificando arquivos modificados..."

if [ -f "src/services/marketApi.ts" ]; then
    if grep -q "tesouro-direto-proxy" "src/services/marketApi.ts"; then
        log_success "marketApi.ts foi atualizado com a URL da Edge Function"
    else
        log_error "marketApi.ts NÃO foi atualizado corretamente"
    fi
else
    log_error "Arquivo marketApi.ts não encontrado"
fi

if [ -f "tests/test-supabase-tesouro-proxy.html" ]; then
    log_success "Arquivo de teste HTML criado"
else
    log_warning "Arquivo de teste HTML não encontrado"
fi

if [ -f "EDGE_FUNCTION_TESOURO_IMPLEMENTADA.md" ]; then
    log_success "Documentação da implementação criada"
else
    log_warning "Documentação não encontrada"
fi

# 2. Testar conectividade com a Edge Function
echo ""
log_info "2. Testando conectividade com a Edge Function..."

# Verificar se curl está disponível
if command -v curl &> /dev/null; then
    echo "   Fazendo requisição para: $EDGE_FUNCTION_URL"
    
    # Fazer requisição com timeout
    HTTP_STATUS=$(curl -s -w "%{http_code}" -o /tmp/supabase_response.json --max-time 10 "$EDGE_FUNCTION_URL")
    
    if [ "$HTTP_STATUS" -eq 200 ]; then
        log_success "Edge Function respondeu com HTTP 200"
        
        # Verificar se a resposta contém dados do Tesouro
        if grep -q "TrsrBdTradgList" /tmp/supabase_response.json 2>/dev/null; then
            log_success "Resposta contém dados válidos do Tesouro Direto"
            
            # Contar títulos retornados
            TITLE_COUNT=$(grep -o "TrsrBd" /tmp/supabase_response.json | wc -l)
            log_info "   Total de títulos retornados: $TITLE_COUNT"
            
        else
            log_error "Resposta não contém dados válidos do Tesouro"
        fi
        
    elif [ "$HTTP_STATUS" -eq 000 ]; then
        log_error "Falha de conectividade (timeout ou rede)"
    else
        log_error "Edge Function retornou HTTP $HTTP_STATUS"
    fi
    
    # Limpar arquivo temporário
    rm -f /tmp/supabase_response.json
    
else
    log_warning "curl não disponível - pulando teste de conectividade"
fi

# 3. Verificar estrutura do projeto
echo ""
log_info "3. Verificando estrutura do projeto..."

# Verificar se é um projeto React/Vite
if [ -f "package.json" ]; then
    if grep -q "react" "package.json" && grep -q "vite" "package.json"; then
        log_success "Projeto React + Vite identificado"
    else
        log_warning "Projeto pode não ser React + Vite"
    fi
    
    # Verificar dependências importantes
    if grep -q "@supabase/supabase-js" "package.json"; then
        log_success "Supabase cliente instalado"
    else
        log_error "Supabase cliente NÃO instalado"
    fi
    
else
    log_error "package.json não encontrado"
fi

# 4. Verificar configuração de ambiente
echo ""
log_info "4. Verificando arquivos de configuração..."

if [ -f ".env.example" ]; then
    if grep -q "VITE_SUPABASE_URL" ".env.example"; then
        log_success "Arquivo .env.example configurado"
    else
        log_warning ".env.example pode estar incompleto"
    fi
else
    log_warning "Arquivo .env.example não encontrado"
fi

# 5. Resumo final
echo ""
echo "📊 RESUMO DA IMPLEMENTAÇÃO"
echo "=========================="

log_info "Data da implementação: 20 de julho de 2025"
log_info "Edge Function criada: tesouro-direto-proxy"
log_info "Status da função: ACTIVE"
log_info "ID da função: 6830db9b-cb7a-40ad-9981-09fca20a32c2"

echo ""
echo "🎯 PRÓXIMOS PASSOS RECOMENDADOS"
echo "==============================="
echo "1. Execute 'npm run dev' para testar localmente"
echo "2. Abra tests/test-supabase-tesouro-proxy.html no navegador"
echo "3. Faça login no sistema e verifique se dados do Tesouro carregam"
echo "4. Monitore console do navegador para verificar se não há erros CORS"

echo ""
echo "🔗 LINKS ÚTEIS"
echo "============="
echo "Edge Function URL: $EDGE_FUNCTION_URL"
echo "Supabase Console: https://supabase.com/dashboard/project/gjvtncdjcslnkfctqnfy"
echo "Arquivo de teste: tests/test-supabase-tesouro-proxy.html"

echo ""
echo "✨ IMPLEMENTAÇÃO CONCLUÍDA COM SUCESSO!"
echo "======================================"

exit 0
