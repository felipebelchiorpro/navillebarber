/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const barbearias = app.findCollectionByNameOrId("barbearias");
    if (barbearias) {
      if (!barbearias.fields.getByName("asaas_id")) {
        barbearias.fields.add(new TextField({ name: "asaas_id" }));
      }
      app.save(barbearias);
    }
  },
  (app) => {}
);

