import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Phone, GraduationCap, Wallet, Plus } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getAluno, listTurmas, listMatriculas, listMensalidadesDoAluno } from "@/lib/supabase/escolas";
import { formatTelefone, formatData, formatBRL } from "@/lib/formatters";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/alunos/$id")({
  head: () => ({ meta: [{ title: "Aluno — ERP Escolas" }] }),
  component: AlunoDetalhe,
});

function AlunoDetalhe() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [openMatricula, setOpenMatricula] = useState(false);
  const [form, setForm] = useState({ turma_id: "", mensalidade: "", ano_letivo: "" });

  const { data: aluno, isLoading } = useQuery({ queryKey: ["aluno", id], queryFn: () => getAluno(id) });
  const { data: turmas } = useQuery({ queryKey: ["turmas"], queryFn: listTurmas });
  const { data: matriculas } = useQuery({ queryKey: ["matriculas-aluno", id], queryFn: () => listMatriculas() });
  const { data: mensalidades } = useQuery({ queryKey: ["mensalidades-aluno", id], queryFn: () => listMensalidadesDoAluno(id) });

  const matriculasAluno = (matriculas ?? []).filter((m) => m.aluno_id === id);

  const matricularMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/matricular", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          aluno_id: id,
          turma_id: form.turma_id || null,
          ano_letivo: form.ano_letivo,
          mensalidade: parseFloat(form.mensalidade) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.erro ?? "Falha ao matricular");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matriculas-aluno", id] });
      queryClient.invalidateQueries({ queryKey: ["mensalidades-aluno", id] });
      toast.success("Matrícula criada! 12 mensalidades geradas.");
      setOpenMatricula(false);
      setForm({ turma_id: "", mensalidade: "", ano_letivo: "" });
    },
    onError: (e) => toast.error(String(e)),
  });

  if (isLoading) {
    return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!aluno) {
    return <div className="py-16 text-center text-muted-foreground">Aluno não encontrado.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/alunos" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar para alunos
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">
            {aluno.nome.charAt(0)}
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">{aluno.nome}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {aluno.turma?.nome ?? "Sem turma"} · {aluno.status}
              {aluno.responsavel_telefone && (
                <span className="ml-3 inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {formatTelefone(aluno.responsavel_telefone)}</span>
              )}
            </p>
          </div>
        </div>
        <Button onClick={() => setOpenMatricula(true)} className="gradient-primary"><Plus className="mr-1.5 h-4 w-4" /> Matricular</Button>
      </div>

      {/* Resumo rápido */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <Card className="border-border/60 p-4 text-center">
          <GraduationCap className="mx-auto h-5 w-5 text-primary" />
          <p className="mt-1 text-2xl font-bold text-foreground">{matriculasAluno.length}</p>
          <p className="text-[11px] text-muted-foreground">Matrículas</p>
        </Card>
        <Card className="border-border/60 p-4 text-center">
          <Wallet className="mx-auto h-5 w-5 text-primary" />
          <p className="mt-1 text-2xl font-bold text-foreground">{(mensalidades ?? []).length}</p>
          <p className="text-[11px] text-muted-foreground">Mensalidades geradas</p>
        </Card>
        <Card className="border-border/60 p-4 text-center">
          <Wallet className="mx-auto h-5 w-5 text-success" />
          <p className="mt-1 text-2xl font-bold text-success">
            {formatBRL((mensalidades ?? []).filter((m) => m.status === "pago").reduce((s, m) => s + Number(m.valor), 0))}
          </p>
          <p className="text-[11px] text-muted-foreground">Total pago</p>
        </Card>
      </div>

      {/* Matrículas */}
      <h2 className="mt-8 font-display text-lg font-bold text-foreground">Matrículas</h2>
      <div className="mt-3 space-y-3">
        {matriculasAluno.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este aluno ainda não possui matrícula.</p>
        ) : (
          matriculasAluno.map((m) => (
            <Card key={m.id} className="border-border/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{m.ano_letivo} · {m.turma?.nome ?? "Sem turma"}</p>
                  <p className="text-xs text-muted-foreground">Mensalidade: {formatBRL(Number(m.mensalidade))} · status: {m.status}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Mensalidades */}
      <h2 className="mt-8 font-display text-lg font-bold text-foreground">Mensalidades do aluno</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-border/40">
        {(mensalidades ?? []).length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma mensalidade. Matricule o aluno para gerar o carnê anual.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {(mensalidades ?? []).map((m) => (
                <tr key={m.id} className="bg-card">
                  <td className="px-4 py-2.5">{formatData(m.vencimento)}</td>
                  <td className="px-4 py-2.5 font-medium">{formatBRL(Number(m.valor))}</td>
                  <td className="px-4 py-2.5 text-success">{formatBRL(Number(m.pago))}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      m.status === "pago" ? "border-success/30 bg-success/10 text-success"
                      : m.status === "parcial" ? "border-warning/30 bg-warning/10 text-warning"
                      : "border-border/40 text-muted-foreground"
                    }`}>{m.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Dialog matrícula */}
      <Dialog open={openMatricula} onOpenChange={setOpenMatricula}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /> Matricular aluno</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium">Turma</Label>
              <Select value={form.turma_id} onValueChange={(v) => setForm((f) => ({ ...f, turma_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar turma..." /></SelectTrigger>
                <SelectContent>
                  {(turmas ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Valor mensal (R$)</Label>
                <Input type="number" step="0.01" value={form.mensalidade} onChange={(e) => setForm((f) => ({ ...f, mensalidade: e.target.value }))} placeholder="0,00" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Ano letivo</Label>
                <Input value={form.ano_letivo} onChange={(e) => setForm((f) => ({ ...f, ano_letivo: e.target.value }))} placeholder={String(new Date().getFullYear())} className="mt-1" />
              </div>
            </div>
            <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              Ao matricular, o sistema gera <b>12 mensalidades</b> (fev–jan) no valor informado, com vencimento dia 10.
            </p>
            <Button onClick={() => matricularMutation.mutate()} disabled={matricularMutation.isPending || !form.mensalidade} className="w-full gradient-primary">
              {matricularMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Matricular e gerar mensalidades"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}