---
tags: [modulo, relatorios, bi, dashboard, financeiro, superadmin, naville]
aliases: [Relatorios Financeiros, Dashboard BI, SuperAdmin BI, Metricas Barbearia]
---

# 📦 [[MOD_DASHBOARD_BI]] — Relatórios Financeiros, Comissões & SuperAdmin BI

> **Módulo:** Análise Financeira, Repasse de Comissões e Visão Global da Plataforma  
> **Conexões do Grafo:** Pertence ao ecossistema [[Naville Barber]]. Consome dados de [[MOD 01 - Core e Auth]], [[MOD 02 - Servicos e Profissionais]], [[MOD 03 - Motor de Agendamento e Grade]], [[MOD 04 - PDV e Modo Cadeira]] e [[Módulo 6]].

---

## 1. Visão Geral e Responsabilidade
Consolidação dos dados operacionais em métricas acionáveis em dois níveis:
1. **Nível Barbearia (Painel do Dono / Gerente):** Faturação bruta, faturamento líquido, comissões individuais a pagar por barbeiro, ticket médio e produtos mais vendidos.
2. **Nível SaaS (SuperAdmin Global):** Total de barbearias ativas, MRR (Receita Recorrente Mensal), taxa de inadimplência e volume geral de agendamentos na plataforma.

---

## 2. Métricas e Cálculos Técnicos

### 2.1. Métricas da Barbearia (Filtro por Período: Hoje, Semana, Mês)
* **Faturamento Bruto:** Soma total de `vendas_balcao.valor_total`.
* **Divisão de Comissões:** Cálculo baseado no percentual configurado em `profissionais.comissao_porcentagem` sobre os serviços executados.
* **Extrato de Comissões por Profissional:** Tabela detalhando Barbeiro, Atendimentos realizados, Valor de Serviços gerados e Total de Comissão a pagar.
* **Repartição por Forma de Pagamento:** Total recebido em PIX, Cartão de Crédito, Cartão de Débito e Dinheiro.

### 2.2. Visão SuperAdmin (Apenas utilizadores com `role: superadmin`)
* **MRR da Plataforma:** Soma do valor dos planos das barbearias com `status_assinatura == 'ativo'`.
* **Total de Barbearias:** Contagem agrupada por status (`ativo`, `trial`, `bloqueado`).
* **Gráficos Resumidos:** Gráfico de linha/barra simples com evolução mensal e lista rápida de tenants para intervenção/bloqueio manual.

---

## 3. Checklist de Execução Técnica
- [ ] Criar a tela/aba **Relatórios & Finanças** no painel do Dono:
  - Filtro por data (Hoje, Últimos 7 dias, Este Mês)
  - Cards de KPI: Faturamento Total, Comissões Acumuladas, Ticket Médio, Total de Atendimentos
  - Tabela detalhada de Comissões por Barbeiro com opção de marcar repasse como pago
- [ ] Criar a visão **SuperAdmin BI Dashboard** (`/superadmin`):
  - Acesso protegido estritamente para `role == 'superadmin'`
  - Exibição de MRR, contagem total de barbearias ativas/bloqueadas e atalho para alternar status de assinaturas SaaS
- [ ] Teste prático: Validar se as vendas e agendamentos concluídos anteriormente aparecem somados corretamente nos relatórios financeiros

---

## 4. Fora de Âmbito
- NÃO gerar ficheiros PDF complexos ou integração bancária de PIX automático para pagamento de comissões (apenas cálculo e exibição na tela).