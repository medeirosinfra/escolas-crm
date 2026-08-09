import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Users, School, GraduationCap, Wallet, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { getResumoEscola } from "@/lib/supabase/escolas";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "Dashboard — ERP Escolas" }] }),
  component: DashboardHome,
});

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function DashboardHome() {
  const { data: resumo, isLoading } = useQuery({ queryKey: ["resumo-escola"], queryFn: getResumoEscola });

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    { label: "Alunos ativos", value: String(resumo?.alunosAtivos ?? 0), icon: Users, sub: `${resumo?.alunos ?? 0} total` },
    { label: "Turmas", value: String(resumo?.turmas ?? 0), icon: School, sub: "ano letivo atual" },
    { label: "Professores", value: String(resumo?.professores ?? 0), icon: GraduationCap, sub: "corpo docente" },
    { label: "Mensalidades abertas", value: String(resumo?.mensalidadesAbertas ?? 0), icon: Wallet, sub: brl(resumo?.aReceber ?? 0) },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Visão geral da escola</p>
        </div>
        <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-success">Recebido este mês</p>
          <p className="font-display text-2xl font-bold text-success">{brl(resumo?.recebidoMes ?? 0)}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="border-border/60 p-5">
            <c.icon className="h-6 w-6 text-primary" />
            <p className="mt-3 font-display text-3xl font-bold text-foreground">{c.value}</p>
            <p className="text-sm font-medium text-foreground">{c.label}</p>
            <p className="text-[11px] text-muted-foreground">{c.sub}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6 border-amber-500/30 bg-amber-500/5 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
          <div>
            <p className="font-semibold text-amber-600">Atenção à inadimplência</p>
            <p className="text-sm text-muted-foreground">
              {resumo?.mensalidadesAbertas ?? 0} mensalidades pendentes somam{" "}
              <b className="text-foreground">{brl(resumo?.aReceber ?? 0)}</b> a receber. Acompanhe na página de Mensalidades.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}