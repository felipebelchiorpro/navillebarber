/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Coleção 'barbearias' (Base)
    let barbearias;
    try {
      barbearias = app.findCollectionByNameOrId("barbearias");
    } catch {}

    if (!barbearias) {
      barbearias = new Collection({
        name: "barbearias",
        type: "base",
        system: false,
        fields: [
          { name: "nome", type: "text", required: true },
          { name: "slug", type: "text", required: true, unique: true },
          { name: "nome_proprietario", type: "text", required: true },
          { name: "telefone_proprietario", type: "text", required: true },
          {
            name: "status",
            type: "select",
            values: ["ativo", "teste", "bloqueado", "cancelado"],
            required: true,
          },
          {
            name: "plano_saas",
            type: "select",
            values: ["basico", "pro", "vitalicio"],
            required: true,
          },
          { name: "e_vitalicio", type: "bool" },
          { name: "max_barbeiros", type: "number" },
          { name: "valor_adicional_barbeiro", type: "number" },
          { name: "bloqueio_automatico", type: "bool" },
          { name: "horarios_funcionamento", type: "json" },
          { name: "descricao_espaco", type: "text" },
          { name: "e_publico", type: "bool" },
        ],
        listRule: "@request.auth.papel = 'superadmin' || id = @request.auth.barbearia_id || (e_publico = true && slug != '')",
        viewRule: "@request.auth.papel = 'superadmin' || id = @request.auth.barbearia_id || (e_publico = true && slug != '')",
        createRule: "@request.auth.papel = 'superadmin'",
        updateRule: "@request.auth.papel = 'superadmin' || id = @request.auth.barbearia_id",
        deleteRule: "@request.auth.papel = 'superadmin'",
      });
      app.save(barbearias);
    }

    // 2. Ajustar coleção de autenticação 'users'
    const users = app.findCollectionByNameOrId("users");
    if (users) {
      if (!users.fields.getByName("barbearia_id")) {
        users.fields.add(
          new TextField({
            name: "barbearia_id",
            required: false,
          })
        );
      }

      if (!users.fields.getByName("papel")) {
        users.fields.add(
          new SelectField({
            name: "papel",
            values: ["superadmin", "dono", "gerente", "barbeiro", "cliente"],
            required: false,
          })
        );
      }

      if (!users.fields.getByName("telefone")) {
        users.fields.add(
          new TextField({
            name: "telefone",
            required: false,
          })
        );
      }

      if (!users.fields.getByName("status")) {
        users.fields.add(
          new SelectField({
            name: "status",
            values: ["ativo", "bloqueado", "pendente"],
            required: false,
          })
        );
      }

      if (!users.fields.getByName("taxa_comissao")) {
        users.fields.add(
          new NumberField({
            name: "taxa_comissao",
            required: false,
          })
        );
      }

      if (!users.fields.getByName("pode_acessar_admin")) {
        users.fields.add(
          new BoolField({
            name: "pode_acessar_admin",
            required: false,
          })
        );
      }

      users.listRule = "@request.auth.papel = 'superadmin' || barbearia_id = @request.auth.barbearia_id";
      users.viewRule = "@request.auth.papel = 'superadmin' || barbearia_id = @request.auth.barbearia_id";

      app.save(users);
    }

    // 3. Cadastrar 1 barbearia de teste (ex: slug: 'zero-grau')
    let testBarbearia;
    try {
      testBarbearia = app.findFirstRecordByFilter("barbearias", "slug = 'zero-grau'");
    } catch {}

    if (!testBarbearia) {
      testBarbearia = new Record(barbearias);
      testBarbearia.set("nome", "Barbearia Zero Grau");
      testBarbearia.set("slug", "zero-grau");
      testBarbearia.set("nome_proprietario", "Carlos Oliveira");
      testBarbearia.set("telefone_proprietario", "(11) 98888-7777");
      testBarbearia.set("status", "ativo");
      testBarbearia.set("plano_saas", "pro");
      testBarbearia.set("e_vitalicio", false);
      testBarbearia.set("max_barbeiros", 5);
      testBarbearia.set("valor_adicional_barbeiro", 25.0);
      testBarbearia.set("bloqueio_automatico", true);
      testBarbearia.set("horarios_funcionamento", {
        seg_sex: "09:00 - 20:00",
        sab: "08:00 - 18:00",
      });
      testBarbearia.set("descricao_espaco", "Barbearia conceito com padrão premium de atendimento.");
      testBarbearia.set("e_publico", true);
      app.save(testBarbearia);
    }

    // 4. Cadastrar 1 utilizador dono de teste vinculado a essa barbearia
    let testOwner;
    try {
      testOwner = app.findFirstRecordByFilter("users", "email = 'dono@zerograu.com'");
    } catch {}

    if (!testOwner) {
      testOwner = new Record(users);
      testOwner.set("email", "dono@zerograu.com");
      testOwner.setPassword("Password123!");
      testOwner.set("name", "Carlos Oliveira");
      testOwner.set("barbearia_id", testBarbearia.id);
      testOwner.set("papel", "dono");
      testOwner.set("telefone", "(11) 98888-7777");
      testOwner.set("status", "ativo");
      testOwner.set("taxa_comissao", 0.5);
      testOwner.set("pode_acessar_admin", true);
      app.save(testOwner);
    }
  },
  (app) => {
    try {
      const owner = app.findFirstRecordByFilter("users", "email = 'dono@zerograu.com'");
      if (owner) app.delete(owner);
    } catch {}

    try {
      const b = app.findFirstRecordByFilter("barbearias", "slug = 'zero-grau'");
      if (b) app.delete(b);
    } catch {}

    try {
      const barbearias = app.findCollectionByNameOrId("barbearias");
      if (barbearias) app.delete(barbearias);
    } catch {}
  }
);
