# 📦 Módulo 04: PDV & Ponto de Venda, Gestão de Estoque e Fecho de Comanda

## 1. Visão Geral e Responsabilidade
Este módulo gerencia o catálogo de produtos e vendas de balcão (PDV) da barbearia. Ele estabelece o controle rigoroso de estoque físico (entradas, saídas, alertas de reposição) e o fluxo ágil de **Fechamento de Comanda** — disparado diretamente ao concluir atendimentos na agenda ou em vendas avulsas de balcão, consolidando serviços executados pelo barbeiro e produtos adicionais consumidos pelo cliente.

---

## 2. Coleções do PocketBase (Nomes em Português)

### 2.1. Coleção `produtos`
* `id` (Text / 15 chars padrão PocketBase)
* `barbearia_id` (Relation -> `barbearias`, obrigatório, maxSelect: 1)
* `nome` (Text, obrigatório) — Ex: "Pomada Modeladora Matte", "Óleo de Barba Premium", "Cerveja Artesanal IPA"
* `categoria` (Select: `cabelo` | `barba` | `bebidas` | `cuidados` | `acessorios`, obrigatório)
* `preco_venda` (Number, obrigatório) — Preço final ao consumidor (R$)
* `preco_custo` (Number, padrão 0) — Preço de aquisição para margem de lucro
* `estoque_atual` (Number, obrigatório, padrão 0) — Quantidade física em estoque
* `estoque_minimo` (Number, padrão 5) — Gatilho para sinalização de reposição necessária
* `codigo_barras` (Text, opcional)
* `ativo` (Bool, padrão true)
* `descricao` (Text, opcional)

### 2.2. Coleção `vendas_balcao`
* `id` (Text / 15 chars padrão PocketBase)
* `barbearia_id` (Relation -> `barbearias`, obrigatório, maxSelect: 1)
* `agendamento_id` (Relation -> `agendamentos`, opcional, maxSelect: 1) — Referência ao agendamento de origem
* `barbeiro_id` (Relation -> `profissionais`, opcional, maxSelect: 1) — Profissional associado (para comissões)
* `cliente_nome` (Text, obrigatório)
* `cliente_telefone` (Text, opcional)
* `itens_servicos` (JSON, obrigatório) — Array de serviços prestados: `[{ id, nome, preco }]`
* `itens_produtos` (JSON, obrigatório) — Array de produtos consumidos: `[{ id, nome, preco_unitario, quantidade, subtotal }]`
* `subtotal_servicos` (Number, obrigatório)
* `subtotal_produtos` (Number, obrigatório)
* `desconto` (Number, padrão 0)
* `acrescimo` (Number, padrão 0)
* `valor_total` (Number, obrigatório)
* `forma_pagamento` (Select: `dinheiro` | `pix` | `cartao_credito` | `cartao_debito` | `misto` | `outros`)
* `status_pagamento` (Select: `pago` | `pendente` | `cancelado`)
* `observacoes` (Text, opcional)

---

## 3. Regras de Negócio e Fecho de Comanda

1. **Gatilho de Fechamento**:
   - Ao clicar no botão **"Concluir"** em qualquer agendamento ativo na Agenda, o sistema abre o modal de **Fechamento de Comanda**.
   - Os serviços realizados e o valor do agendamento já vêm pré-preenchidos.
   - O atendente pode adicionar produtos adicionais da barbearia (ex: pomada, refrigerante, cerveja) em 1 clique.
2. **Abate Automático de Estoque**:
   - Ao finalizar a venda, as unidades vendidas de cada produto são subtraídas de `estoque_atual` no PocketBase.
   - Produtos com estoque 0 não permitem adição ou alertam sobre estoque esgotado.
3. **Conclusão do Agendamento**:
   - O agendamento vinculado tem seu status atualizado atomicamente para `concluido`.
4. **Venda Avulsa de Balcão**:
   - Permite registrar vendas diretas de produtos ou serviços rápidos de balcão sem necessidade de pré-agendamento.

---

## 4. Checklist de Execução Técnica

- [x] Criar migração no PocketBase local (`pocketbase/pb_migrations/1793225400_modulo_04_pdv_produtos.js`)
- [x] Criar coleções `produtos` e `vendas_balcao` com regras RLS no PocketBase local
- [x] Cadastrar produtos semente de teste na barbearia modelo (`Barbearia Zero Grau`)
- [x] Criar interfaces e serviços em `src/services/pocketbase.ts` (`produtosService` e `vendasBalcaoService`)
- [x] Construir a aba **"Produtos & Estoque"** no painel com:
  - Listagem com pesquisa e filtro por categoria
  - Alertas visuais de estoque baixo / esgotado
  - Ações rápidas de ajuste manual de estoque (+1 / -1)
  - Modal de cadastro e edição de produtos
- [x] Construir o **Modal de Fecho de Comanda (PDV)** integrado:
  - Disparado pelo botão 'Concluir' na Agenda
  - Adição dinâmica de produtos da loja ao atendimento
  - Desconto / acréscimo e seleção de forma de pagamento
  - Abate automático de estoque dos produtos selecionados
  - Atualização do status do agendamento para `concluido`
- [x] Registrar histórico de vendas no painel

---

## 5. Fora de Âmbito (Proibido neste Módulo)
- NÃO avançar para integrações externas de WhatsApp.
- NÃO configurar maquininhas de cartão físicas ou webhooks Stripe.
- NÃO gerar Nota Fiscal Eletrônica (NFS-e/NFC-e).
