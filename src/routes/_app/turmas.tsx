import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, Pencil, Trash2, Users, BookOpen } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { listTurmas, createTurma, updateTurma, deleteTurma, listAlunosPorTurma, type Turma } from "@/lib/supabase/escolas";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/turmas")({
  head: () => ({ meta: [{ title: "Turmas — ERP Escolas" }] }),
  component: TurmasPage,
});

function TurmasPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Turma | null>(null);
  const [form, setForm] = useState({ nome: "", serie: "", turno: "manha", ano_letivo: "" });

  const { data: turmas, isLoading } = useQuery({ queryKey: ["turmas"], queryFn: listTurmas });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const abrirEdicao = (t: Turma) => {
    setEditando(t);
    setForm({ nome: t.nome, serie: t.serie ?? "", turno: t.turno ?? "manho", ano_letivo: String(t.ano_letivo ?? "") });
    setOpen(true);
  };

  const criarMutation = useMutation({
    mutationFn: () => createTurma({
      nome: form.nome, serie: form.serie || undefined, turno: form.turno,
      ano_letivo: form.ano_letivo ? parseInt(form.ano_letivo) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
      toast.success("Turma criada!");
      setOpen(false);
      setForm({ nome: "", serie: "", turno: "manho", ano_letivo: "" });
    },
    onError: (e) => toast.error(String(e)),
  });

  const updateMutation = useMutation({
    mutationFn: () => updateTurma(editando!.id, {
      nome: form.nome, serie: form.serie || null, turno: form.turno || null,
      ano_letivo: form.ano_letivo ? parseInt(form.ano_letivo) : null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
      toast.success("Turma atualizada!");
      setOpen(false);
      setEditando(null);
    },
    onError: (e) => toast.error(String(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTurma(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["turmas"] }); toast.success("Turma excluída!"); },
    onError: (e) => toast.error(String(e)),
  });

  const contarAlunos = (id: string) => listAlunosPorTurma(id).then((a) => a.length);

  if (isLoading) {
    return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Turmas</h1>
          <p className="mt-1 text-sm text-muted-foreground">{turmas?.length ?? 0} turmas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary"><Plus className="mr-1.5 h-4 w-4" /> Nova Turma</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{editando ? "Editar Turma" : "Nova Turma"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium">Nome da turma *</Label>
                <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex: 3º Ano A" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Série</Label>
                  <Input value={form.serie} onChange={(e) => set("serie", e.target.value)} placeholder="Ex: 3º ano" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Turno</Label>
                  <Select value={form.turno} onValueChange={(v) => set("turno", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manho">Manhã</SelectItem>
                      <SelectItem value="tarde">Tarde</SelectItem>
                      <SelectItem value="noite">Noite</SelectItem>
                      <SelectItem value="integral">Integral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Ano letivo</Label>
                <Input value={form.ano_letivo} onChange={(e) => set("ano_letivo", e.target.value)} placeholder="2026" className="mt-1" />
              </div>
              <Button
                onClick={() => (editando ? updateMutation.mutate() : criarMutation.mutate())}
                disabled={(criarMutation.isPending || updateMutation.isPending) || !form.nome}
                className="w-full gradient-primary"
              >
                {(criarMutation.isPending || updateMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(turmas ?? []).map((t) => (
          <Card key={t.id} className="border-border/60 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{t.nome}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t.turno && ["manho", "tarde", "noite", "integral"].includes(t.turno)
                      ? t.turno.replace("manho", "Manhã").replace("tarde", "Tarde").replace("noite", "Noite").replace("integral", "Integral")
                      : t.turno} · {t.ano_letivo ?? "—"}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary" onClick={() => abrirEdicao(t)}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => { if (confirm(`Excluir a turma "${t.nome}"?`)) deleteMutation.mutate(t.id); }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>Alunos da turma</span>
            </div>
          </Card>
        ))}
        {(turmas ?? []).length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">Nenhuma turma cadastrada ainda.</p>
        )}
      </div>
    </div>
  );
}