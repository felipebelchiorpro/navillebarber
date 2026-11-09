/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const barbearias = app.findCollectionByNameOrId("barbearias");
    if (barbearias) {
      const planoField = barbearias.fields.getByName("plano_saas");
      if (planoField) {
        planoField.values = ["starter", "pro", "enterprise", "basico", "vitalicio"];
      }
      app.save(barbearias);
    }
  },
  (app) => {}
);
