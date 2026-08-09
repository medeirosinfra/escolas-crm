-- ============================================================
-- 001_escolas_schema.sql — Schema do ERP de Escolas (multi-tenant)
-- Banco dedicado: escolas_db (schema public)
-- Login GoTrue: schema auth copiado do supabase (baseline)
-- Padrão arquitetural: replicado do crm-base (RLS multi-tenant)
-- ============================================================

-- ------------------------------------------------------------
-- IMPORTANTE: funções current_tenant_id e is_super_admin são criadas
-- DEPOIS das tabelas (referenciam profiles). Ver bloco no fim.
-- ------------------------------------------------------------

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- tenants (escolas)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  subdominio text UNIQUE,
  especialidade text DEFAULT 'Ensino Fundamental e Médio',
  cor_primaria text DEFAULT '#3b82f6',
  cor_segundaria text DEFAULT '#0f172a',
  dominio text,
  plano text NOT NULL DEFAULT 'starter',
  status text NOT NULL DEFAULT 'ativa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tenants_subdominio ON public.tenants (subdominio) WHERE subdominio IS NOT NULL;

-- ------------------------------------------------------------
-- profiles (usuários)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text,
  email text,
  cargo text DEFAULT 'admin',  -- super_admin | admin | secretaria | financeiro | professor
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.profiles (tenant_id);

-- ------------------------------------------------------------
-- turmas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.turmas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,            -- ex: "3º Ano A", "1ª Série B"
  serie text,                    -- ex: "3º ano", "8º ano"
  turno text DEFAULT 'manha',    -- manha | tarde | noite | integral
  ano_letivo integer,
  capacidade integer DEFAULT 40,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_turmas_tenant ON public.turmas (tenant_id);

-- ------------------------------------------------------------
-- professores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.professores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  telefone text,
  email text,
  especialidade text,  -- ex: Matemática, Português
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_professores_tenant ON public.professores (tenant_id);

-- ------------------------------------------------------------
-- alunos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  turma_id uuid REFERENCES public.turmas(id) ON DELETE SET NULL,
  nome text NOT NULL,
  cpf text,
  rg text,
  nascimento date,
  genero text,
  responsavel_nome text,
  responsavel_telefone text,
  responsavel_email text,
  email text,
  endereco text,
  status text DEFAULT 'ativo',  -- ativo | inativo | transferido
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alunos_tenant ON public.alunos (tenant_id);
CREATE INDEX IF NOT EXISTS idx_alunos_turma ON public.alunos (turma_id);

