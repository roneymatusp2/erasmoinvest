# 📊 Sistema de Controle de Investimentos - Erasmo Invest

Sistema completo para controle e análise de investimentos pessoais com integração ao Supabase.

## 🚀 Funcionalidades

- **Dashboard Avançado**: Análise completa do portfólio
- **Controle de FIIs**: Gestão de Fundos Imobiliários 
- **Ações Brasileiras**: Acompanhamento de ações da B3
- **Ativos Internacionais**: ETFs e REITs americanos
- **Preços em Tempo Real**: Integração com APIs de mercado
- **Análise de Performance**: Relatórios detalhados
- **Cálculo de Yield**: DY histórico e projeções
- **Autenticação Segura**: Acesso restrito com senha
- **Responsive Design**: Interface moderna e responsiva

### 📈 APIs de Mercado Integradas

- **Brapi.dev**: Ações brasileiras e FIIs (B3)
- **Finnhub.io**: Ações americanas e dados em tempo real
- **Alpha Vantage**: Backup para ações internacionais
- **Sistema de Cache**: 1 minuto de cache para performance

## 🛠️ Tecnologias

- **Frontend**: React + TypeScript + Vite
- **Estilização**: Tailwind CSS + Framer Motion
- **Backend**: Supabase (PostgreSQL)
- **Gráficos**: Recharts
- **Ícones**: Lucide React
- **Deploy**: Netlify

## 📱 Preview

- **URL de Produção**: [erasmoinvest.netlify.app](https://erasmoinvest.netlify.app)
- **Usuário Autorizado**: erasmorusso@uol.com.br

## 🏗️ Estrutura do Projeto

```
src/
├── components/          # Componentes React
├── data/               # Dados locais (fallback)
├── lib/                # Configurações (Supabase)
├── services/           # Serviços e APIs
├── types/              # Tipos TypeScript
└── styles/             # Estilos globais

supabase/
└── migrations/         # Migrações do banco
```

## 🔧 Configuração Local

1. **Clone o repositório**
```bash
git clone https://github.com/[usuario]/erasmoinvest.git
cd erasmoinvest
```

2. **Instale dependências**
```bash
npm install
```

3. **Configure variáveis de ambiente**
```bash
# Crie arquivo .env na raiz do projeto

# Configurações do Supabase
VITE_SUPABASE_URL=https://gjvtncdjcslnkfctqnfy.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_supabase_aqui

# APIs de Mercado Financeiro
VITE_ALPHA_VANTAGE_API_KEY=7KAUW1MTXT6TPCKU
VITE_FINNHUB_API_KEY=cvu1cmhr01qjg136up40cvu1cmhr01qjg136up4g
```

4. **Execute em desenvolvimento**
```bash
npm run dev
```

## 🗄️ Configuração do Banco de Dados

O projeto utiliza Supabase com as seguintes tabelas:

- `asset_metadata`: Metadados dos ativos (FIIs, ações, ETFs)
- `investments`: Registros de investimentos
- `user_portfolios`: Controle de portfólios

### Migrações Executadas:
- ✅ Criação das tabelas principais
- ✅ Configuração de RLS (Row Level Security)
- ✅ Seed inicial com metadados dos ativos
- ✅ Índices para performance
- ✅ Triggers para auditoria

## 🚀 Deploy no Netlify

### Configuração Automática:

1. **Conecte o repositório GitHub ao Netlify**
2. **Configure as variáveis de ambiente no Netlify:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ALPHA_VANTAGE_API_KEY`
   - `VITE_FINNHUB_API_KEY`

3. **Deploy automático:** O Netlify detectará automaticamente as configurações do `netlify.toml`

### Configurações do Build:
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Node Version**: 18

## 🔐 Segurança

- ✅ RLS habilitado em todas as tabelas
- ✅ Acesso restrito por email autorizado
- ✅ Variáveis de ambiente seguras
- ✅ Headers de segurança configurados
- ✅ HTTPS obrigatório

## 📊 Dados Suportados

### FIIs Brasileiros:
- ALZR11, BCIA11, BRCO11, BTLG11
- HGBS11, HGCR11, HGFF11, HGLG11
- KFOF11, KNCR11, KNRI11, KNSC11
- RCRB11, XPLG11, XPML11

### Ações Brasileiras:
- BBAS3, BBSE3, B3SA3, BBDC4
- CPFE3, EGIE3, FLRY3, ODPV3
- PSSA3, RADL3, VALE3, WEGE3

### Ativos Internacionais:
- VOO, VNQ (ETFs)
- DVN, EVEX (Stocks)
- O (REIT)

## 🤝 Contribuição

Este é um projeto pessoal, mas sugestões são bem-vindas via issues.

## 📄 Licença

Projeto privado - Todos os direitos reservados.

---

**Desenvolvido por Erasmo Russo** 🚀 # erasmoinvest
# erasmoinvest
