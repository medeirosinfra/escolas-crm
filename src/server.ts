import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

import { supabaseAdmin } from "./lib/supabase/server";

// ============================================================
// Entry SSR — ERP de Escolas
// Intercepta /api/* ANTES do router TanStack (padrão crm-base).
// ============================================================

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

const j = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

// ============================================================
// GET /api/escolas/lista — listar escolas (painel master, service_role)
// ============================================================
async function handleListarEscolas(): Promise<Response> {
  try {
    const { data, error } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return j({ data: data ?? [] });
  } catch (e) {
    return j({ erro: String((e as Error).message ?? e) }, 500);
  }
}

// ============================================================
// POST /api/escolas — criar escola + admin automático
// ============================================================
async function handleCriarEscola(request: Request): Promise<Response> {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      nome?: string;
      slug?: string;
      subdominio?: string;
      adminNome?: string;
      adminEmail?: string;
      adminSenha?: string;
      corPrimaria?: string;
      plano?: string;
    };

    if (!body.nome || !body.adminEmail || !body.adminSenha || !body.slug) {
      return j({ erro: "nome, slug, adminEmail e adminSenha são obrigatórios" }, 400);
    }

    // 1. Tenant (escola)
    const { data: tenant, error: tErr } = await supabaseAdmin.from("tenants").insert({
      nome: body.nome,
      slug: body.slug,
      subdominio: body.subdominio ?? body.slug,
      cor_primaria: body.corPrimaria ?? "#3b82f6",
      plano: body.plano ?? "starter",
      status: "ativa",
      especialidade: "Escola",
    }).select().single();
    if (tErr || !tenant) throw new Error(`Erro ao criar escola: ${tErr?.message ?? "desconhecido"}`);

    // 2. Usuário admin no auth
    const { data: authUser, error: uErr } = await supabaseAdmin.auth.admin.createUser({
      email: body.adminEmail,
      password: body.adminSenha,
      email_confirm: true,
      user_metadata: { tenant_id: tenant.id, cargo: "admin" },
    });
    if (uErr || !authUser.user) {
      await supabaseAdmin.from("tenants").delete().eq("id", tenant.id);
      throw new Error(`Erro ao criar admin: ${uErr?.message ?? "desconhecido"}`);
    }

    // 3. Profile admin
    const { error: pErr } = await supabaseAdmin.from("profiles").insert({
      id: authUser.user.id,
      tenant_id: tenant.id,
      nome: body.adminNome ?? body.nome,
      email: body.adminEmail,
      cargo: "admin",
    });
    if (pErr) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      await supabaseAdmin.from("tenants").delete().eq("id", tenant.id);
      throw new Error(`Erro ao criar perfil: ${pErr.message}`);
    }

    return j({ ok: true, id: tenant.id, credenciais: { email: body.adminEmail, senha: body.adminSenha } }, 201);
  } catch (e) {
    return j({ erro: String((e as Error).message ?? e) }, 500);
  }
}

// ============================================================
// POST /api/matricular — cria matrícula + gera 12 mensalidades
// (service_role — bypass RLS, geração em lote confiável)
// ============================================================
async function handleMatricular(request: Request): Promise<Response> {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      aluno_id?: string;
      turma_id?: string | null;
      ano_letivo?: string;
      mensalidade?: number;
      inicio?: string;
    };
    if (!body.aluno_id) return j({ erro: "aluno_id é obrigatório" }, 400);
    const valor = Number(body.mensalidade) || 0;
    if (valor <= 0) return j({ erro: "mensalidade deve ser maior que 0" }, 400);

    // Resolve tenant pelo aluno
    const { data: aluno } = await supabaseAdmin.from("alunos").select("tenant_id, id").eq("id", body.aluno_id).maybeSingle();
    if (!aluno) return j({ erro: "Aluno não encontrado" }, 404);
    const tenantId = (aluno as { tenant_id: string }).tenant_id;

    // Cria matrícula (tenant explícito)
    const { data: matricula, error: mErr } = await supabaseAdmin.from("matriculas").insert({
      tenant_id: tenantId,
      aluno_id: body.aluno_id,
      turma_id: body.turma_id ?? null,
      ano_letivo: body.ano_letivo ?? String(new Date().getFullYear()),
      mensalidade: valor,
      status: "ativa",
    }).select().single();
    if (mErr || !matricula) throw new Error(`Erro ao criar matrícula: ${mErr?.message}`);

    // Gera 12 mensalidades
    const ano = Number(body.ano_letivo) || new Date().getFullYear();
    const mesInicio = body.inicio ? parseInt(body.inicio.split("-")[1] ?? "", 10) : 2;
    const parcelas = Array.from({ length: 12 }, (_, i) => {
      let mes = (isNaN(mesInicio) ? 2 : mesInicio) + i;
      let anoM = ano;
      while (mes > 12) { mes -= 12; anoM += 1; }
      return {
        tenant_id: tenantId,
        matricula_id: matricula.id,
        aluno_id: body.aluno_id,
        vencimento: `${anoM}-${String(mes).padStart(2, "0")}-10`,
        valor,
        pago: 0,
        status: "pendente",
      };
    });
    const { error: pErr } = await supabaseAdmin.from("mensalidades").insert(parcelas);
    if (pErr) {
      await supabaseAdmin.from("matriculas").delete().eq("id", matricula.id);
      throw new Error(`Erro ao gerar mensalidades: ${pErr.message}`);
    }

    return j({ ok: true, matriculaId: matricula.id, mensalidades: 12 }, 201);
  } catch (e) {
    return j({ erro: String((e as Error).message ?? e) }, 500);
  }
}

