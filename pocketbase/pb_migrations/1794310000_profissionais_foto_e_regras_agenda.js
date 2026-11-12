/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Adiciona campos 'avatar_url', 'avatar', 'tem_comissao' na coleção 'profissionais'
    let profissionais;
    try {
      profissionais = app.findCollectionByNameOrId("profissionais");
    } catch {}

    if (profissionais) {
      if (!profissionais.fields.getByName("avatar_url")) {
        profissionais.fields.add(new TextField({ name: "avatar_url" }));
      }
      if (!profissionais.fields.getByName("foto_url")) {
        profissionais.fields.add(new TextField({ name: "foto_url" }));
      }
      if (!profissionais.fields.getByName("tem_comissao")) {
        profissionais.fields.add(new BoolField({ name: "tem_comissao" }));
      }
      if (!profissionais.fields.getByName("foto")) {
        try {
          profissionais.fields.add(
            new FileField({
              name: "foto",
              maxSelect: 1,
              maxSize: 5242880,
              mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"]
            })
          );
        } catch {}
      }
      app.save(profissionais);
    }

    // 2. Adiciona campos de controle de agendamento antecipado na coleção 'barbearias'
    let barbearias;
    try {
      barbearias = app.findCollectionByNameOrId("barbearias");
    } catch {}

    if (barbearias) {
      if (!barbearias.fields.getByName("limitar_agendamento_semana")) {
        barbearias.fields.add(new BoolField({ name: "limitar_agendamento_semana" }));
      }
      if (!barbearias.fields.getByName("dias_max_agendamento")) {
        barbearias.fields.add(new NumberField({ name: "dias_max_agendamento" }));
      }
      if (!barbearias.fields.getByName("dia_liberacao_agenda")) {
        barbearias.fields.add(
          new SelectField({
            name: "dia_liberacao_agenda",
            values: ["domingo", "segunda", "livre"],
            maxSelect: 1
          })
        );
      }
      app.save(barbearias);
    }
  },
  (app) => {}
);
