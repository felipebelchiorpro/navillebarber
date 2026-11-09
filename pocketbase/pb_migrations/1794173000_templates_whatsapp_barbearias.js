/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    let barbearias;
    try {
      barbearias = app.findCollectionByNameOrId("barbearias");
    } catch {}

    if (barbearias) {
      if (!barbearias.fields.getByName("templates_whatsapp")) {
        barbearias.fields.add(new JSONField({ name: "templates_whatsapp", required: false }));
      }
      app.save(barbearias);
    }
  },
  (app) => {}
);
