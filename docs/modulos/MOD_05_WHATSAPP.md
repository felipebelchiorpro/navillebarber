# 📦 Módulo 05: Notificações WhatsApp, Automações & Templates

## 1. Visão Geral e Responsabilidade
Este módulo gerencia a comunicação automatizada e disparos de mensagens via WhatsApp para clientes da barbearia. Ele estabelece o emparelhamento da instância WhatsApp da barbearia (suportando simulação local via QR Code), configuração e personalização de templates com placeholders dinâmicos (`{cliente_nome}`, `{data}`, `{horario}`, `{barbeiro}`, `{servico}`, `{barbearia_nome}`) e o histórico auditável de disparos realizados (com status de entrega, datas e filtros).

---

## 2. Coleções do PocketBase (Nomes em Português)

### 2.1. Coleção `templates_mensagens`
* `id` (Text / 15 chars padrão PocketBase)
* `barbearia_id` (Relation -> `barbearias`, obrigatório, maxSelect: 1)
* `tipo_gatilho` (Select: `confirmacao_agendamento` | `lembrete_horario` | `cancelamento_agendamento` | `pos_atendimento` | `cobranca_vip` | `avulso`, obrigatório)
* `titulo` (Text, obrigatório) — Ex: "Confirmação de Agendamento", "Lembrete 2h Antes"
* `conteudo` (Text, obrigatório) — Conteúdo da mensagem com placeholders
* `ativo` (Bool, padrão true)
* `variaveis_disponiveis` (JSON, opcional) — Lista de tags disponíveis para substituição

### 2.2. Coleção `historico_mensagens_whatsapp`
* `id` (Text / 15 chars padrão PocketBase)
* `barbearia_id` (Relation -> `barbearias`, obrigatório, maxSelect: 1)
* `template_id` (Relation -> `templates_mensagens`, opcional, maxSelect: 1)
* `agendamento_id` (Relation -> `agendamentos`, opcional, maxSelect: 1)
* `cliente_id` (Relation -> `clientes`, opcional, maxSelect: 1)
* `destinatario_nome` (Text, obrigatório)
* `destinatario_telefone` (Text, obrigatório)
* `tipo_gatilho` (Select: `confirmacao_agendamento` | `lembrete_horario` | `cancelamento_agendamento` | `pos_atendimento` | `cobranca_vip` | `avulso`, obrigatório)
* `mensagem` (Text, obrigatório) — Mensagem final renderizada com os dados reais
* `status` (Select: `enviado` | `entregue` | `lido` | `falha` | `pendente`, obrigatório)
* `erro_detalhe` (Text, opcional)
* `data_envio` (Text, opcional) — Timestamp legível da tentativa de envio

---

## 3. Regras de Negócio e Funcionalidades

1. **Card de Emparelhamento WhatsApp (QR Code Mock Local)**:
   - Exibe status da instância: `Desconectado`, `Gerando QR Code`, `Aguardando Leitura` ou `Conectado`.
   - Permite gerar QR Code visual (simulação interativa com SVG renderizado em tela) e botão para simular leitura com sucesso.
   - Mostra número emparelhado, bateria simulada e botão para desconectar a instância.
   - Persiste o status de conexão no PocketBase (`barbearias.whatsapp_status`).

2. **Editor de Templates com Preview em Tempo Real**:
   - Listagem dos templates por tipo de gatilho.
   - Edição de conteúdo com inserção facilitada de tags (`{cliente_nome}`, `{data}`, `{horario}`, etc.).
   - Balão de visualização estilo WhatsApp com formatação e dados de exemplo renderizados ao vivo.
   - Botão para ativar/desativar cada template.

3. **Histórico de Envios & Disparador de Teste**:
   - Tabela de histórico com busca por cliente/telefone e filtro por status (`todos`, `entregue`, `lido`, `falha`).
   - Modal de envio manual/teste com seleção de template, preenchimento dinâmico de telefone e registro imediato no histórico do PocketBase.

---

## 4. Checklist de Execução Técnica

- [x] Criar migração no PocketBase local (`pocketbase/pb_migrations/1793227200_modulo_05_whatsapp_notificacoes.js`)
- [x] Criar coleções `templates_mensagens` e `historico_mensagens_whatsapp` com regras RLS
- [x] Adicionar campos `whatsapp_status` e `whatsapp_numero` na coleção `barbearias`
- [x] Inserir templates semente de teste na barbearia modelo (`Barbearia Zero Grau`)
- [x] Inserir registros de histórico semente para validação de listagem
- [x] Adicionar interfaces TypeScript e serviços em `src/services/pocketbase.ts` (`whatsappService`)
- [x] Construir o componente `WhatsAppManager.tsx` com:
  - Card de emparelhamento com QR Code mock dinâmico e status de conexão
  - Editor de templates com balão de preview realista do WhatsApp
  - Tabela de histórico de disparos com filtros e badges de status
  - Disparador de mensagem de teste avulsa
- [x] Integrar a aba **"WhatsApp & Notificações"** no painel principal `ActiveBarbeariaDashboard.tsx`
- [x] Testar via navegador e validar funcionamento completo

---

## 5. Fora de Âmbito (Proibido neste Módulo)
- NÃO avançar para faturamento B2B da plataforma SaaS.
- NÃO configurar webhooks de pagamento Stripe ou maquininhas.
- NÃO cobrar assinaturas SaaS dos donos de barbearia.
