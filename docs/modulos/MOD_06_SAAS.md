---
tags: [modulo, saas, b2b, faturamento, stripe, kill-switch, naville]
aliases: [Modulo 06, Faturamento SaaS, Kill Switch, SuperAdmin]
---

# 📦 [[Módulo 6]] — Faturamento SaaS B2B, Planos & Kill Switch

> **Módulo:** Governança SaaS, Cobrança de Assinaturas das Barbearias e Bloqueio Automático  
> **Conexões do Grafo:** Pertence ao ecossistema [[Naville Barber]]. Conecta-se a [[Módulo 1]], [[barbearias]], [[faturas]], [[Kill Switch]] e [[SuperAdminBiDashboard.tsx]].

---

## 1. Visão Geral e Responsabilidade
Controlo de planos e pagamentos B2B (a cobrança do software às barbearias). Gestão do ciclo de vida das contas, controlo de limites de cadeiras/profissionais contratados e o mecanismo de **Kill Switch** (bloqueio automático de acesso caso a mensalidade da barbearia esteja em atraso, com redirecionamento para tela de fatura pendente).

---

## 2. Coleções do PocketBase (Nomes em Português)

### 2.1. Coleção `faturas` (ou `historico_faturas`)
* `id` (Text / 15 chars)
* `barbearia_id` (Relation -> `barbearias`, obrigatório)
* `valor` (Number, obrigatório) — Ex: 97.00, 197.00
* `data_vencimento` (Text, YYYY-MM-DD)
* `data_pagamento` (Text, ISO Timestamp, opcional)
* `status` (Select: `pendente` | `pago` | `atrasado` | `cancelado`)
* `metodo_pagamento` (Select: `pix` | `cartao` | `boleto`)
* `link_pagamento` (Text, opcional)
* `comprovante` (File, opcional)

### 2.2. Atualização na Coleção `barbearias`
Garantir a leitura e gravação dos seguintes campos de controlo SaaS:
* `status_assinatura` (Select: `ativo` | `trial` | `bloqueado` | `cancelado`)
* `bloqueio_automatico` (Bool, padrão `true`)
* `plano_saas` (Select: `starter` | `pro` | `enterprise`)
* `limite_profissionais` (Number, padrão 5)
* `data_expiracao_plano` (Text, YYYY-MM-DD)

---

## 3. Regra do Kill Switch & Proteção de Rotas
- **Middleware / Guardião de Rotas:** 
  - Se `barbearia.status_assinatura == 'bloqueado'` ou se a data de expiração expirou com `bloqueio_automatico == true`:
    - Impedir o acesso à agenda, ao PDV e às configurações operacionais.
    - Redirecionar imediatamente para a tela `TenantBlockedCustomerView.tsx` (exibindo fatura pendente, QR Code PIX ou botão de regularização).
- Apenas utilizadores com papel `superadmin` conseguem desbloquear manualmente ou alterar o plano da barbearia.

---

## 4. Checklist de Execução Técnica
- [x] Criar a coleção `faturas` no PocketBase local e validar campos na coleção `barbearias`
- [x] Implementar a tela/modal de Gestão da Assinatura no painel do Dono da barbearia:
  - Exibição do plano atual, limite de cadeiras em uso e data do próximo vencimento
  - Histórico de faturas geradas (com botão simulado para "Pagar Fatura")
- [x] Teste do Kill Switch:
  - Alternar temporariamente o status da "Barbearia Zero Grau" para `bloqueado` no PocketBase (ou via botão de simulação)
  - Validar se o sistema redireciona para a tela de bloqueio e impede novas ações
  - Ao marcar a fatura como `pago`, reativar o acesso instantaneamente

---

## 5. Fora de Âmbito (Proibido neste Módulo)
- NÃO conectar webhooks reais de produção da Stripe ou Invoice Ninja (utilizar fluxo simulado/mock local primeiro).
- NÃO alterar a estrutura de serviços ou agendamentos dos módulos anteriores.