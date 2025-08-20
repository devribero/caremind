# Configuração do Supabase para o CareMind

## Passos para configurar o sistema de autenticação:

### 1. Criar projeto no Supabase
- Acesse [supabase.com](https://supabase.com)
- Crie uma nova conta ou faça login
- Crie um novo projeto
- Aguarde a criação do projeto

### 2. Obter credenciais
- No dashboard do projeto, vá para "Settings" > "API"
- Copie a "Project URL" e "anon public" key

### 3. Configurar variáveis de ambiente
Crie um arquivo `.env.local` na raiz do projeto com:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

### 4. Configurar autenticação
- No Supabase, vá para "Authentication" > "Settings"
- Em "Site URL", adicione: `http://localhost:3000`
- Em "Redirect URLs", adicione: `http://localhost:3000/dashboard`

### 5. Configurar políticas de segurança (opcional)
- Vá para "Authentication" > "Policies"
- Configure as políticas de acesso às suas tabelas conforme necessário

### 6. Testar o sistema
- Execute `npm run dev`
- Acesse `http://localhost:3000/login`
- Teste o cadastro e login

## Funcionalidades implementadas:

✅ Sistema de cadastro e login  
✅ Contexto de autenticação  
✅ Proteção de rotas  
✅ Página de dashboard protegida  
✅ Logout automático  
✅ Redirecionamento após login  
✅ Design responsivo e consistente  

## Estrutura de arquivos:

```
src/
├── contexts/
│   └── AuthContext.tsx          # Contexto de autenticação
├── components/
│   └── ProtectedRoute.tsx       # Componente de proteção de rota
├── app/
│   ├── login/
│   │   ├── page.tsx             # Página de login/cadastro
│   │   └── page.module.css      # Estilos da página de login
│   ├── dashboard/
│   │   ├── page.tsx             # Dashboard protegido
│   │   └── page.module.css      # Estilos do dashboard
│   └── layout.tsx               # Layout com AuthProvider
└── lib/
    └── supabaseClient.ts        # Cliente do Supabase
```

## Próximos passos sugeridos:

1. Implementar recuperação de senha
2. Adicionar autenticação social (Google, Facebook)
3. Implementar perfis de usuário
4. Adicionar validação de formulários mais robusta
5. Implementar refresh tokens
6. Adicionar testes automatizados
