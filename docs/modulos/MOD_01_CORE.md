# 📦 Módulo 01: Core Multi-Tenant, Identidade & Autenticação

## 1. Visão Geral e Responsabilidade
Fundação estrutural do Naville Barber. Responsável pela gestão dos estabelecimentos (tenants), identidade visual, isolamento rígido de dados (RLS) e controlo de acessos (RBAC).

---

## 2. Dicionário de Coleções do PocketBase (Nomes em Português)

### 2.1. Coleção `barbearias` (Base de Dados / SQLite)
* `id` (Text / 15 chars padrão PocketBase)
* `nome` (Text, obrigatório) — Nome de exibição da barbearia
* `slug` (Text, obrigatório, único) — Identificador de URL pública (`/b/:slug`)
* `nome_proprietario` (Text, obrigatório)
* `telefone_proprietario` (Text, obrigatório)
* `status` (Select: `ativo` | `teste` | `bloqueado` | `cancelado`)
* `plano_saas` (Select: `basico` | `pro` | `vitalicio`)
* `e_vitalicio` (Bool, padrão `false`) — Imunidade ao Kill Switch de faturas
* `max_barbeiros` (Number, padrão 1)
* `valor_adicional_barbeiro` (Number, padrão 25.00)
* `bloqueio_automatico` (Bool, padrão `true`)
* `horarios_funcionamento` (JSON: lista de dias e horários)
* `descricao_espaco` (Text)
* `e_publico` (Bool, padrão `true`)

### 2.2. Coleção `usuarios` (Auth Collection nativa)
* `id` (Text)
* `email` (Email, único, obrigatório)
* `name` (Text, obrigatório) — Nome completo do utilizador
* `barbearia_id` (Relation -> `barbearias`, obrigatório para donos/barbeiros)
* `papel` (Select: `superadmin` | `dono` | `gerente` | `barbeiro` | `cliente`)
* `telefone` (Text)
* `status` (Select: `ativo` | `bloqueado` | `pendente`)
* `taxa_comissao` (Number, ex: 0.50 para 50%)
* `pode_acessar_admin` (Bool, padrão `false`)

---

## 3. Regras de Isolamento (RLS - PocketBase Rules)

* **`barbearias`:**
  * `List / View`: `@request.auth.papel = 'superadmin' || id = @request.auth.barbearia_id || (e_publico = true && slug != '')`
  * `Create`: `@request.auth.papel = 'superadmin'`
  * `Update`: `@request.auth.papel = 'superadmin' || id = @request.auth.barbearia_id`
  * *(Nota: Os campos `plano_saas`, `e_vitalicio` e `status` apenas o `superadmin` pode alterar)*
* **`usuarios`:**
  * `List / View`: `@request.auth.papel = 'superadmin' || barbearia_id = @request.auth.barbearia_id`

---

## 4. Checklist de Execução Técnica

- [ ] Iniciar binário do PocketBase localmente (`http://127.0.0.1:8090/_/`)
- [ ] Criar a coleção `barbearias` com os campos acima
- [ ] Ajustar a coleção de autenticação `users` (ou criar alias `usuarios`) com `papel` e `barbearia_id`
- [ ] Cadastrar 1 barbearia de teste (ex: slug: `zero-grau`)
- [ ] Cadastrar 1 utilizador dono de teste vinculado a essa barbearia
- [ ] Criar serviço de conexão frontend (`src/services/pocketbase.ts`)
- [ ] Implementar ecrã de Login simples e autenticação de sessão
- [ ] Implementar cabeçalho do painel exibindo o nome da barbearia ativa e botão de Logout

---

## 5. Fora de Âmbito (Proibido neste Módulo)
- NÃO criar tabelas ou ecrãs de agendamento de horários.
- NÃO configurar conexões nem instâncias de WhatsApp.
- NÃO criar checkout ou regras de cobrança do Stripe.
