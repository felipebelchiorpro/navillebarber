/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Campos na coleção 'barbearias'
    const barbearias = app.findCollectionByNameOrId("barbearias");
    if (barbearias) {
      if (!barbearias.fields.getByName("modulo_split_asaas")) {
        barbearias.fields.add(new BoolField({ name: "modulo_split_asaas" }));
      }
      if (!barbearias.fields.getByName("split_taxa_tipo")) {
        barbearias.fields.add(
          new SelectField({
            name: "split_taxa_tipo",
            values: ["fixa", "percentual"],
            required: false,
          })
        );
      }
      if (!barbearias.fields.getByName("split_taxa_valor")) {
        barbearias.fields.add(new NumberField({ name: "split_taxa_valor" }));
      }
      if (!barbearias.fields.getByName("asaas_wallet_id")) {
        barbearias.fields.add(new TextField({ name: "asaas_wallet_id" }));
      }
      app.save(barbearias);
    }

    // 2. Campos na coleção 'profissionais'
    let profissionais;
    try {
      profissionais = app.findCollectionByNameOrId("profissionais");
    } catch {}

    if (profissionais) {
      if (!profissionais.fields.getByName("asaas_account_id")) {
        profissionais.fields.add(new TextField({ name: "asaas_account_id" }));
      }
      if (!profissionais.fields.getByName("asaas_wallet_id")) {
        profissionais.fields.add(new TextField({ name: "asaas_wallet_id" }));
      }
      if (!profissionais.fields.getByName("porcentagem_comissao")) {
        profissionais.fields.add(new NumberField({ name: "porcentagem_comissao" }));
      }
      if (!profissionais.fields.getByName("cpf_cnpj")) {
        profissionais.fields.add(new TextField({ name: "cpf_cnpj" }));
      }
      if (!profissionais.fields.getByName("pix_chave")) {
        profissionais.fields.add(new TextField({ name: "pix_chave" }));
      }
      if (!profissionais.fields.getByName("split_status")) {
        profissionais.fields.add(
          new SelectField({
            name: "split_status",
            values: ["pendente", "ativo", "recusado"],
            required: false,
          })
        );
      }
      app.save(profissionais);
    }
  },
  (app) => {}
);

