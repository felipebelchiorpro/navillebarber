# 📦 Módulo 03: Motor de Agendamento, Grade de Horários & Slots Contíguos

## 1. Visão Geral e Responsabilidade
Regras de validação de horário e marcação de atendimentos no painel do estabelecimento. Implementa o algoritmo de slots contíguos (onde múltiplos serviços somados exigem blocos contínuos livres na grade do barbeiro) e a visão diária da agenda por barbeiro com ações rápidas de status.

---

## 2. Coleções do PocketBase (Nomes em Português)

### 2.1. Coleção `agendamentos`
* `id` (Text / 15 chars padrão PocketBase)
* `barbearia_id` (Relation -> `barbearias`, obrigatório)
* `barbeiro_id` (Relation -> `profissionais`, obrigatório)
* `cliente_nome` (Text, obrigatório)
* `cliente_telefone` (Text, obrigatório)
* `servicos_ids` (JSON, obrigatório — array com IDs dos serviços escolhidos)
* `data` (Text, obrigatório — Formato YYYY-MM-DD)
* `horario` (Text, obrigatório — Formato HH:mm)
* `duracao_total_minutos` (Number, obrigatório)
* `valor_total` (Number, obrigatório)
* `status` (Select: `pendente` | `confirmado` | `concluido` | `cancelado`)
* `observacoes` (Text, opcional)

### 2.2. Coleção `bloqueios_horario` (Antigo time_blocks)
* `id` (Text / 15 chars)
* `barbearia_id` (Relation -> `barbearias`, obrigatório)
* `barbeiro_id` (Text — ID do profissional ou `'todos'`)
* `data` (Text, YYYY-MM-DD)
* `horario_inicio` (Text, HH:mm)
* `horario_fim` (Text, HH:mm)
* `motivo` (Text — Ex: "Almoço", "Folga", "Manutenção")

---

## 3. Regra Crítica: Algoritmo de Slots Contíguos

1. **Duração Acumulada**:
   - Ao selecionar múltiplos serviços (ex: Corte 35 min + Barba 30 min = 65 min), o sistema soma as durações e calcula a janela necessária: `[horario_inicio, horario_inicio + duracao_total]`.
2. **Limite de Encerramento (Fechamento)**:
   - Se `horario_inicio + duracao_total > horario_fechamento` (padrão 19:00 ou configurado na barbearia), o agendamento é bloqueado com mensagem explicativa.
3. **Prevenção de Colisão de Horários**:
   - Valida se o intervalo desejado sobrepõe qualquer agendamento ativo (`confirmado` ou `pendente`) do mesmo barbeiro. Agendamentos cancelados são desconsiderados.
4. **Respeito aos Bloqueios de Horário**:
   - Interdição automática caso o intervalo sobreponha bloqueios de horário individuais do barbeiro ou gerais (`barbeiro_id = 'todos'`).

---

## 4. Checklist de Execução Técnica

- [x] Criar migração no PocketBase local (`pocketbase/pb_migrations/1793224500_modulo_03_agendamentos.js`)
- [x] Criar coleções `agendamentos` e `bloqueios_horario` no PocketBase local
- [x] Implementar motor de cálculo de slots contíguos (`src/services/slotEngine.ts`)
- [x] Implementar a tela de Visão Diária da Agenda no painel da barbearia (`src/components/AgendaManager.tsx`):
  - Navegação de datas (Hoje, Amanhã, Chevron dia a dia, DatePicker nativo estilizado)
  - Filtro por barbeiro (Visão Panorâmica de todos ou individual)
  - Grade visual das 08:00 às 19:00 com slots livres, agendamentos marcados e bloqueios
  - Indicadores diários de métricas: Agendamentos, Confirmados, Horas Ocupadas e Faturamento Previsto
- [x] Modal interno para o dono/barbeiro lançar agendamento manual na grade com validação de slots contíguos em tempo real
- [x] Modal para cadastrar bloqueios de horário (Almoço, Folga, etc.)
- [x] Ações rápidas para alterar status do agendamento (`Confirmar`, `Concluir`, `Cancelar`)
- [x] Dados de teste provisionados (Agendamento de Carlos Eduardo e Bloqueio de Almoço na Barbearia Zero Grau)

---

## 5. Fora de Âmbito (Proibido neste Módulo)
- NÃO criar vitrine externa pública do cliente final (`/b/:slug`).
- NÃO disparar mensagens no WhatsApp.
- NÃO processar pagamentos nem fechar comanda de PDV.
