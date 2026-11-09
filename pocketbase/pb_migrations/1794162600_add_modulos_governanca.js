/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const barbearias = app.findCollectionByNameOrId("barbearias");
    if (barbearias) {
      if (!barbearias.fields.getByName("modulo_whatsapp")) {
        barbearias.fields.add(new BoolField({ name: "modulo_whatsapp" }));
      }
      if (!barbearias.fields.getByName("modulo_financeiro")) {
        barbearias.fields.add(new BoolField({ name: "modulo_financeiro" }));
      }
      if (!barbearias.fields.getByName("modulo_assessor")) {
        barbearias.fields.add(new BoolField({ name: "modulo_assessor" }));
      }
      if (!barbearias.fields.getByName("valor_modulo_whatsapp")) {
        barbearias.fields.add(new NumberField({ name: "valor_modulo_whatsapp" }));
      }
      if (!barbearias.fields.getByName("valor_modulo_financeiro")) {
        barbearias.fields.add(new NumberField({ name: "valor_modulo_financeiro" }));
      }
      if (!barbearias.fields.getByName("valor_modulo_clube_vip")) {
        barbearias.fields.add(new NumberField({ name: "valor_modulo_clube_vip" }));
      }
      if (!barbearias.fields.getByName("valor_modulo_assessor")) {
        barbearias.fields.add(new NumberField({ name: "valor_modulo_assessor" }));
      }
      if (!barbearias.fields.getByName("modulos_config")) {
        barbearias.fields.add(new JSONField({ name: "modulos_config" }));
      }

      app.save(barbearias);
    }
  },
  (app) => {}
);

