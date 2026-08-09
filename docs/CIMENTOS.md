# 🔒 Cimentos: O Segurança da Infraestrutura

## 🔒 Segurança e Proteção de Dados
- **Rotação**: Seguro, com senhas de API e serviços rotativos.
- **Isolamento**: Banque de dados, portas de acesso, certificados TLS ativos.
- **Criptografia**: Dados criptografados em repouso e em trânsito (TLS 1.3).
- **Gestão de Acesso**: RBAC, roles e permissões por tenant (máxima separação).

## 🏗️ Arquitetura de Rede
- **Rede Docker**: Containers isolados por rede.
- **Proxy Reverse**: Nginx (ou Cloudflare Tunnel).
- **Rotas de API**: `/api/tenant/:sub` -> branding público.

---

## 🌐 DNS & Roteamento
- **DNS**: CNAME e registro para todos os subdomínios, sem misturar.
- **Provedor**: Cloudflare Zero Trust (Zero Trust / Tunnels).

---

## 📡 Infraestrutura & Rede
- **Banco de Dados**: PostgreSQL 17, auto-scaling, replicação.
- **Containerização**: Docker, Docker Compose (redes isoladas).
- **Firewall**: Regras de entrada e saída de portas (ex: 80, 443, 3110, 4002, etc.).
