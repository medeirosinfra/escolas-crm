import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Loader2, Search, Phone, Pencil, Trash2, School } from "lucide-react";
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
import { listAlunos, createAluno, updateAluno, deleteAluno, listTurmas, type Aluno } from "@/lib/supabase/escolas";
import { formatTelefone, formatData } from "@/lib/formatters";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/alunos")({
  head: () => ({ meta: [{ title: "Alunos — ERP Escolas" }] }),
  component: AlunosPage,
});

function AlunosPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editando, setEditando] = useState<Aluno | null>(null);
  const [form, setForm] = useState({
    nome: "", cpf: "", rg: "", nascimento: "", genero: "",
    responsavel_nome: "", responsavel_telefone: "", responsavel_email: "", email: "",
    endereco: "", turma_id: "", observacoes: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: alunos, isLoading } = useQuery({ queryKey: ["alunos"], queryFn: listAlunos });
  const { data: turmas } = useQuery({ queryKey: ["turmas"], queryFn: listTurmas });

  const abrirEdicao = (a: Aluno) => {
    setEditando(a);
    setForm({
      nome: a.nome ?? "", cpf: a.cpf ?? "", rg: a.rg ?? "", nascimento: a.nascimento ?? "", genero: a.genero ?? "",
      responsavel_nome: a.responsavel_nome ?? "", responsavel_telefone: a.responsavel_telefone ?? "",
      responsavel_email: a.responsavel_email ?? "", email: a.email ?? "", endereco: a.endereco ?? "",
      turma_id: a.turma_id ?? "", observacoes: a.observacoes ?? "",
    });
    setOpenEdit(true);
  };

  const criarMutation = useMutation({
    mutationFn: () => createAluno({
      nome: form.nome, cpf: form.cpf || null, rg: form.rg || null,
      nascimento: form.nascimento || null, genero: form.genero || null,
      responsavel_nome: form.responsavel_nome || null, responsavel_telefone: form.responsavel_telefone || null,
      responsavel_email: form.responsavel_email || null, email: form.email || null,
      endereco: form.endereco || null, turma_id: form.turma_id || null, observacoes: form.observacoes || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      toast.success("Aluno cadastrado!");
      setOpen(false);
      setForm({ nome: "", cpf: "", rg: "", nascimento: "", genero: "", responsavel_nome: "", responsavel_telefone: "", responsavel_email: "", email: "", endereco: "", turma_id: "", observacoes: "" });
    },
    onError: (e) => toast.error(String(e)),
  });

  const updateMutation = useMutation({
    mutationFn: () => updateAluno(editando!.id, {
      nome: form.nome, cpf: form.cpf || null, rg: form.rg || null,
      nascimento: form.nascimento || null, genero: form.genero || null,
      responsavel_nome: form.responsavel_nome || null, responsavel_telefone: form.responsavel_telefone || null,
      responsavel_email: form.responsavel_email || null, email: form.email || null,
      endereco: form.endereco || null, turma_id: form.turma_id || null, observacoes: form.observacoes || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      toast.success("Aluno atualizado!");
      setOpenEdit(false);
      setEditando(null);
    },
    onError: (e) => toast.error(String(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAluno(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["alunos"] }); toast.success("Aluno excluído!"); },
    onError: (e) => toast.error(String(e)),
  });

  const filtrados = (alunos ?? []).filter((a) =>
    a.nome.toLowerCase().includes(search.toLowerCase()) ||
    (a.responsavel_telefone ?? "").includes(search) ||
    (a.cpf ?? "").includes(search),
  );

  if (isLoading) {
    return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Alunos</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filtrados.length} alunos</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar aluno..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-60" />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary"><Plus className="mr-1.5 h-4 w-4" /> Novo Aluno</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Cadastrar Aluno</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-medium">Nome completo *</Label>
                  <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Nome do aluno" className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium">CPF</Label>
                    <Input value={form.cpf} onChange={(e) => set("cpf", e.target.value)} placeholder="000.000.000-00" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Nascimento</Label>
                    <Input type="date" value={form.nascimento} onChange={(e) => set("nascimento", e.target.value)} className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium">Turma</Label>
                    <Select value={form.turma_id} onValueChange={(v) => set("turma_id", v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar turma..." /></SelectTrigger>
                      <SelectContent>
                        {(turmas ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Gênero</Label>
                    <Select value={form.genero} onValueChange={(v) => set("genero", v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="F">Feminino</SelectItem>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="X">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium">Responsável</Label>
                  <Input value={form.responsavel_nome} onChange={(e) => set("responsavel_nome", e.target.value)} placeholder="Nome do responsável" className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium">Telefone responsável</Label>
                    <Input value={form.responsavel_telefone} onChange={(e) => set("responsavel_telefone", e.target.value)} placeholder="(00) 00000-0000" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Email responsável</Label>
                    <Input type="email" value={form.responsavel_email} onChange={(e) => set("responsavel_email", e.target.value)} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium">Endereço</Label>
                  <Input value={form.endereco} onChange={(e) => set("endereco", e.target.value)} className="mt-1" />
                </div>
                <Button onClick={() => criarMutation.mutate()} disabled={criarMutation.isPending || !form.nome} className="w-full gradient-primary font-semibold">
                  {criarMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar aluno"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lista */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtrados.map((a) => (
          <Card key={a.id} className="border-border/60 p-4 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {a.nome.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{a.nome}</p>
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    {a.turma?.nome ? <><School className="h-3 w-3" /> {a.turma.nome}</> : "Sem turma"}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Link to="/alunos/$id" params={{ id: a.id }} className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary">
                  <School className="h-4 w-4" />
                </Link>
                <button className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary" onClick={() => abrirEdicao(a)}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => { if (confirm(`Excluir o aluno "${a.nome}"?`)) deleteMutation.mutate(a.id); }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {a.responsavel_nome && (
              <p className="mt-2 text-xs text-muted-foreground">Resp.: {a.responsavel_nome}</p>
            )}
            {a.responsavel_telefone && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" /> {formatTelefone(a.responsavel_telefone)}
              </p>
            )}
          </Card>
        ))}
        {filtrados.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
            {search ? "Nenhum aluno encontrado." : "Nenhum aluno cadastrado ainda. Clique em 'Novo Aluno'."}
          </p>
        )}
      </div>

      {/* Dialog edição */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Aluno</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium">Nome completo</Label>
              <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">CPF</Label>
                <Input value={form.cpf} onChange={(e) => set("cpf", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Nascimento</Label>
                <Input type="date" value={form.nascimento} onChange={(e) => set("nascimento", e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Turma</Label>
              <Select value={form.turma_id} onValueChange={(v) => set("turma_id", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="..." /></SelectTrigger>
                <SelectContent>
                  {(turmas ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Telefone responsável</Label>
                <Input value={form.responsavel_telefone} onChange={(e) => set("responsavel_telefone", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Email responsável</Label>
                <Input value={form.responsavel_email} onChange={(e) => set("responsavel_email", e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Observações</Label>
              <Input value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} className="mt-1" />
            </div>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="w-full gradient-primary">
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}