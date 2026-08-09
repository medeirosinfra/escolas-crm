// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro, VITE_* env injection, @ path alias
// Você pode passar config extra via defineConfig({ vite: { ... }, etc... }).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  // Deploy no Docker/Node (NÃO Cloudflare): preset node-server serve assets + SSR
  nitro: {
    preset: "node-server",
    output: { dir: ".output" },
    routeRules: {
      // Sem cache de HTML (assets têm hash único/immutable)
      "/": {
        headers: {
          "cache-control": "no-cache, no-store, must-revalidate, max-age=0",
          "cdn-cache-control": "no-cache, no-store",
        },
      },
      "/alunos/**": {
        headers: { "cache-control": "no-cache, no-store, must-revalidate", "cdn-cache-control": "no-cache, no-store" },
      },
      "/login/**": {
        headers: { "cache-control": "no-cache, no-store, must-revalidate", "cdn-cache-control": "no-cache, no-store" },
      },
      // Proxy: /supabase/* → Supabase local (Kong 54321) — IP do HOST pois dentro do
      // container 127.0.0.1 é ele mesmo.
      "/supabase/**": {
        proxy: "http://172.16.0.50:54321/**",
      },
    },
  },
});