-- ------------------------------------------------------------
-- matriculas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matriculas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  turma_id uuid REFERENCES public.turmas(id) ON DELETE SET NULL,
  ano_letivo text,
  mensalidade numeric(10,2) DEFAULT 0,   -- valor da mensalidade p/ esta matrícula
  status text DEFAULT 'ativa',             -- ativa | trancada | concluida
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_matriculas_tenant ON public.matriculas (tenant_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_aluno ON public.matriculas (aluno_id);

-- ------------------------------------------------------------
-- mensalidades (faturamento recorrente gerado ao matricular)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mensalidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  matricula_id uuid REFERENCES public.matriculas(id) ON DELETE CASCADE,
  aluno_id uuid REFERENCES public.alunos(id) ON DELETE SET NULL,
  vencimento date NOT NULL,
  valor numeric(10,2) NOT NULL DEFAULT 0,
  pago numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',  -- pendente | pago | parcial | cancelado
  pago_em date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mensalidades_tenant ON public.mensalidades (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mensalidades_aluno ON public.mensalidades (aluno_id);
CREATE INDEX IF NOT EXISTS idx_mensalidades_venc ON public.mensalidades (vencimento);

-- ------------------------------------------------------------
-- transacoes_financeiras (receitas/despesas)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transacoes_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  categoria_id uuid,
  descricao text NOT NULL,
  valor numeric(10,2) NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT 'receita',  -- receita | despesa
  data date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pago',   -- pago | pendente | cancelado
  aluno_id uuid REFERENCES public.alunos(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transacoes_tenant ON public.transacoes_financeiras (tenant_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_data ON public.transacoes_financeiras (data);

-- ------------------------------------------------------------
-- categorias_financeiras
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categorias_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text DEFAULT 'receita',  -- receita | despesa
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_categorias_tenant ON public.categorias_financeiras (tenant_id);

-- ============================================================
-- RLS — MULTI-TENANT (todas as operações pelo tenant ou super admin)
-- ============================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_financeiras ENABLE ROW LEVEL SECURITY;

-- tenants: select próprio/super admin; insert/update super admin
CREATE POLICY tenants_select_own ON public.tenants FOR SELECT
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
    OR id = current_tenant_id() OR is_super_admin());
CREATE POLICY tenants_admin_insert ON public.tenants FOR INSERT
  WITH CHECK (is_super_admin() OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role');
CREATE POLICY tenants_admin_update ON public.tenants FOR UPDATE
  USING (id = current_tenant_id() OR is_super_admin() OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role');

-- profiles (SEM current_tenant_id no select p/ evitar recursão — padrão supabase)
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT
  USING (id = auth.uid() OR is_super_admin());
CREATE POLICY profiles_insert_admin ON public.profiles FOR INSERT
  WITH CHECK (is_super_admin() OR (SELECT tenant_id FROM profiles WHERE id = auth.uid()) IS NOT NULL
    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role');

-- Turmas
CREATE POLICY turmas_select_tenant ON public.turmas FOR SELECT
  USING (tenant_id = current_tenant_id() OR is_super_admin());
CREATE POLICY turmas_insert_tenant ON public.turmas FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());
CREATE POLICY turmas_update_tenant ON public.turmas FOR UPDATE
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());
CREATE POLICY turmas_delete_tenant ON public.turmas FOR DELETE
  USING (tenant_id = current_tenant_id() OR is_super_admin());

-- Professores
CREATE POLICY professores_select_tenant ON public.professores FOR SELECT
  USING (tenant_id = current_tenant_id() OR is_super_admin());
CREATE POLICY professores_insert_tenant ON public.professores FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());
CREATE POLICY professores_update_tenant ON public.professores FOR UPDATE
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());
CREATE POLICY professores_delete_tenant ON public.professores FOR DELETE
  USING (tenant_id = current_tenant_id() OR is_super_admin());

-- Alunos
CREATE POLICY alunos_select_tenant ON public.alunos FOR SELECT
  USING (tenant_id = current_tenant_id() OR is_super_admin());
CREATE POLICY alunos_insert_tenant ON public.alunos FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());
CREATE POLICY alunos_update_tenant ON public.alunos FOR UPDATE
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());
CREATE POLICY alunos_delete_tenant ON public.alunos FOR DELETE
  USING (tenant_id = current_tenant_id() OR is_super_admin());

-- Matrículas
CREATE POLICY matriculas_select_tenant ON public.matriculas FOR SELECT
  USING (tenant_id = current_tenant_id() OR is_super_admin());
CREATE POLICY matriculas_insert_tenant ON public.matriculas FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());
CREATE POLICY matriculas_update_tenant ON public.matriculas FOR UPDATE
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());
CREATE POLICY matriculas_delete_tenant ON public.matriculas FOR DELETE
  USING (tenant_id = current_tenant_id() OR is_super_admin());

-- Mensalidades
CREATE POLICY mensalidades_select_tenant ON public.mensalidades FOR SELECT
  USING (tenant_id = current_tenant_id() OR is_super_admin());
CREATE POLICY mensalidades_insert_tenant ON public.mensalidades FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());
CREATE POLICY mensalidades_update_tenant ON public.mensalidades FOR UPDATE
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());
CREATE POLICY mensalidades_delete_tenant ON public.mensalidades FOR DELETE
  USING (tenant_id = current_tenant_id() OR is_super_admin());

-- Transações financeiras
CREATE POLICY transacoes_select_tenant ON public.transacoes_financeiras FOR SELECT
  USING (tenant_id = current_tenant_id() OR is_super_admin());
CREATE POLICY transacoes_insert_tenant ON public.transacoes_financeiras FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());
CREATE POLICY transacoes_update_tenant ON public.transacoes_financeiras FOR UPDATE
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());
CREATE POLICY transacoes_delete_tenant ON public.transacoes_financeiras FOR DELETE
  USING (tenant_id = current_tenant_id() OR is_super_admin());

-- Categorias financeiras
CREATE POLICY categorias_select_tenant ON public.categorias_financeiras FOR SELECT
  USING (tenant_id = current_tenant_id() OR is_super_admin());
CREATE POLICY categorias_insert_tenant ON public.categorias_financeiras FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());
CREATE POLICY categorias_update_tenant ON public.categorias_financeiras FOR UPDATE
  USING (tenant_id = current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());
CREATE POLICY categorias_delete_tenant ON public.categorias_financeiras FOR DELETE
  USING (tenant_id = current_tenant_id() OR is_super_admin());

-- Grants para o role anon/authenticated (Supabase)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================================
-- FUNÇÕES (devem ser criadas APÓS as tabelas — profiles)
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (NULLIF(auth.jwt() ->> 'tenant_id', ''))::uuid,
    (NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), ''))::uuid,
    (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND cargo = 'super_admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
