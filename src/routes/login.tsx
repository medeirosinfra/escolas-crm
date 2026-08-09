import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, LogIn, GraduationCap } from "lucide-react";
import { useState, useEffect, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — ERP Escolas" }, { name: "robots", content: "noindex" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { signIn, user, isMaster, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingForm, setLoadingForm] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: isMaster ? "/master" : "/" });
    }
  }, [loading, user, isMaster, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoadingForm(true);
    const { error: signInError } = await signIn(email.trim(), senha);
    setLoadingForm(false);
    if (signInError) setError(signInError);
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <GraduationCap className="h-8 w-8" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-foreground">ERP de Escolas</h1>
            <p className="text-sm text-muted-foreground">Acesse o painel da sua escola</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <div>
            <Label className="text-xs font-medium">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@escola.com.br" required className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium">Senha</Label>
            <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" required className="mt-1" />
          </div>
          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" disabled={loadingForm} className="w-full">
            {loadingForm ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}