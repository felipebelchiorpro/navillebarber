/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Atualizar campos da coleção 'barbearias'
    const barbearias = app.findCollectionByNameOrId("barbearias");
    if (barbearias) {
      if (!barbearias.fields.getByName("split_ativo")) {
        barbearias.fields.add(new BoolField({ name: "split_ativo" }));
      }
      if (!barbearias.fields.getByName("split_carencia_tipo")) {
        barbearias.fields.add(
          new SelectField({
            name: "split_carencia_tipo",
            values: ["dias", "transacoes", "isento_vitalicio"],
            required: false,
            maxSelect: 1,
          })
        );
      }
      if (!barbearias.fields.getByName("split_dias_gratis")) {
        barbearias.fields.add(new NumberField({ name: "split_dias_gratis" }));
      }
      if (!barbearias.fields.getByName("split_data_ativacao")) {
        barbearias.fields.add(new DateField({ name: "split_data_ativacao", required: false }));
      }
      if (!barbearias.fields.getByName("split_franquia_transacoes_mensal")) {
        barbearias.fields.add(new NumberField({ name: "split_franquia_transacoes_mensal" }));
      }
      if (!barbearias.fields.getByName("split_contador_mes_atual")) {
        barbearias.fields.add(new NumberField({ name: "split_contador_mes_atual" }));
      }
      if (!barbearias.fields.getByName("split_taxa_transacao")) {
        barbearias.fields.add(new NumberField({ name: "split_taxa_transacao" }));
      }
      if (!barbearias.fields.getByName("split_mensalidade_modulo")) {
        barbearias.fields.add(new NumberField({ name: "split_mensalidade_modulo" }));
      }
      app.save(barbearias);

      // Preenche valores default para as barbearias existentes
      try {
        const records = app.findRecordsByFilter("barbearias", "id != ''", "", 100);
        for (const b of records) {
          let updated = false;
          if (b.get("split_ativo") === null || b.get("split_ativo") === undefined) {
            b.set("split_ativo", b.get("modulo_split_asaas") ?? true);
            updated = true;
          }
          if (!b.get("split_carencia_tipo")) {
            b.set("split_carencia_tipo", "dias");
            updated = true;
          }
          if (b.get("split_dias_gratis") === null || b.get("split_dias_gratis") === undefined) {
            b.set("split_dias_gratis", 30);
            updated = true;
          }
          if (!b.get("split_data_ativacao")) {
            b.set("split_data_ativacao", new Date().toISOString());
            updated = true;
          }
          if (b.get("split_franquia_transacoes_mensal") === null || b.get("split_franquia_transacoes_mensal") === undefined) {
            b.set("split_franquia_transacoes_mensal", 30);
            updated = true;
          }
          if (b.get("split_contador_mes_atual") === null || b.get("split_contador_mes_atual") === undefined) {
            b.set("split_contador_mes_atual", 0);
            updated = true;
          }
          if (b.get("split_taxa_transacao") === null || b.get("split_taxa_transacao") === undefined) {
            b.set("split_taxa_transacao", 0.35);
            updated = true;
          }
          if (b.get("split_mensalidade_modulo") === null || b.get("split_mensalidade_modulo") === undefined) {
            b.set("split_mensalidade_modulo", 30.0);
            updated = true;
          }
          if (updated) {
            app.save(b);
          }
        }
      } catch (e) {
        console.log("Aviso ao preencher defaults de barbearias:", e);
      }
    }

    // 2. Nova Coleção 'terminais_pagamento'
    let terminais;
    try {
      terminais = app.findCollectionByNameOrId("terminais_pagamento");
    } catch {}

    const agendamentos = app.findCollectionByNameOrId("agendamentos");

    if (!terminais) {
      terminais = new Collection({
        name: "terminais_pagamento",
        type: "base",
        system: false,
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
      });

      terminais.fields.add(
        new RelationField({
          name: "barbearia",
          collectionId: barbearias.id,
          cascadeDelete: false,
          maxSelect: 1,
          required: true,
        }),
        new TextField({
          name: "identificador",
          required: true,
        }),
        new SelectField({
          name: "tipo_terminal",
          values: ["tef_smartlink", "pwa_maquininha"],
          required: true,
          maxSelect: 1,
        }),
        new TextField({
          name: "codigo_pareamento",
          required: false,
        }),
        new SelectField({
          name: "status",
          values: ["online", "offline", "aguardando_pagamento"],
          required: true,
          maxSelect: 1,
        })
      );

      if (agendamentos) {
        terminais.fields.add(
          new RelationField({
            name: "cobranca_ativa",
            collectionId: agendamentos.id,
            cascadeDelete: false,
            maxSelect: 1,
            required: false,
          })
        );
      }

      app.save(terminais);

      // Seed de terminais de demonstração para a primeira barbearia
      try {
        const primeiraBarbearia = app.findFirstRecordByFilter("barbearias", "id != ''");
        if (primeiraBarbearia) {
          const t1 = new Record(terminais);
          t1.set("barbearia", primeiraBarbearia.id);
          t1.set("identificador", "Balcão Principal");
          t1.set("tipo_terminal", "tef_smartlink");
          t1.set("codigo_pareamento", "849201");
          t1.set("status", "online");
          app.save(t1);

          const t2 = new Record(terminais);
          t2.set("barbearia", primeiraBarbearia.id);
          t2.set("identificador", "Maquininha PWA Cadeira 01");
          t2.set("tipo_terminal", "pwa_maquininha");
          t2.set("codigo_pareamento", "317849");
          t2.set("status", "online");
          app.save(t2);
        }
      } catch (errSeed) {
        console.log("Aviso ao semear terminais de teste:", errSeed);
      }
    }
  },
  (app) => {}
);

