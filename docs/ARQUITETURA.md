# ERP Escolas SaaS Multi-Tenant

Plataforma SaaS moderna e robusta para gestão escolar multi-tenant, desenvolvida com arquitetura de ponta para instituições de ensino.

## 🚀 Arquitetura & Stack Tecnológica

- **Frontend & SSR**: TanStack Start / TanStack Router / React 19
- **Estilização**: Tailwind CSS v4, Lucide Icons, Radix UI
- **Banco de Dados & Backend**: PostgreSQL 17 + Supabase Self-Hosted (Kong / GoTrue / PostgREST)
- **Containerização**: Docker & Docker Compose com redes e portas isoladas

---

## 🔒 Isolamento Absoluto (Design Multi-Tenant)
O ERP Escolas é totalmente isolado de outros produtos da suíte (como CRMs de clínicas), possuindo:
- Banco de dados dedicado (`escolas_db`).
- Stack Supabase própria (Kong porta `5442`, GoTrue, PostgREST).
- Domínio e roteamento exclusivos (`erp.medeirossolucoestech.com.br`).

---

## 📚 Módulos do Sistema
1. **Gestão de Alunos & Matrículas**: Cadastro completo, histórico e status acadêmico.
2. **Turmas & Professores**: Organização por série, turma e alocação docente.
3. **Financeiro Escolar**: Mensalidades, controle de inadimplência e fluxo de caixa.
4. **Painel Master**: Gestão centralizada de escolas e provisionamento automático de admins.

---

## 🛠️ Como Executar (Desenvolvimento & Produção)
```bash
docker compose up -d
```
