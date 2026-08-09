import { supabase } from "./client";

// ============================================================
// Service Layer — ERP de Escolas (multi-tenant)
// Alunos, turmas, professores, matrículas, mensalidades.
// Reaproveita o padrão do crm-base (client supabase + RLS).
// ============================================================

// ---------------- TIPOS ----------------

export interface Turma {
  id: string;
  tenant_id: string;
  nome: string;
  serie?: string | null;
  turno?: string | null;
  ano_letivo?: number | null;
  capacidade?: number | null;
  created_at: string;
}

export interface Professor {
  id: string;
  tenant_id: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  especialidade?: string | null;
  created_at: string;
}

export interface Aluno {
  id: string;
  tenant_id: string;
  turma_id?: string | null;
  nome: string;
  cpf?: string | null;
  rg?: string | null;
  nascimento?: string | null;
  genero?: string | null;
  responsavel_nome?: string | null;
  responsavel_telefone?: string | null;
  responsavel_email?: string | null;
  email?: string | null;
  endereco?: string | null;
  status: "ativo" | "inativo" | "transferido";
  observacoes?: string | null;
  created_at: string;
  turma?: { nome: string } | null;
}

export interface Matricula {
  id: string;
  tenant_id: string;
  aluno_id: string;
  turma_id?: string | null;
  ano_letivo?: string | null;
  mensalidade: number;
  status: "ativa" | "trancada" | "concluida";
  created_at: string;
  aluno?: { nome: string } | null;
  turma?: { nome: string } | null;
}

export interface Mensalidade {
  id: string;
  tenant_id: string;
  matricula_id?: string | null;
  aluno_id?: string | null;
  vencimento: string;
  valor: number;
  pago: number;
  status: "pendente" | "pago" | "parcial" | "cancelado";
  pago_em?: string | null;
  created_at: string;
  aluno?: { nome: string } | null;
}

// ---------------- TURMAS ----------------

export async function listTurmas(): Promise<Turma[]> {
  const { data, error } = await supabase
    .from("turmas")
    .select("*")
    .order("nome", { ascending: true });
  if (error) throw new Error(`Erro ao listar turmas: ${error.message}`);
  return (data ?? []) as Turma[];
}

export async function createTurma(input: { nome: string; serie?: string; turno?: string; ano_letivo?: number; capacidade?: number }): Promise<Turma> {
  const { data, error } = await supabase
    .from("turmas")
    .insert({ nome: input.nome, serie: input.serie ?? null, turno: input.turno ?? null, ano_letivo: input.ano_letivo ?? null, capacidade: input.capacidade ?? 40 })
    .select()
    .single();
  if (error || !data) throw new Error(`Erro ao criar turma: ${error?.message ?? "desconhecido"}`);
  return data as Turma;
}

export async function updateTurma(id: string, input: Partial<Turma>): Promise<Turma> {
  const { data, error } = await supabase.from("turmas").update(input).eq("id", id).select().single();
  if (error || !data) throw new Error(`Erro ao atualizar turma: ${error.message}`);
  return data as Turma;
}

export async function deleteTurma(id: string): Promise<void> {
  const { error } = await supabase.from("turmas").delete().eq("id", id);
  if (error) throw new Error(`Erro ao excluir turma: ${error.message}`);
}

// ---------------- PROFESSORES ----------------

export async function listProfessores(): Promise<Professor[]> {
  const { data, error } = await supabase
    .from("professores")
    .select("*")
    .order("nome", { ascending: true });
  if (error) throw new Error(`Erro ao listar professores: ${error.message}`);
  return (data ?? []) as Professor[];
}

export async function createProfessor(input: Partial<Professor>): Promise<Professor> {
  const { data, error } = await supabase
    .from("professores")
    .insert({ nome: input.nome, telefone: input.telefone ?? null, email: input.email ?? null, especialidade: input.especialidade ?? null })
    .select()
    .single();
  if (error || !data) throw new Error(`Erro ao criar professor: ${error.message}`);
  return data as Professor;
}

export async function updateProfessor(id: string, input: Partial<Professor>): Promise<Professor> {
  const { data, error } = await supabase.from("professores").update(input).eq("id", id).select().single();
  if (error || !data) throw new Error(`Erro ao atualizar professor: ${error.message}`);
  return data as Professor;
}

