/// <reference path="../pb_data/types.d.ts" />

/**
 * Login dos barbeiros: campos de senha (hidden = nunca retornados pela API)
 * e controle de acesso ao App do Barbeiro.
 */
migrate(
  (app) => {
    let profissionais;
    try {
      profissionais = app.findCollectionByNameOrId("profissionais");
    } catch {}
    if (!profissionais) return;

    const addText = (name, hidden) => {
      if (!profissionais.fields.getByName(name)) {
        profissionais.fields.add(new TextField({ name: name, hidden: hidden, required: false }));
      }
    };

    addText("senha_hash", true);
    addText("senha_salt", true);
    addText("senha_token_key", true);
    addText("senha_atualizada_em", false);

    if (!profissionais.fields.getByName("senha_definida")) {
      profissionais.fields.add(new BoolField({ name: "senha_definida" }));
    }
    if (!profissionais.fields.getByName("acesso_ativo")) {
      profissionais.fields.add(new BoolField({ name: "acesso_ativo" }));
    }

    app.save(profissionais);
  },
  (app) => {}
);

