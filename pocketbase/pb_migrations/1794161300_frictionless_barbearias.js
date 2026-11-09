/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const barbearias = app.findCollectionByNameOrId("barbearias");
    if (barbearias) {
      // 1. Liberar regra de criação
      barbearias.createRule = "";

      // 2. Tornar campos antigos não obrigatórios para Frictionless Onboarding
      const nomeProp = barbearias.fields.getByName("nome_proprietario");
      if (nomeProp) nomeProp.required = false;

      const telProp = barbearias.fields.getByName("telefone_proprietario");
      if (telProp) telProp.required = false;

      const planoSaas = barbearias.fields.getByName("plano_saas");
      if (planoSaas) planoSaas.required = false;

      // 3. Atualizar status para permitir 'ativa'
      const status = barbearias.fields.getByName("status");
      if (status) {
        status.required = false;
        status.values = ["ativo", "ativa", "teste", "bloqueado", "bloqueada", "cancelado", "cancelada"];
      }

      // 4. Adicionar novos campos se não existirem
      if (!barbearias.fields.getByName("proprietario")) {
        barbearias.fields.add(new TextField({ name: "proprietario" }));
      }
      if (!barbearias.fields.getByName("telefone")) {
        barbearias.fields.add(new TextField({ name: "telefone" }));
      }
      if (!barbearias.fields.getByName("documento")) {
        barbearias.fields.add(new TextField({ name: "documento" }));
      }
      if (!barbearias.fields.getByName("email")) {
        barbearias.fields.add(new TextField({ name: "email" }));
      }
      if (!barbearias.fields.getByName("plano")) {
        barbearias.fields.add(new TextField({ name: "plano" }));
      }

      app.save(barbearias);
    }
  },
  (app) => {}
);

