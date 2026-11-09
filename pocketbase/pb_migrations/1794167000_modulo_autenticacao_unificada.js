/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const barbearias = app.findCollectionByNameOrId("barbearias");

    // 1. Ajuste na coleção 'users'
    let users;
    try {
      users = app.findCollectionByNameOrId("users");
    } catch {}

    if (users) {
      if (!users.fields.getByName("role")) {
        users.fields.add(
          new SelectField({
            name: "role",
            values: ["superadmin", "proprietario"],
            required: false,
            maxSelect: 1,
          })
        );
      }

      if (!users.fields.getByName("barbearia")) {
        users.fields.add(
          new RelationField({
            name: "barbearia",
            collectionId: barbearias.id,
            cascadeDelete: false,
            maxSelect: 1,
            required: false,
          })
        );
      }

      app.save(users);

      // Sincroniza dados existentes em users
      try {
        const userRecords = app.findRecordsByFilter("users", "id != ''");
        for (const u of userRecords) {
          const papel = u.getString("papel");
          const barbId = u.getString("barbearia_id");

          if (!u.getString("role")) {
            if (papel === "superadmin") {
              u.set("role", "superadmin");
            } else {
              u.set("role", "proprietario");
            }
          }

          if (!u.getString("barbearia") && barbId) {
            u.set("barbearia", barbId);
          }

          app.save(u);
        }
      } catch (e) {
        console.log("Erro ao sincronizar users:", e);
      }
    }

    // 2. Ajuste na coleção 'profissionais'
    let profissionais;
    try {
      profissionais = app.findCollectionByNameOrId("profissionais");
    } catch {}

    if (profissionais) {
      if (!profissionais.fields.getByName("pin")) {
        profissionais.fields.add(
          new TextField({
            name: "pin",
            required: false,
          })
        );
      }

      if (!profissionais.fields.getByName("barbearia")) {
        profissionais.fields.add(
          new RelationField({
            name: "barbearia",
            collectionId: barbearias.id,
            cascadeDelete: false,
            maxSelect: 1,
            required: false,
          })
        );
      }

      app.save(profissionais);

      // Sincroniza dados existentes em profissionais
      try {
        const profRecords = app.findRecordsByFilter("profissionais", "id != ''");
        for (const p of profRecords) {
          const barbId = p.getString("barbearia_id");
          const pinAcesso = p.getString("pin_acesso");

          if (!p.getString("barbearia") && barbId) {
            p.set("barbearia", barbId);
          }

          if (!p.getString("pin")) {
            p.set("pin", pinAcesso || "1234");
          }

          // Se telefone estiver em branco, atribui número para teste
          if (!p.getString("telefone")) {
            p.set("telefone", "19998277880");
          }

          app.save(p);
        }
      } catch (e) {
        console.log("Erro ao sincronizar profissionais:", e);
      }
    }
  },
  (app) => {}
);

