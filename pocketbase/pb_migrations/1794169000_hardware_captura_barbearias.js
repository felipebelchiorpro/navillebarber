/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const barbearias = app.findCollectionByNameOrId("barbearias");
    if (barbearias) {
      if (!barbearias.fields.getByName("pix_chave_repasse")) {
        barbearias.fields.add(new TextField({ name: "pix_chave_repasse" }));
      }
      if (!barbearias.fields.getByName("pix_tipo_chave")) {
        barbearias.fields.add(
          new SelectField({
            name: "pix_tipo_chave",
            values: ["cpf", "cnpj", "email", "telefone", "aleatoria"],
            required: false,
          })
        );
      }
      if (!barbearias.fields.getByName("banco_nome")) {
        barbearias.fields.add(new TextField({ name: "banco_nome" }));
      }
      if (!barbearias.fields.getByName("canal_captura_principal")) {
        barbearias.fields.add(
          new SelectField({
            name: "canal_captura_principal",
            values: ["display_pix", "tap_phone", "smart_pos"],
            required: false,
          })
        );
      }
      if (!barbearias.fields.getByName("solicitou_maquininha")) {
        barbearias.fields.add(new BoolField({ name: "solicitou_maquininha" }));
      }
      if (!barbearias.fields.getByName("maquininha_modelo")) {
        barbearias.fields.add(new TextField({ name: "maquininha_modelo" }));
      }
      app.save(barbearias);
    }
  },
  (app) => {}
);

