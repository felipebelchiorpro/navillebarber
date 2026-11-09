/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const barbearias = app.findCollectionByNameOrId("barbearias");
    if (barbearias) {
      if (!barbearias.fields.getByName("created")) {
        barbearias.fields.add(
          new AutodateField({
            name: "created",
            onCreate: true,
            onUpdate: false,
          })
        );
      }
      if (!barbearias.fields.getByName("updated")) {
        barbearias.fields.add(
          new AutodateField({
            name: "updated",
            onCreate: true,
            onUpdate: true,
          })
        );
      }
      app.save(barbearias);
    }
  },
  (app) => {}
);

