# ErasmoInvest 💰

Sistema de gestão de investimentos inteligente com integração ao Supabase e APIs de mercado.

## 🚀 Funcionalidades

- ✅ Dashboard completo de investimentos
- ✅ Integração com APIs de mercado (B3, Tesouro Direto)
- ✅ Autenticação segura via Supabase
- ✅ Comandos de voz para navegação
- ✅ Gráficos interativos de performance
- ✅ Sistema de cache inteligente
- ✅ Interface responsiva e moderna

## 🛠️ Tecnologias

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Styling**: TailwindCSS
- **Gráficos**: Recharts
- **APIs**: B3 API, Tesouro Direto API
- **Deploy**: Netlify

## 🎯 Configuração do Ambiente

### Pré-requisitos

- Node.js 18+
- NPM ou Yarn
- Conta no Supabase

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/roneymatusp2/erasmoinvest.git
cd erasmoinvest
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env.local
```

4. Configure as variáveis no arquivo `.env.local`:
```env
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

5. Execute o projeto em desenvolvimento:
```bash
npm run dev
```

## 📂 Estrutura do Projeto

```
src/
├── components/          # Componentes React
├── hooks/              # Custom hooks
├── services/           # Serviços de API
├── types/              # Definições de tipos TypeScript
├── utils/              # Utilitários e helpers
└── styles/             # Estilos CSS

supabase/
├── migrations/         # Migrações do banco
└── config.toml        # Configuração do Supabase
```

## 🚢 Deploy

O projeto está configurado para deploy automático no Netlify:

1. Push para a branch `main`
2. O Netlify fará o build e deploy automaticamente
3. Acesse sua aplicação via URL do Netlify

## 🔧 Scripts Disponíveis

- `npm run dev` - Executa em modo desenvolvimento
- `npm run build` - Build para produção
- `npm run preview` - Preview do build
- `npm run lint` - Executa o linter

## 📊 Funcionalidades Principais

### Dashboard de Investimentos
- Visão geral do portfólio
- Gráficos de performance
- Distribuição por tipo de ativo

### Gestão de Ativos
- Adicionar/editar/remover investimentos
- Categorização automática
- Cálculo de rendimentos

### Comandos de Voz
- Navegação por voz
- Consulta de dados via comando
- Interface acessível

## 🔐 Autenticação

- Sistema seguro via Supabase Auth
- Usuário padrão: erasmorusso@uol.com.br
- Dados protegidos por RLS (Row Level Security)

## 📈 APIs Integradas

- **B3 API**: Cotações de ações e FIIs
- **Tesouro Direto**: Preços de títulos públicos
- **Cache System**: Sistema de cache para otimização

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🔗 Links Úteis

- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [TailwindCSS](https://tailwindcss.com)

---

Desenvolvido com ❤️ por [Roney](https://github.com/roneymatusp2)