// ============================================================
// POST /api/mensalidade/pagar — dar baixa + registrar receita
// ============================================================
async function handlePagarMensalidade(request: Request): Promise<Response> {
  try {
    const body = (await request.json().catch(() => ({}))) as { id?: string; valor?: number };
    if (!body.id) return j({ erro: "id é obrigatório" }, 400);
    const valor = Math.round((Number(body.valor) || 0) * 100) / 100;
    if (valor <= 0) return j({ erro: "valor inválido" }, 400);

    const { data: mens, error: gErr } = await supabaseAdmin.from("mensalidades").select("*").eq("id", body.id).single();
    if (gErr || !mens) return j({ erro: "Mensalidade não encontrada" }, 404);

    const novoPago = Math.min(Math.round((Number(mens.pago) + valor) * 100) / 100, Number(mens.valor));
    const status = novoPago >= Number(mens.valor) ? "pago" : "parcial";
    const { error: uErr } = await supabaseAdmin.from("mensalidades").update({ pago: novoPago, status, pago_em: new Date().toISOString().slice(0, 10) }).eq("id", body.id);
    if (uErr) throw new Error(`Erro ao dar baixa: ${uErr.message}`);

    // Registra receita financeira
    const receita = Math.round((novoPago - Number(mens.pago)) * 100) / 100;
    if (receita > 0) {
      const { data: aluno } = await supabaseAdmin.from("alunos").select("nome").eq("id", mens.aluno_id ?? "").maybeSingle();
      await supabaseAdmin.from("transacoes_financeiras").insert({
        tenant_id: mens.tenant_id,
        descricao: `Mensalidade ${mens.vencimento.slice(0, 7)}${aluno ? ` — ${(aluno as { nome: string }).nome}` : ""}`,
        valor: receita,
        tipo: "receita",
        data: new Date().toISOString().slice(0, 10),
        status: "pago",
        aluno_id: mens.aluno_id ?? null,
      });
    }

    return j({ ok: true, status });
  } catch (e) {
    return j({ erro: String((e as Error).message ?? e) }, 500);
  }
}

// ============================================================
// Dispatcher
// ============================================================
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    const path = url.pathname;

    // API REST — intercepta antes do router (padrão comprovado)
    if (path === "/api/escolas/lista" && request.method === "GET") return handleListarEscolas();
    if (path.startsWith("/api/escolas") && request.method === "POST") return handleCriarEscola(request);
    if (path === "/api/matricular" && request.method === "POST") return handleMatricular(request);
    if (path === "/api/mensalidade/pagar" && request.method === "POST") return handlePagarMensalidade(request);

    // Tenant branding por subdomínio
    if (path.startsWith("/api/tenant/") && request.method === "GET") {
      const sub = path.split("/").pop()?.toLowerCase();
      if (sub) {
        const { data } = await supabaseAdmin.from("tenants").select("id, nome, cor_primaria, cor_segundaria").eq("subdominio", sub).maybeSingle();
        return j(data ?? { erro: "não encontrado" }, data ? 200 : 404);
      }
      return j({ erro: "sub inválido" }, 400);
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return response;
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}