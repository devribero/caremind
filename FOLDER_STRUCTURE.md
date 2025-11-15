# 📁 CareMind - Estrutura de Pastas Reorganizada

## Visão Geral
A estrutura de pastas foi reorganizada seguindo o padrão arquitetural maduro para Next.js 15 com App Router.

```
/
├── /app/ # App Router (o coração do aplicativo)
│   ├── (public)/ # Grupo de rotas públicas
│   │   ├── about/
│   │   ├── blog/
│   │   ├── contato/
│   │   ├── cookies/
│   │   ├── ajuda/
│   │   ├── politica-privacidade/
│   │   ├── privacidade/
│   │   ├── reset-password/
│   │   ├── seguranca/
│   │   ├── sobre/
│   │   ├── termos/
│   │   ├── status/
│   │   ├── funcionalidades/
│   │   └── layout.tsx # Layout compartilhado com Footer
│   │
│   ├── (private)/ # Grupo de rotas protegidas por autenticação
│   │   ├── (dashboard)/ # Grupo de rotas do dashboard
│   │   │   ├── dashboard/
│   │   │   ├── compromissos/
│   │   │   ├── configuracoes/
│   │   │   ├── familia/
│   │   │   ├── familiar-dashboard/
│   │   │   ├── integracoes/
│   │   │   ├── perfil/
│   │   │   ├── relatorios/
│   │   │   ├── remedios/
│   │   │   ├── rotinas/
│   │   │   └── layout.tsx # Layout do dashboard
│   │   ├── offline/
│   │   ├── onboarding/
│   │   └── layout.tsx # Layout privado geral (proteção de rotas)
│   │
│   ├── (auth)/ # Grupo de rotas de autenticação
│   │   ├── auth/
│   │   │   └── page.tsx
│   │   └── layout.tsx # Redireciona usuários autenticados
│   │
│   ├── /api/ # API Routes / Backend
│   │   ├── auth/
│   │   ├── change-password/
│   │   ├── compromissos/
│   │   ├── criar-idoso/
│   │   ├── historico_eventos/
│   │   ├── medicamentos/
│   │   ├── perfil/
│   │   ├── relatorios/
│   │   ├── rotinas/
│   │   └── vinculos/
│   │
│   ├── global.css # Estilos globais (Tailwind)
│   ├── layout.tsx # Root Layout
│   ├── page.tsx # Homepage
│   └── middleware.ts # Middleware global
│
├── /components/ # Componentes React organizados por tipo
│   ├── /ui/ # Componentes de UI "dumb" reutilizáveis
│   │   └── button.tsx
│   │
│   ├── /shared/ # Componentes complexos globais
│   │   ├── ClientAreaHeader.tsx
│   │   ├── Footer.tsx
│   │   ├── Waves.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── DevUnhandledRejectionLogger.tsx
│   │   ├── /layout/
│   │   │   └── AppLayout.tsx
│   │   ├── /Header/
│   │   └── /headers/
│   │
│   └── /features/ # Componentes específicos de funcionalidades
│       ├── ConfirmDialog.tsx
│       ├── DashboardClient.tsx
│       ├── EditProfileModal.tsx
│       ├── FullScreenLoader.tsx
│       ├── InstallPWA.tsx
│       ├── Modal.tsx
│       ├── MedicamentoCard.tsx
│       ├── RotinasCard.tsx
│       ├── Toast.tsx
│       ├── /dashboard/
│       ├── /forms/
│       ├── /modals/
│       │   ├── AddIdosoModal.tsx
│       │   ├── AddEditCompromissoModal.tsx
│       │   └── ...
│       └── /perfil/
│           └── GerenciarIdososVinculados.tsx
│
├── /lib/ # Lógica de negócios e utilitários (não-React)
│   ├── /actions/ # Server Actions (Next.js)
│   ├── /validators/ # Esquemas de validação (ex: Zod)
│   ├── /utils/ # Funções utilitárias gerais
│   │   ├── index.ts # Funções principais
│   │   └── medicamentoUtils.ts # Utilitários específicos
│   ├── /services/ # Serviços de integração
│   └── /supabase/ # Configuração Supabase
│       ├── client.ts # Client Supabase (browser)
│       └── server.ts # Server Supabase (API/Server Components)
│
├── /hooks/ # Custom React Hooks
│   ├── index.ts
│   ├── use-pwa.ts
│   ├── useApiRequest.ts
│   ├── useAuthRequest.ts
│   ├── useCrudOperations.ts
│   ├── useModalState.ts
│   ├── useOptimisticUpdates.ts
│   ├── useOptimizedNavigation.ts
│   └── usePersistentState.ts
│
├── /contexts/ # React Contexts
│   ├── AuthContext.tsx
│   ├── IdosoContext.tsx
│   ├── LoadingContext.tsx
│   └── ProfileContext.tsx
│
├── /public/ # Assets estáticos
│   ├── /icons/
│   ├── /images/
│   ├── favicon.ico
│   ├── manifest.json
│   └── ...
│
├── .eslintrc.mjs # Configuração ESLint
├── next.config.ts # Configuração Next.js
├── tsconfig.json # Configuração TypeScript
└── package.json # Dependências do projeto
```

## 🎯 Benefícios da Reorganização

### 1. **Separação Clara de Responsabilidades**
- **`(public)`**: Rotas acessíveis para todos
- **`(private)`**: Rotas protegidas por autenticação
- **`(auth)`**: Rotas de autenticação exclusivas

### 2. **Componentes Bem Organizados**
- **`/ui/`**: Botões, inputs, cards - componentes agnósticos
- **`/shared/`**: Headers, Footers, Layouts - componentes reutilizados em múltiplas seções
- **`/features/`**: Componentes específicos da negócio (MedicamentoCard, RotinasCard, etc)

### 3. **Escalabilidade**
- Fácil adicionar novas rotas, layouts e componentes
- Estrutura clara facilita onboarding de novos desenvolvedores
- Evita chaos de componentes em um único diretório

### 4. **Melhor Manutenibilidade**
- Componentes relacionados ficam próximos
- Imports mais previsíveis e organizados
- Facilita refatoração futura

## 📍 Onde Adicionar Novos Componentes?

### Um novo componente de botão customizado?
→ `/components/ui/`

### Uma barra de navegação ou card compartilhado?
→ `/components/shared/`

### Um modal específico para gerenciar medicamentos?
→ `/components/features/modals/`

### Uma função utilitária para formatação?
→ `/lib/utils/`

## 🔄 Migração de Imports

Todos os imports foram atualizados automaticamente. Exemplos:

**Antes:**
```typescript
import { Footer } from "@/components/Footer";
import { Modal } from "@/components/Modal";
import AppLayout from "@/components/layout/AppLayout";
```

**Depois:**
```typescript
import { Footer } from "@/components/shared/Footer";
import { Modal } from "@/components/features/Modal";
import AppLayout from "@/components/shared/layout/AppLayout";
```

## ✅ Checklist de Conclusão

- ✓ Reorganização de rotas públicas em `(public)`
- ✓ Organização de rotas privadas em `(private)`
- ✓ Separação de rotas de autenticação em `(auth)`
- ✓ Reorganização de componentes em `/ui/`, `/shared/`, `/features/`
- ✓ Reorganização de `/lib/` com sub-pastas
- ✓ Atualização de todos os imports no projeto
- ✓ Criação de layouts para grupos de rotas
- ✓ Build compilado com sucesso ✓

---

**Data da Reorganização:** 15 de Novembro de 2025  
**Status:** ✓ Completo e testado
