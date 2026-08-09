import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trophy, Users, DollarSign, Loader2, Trash2, CheckCircle2, XCircle, Calendar, Award } from "lucide-react";
import { useState, type FormEvent } from "react";
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
import {
  listCampeonatos, createCampeonato, deleteCampeonato,
  listParticipantes, addParticipante, removeParticipante, togglePagamentoParticipante,
  listAlunos, listTurmas,
  type Campeonato, type CampeonatoParticipante, type Aluno, type Turma
} from "@/lib/supabase/escolas";
import { formatBRL, formatData } from "@/lib/formatters";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/campeonatos")({
  head: () => ({ meta: [{ title: "Campeonatos & Eventos — ERP Escolas" }] }),
  component: CampeonatosPage,
});

function CampeonatosPage() {
  const queryClient = useQueryClient();
  const [selectedCamp, setSelectedCamp] = useState<Campeonato | null>(null);
  const [criarOpen, setCriarOpen] = useState(false);
  const [participanteOpen, setParticipanteOpen] = useState(false);

  // Form novo campeonato
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [valorContrib, setValorContrib] = useState("0");

  // Form adicionar participante
  const [alunoId, setAlunoId] = useState("");
  const [turmaId, setTurmaId] = useState("");

  const { data: campeonatos, isLoading: loadingCamp } = useQuery({ queryKey: ["campeonatos"], queryFn: listCampeonatos });
  const { data: participantes, isLoading: loadingPart } = useQuery({
    queryKey: ["participantes", selectedCamp?.id],
    queryFn: () => (selectedCamp ? listParticipantes(selectedCamp.id) : Promise.resolve([])),
    enabled: !!selectedCamp,
  });
  const { data: alunos } = useQuery({ queryKey: ["alunos"], queryFn: listAlunos });
  const { data: turmas } = useQuery({ queryKey: ["turmas"], queryFn: listTurmas });

  const createCampMutation = useMutation({
    mutationFn: () => createCampeonato({
      nome,
      descricao: descricao || null,
      data_inicio: dataInicio || null,
      data_fim: dataFim || null,
      valor_contribuicao: parseFloat(valorContrib) || 0,
      status: "ativo",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campeonatos"] });
      toast.success("Campeonato criado com sucesso!");
      setCriarOpen(false);
      setNome(""); setDescricao(""); setDataInicio(""); setDataFim(""); setValorContrib("0");
    },
    onError: (e) => toast.error(String(e)),
  });

  const deleteCampMutation = useMutation({
    mutationFn: deleteCampeonato,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campeonatos"] });
      toast.success("Campeonato excluído");
      if (selectedCamp) setSelectedCamp(null);
    },
    onError: (e) => toast.error(String(e)),
  });

  const addPartMutation = useMutation({
    mutationFn: () => {
      if (!selectedCamp || !alunoId) throw new Error("Selecione o aluno");
      return addParticipante({
        campeonato_id: selectedCamp.id,
        aluno_id: alunoId,
        turma_id: turmaId || null,
        pago: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participantes", selectedCamp?.id] });
      toast.success("Participante adicionado!");
      setParticipanteOpen(false);
      setAlunoId(""); setTurmaId("");
    },
    onError: (e) => toast.error(String(e)),
  });

  const removePartMutation = useMutation({
    mutationFn: removeParticipante,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participantes", selectedCamp?.id] });
      toast.success("Participante removido");
    },
    onError: (e) => toast.error(String(e)),
  });

  const togglePagoMutation = useMutation({
    mutationFn: ({ id, pago }: { id: string; pago: boolean }) => togglePagamentoParticipante(id, pago),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participantes", selectedCamp?.id] });
      toast.success("Status de pagamento atualizado!");
    },
    onError: (e) => toast.error(String(e)),
  });

  if (loadingCamp) {
    return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Campeonatos & Eventos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie campeonatos esportivos, alunos participantes e taxas de contribuição.</p>
        </div>
        <Button onClick={() => setCriarOpen(true)} className="gradient-primary font-semibold shadow-glow">
          <Plus className="mr-1.5 h-4 w-4" /> Novo Campeonato
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Lista de Campeonatos */}
        <div className="space-y-4 lg:col-span-1">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Campeonatos Ativos</h2>
          {campeonatos?.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">Nenhum campeonato cadastrado.</Card>
          ) : (
            campeonatos?.map((c) => {
              const isSelected = selectedCamp?.id === c.id;
              return (
                <Card
                  key={c.id}
                  onClick={() => setSelectedCamp(c)}
                  className={`cursor-pointer border p-5 transition-all hover:border-primary/50 ${
                    isSelected ? "border-primary bg-primary/5 shadow-glow" : "border-border/60 bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="inline-flex items-center rounded-md bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {formatBRL(Number(c.valor_contribuicao))} taxa
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm(`Excluir ${c.nome}?`)) deleteCampMutation.mutate(c.id); }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <h3 className="mt-3 font-display text-lg font-bold text-foreground">{c.nome}</h3>
                  {c.descricao && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{c.descricao}</p>}
                  {c.data_inicio && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 text-primary" /> {formatData(c.data_inicio)} {c.data_fim ? `até ${formatData(c.data_fim)}` : ""}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>

        {/* Detalhes do Campeonato Selecionado & Participantes */}
        <div className="lg:col-span-2">
          {selectedCamp ? (
            <Card className="border-border/60 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-5">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary">Detalhes do Evento</span>
                  <h2 className="font-display text-2xl font-bold text-foreground">{selectedCamp.nome}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedCamp.descricao || "Sem descrição."}</p>
                </div>
                <Button onClick={() => setParticipanteOpen(true)} className="gradient-primary font-semibold">
                  <Users className="mr-1.5 h-4 w-4" /> Adicionar Aluno / Turma
                </Button>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border/40 bg-muted/30 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Taxa de Contribuição</p>
                  <p className="mt-1 font-display text-xl font-bold text-foreground">{formatBRL(Number(selectedCamp.valor_contribuicao))}</p>
                </div>
                <div className="rounded-xl border border-border/40 bg-muted/30 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Total Participantes</p>
                  <p className="mt-1 font-display text-xl font-bold text-primary">{participantes?.length ?? 0}</p>
                </div>
                <div className="rounded-xl border border-border/40 bg-muted/30 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Arrecadação Prevista</p>
                  <p className="mt-1 font-display text-xl font-bold text-success">
                    {formatBRL((participantes?.length ?? 0) * Number(selectedCamp.valor_contribuicao))}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Alunos Inscritos</h3>
                {loadingPart ? (
                  <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : participantes?.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">Nenhum aluno inscrito neste campeonato ainda.</p>
                ) : (
                  <div className="mt-4 overflow-hidden rounded-xl border border-border/40">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr className="text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                          <th className="px-4 py-3">Aluno</th>
                          <th className="px-4 py-3">Turma</th>
                          <th className="px-4 py-3">Contribuição</th>
                          <th className="px-4 py-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {participantes?.map((p) => (
                          <tr key={p.id} className="bg-card hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium">{p.aluno?.nome ?? "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{p.turma?.nome ?? "Geral"}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => togglePagoMutation.mutate({ id: p.id, pago: !p.pago })}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                                  p.pago ? "border-success/30 bg-success/10 text-success hover:bg-success/20" : "border-warning/30 bg-warning/10 text-warning hover:bg-warning/20"
                                }`}
                              >
                                {p.pago ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                {p.pago ? "Pago" : "Pendente"}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => removePartMutation.mutate(p.id)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="grid place-items-center border-border/60 p-16 text-center">
              <Award className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 font-display text-lg font-bold text-foreground">Nenhum campeonato selecionado</h3>
              <p className="mt-1 text-sm text-muted-foreground">Selecione um campeonato à esquerda para ver os detalhes e gerenciar os alunos participantes.</p>
            </Card>
          )}
        </div>
      </div>

      {/* Modal Novo Campeonato */}
      <Dialog open={criarOpen} onOpenChange={setCriarOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Criar Novo Campeonato</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); if (nome.trim()) createCampMutation.mutate(); }} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nome do Campeonato *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex: Copa Intercolegial de Futsal" className="mt-1.5 h-11" required />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Descrição</Label>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Regras, local, premiação..." className="mt-1.5 h-11" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Data Início</Label>
                <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="mt-1.5 h-11" />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Data Fim</Label>
                <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="mt-1.5 h-11" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Valor da Contribuição (R$)</Label>
              <Input type="number" step="0.01" value={valorContrib} onChange={(e) => setValorContrib(e.target.value)} className="mt-1.5 h-11 font-mono" required />
            </div>
            <Button type="submit" disabled={createCampMutation.isPending} className="gradient-primary w-full font-semibold">
              {createCampMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Campeonato"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Adicionar Participante */}
      <Dialog open={participanteOpen} onOpenChange={setParticipanteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Inscrever Aluno no Campeonato</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addPartMutation.mutate(); }} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Aluno *</Label>
              <Select value={alunoId} onValueChange={setAlunoId}>
                <SelectTrigger className="mt-1.5 h-11"><SelectValue placeholder="Selecione o aluno..." /></SelectTrigger>
                <SelectContent>
                  {alunos?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Turma (Opcional)</Label>
              <Select value={turmaId} onValueChange={setTurmaId}>
                <SelectTrigger className="mt-1.5 h-11"><SelectValue placeholder="Selecione a turma..." /></SelectTrigger>
                <SelectContent>
                  {turmas?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={addPartMutation.isPending || !alunoId} className="gradient-primary w-full font-semibold">
              {addPartMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Inscrever Aluno"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