export async function deleteProfessor(id: string): Promise<void> {
  const { error } = await supabase.from("professores").delete().eq("id", id);
  if (error) throw new Error(`Erro ao excluir professor: ${error.message}`);
}

// ---------------- ALUNOS ----------------

export async function listAlunos(): Promise<Aluno[]> {
  const { data, error } = await supabase
    .from("alunos")
    .select("*, turma:turmas(nome)")
    .order("nome", { ascending: true });
  if (error) throw new Error(`Erro ao listar alunos: ${error.message}`);
  return (data ?? []) as Aluno[];
}

export async function listAlunosPorTurma(turmaId: string): Promise<Aluno[]> {
  const { data, error } = await supabase
    .from("alunos")
    .select("*")
    .eq("turma_id", turmaId)
    .order("nome");
  if (error) throw new Error(`Erro ao listar alunos da turma: ${error.message}`);
  return (data ?? []) as Aluno[];
}

export async function getAluno(id: string): Promise<Aluno | null> {
  const { data, error } = await supabase
    .from("alunos")
    .select("*, turma:turmas(nome)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Erro ao buscar aluno: ${error.message}`);
  return (data ?? null) as Aluno | null;
}

export async function createAluno(input: Partial<Aluno>): Promise<Aluno> {
  const { data, error } = await supabase.from("alunos").insert(input).select().single();
  if (error || !data) throw new Error(`Erro ao criar aluno: ${error.message}`);
  return data as Aluno;
}

export async function updateAluno(id: string, input: Partial<Aluno>): Promise<Aluno> {
  const { data, error } = await supabase.from("alunos").update(input).eq("id", id).select().single();
  if (error || !data) throw new Error(`Erro ao atualizar aluno: ${error.message}`);
  return data as Aluno;
}

export async function deleteAluno(id: string): Promise<void> {
  const { error } = await supabase.from("alunos").delete().eq("id", id);
  if (error) throw new Error(`Erro ao excluir aluno: ${error.message}`);
}

// ---------------- MATRÍCULAS ----------------

export async function listMatriculas(): Promise<Matricula[]> {
  const { data, error } = await supabase
    .from("matriculas")
    .select("*, aluno:alunos(nome), turma:turmas(nome)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Erro ao listar matrículas: ${error.message}`);
  return (data ?? []) as Matricula[];
}

/** Cria matrícula + gera 12 mensalidades (fev–jan). input.mensalidade = valor mensal. */
export async function createMatricula(input: {
  aluno_id: string;
  turma_id?: string | null;
  ano_letivo?: string;
  mensalidade: number;
  inicio?: string; // mês inicial, ex '2026-01' ou '2026-02'
}): Promise<{ matricula: Matricula; totalMensalidades: number }> {
  const valor = Number(input.mensalidade) || 0;
  const { data: matricula, error } = await supabase
    .from("matriculas")
    .insert({
      aluno_id: input.aluno_id,
      turma_id: input.turma_id ?? null,
      ano_letivo: input.ano_letivo ?? String(new Date().getFullYear()),
      mensalidade: valor,
      status: "ativa",
    })
    .select()
    .single();
  if (error || !matricula) throw new Error(`Erro ao criar matrícula: ${error?.message ?? "desconhecido"}`);

  // Gera 12 mensalidades a partir do mês de início (padrão: fevereiro = mês 2)
  const ano = Number(input.ano_letivo) || new Date().getFullYear();
  const mesInicio = input.inicio ? parseInt(input.inicio.split("-")[1], 10) : 2; // fev padrão
  const mensalidades = Array.from({ length: 12 }, (_, i) => {
    let mes = mesInicio + i;
    let anoMes = ano;
    while (mes > 12) { mes -= 12; anoMes += 1; }
    return {
      tenant_id: matricula.tenant_id,
      matricula_id: matricula.id,
      aluno_id: input.aluno_id,
      vencimento: `${anoMes}-${String(mes).padStart(2, "0")}-10`,
      valor,
      pago: 0,
      status: "pendente",
    };
  });

  const { error: mErr } = await supabase.from("mensalidades").insert(mensalidades);
  if (mErr) {
    // Rollback da matrícula + mensalidades
    await supabase.from("matriculas").delete().eq("id", matricula.id);
    throw new Error(`Erro ao gerar mensalidades: ${mErr.message}`);
  }

  return { matricula: matricula as Matricula, mensalidadesGen: 12 };
}

export async function updateMatricula(id: string, input: Partial<Matricula>): Promise<Matricula> {
  const { data, error } = await supabase.from("matriculas").update(input).eq("id", id).select().single();
  if (error || !data) throw new Error(`Erro ao atualizar matrícula: ${error.message}`);
  return data as Matricula;
}

export async function deleteMatricula(id: string): Promise<void> {
  const { error } = await supabase.from("matriculas").delete().eq("id", id);
  if (error) throw new Error(`Erro ao excluir matrícula: ${error.message}`);
}

// ---------------- MENSALIDADES ----------------

export async function listMensalidades(): Promise<Mensalidade[]> {
  const { data, error } = await supabase
    .from("mensalidades")
    .select("*, aluno:alunos(nome)")
    .order("vencimento", { ascending: true });
  if (error) throw new Error(`Erro ao listar mensalidades: ${error.message}`);
  return (data ?? []) as Mensalidade[];
}

/** Lista mensalidades de um aluno. */
export async function listMensalidadesDoAluno(alunoId: string): Promise<Mensalidade[]> {
  const { data, error } = await supabase
    .from("mensalidades")
    .select("*")
    .eq("aluno_id", alunoId)
    .order("vencimento", { ascending: true });
  if (error) throw new Error(`Erro ao listar mensalidades do aluno: ${error.message}`);
  return (data ?? []) as Mensalidade[];
}

/** Dá baixa (parcial na total) numa mensalidade. */
export async function pagarMensalidade(id: string, valorPago: number): Promise<Mensalidade> {
  const valorInput = Math.round((Number(valorPago) || 0) * 100) / 100;
  if (valorInput <= 0) throw new Error("Valor inválido");

  const { data: mens, error: gErr } = await supabase.from("mensalidades").select("*").eq("id", id).single();
  if (gErr || !mens) throw new Error(`Erro ao buscar mensalidade: ${gErr?.message}`);

  const novoPago = Math.min(Math.round((Number(mens.pago) + valorInput) * 100) / 100, Number(mens.valor));
  const status = novoPago >= Number(mens.valor) ? "pago" : "parcial";

  const { data, error } = await supabase
    .from("mensalidades")
    .update({ pago: novoPago, status, pago_em: new Date().toISOString().slice(0, 10) })
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(`Erro ao dar baixa na mensalidade: ${error?.message}`);
  return data as Mensalidade;
}

// ---------------- DASHBOARD DADOS ----------------

export async function getResumoEscola(): Promise<{
  alunos: number;
  alunosAtivos: number;
  turmas: number;
  professores: number;
  mensalidadesAbertas: number;
  aReceber: number;
  recebidoMes: number;
}> {
  const [{ data: alunos }, { data: turmas }, { data: professores }, { data: mens }] = await Promise.all([
    supabase.from("alunos").select("id, status"),
    supabase.from("turmas").select("id"),
    supabase.from("professores").select("id"),
    supabase.from("mensalidades").select("valor, pago, status, vencimento"),
  ]);

  const mensAb = (mens ?? []).filter((m) => m.status === "pendente" || m.status === "parcial");
  const aReceber = mensAb.reduce((s, m) => s + (Number(m.valor) - Number(m.pago)), 0);
  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const recebidoMes = (mens ?? [])
    .filter((m) => m.status === "pago" && (m.vencimento ?? "").startsWith(mesAtual))
    .reduce((s, m) => s + Number(m.valor), 0);

  return {
    alunos: (alunos ?? []).length,
    alunosAtivos: (alunos ?? []).filter((a) => a.status === "ativo").length,
    turmas: (turmas ?? []).length,
    professores: (professores ?? []).length,
    mensalidadesAbertas: mensAb.length,
    aReceber,
    recebidoMes,
  };
}