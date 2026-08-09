# 🚀 Guia de Implantação e Deploy (Runbook)

Este guia detalha o passo a passo para realizar o deploy completo e seguro do ERP Escolas em ambiente de produção (VPS Linux).

## Pré-requisitos
- Docker & Docker Compose instalados.
- Domínio configurado na Cloudflare.
- Acesso SSH ao servidor.

## Passos para o Deploy

1. **Clonar o Repositório**:
   ```bash
   git clone https://github.com/medeirosinfra/escolas-crm.git
   cd escolas-crm
   ```

2. **Configurar as Variáveis de Ambiente (`.env`)**:
   Certifique-se de configurar a URL do Supabase, chaves JWT e porta da aplicação.

3. **Subir a Infraestrutura (Banco + Supabase + App)**:
   ```bash
   docker compose up -d --build
   ```

4. **Validar os Containers**:
   ```bash
   docker ps
   ```

5. **Configurar no Cloudflare Tunnel**:
   - Apontar `erp.medeirossolucoestech.com.br` para `http://localhost:4002`.
