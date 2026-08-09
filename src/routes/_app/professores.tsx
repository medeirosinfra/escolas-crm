import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, Pencil, Trash2, GraduationCap, Phone, Mail } from "lucide-react";
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
  listProfessores, createProfessor, updateProfessor, deleteProfessor, type Professor,
} from "@/lib/supabase/escolas";
import { formatTelefone } from "@/lib/formatters";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/professores")({
  head: () => ({ meta: [{ title: "Professores — ERP Escolas" }] }),
  component: ProfessoresPage,
});

function ProfessoresPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Professor | null>(null);
  const [form, setForm] = useState({ nome: "", telefone: "", email: "", especialidade: "" });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: professores, isLoading } = useQuery({ queryKey: ["professores"], queryFn: listProfessores });

  const abrirEdicao = (p: Professor) => {
    setEditando(p);
    setForm({ nome: p.nome, telefone: p.telefone ?? "", email: p.email ?? "", especialidade: p.especialidade ?? "" });
    setOpen(true);
  };

  const criarMutation = useMutation({
    mutationFn: () => createProfessor({ nome: form.nome, telefone: form.telefone || null, email: form.email || null, especialidade: form.especialidade || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professores"] });
      toast.success("Professor cadastrado!");
      setOpen(false);
      setForm({ nome: "", telefone: "", email: "", especialidade: "" });
    },
    onError: (e) => toast.error(String(e)),
  });

  const updateMutation = useMutation({
    mutationFn: () => updateProfessor(editando!.id, { nome: form.nome, telefone: form.telefone || null, email: form.email || null, especialidade: form.especialidade || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professores"] });
      toast.success("Professor atualizado!");
      setOpen(false);
      setEditando(null);
    },
    onError: (e) => toast.error(String(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProfessor(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["professores"] }); toast.success("Professor excluído!"); },
    onError: (e) => toast.error(String(e)),
  });

  if (isLoading) {
    return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Professores</h1>
          <p className="mt-1 text-sm text-muted-foreground">{professores?.length ?? 0} professores</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary"><Plus className="mr-1.5 h-4 w-4" /> Novo Professor</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{editando ? "Editar Professor" : "Novo Professor"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium">Nome completo *</Label>
                <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Telefone</Label>
                  <Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="(00) 00000-0000" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Disciplina / Especialidade</Label>
                <Input value={form.especialidade} onChange={(e) => set("especialidade", e.target.value)} placeholder="Ex: Matemática" className="mt-1" />
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
        {(professores ?? []).map((p) => (
          <Card key={p.id} className="border-border/60 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{p.nome}</p>
                  {p.especialidade && <p className="text-[11px] text-muted-foreground">{p.especialidade}</p>}
                </div>
              </div>
              <div className="flex gap-1">
                <button className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary" onClick={() => abrirEdicao(p)}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => { if (confirm(`Excluir o professor "${p.nome}"?`)) deleteMutation.mutate(p.id); }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              {p.telefone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {formatTelefone(p.telefone)}</p>}
              {p.email && <p className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3" /> {p.email}</p>}
            </div>
          </Card>
        ))}
        {(professores ?? []).length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">Nenhum professor cadastrado ainda.</p>
        )}
      </div>
    </div>
  );
}