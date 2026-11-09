---
tags: [modulo, vitrine-publica, b2c, agendamento-online, pwa, naville]
aliases: [Vitrine Publica, Agendamento B2C, Fluxo Cliente, Slug Barbearia]
---

# 📦 [[MOD Vitrine Publica]] — Vitrine de Agendamento Online & Fluxo B2C

> **Módulo:** Experiência Externa do Cliente Final  
> **Conexões do Grafo:** Pertence ao ecossistema [[Naville Barber]]. Consome dados de [[Módulo 1]], [[Módulo 2]], [[Módulo 3]] e valida assinaturas de [[Clube VIP]].

---

## 1. Visão Geral e Responsabilidade
Página pública e responsiva acessível pelo link único da barbearia (ex.: `/b/zero-grau`). Permite que o cliente final agende o seu atendimento sem necessidade de login com senha (usando apenas o número de telemóvel/WhatsApp e o nome), respeitando a grade, os slots contíguos e aplicando os benefícios do [[Clube VIP]] se for assinante ativo.

---

## 2. Fluxo em Etapas (Step-by-Step UI)

1. **Etapa 1 — Seleção de Serviços:**
   - Listagem dos serviços da coleção [[servicos]] ativos com filtros por categoria.
   - Multi-seleção com soma dinâmica de preço e tempo.

2. **Etapa 2 — Escolha do Barbeiro:**
   - Lista dos profissionais da coleção [[barbeiros]] ou opção "Qualquer Profissional".

3. **Etapa 3 — Data & Horário Livre:**
   - Seleção de dia e exibição apenas de horários livres com slots contíguos válidos.

4. **Etapa 4 — Identificação & Verificação VIP:**
   - Campo para Nome e WhatsApp.
   - Verificação em tempo real: se for assinante ativo em [[clientes]], abater o serviço elegível para R$ 0,00.

5. **Etapa 5 — Confirmação:**
   - Resumo do agendamento gravando na coleção [[agendamentos]].
   - Criação do registo em [[historico_mensagens_whatsapp]].

---

## 3. Checklist de Execução Técnica
- [ ] Criar a rota dinâmica pública `/b/:slug`
- [ ] Construir o componente em etapas (Serviços -> Profissional -> Grade de Horários -> Identificação -> Sucesso)
- [ ] Integrar com o motor de slots contíguos
- [ ] Integrar com a checagem de telefone do [[Clube VIP]]
- [ ] Validar um agendamento de teste gerado pela vitrine caindo na agenda interna do [[Módulo 3]]

---
## 🔗 Relações no Grafo
- **Módulos Conectados:** [[Naville Barber]], [[Módulo 1]], [[Módulo 2]], [[Módulo 3]], [[Clube VIP]], [[Módulo 5]]