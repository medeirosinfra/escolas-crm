import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Wallet, CheckCircle2 } from "lucide-react";
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
import { listMensalidades, pagarMensalidade, type Mensalidade } from "@/lib/supabase/escolas";
import { formatBRL, formatData } from "@/lib/formatters";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/mensalidades")({
  head: () => ({ meta: [{ title: "Mensalidades — ERP Escolas" }] }),
  component: MensalidadesPage,
});

function MensalidadesPage() {
  const queryClient = useQueryClient();
  const [filtro, setFiltro] = useState("todas");
  const [target, setTarget] = useState<Mensalidade | null>(null);
  const [valor, setValor] = useState("");

  const { data: mensalidades, isLoading } = useQuery({ queryKey: ["mensalidades"], queryFn: listMensalidades });

  const pagarMutation = useMutation({
    mutationFn: async (m: Mensalidade) => {
      const res = await fetch("/api/mensalidade/pagar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: m.id, valor: parseFloat(valor.replace(",", ".")) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.erro ?? "Erro ao dar baixa");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mensalidades"] });
      toast.success("Mensalidade paga!");
      setTarget(null);
      setValor("");
    },
    onError: (e) => toast.error(String(e)),
  });

  const abrirBaixa = (m: Mensalidade) => {
    setTarget(m);
    setValor(String(Number(m.valor) - Number(m.pago)));
  };

  const filtradas = (mensalidades ?? []).filter((m) => {
    if (filtro === "pendentes") return m.status === "pendente" || m.status === "parcial";
    if (filtro === "pagas") return m.status === "pago";
    return true;
  });

  const totalAberto = (mensalidades ?? [])
    .filter((m) => m.status === "pendente" || m.status === "parcial")
    .reduce((s, m) => s + (Number(m.valor) - Number(m.pago)), 0);

  if (isLoading) {
    return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Mensalidades</h1>
          <p className="mt-1 text-sm text-muted-foreground">{mensalidades?.length ?? 0} mensalidades geradas</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="pendentes">Pendentes</SelectItem>
              <SelectItem value="pagas">Pagas</SelectItem>
            </SelectContent>
          </Select>
          <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2 text-right">
            <p className="text-[11px] font-semibold uppercase text-warning">A receber</p>
            <p className="font-display text-lg font-bold text-warning">{formatBRL(totalAberto)}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border/40">
        {filtrados.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma mensalidade neste filtro.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                <th className="px-4 py-3">Aluno</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-right">Pago</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtrados.map((m) => (
                <tr key={m.id} className="bg-card hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{m.aluno?.nome ?? "—"}</td>
                  <td className="px-4 py-2.5">{formatData(m.vencimento)}</td>
                  <td className="px-4 py-2.5 text-right">{formatBRL(Number(m.valor))}</td>
                  <td className="px-4 py-2.5 text-right text-success">{formatBRL(Number(m.pago))}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      m.status === "pago" ? "border-success/30 bg-success/10 text-success"
                      : m.status === "parcial" ? "border-warning/30 bg-warning/10 text-warning"
                      : m.status === "cancelado" ? "border-border/40 text-muted-foreground"
                      : "border-primary/30 bg-primary/10 text-primary"
                    }`}>
                      {m.status === "pago" ? "Pago" : m.status === "parcial" ? "Parcial" : m.status === "cancelado" ? "Cancelado" : "Pendente"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {m.status !== "pago" ? (
                      <Button size="sm" variant="outline" className="h-8 text-[11px] font-semibold text-success hover:bg-success/10" onClick={() => abrirBaixa(m)}>
                        <Wallet className="mr-1 h-3.5 w-3.5" /> Receber
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Pago
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Dialog baixa */}
      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> Receber mensalidade</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Aluno: <b className="text-foreground">{target?.aluno?.nome}</b> · Vencimento {target ? formatData(target.vencimento) : ""}
            </p>
            <div>
              <Label className="text-xs font-medium">Valor recebido (R$)</Label>
              <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus className="mt-1" />
            </div>
            <Button
              onClick={() => target && pagarMutation.mutate(target)}
              disabled={pagarMutation.isPending}
              className="w-full gradient-primary"
            >
              {pagarMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar pagamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}