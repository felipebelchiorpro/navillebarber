/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const servicos = app.findCollectionByNameOrId("servicos");
    if (servicos) {
      if (!servicos.fields.getByName("comissao_personalizada_ativa")) {
        servicos.fields.add(new BoolField({ name: "comissao_personalizada_ativa" }));
      }
      if (!servicos.fields.getByName("comissao_tipo")) {
        servicos.fields.add(
          new SelectField({
            name: "comissao_tipo",
            values: ["padrao_barbeiro", "porcentagem_fixa", "valor_fixo"],
            required: false,
            maxSelect: 1,
          })
        );
      }
      if (!servicos.fields.getByName("comissao_valor")) {
        servicos.fields.add(new NumberField({ name: "comissao_valor" }));
      }
      app.save(servicos);

      // Preenche valores default caso existam serviços cadastrados
      try {
        const records = app.findRecordsByFilter("servicos", "id != ''", "", 200);
        for (const s of records) {
          let updated = false;
          if (s.get("comissao_personalizada_ativa") === null || s.get("comissao_personalizada_ativa") === undefined) {
            s.set("comissao_personalizada_ativa", false);
            updated = true;
          }
          if (!s.get("comissao_tipo")) {
            s.set("comissao_tipo", "padrao_barbeiro");
            updated = true;
          }
          if (s.get("comissao_valor") === null || s.get("comissao_valor") === undefined) {
            s.set("comissao_valor", 0);
            updated = true;
          }
          if (updated) {
            app.save(s);
          }
        }
      } catch (e) {
        console.log("Aviso ao preencher defaults de comissão em serviços:", e);
      }
    }
  },
  (app) => {}
);

