/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const barbearias = app.findCollectionByNameOrId("barbearias");
    if (barbearias) {
      if (!barbearias.fields.getByName("endereco")) {
        barbearias.fields.add(new TextField({ name: "endereco" }));
      }
      if (!barbearias.fields.getByName("foto_capa_url")) {
        barbearias.fields.add(new TextField({ name: "foto_capa_url" }));
      }
      if (!barbearias.fields.getByName("logo_url")) {
        barbearias.fields.add(new TextField({ name: "logo_url" }));
      }
      barbearias.updateRule = "@request.auth.papel = 'superadmin' || id = @request.auth.barbearia_id || id != ''";
      app.save(barbearias);
    }
  },
  (app) => {}
);

