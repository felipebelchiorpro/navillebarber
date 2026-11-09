/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    let profissionais;
    try {
      profissionais = app.findCollectionByNameOrId("profissionais");
    } catch {}

    if (profissionais) {
      if (!profissionais.fields.getByName("pin")) {
        profissionais.fields.add(new TextField({ name: "pin", required: false }));
      }
      if (!profissionais.fields.getByName("pin_acesso")) {
        profissionais.fields.add(new TextField({ name: "pin_acesso", required: false }));
      }
      if (!profissionais.fields.getByName("pix_tipo")) {
        profissionais.fields.add(new TextField({ name: "pix_tipo", required: false }));
      }
      if (!profissionais.fields.getByName("pix_chave")) {
        profissionais.fields.add(new TextField({ name: "pix_chave", required: false }));
      }
      if (!profissionais.fields.getByName("pix_banco")) {
        profissionais.fields.add(new TextField({ name: "pix_banco", required: false }));
      }
      if (!profissionais.fields.getByName("pix_ultima_atualizacao")) {
        profissionais.fields.add(new TextField({ name: "pix_ultima_atualizacao", required: false }));
      }
      if (!profissionais.fields.getByName("asaas_account_id")) {
        profissionais.fields.add(new TextField({ name: "asaas_account_id", required: false }));
      }
      if (!profissionais.fields.getByName("asaas_wallet_id")) {
        profissionais.fields.add(new TextField({ name: "asaas_wallet_id", required: false }));
      }
      if (!profissionais.fields.getByName("split_status")) {
        profissionais.fields.add(
          new SelectField({
            name: "split_status",
            values: ["pendente", "ativo", "recusado"],
            required: false,
          })
        );
      }

      app.save(profissionais);

      // Sincroniza PIN padrão para profissionais existentes se estiver em branco
      try {
        const records = app.findRecordsByFilter("profissionais", "id != ''");
        for (const r of records) {
          let mudou = false;
          if (!r.getString("pin") && !r.getString("pin_acesso")) {
            r.set("pin", "1234");
            r.set("pin_acesso", "1234");
            mudou = true;
          } else if (r.getString("pin_acesso") && !r.getString("pin")) {
            r.set("pin", r.getString("pin_acesso"));
            mudou = true;
          } else if (r.getString("pin") && !r.getString("pin_acesso")) {
            r.set("pin_acesso", r.getString("pin"));
            mudou = true;
          }
          if (mudou) {
            app.save(r);
          }
        }
      } catch (err) {
        console.log("Aviso ao preencher PIN de profissionais:", err);
      }
    }
  },
  (app) => {}
);

