import { createFileRoute, Outlet, Link, useRouterState, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  School,
  BookOpen,
  Wallet,
  LogOut,
  Menu,
  X,
  Building2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/require-auth";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { tenantNome, tenantId, cargo, signOut } = useAuth();
  const routerState = useRouterState();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isMaster = cargo === "super_admin";
  const basePath = isMaster ? "/master" : "";

  const links = isMaster
    ? [
        { to: "/master", label: "Escolas", icon: Building2 },
      ]
    : [
        { to: "/", label: "Dashboard", icon: LayoutDashboard },
        { to: "/alunos", label: "Alunos", icon: Users },
        { to: "/turmas", label: "Turmas", icon: BookOpen },
        { to: "/professores", label: "Professores", icon: GraduationCap },
        { to: "/mensalidades", label: "Mensalidades", icon: Wallet },
      ];

  const currentPath = routerState.location.pathname;

  const handleSignOut = async () => {
    await signOut();
    router.invalidate();
    window.location.href = "/login";
  };

  return (
    <RequireAuth>
      <div className="flex min-h-screen bg-background">
        {/* Sidebar desktop */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border/60 bg-card lg:flex">
          <div className="flex items-center gap-2 border-b border-border/40 px-5 py-5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold text-foreground">
                {isMaster ? "Painel Master" : (tenantNome ?? "ERP Escolas")}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">ERP de Escolas</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
            {links.map((l) => {
              const active = currentPath === l.to || (l.to !== "/" && currentPath.startsWith(l.to));
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <l.icon className="h-4 w-4" />
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border/40 p-4">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </aside>

        {/* Sidebar mobile */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-64 bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="font-display font-bold text-foreground">{isMaster ? "Master" : (tenantNome ?? "ERP")}</p>
                <button onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
              </div>
              <nav className="mt-4 space-y-1">
                {links.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50"
                  >
                    <l.icon className="h-4 w-4" />
                    {l.label}
                  </Link>
                ))}
              </nav>
            </aside>
          </div>
        )}

        {/* Conteúdo */}
        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border/40 bg-card/50 px-5 py-3 lg:hidden">
            <button onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button>
            <p className="font-display text-sm font-bold">{isMaster ? "Master" : (tenantNome ?? "ERP Escolas")}</p>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
      <Toaster />
    </RequireAuth>
  );
}