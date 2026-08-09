import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, Building2 } from "lucide-react";
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
import { toast } from "sonner";

export const Route = createFileRoute("/_app/master/")({
  head: () => ({ meta: [{ title: "Escolas — ERP Master" }] }),
  component: MasterPage,
});

const PLANOS = ["starter", "pro", "empresarial"];

function MasterPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "", slug: "", subdominio: "", adminNome: "", adminEmail: "", adminSenha: "",
    corPrimaria: "#3b82f6", plano: "starter",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["tenants-master"],
    queryFn: async () => {
      // Rota servidor com service_role (painel master listar TODAS as escolas)
      const res = await fetch("/api/escolas/lista");
      if (!res.ok) throw new Error("Falha ao listar escolas");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const criarMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/escolas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nome: form.nome,
          slug: form.slug || form.nome.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          subdominio: form.subdominio,
          adminNome: form.adminNome,
          adminEmail: form.adminEmail,
          adminSenha: form.adminSenha,
          corPrimaria: form.corPrimaria,
          plano: form.plano,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.erro ?? "Falha ao criar escola");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants-master"] });
      toast.success("Escola criada com admin automático!");
      setOpen(false);
      setForm({ nome: "", slug: "", subdominio: "", adminNome: "", adminEmail: "", adminSenha: "", corPrimaria: "#3b82f6", plano: "starter" });
    },
    onError: (e) => toast.error(String(e)),
  });

  if (isLoading) {
    return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Escolas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Painel Master — gerencie as escolas da plataforma</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary"><Plus className="mr-1.5 h-4 w-4" /> Nova Escola</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Cadastrar Escola</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium">Nome da escola *</Label>
                <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex: Colégio Alpha" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Slug (URL)</Label>
                  <Input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Subdomínio</Label>
                  <Input value={form.subdominio} onChange={(e) => set("subdominio", e.target.value)} placeholder="alpha" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Admin nome</Label>
                  <Input value={form.adminNome} onChange={(e) => set("adminNome", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Plano</Label>
                  <Select value={form.plano} onValueChange={(v) => set("plano", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLANOS.map((p) => <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Admin email *</Label>
                <Input type="email" value={form.adminEmail} onChange={(e) => set("adminEmail", e.target.value)} placeholder="admin@escola.com.br" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Admin senha *</Label>
                <Input type="text" value={form.adminSenha} onChange={(e) => set("adminSenha", e.target.value)} placeholder="senha inicial" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Cor principal</Label>
                <Input type="color" value={form.corPrimaria} onChange={(e) => set("corPrimaria", e.target.value)} className="mt-1 h-10 w-full" />
              </div>
              <Button
                onClick={() => criarMutation.mutate()}
                disabled={criarMutation.isPending || !form.nome || !form.adminEmail || !form.adminSenha}
                className="w-full gradient-primary font-semibold"
              >
                {criarMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar escola + admin"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(tenants ?? []).map((t: { id: string; nome: string; subdominio?: string | null; plano?: string | null; status?: string | null; cor_primaria?: string | null }) => (
          <Card key={t.id} className="border-border/60 p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl" style={{ backgroundColor: t.cor_primaria ?? "#3b82f6" }}>
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{t.nome}</p>
                <p className="text-[11px] text-muted-foreground">{t.subdominio ?? "sem subdomínio"}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full border border-border/40 px-2 py-0.5 text-muted-foreground">{t.plano}</span>
              <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-success">{t.status}</span>
            </div>
          </Card>
        ))}
        {(tenants ?? []).length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
            Nenhuma escola cadastrada. Clique em "Nova Escola" para começar.
          </p>
        )}
      </div>
    </div>
  );
}