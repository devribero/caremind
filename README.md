# <img src="/icons/logo_coracao.png" alt="CareMind Logo" width="40" height="40" style="vertical-align: middle;"> CareMind Web

[![Next.js](https://img.shields.io/badge/Next.js-15.5.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.0-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-2.58.5-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel)](https://vercel.com/)
[![Status](https://img.shields.io/badge/Status-Concluído-brightgreen?style=flat-square)]()

> **Gerenciamento Inteligente de Medicamentos e Rotinas para Idosos**

## 📋 Sobre o Projeto

CareMind Web é uma plataforma de saúde digital desenvolvida como Trabalho de Conclusão de Curso (TCC) para o Técnico em Desenvolvimento de Sistemas no SENAI Conde Alexandre Siciliano (Jundiaí-SP). A aplicação foi projetada para combater a **polifarmácia** e auxiliar cuidadores no gerenciamento seguro e eficiente de medicamentos e rotinas diárias de idosos.

Com uma interface focada no **Familiar/Cuidador**, o sistema oferece dashboard administrativo completo, relatórios detalhados de adesão e configurações avançadas de segurança.

## ✨ Funcionalidades Chave (Web)

### 🏠 Dashboard Administrativo
- 📊 **Gráficos interativos** de adesão medicamentosa em tempo real
- 📈 **Analytics** avançados com Chart.js e Vercel Analytics
- 🎯 **KPIs** personalizáveis para monitoramento de saúde

### 💊 Gestão de Medicamentos e Rotinas
- ➕ **CRUD completo** de medicamentos com dosagens e horários
- ⏰ **Sistema de agendamento** inteligente com notificações
- 🔄 **Rotinas personalizáveis** adaptadas às necessidades do paciente

### 📸 Upload de Receitas com OCR
- 🤖 **IA Qwen-VL** para reconhecimento óptico de caracteres
- 👁️ **Revisão manual** garantindo 100% de precisão
- 📱 **Processamento em tempo real** via Supabase Edge Functions

### 👥 Gerenciamento Familiar Seguro
- 🔐 **Security by Design** com Row Level Security (RLS)
- 👨‍👩‍👧‍👦 **Vínculos familiares** hierárquicos e controlados
- 🛡️ **Permissões granulares** por nível de acesso

### 🌐 Landing Page Institucional
- 📱 **Design responsivo** com Tailwind CSS e Shadcn/ui
- 🎨 **UI/UX moderna** com Framer Motion
- ♿ **Acessibilidade** WCAG 2.1 AA compliance

## 🏗️ Arquitetura e Tecnologias

### Frontend
- **Next.js 15.5.4** (App Router) - Framework React full-stack
- **React 18.3.1** - Biblioteca de componentes UI
- **TypeScript 5.9.3** - Tipagem estática e desenvolvimento seguro
- **Tailwind CSS 3.4.0** - Framework CSS utility-first
- **Shadcn/ui** - Componentes UI acessíveis e customizáveis
- **Framer Motion 12.23.24** - Animações e transições fluidas

### Backend (BaaS)
- **Supabase 2.58.5** - Backend-as-a-Service completo
  - **Auth**: Autenticação segura com OAuth
  - **Database**: PostgreSQL com RLS integrado
  - **Storage**: Armazenamento de arquivos criptografado
  - **Edge Functions**: Serverless functions para OCR

### Segurança e Performance
- 🛡️ **CSP (Content Security Policy)** implementado
- 🔒 **HSTS (HTTP Strict Transport Security)**
- ✅ **Validação OWASP ZAP** para segurança web
- 📊 **Vercel Speed Insights** para monitoramento de performance
- 🚀 **PWA capabilities** (desativado temporariamente)

## 🚀 Instalação e Execução

### Pré-requisitos
- **Node.js 20.x** ou superior
- **npm** ou **yarn** como gerenciador de pacotes

### Passo a Passo

1. **Clone o repositório**
   ```bash
   git clone https://github.com/devribero/caremind.git
   cd caremind
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**
   ```bash
   cp .env.example .env.local
   ```
   Edite o arquivo `.env.local` com suas chaves do Supabase (veja seção abaixo)

4. **Execute o servidor de desenvolvimento**
   ```bash
   npm run dev
   ```

5. **Acesse a aplicação**
   ```
   http://localhost:3000
   ```

## 🔧 Variáveis de Ambiente

Configure as seguintes variáveis no seu arquivo `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=CareMind

# Analytics (Opcional)
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your_vercel_analytics_id
```

> **⚠️ Importante**: Nunca exponha suas chaves do Supabase em repositórios públicos. O arquivo `.env` está incluído no `.gitignore` para segurança.

## 📁 Estrutura do Projeto

```
caremind/
├── src/
│   ├── app/                 # App Router (Next.js 13+)
│   ├── components/          # Componentes React
│   │   ├── features/        # Componentes de negócio
│   │   └── shared/          # Componentes compartilhados
│   ├── contexts/            # React Context Providers
│   ├── hooks/               # Custom Hooks
│   ├── lib/                 # Utilitários e configurações
│   └── types/               # Tipos TypeScript
├── supabase/
│   ├── functions/           # Edge Functions
│   └── migrations/          # Migrations do banco
├── public/                  # Assets estáticos
└── docs/                    # Documentação adicional
```

## 👥 Autores e Orientador

### Desenvolvedores
- **Daniel Augusto Batista** - Full-stack Developer
- **João Gabriel Sacramoni Pincinato** - Frontend Specialist  
- **Leonardo Destro Felix** - Backend & Integration
- **Marcos Néfi Bolonha da Silva** - UI/UX Designer
- **Pedro Ribeiro** - DevOps & Security

### Orientador
- **Carlos Ribeiro** - Orientador Técnico
  - SENAI Conde Alexandre Siciliano
  - Jundiaí - São Paulo

## 📄 Licença

**© 2025 - Todos os direitos reservados**

Este projeto é propriedade intelectual dos desenvolvedores e do SENAI Conde Alexandre Siciliano. Não é permitida a reprodução, distribuição ou modificação sem autorização expressa.

---

## 🤝 Contribuições

Este é um projeto acadêmico concluído. Para sugestões ou feedback, entre em contato através dos canais institucionais do SENAI.

## 📞 Contato

- **Instituição**: SENAI Conde Alexandre Siciliano
- **Localização**: Jundiaí - São Paulo, Brasil
- **Ano de Conclusão**: 2025

---

<div align="center">

**💙 Desenvolvido com dedicação ao cuidado dos nossos idosos 💙**

</div>
