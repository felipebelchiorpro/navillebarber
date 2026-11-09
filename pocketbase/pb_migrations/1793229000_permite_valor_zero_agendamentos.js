/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const agendamentos = app.findCollectionByNameOrId("agendamentos");
    if (agendamentos) {
      const valorTotalField = agendamentos.fields.getByName("valor_total");
      if (valorTotalField) {
        valorTotalField.required = false;
      }
      app.save(agendamentos);
    }
  },
  (app) => {}
);
