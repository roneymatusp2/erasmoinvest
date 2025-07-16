# 🚀 **ERASMO INVEST** - Sistema Inteligente de Gestão de Investimentos

![Versão](https://img.shields.io/badge/versão-2.0.0-blue.svg)
![Status](https://img.shields.io/badge/status-produção-green.svg)
![IA](https://img.shields.io/badge/IA-integrada-purple.svg)

## 🎯 **VISÃO GERAL**

**Erasmo Invest** é uma plataforma completa e inteligente para gestão de investimentos pessoais, com **comandos de voz e IA integrada**. Desenvolvido com React + TypeScript + Supabase, oferece uma experiência moderna e intuitiva para controlar seu portfólio.

### 🌟 **NOVIDADES v2.0**
- 🎤 **Comandos de Voz** - Controle total por voz com detecção automática de silêncio
- 🧠 **IA Integrada** - Mistral AI + OpenAI para processamento de linguagem natural
- 🔊 **Resposta em Áudio** - Síntese de fala com OpenAI TTS
- 📝 **Comandos de Texto** - Interface moderna para comandos escritos
- ⚡ **Edge Functions** - Backend serverless com Supabase

## 🚀 **ACESSO RÁPIDO**

### 🌐 **Aplicação Online**
**URL**: [https://erasmoinvest.netlify.app](https://erasmoinvest.netlify.app)

### 🔑 **Login**
- **Usuário**: `erasmo_russo`
- **Senha**: `123456`

## 🎮 **COMANDOS DE VOZ E TEXTO**

### 🎤 **Como Usar Comandos de Voz**
1. Pressione e **segure** o botão azul "Comando de Voz"
2. Fale seu comando claramente
3. **Solte** o botão (ou aguarde 2s de silêncio)
4. Aguarde a IA processar e responder

### 📝 **Como Usar Comandos de Texto**
1. Clique no botão "Texto"
2. Digite seu comando
3. Pressione "Enviar Comando"

### 💬 **Exemplos de Comandos**

#### **📊 Consultar Portfólio**
```
"Como está meu portfólio?"
"Qual o valor total dos meus investimentos?"
"Quantos ativos eu tenho?"
```

#### **🔍 Consultar Ativos**
```
"Quantas ações da Vale eu tenho?"
"Como está o Banco do Brasil?"
"Mostre informações da Petrobras"
```

#### **➕ Adicionar Investimentos**
```
"Adicione 10 ações da Vale por 25 reais"
"Comprei 5 ações do Banco do Brasil a 30,50"
"Adicione 100 ações da Petrobras por 35 reais cada"
```

## 🏗️ **ARQUITETURA TÉCNICA**

### **Frontend**
- ⚛️ **React 18** + TypeScript
- 🎨 **Tailwind CSS** + Framer Motion
- 📱 **Responsive Design**
- 🔥 **Vite** (build ultra-rápido)

### **Backend**
- 🐘 **Supabase PostgreSQL** (banco de dados)
- ⚡ **Edge Functions** (Deno + TypeScript)
- 🔒 **Row Level Security** (RLS)
- 🌐 **Real-time updates**

### **IA e APIs**
- 🧠 **Mistral AI** (processamento de comandos)
- 🎵 **OpenAI Whisper** (speech-to-text)
- 🔊 **OpenAI TTS** (text-to-speech)
- 📊 **APIs de Mercado** (dados em tempo real)

## 🛠️ **DESENVOLVIMENTO LOCAL**

### **Pré-requisitos**
- Node.js 18+
- npm ou yarn

### **Instalação**
```bash
# Clone o repositório
git clone https://github.com/roneymatusp2/erasmoinvest.git

# Entre na pasta
cd erasmoinvest

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas chaves

# Inicie desenvolvimento
npm run dev
```

### **Scripts Disponíveis**
```bash
npm run dev          # Desenvolvimento
npm run build        # Build produção
npm run preview      # Preview do build
npm run type-check   # Verificar tipos
npm run lint         # Verificar código
npm run build:check  # Build + verificações
```

## 📊 **FUNCIONALIDADES PRINCIPAIS**

### **💼 Gestão de Portfólio**
- ➕ Adicionar investimentos (ações, FIIs, ETFs, REITs)
- 📈 Acompanhar performance em tempo real
- 💰 Controle de dividendos e juros
- 📊 Análise de rentabilidade e DY

### **📱 Interface Moderna**
- 🌙 **Tema escuro** elegante
- 📱 **Responsivo** (mobile-first)
- ⚡ **Animações fluidas** com Framer Motion
- 🎨 **Componentes reutilizáveis**

### **📊 Dashboards Inteligentes**
- 📈 **Overview geral** do portfólio
- 🥧 **Gráficos interativos** (pizza, barras, linhas)
- 📋 **Tabelas detalhadas** com filtros
- 📤 **Exportação Excel** profissional

### **🔍 Análise Avançada**
- 💹 **Cálculo automático** de preço médio
- 📊 **Dividend Yield** por ativo e total
- 🎯 **Alocação por setor/tipo/país**
- 📈 **Performance histórica**

## 🔧 **CONFIGURAÇÃO SUPABASE**

### **Variáveis de Ambiente**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### **Edge Functions**
```bash
supabase functions deploy transcribe-audio
supabase functions deploy process-command
supabase functions deploy execute-command
supabase functions deploy text-to-speech
```

## 📱 **DEPLOY**

### **Netlify (Automático)**
- 🔄 **Deploy automático** via GitHub
- 🌐 **CDN global** para performance
- 🔒 **HTTPS** por padrão
- ⚡ **Build otimizado** com Vite

### **Variáveis no Netlify**
```env
VITE_SUPABASE_URL=https://gjvtncdjcslnkfctqnfy.supabase.co
VITE_SUPABASE_ANON_KEY=your-key-here
```

## 🔒 **SEGURANÇA**

- 🛡️ **Row Level Security** (RLS) no Supabase
- 🔐 **Autenticação segura** com tokens
- 🔒 **API keys** protegidas em Edge Functions
- 🌐 **CORS** configurado corretamente

## 🎯 **ROADMAP**

### **✅ Concluído (v2.0)**
- [x] Sistema de comandos de voz
- [x] IA integrada (Mistral + OpenAI)
- [x] Edge Functions Supabase
- [x] Interface moderna e responsiva
- [x] Dashboards avançados
- [x] Exportação Excel profissional

### **🔮 Próximas Versões**
- [ ] **App Mobile** (React Native)
- [ ] **Notificações Push** para dividendos
- [ ] **Análise técnica** com indicadores
- [ ] **Social trading** e compartilhamento
- [ ] **API pública** para integrações

## 🤝 **CONTRIBUIÇÃO**

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 **LICENÇA**

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👨‍💻 **AUTOR**

**Roney Mateus**
- 🐙 GitHub: [@roneymatusp2](https://github.com/roneymatusp2)
- 📧 Email: roney.mateus@example.com
- 💼 LinkedIn: [roney-mateus](https://linkedin.com/in/roney-mateus)

---

### 🎉 **ERASMO INVEST - INTELIGÊNCIA ARTIFICIAL PARA SEUS INVESTIMENTOS!**

**Transforme sua gestão de investimentos com comandos de voz e IA! 🚀**
