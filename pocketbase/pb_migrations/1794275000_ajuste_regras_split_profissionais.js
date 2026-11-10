/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Desbloqueia e unifica regras da coleção 'profissionais'
    let profissionais;
    try {
      profissionais = app.findCollectionByNameOrId("profissionais");
    } catch {}

    if (profissionais) {
      profissionais.listRule = "";
      profissionais.viewRule = "";
      profissionais.createRule = "";
      profissionais.updateRule = "";
      profissionais.deleteRule = "";
      app.save(profissionais);
    }

    // 2. Desbloqueia e unifica regras da coleção 'barbearias'
    let barbearias;
    try {
      barbearias = app.findCollectionByNameOrId("barbearias");
    } catch {}

    if (barbearias) {
      barbearias.listRule = "";
      barbearias.viewRule = "";
      barbearias.createRule = "";
      barbearias.updateRule = "";

      // Garante campos de Split e Retenção
      if (!barbearias.fields.getByName("split_ativo")) {
        barbearias.fields.add(new BoolField({ name: "split_ativo" }));
      }
      if (!barbearias.fields.getByName("modulo_split_asaas")) {
        barbearias.fields.add(new BoolField({ name: "modulo_split_asaas" }));
      }
      if (!barbearias.fields.getByName("split_carencia_tipo")) {
        barbearias.fields.add(
          new SelectField({
            name: "split_carencia_tipo",
            values: ["dias", "transacoes", "isento_vitalicio"],
            required: false,
            maxSelect: 1,
          })
        );
      }
      if (!barbearias.fields.getByName("split_dias_gratis")) {
        barbearias.fields.add(new NumberField({ name: "split_dias_gratis" }));
      }
      if (!barbearias.fields.getByName("split_data_ativacao")) {
        barbearias.fields.add(new DateField({ name: "split_data_ativacao", required: false }));
      }
      if (!barbearias.fields.getByName("split_franquia_transacoes_mensal")) {
        barbearias.fields.add(new NumberField({ name: "split_franquia_transacoes_mensal" }));
      }
      if (!barbearias.fields.getByName("split_contador_mes_atual")) {
        barbearias.fields.add(new NumberField({ name: "split_contador_mes_atual" }));
      }
      if (!barbearias.fields.getByName("split_taxa_transacao")) {
        barbearias.fields.add(new NumberField({ name: "split_taxa_transacao" }));
      }
      if (!barbearias.fields.getByName("split_mensalidade_modulo")) {
        barbearias.fields.add(new NumberField({ name: "split_mensalidade_modulo" }));
      }
      if (!barbearias.fields.getByName("valor_modulo_split")) {
        barbearias.fields.add(new NumberField({ name: "valor_modulo_split" }));
      }
      if (!barbearias.fields.getByName("split_taxa_tipo")) {
        barbearias.fields.add(
          new SelectField({
            name: "split_taxa_tipo",
            values: ["fixa", "percentual"],
            required: false,
            maxSelect: 1,
          })
        );
      }
      if (!barbearias.fields.getByName("split_taxa_valor")) {
        barbearias.fields.add(new NumberField({ name: "split_taxa_valor" }));
      }
      if (!barbearias.fields.getByName("asaas_wallet_id")) {
        barbearias.fields.add(new TextField({ name: "asaas_wallet_id", required: false }));
      }
      if (!barbearias.fields.getByName("asaas_account_id")) {
        barbearias.fields.add(new TextField({ name: "asaas_account_id", required: false }));
      }

      app.save(barbearias);

      // Preenche dados padrão nas barbearias existentes
      try {
        const records = app.findRecordsByFilter("barbearias", "id != ''", "", 500);
        for (const b of records) {
          let updated = false;
          if (b.get("split_ativo") === null || b.get("split_ativo") === undefined) {
            b.set("split_ativo", true);
            b.set("modulo_split_asaas", true);
            updated = true;
          }
          if (!b.get("split_carencia_tipo")) {
            b.set("split_carencia_tipo", "dias");
            updated = true;
          }
          if (b.get("split_dias_gratis") === null || b.get("split_dias_gratis") === undefined) {
            b.set("split_dias_gratis", 30);
            updated = true;
          }
          if (!b.get("split_data_ativacao")) {
            b.set("split_data_ativacao", new Date().toISOString());
            updated = true;
          }
          if (b.get("split_franquia_transacoes_mensal") === null || b.get("split_franquia_transacoes_mensal") === undefined) {
            b.set("split_franquia_transacoes_mensal", 30);
            updated = true;
          }
          if (b.get("split_contador_mes_atual") === null || b.get("split_contador_mes_atual") === undefined) {
            b.set("split_contador_mes_atual", 0);
            updated = true;
          }
          if (b.get("split_taxa_transacao") === null || b.get("split_taxa_transacao") === undefined) {
            b.set("split_taxa_transacao", 0.35);
            updated = true;
          }
          if (b.get("split_mensalidade_modulo") === null || b.get("split_mensalidade_modulo") === undefined) {
            b.set("split_mensalidade_modulo", 30.0);
            b.set("valor_modulo_split", 30.0);
            updated = true;
          }
          if (!b.get("split_taxa_tipo")) {
            b.set("split_taxa_tipo", "fixa");
            updated = true;
          }
          if (b.get("split_taxa_valor") === null || b.get("split_taxa_valor") === undefined) {
            b.set("split_taxa_valor", 1.50);
            updated = true;
          }
          if (updated) {
            app.save(b);
          }
        }
      } catch (errPopulate) {
        console.log("Aviso ao preencher padrões de split:", errPopulate);
      }
    }
  },
  (app) => {}
);
