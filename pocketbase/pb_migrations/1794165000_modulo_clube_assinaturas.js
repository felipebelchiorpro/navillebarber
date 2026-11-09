/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const barbearias = app.findCollectionByNameOrId("barbearias");

    // 1. Coleção 'clube_planos'
    let clubePlanos;
    try {
      clubePlanos = app.findCollectionByNameOrId("clube_planos");
    } catch {}

    if (!clubePlanos) {
      clubePlanos = new Collection({
        name: "clube_planos",
        type: "base",
        system: false,
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.papel = 'superadmin' || @request.auth.id != ''",
        updateRule: "@request.auth.papel = 'superadmin' || @request.auth.id != ''",
        deleteRule: "@request.auth.papel = 'superadmin' || @request.auth.id != ''",
      });

      clubePlanos.fields.add(
        new RelationField({
          name: "barbearia",
          collectionId: barbearias.id,
          cascadeDelete: false,
          maxSelect: 1,
          required: true,
        }),
        new TextField({
          name: "nome",
          required: true,
        }),
        new NumberField({
          name: "valor_mensal",
          required: true,
        }),
        new NumberField({
          name: "desconto_produtos_pct",
          required: false,
        }),
        new BoolField({
          name: "permite_corte_ilimitado",
          required: false,
        }),
        new NumberField({
          name: "limite_cortes_mes",
          required: false,
        }),
        new BoolField({
          name: "ativo",
          required: false,
        })
      );

      app.save(clubePlanos);
    }

    // 2. Coleção 'clube_membros'
    let clubeMembros;
    try {
      clubeMembros = app.findCollectionByNameOrId("clube_membros");
    } catch {}

    if (!clubeMembros) {
      clubeMembros = new Collection({
        name: "clube_membros",
        type: "base",
        system: false,
        fields: [],
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.papel = 'superadmin' || @request.auth.id != ''",
        updateRule: "@request.auth.papel = 'superadmin' || @request.auth.id != ''",
        deleteRule: "@request.auth.papel = 'superadmin' || @request.auth.id != ''",
      });

      clubeMembros.fields.add(
        new RelationField({
          name: "barbearia",
          collectionId: barbearias.id,
          cascadeDelete: false,
          maxSelect: 1,
          required: true,
        }),
        new RelationField({
          name: "plano",
          collectionId: clubePlanos.id,
          cascadeDelete: false,
          maxSelect: 1,
          required: true,
        }),
        new TextField({
          name: "nome",
          required: true,
        }),
        new TextField({
          name: "telefone",
          required: true,
        }),
        new SelectField({
          name: "status",
          values: ["ativo", "cancelado", "inadimplente"],
          required: true,
          maxSelect: 1,
        }),
        new DateField({
          name: "validade",
          required: false,
        })
      );

      app.save(clubeMembros);
    }

    // 3. Ajuste na coleção 'profissionais'
    let profissionais;
    try {
      profissionais = app.findCollectionByNameOrId("profissionais");
    } catch {}

    if (profissionais) {
      let tipoAtendimentoField = profissionais.fields.getByName("tipo_atendimento");
      if (tipoAtendimentoField) {
        tipoAtendimentoField.values = ["agendamento_geral", "hibrido_clube_geral", "exclusivo_clube"];
      } else {
        profissionais.fields.add(new SelectField({
          name: "tipo_atendimento",
          values: ["agendamento_geral", "hibrido_clube_geral", "exclusivo_clube"],
          required: true,
          maxSelect: 1,
        }));
      }
      app.save(profissionais);

      // Migra registros existentes de profissionais
      try {
        const registros = app.findRecordsByFilter("profissionais", "tipo_atendimento != ''");
        for (const reg of registros) {
          const val = reg.getString("tipo_atendimento");
          if (val === "ambos") {
            reg.set("tipo_atendimento", "hibrido_clube_geral");
            app.save(reg);
          } else if (val === "agenda" || val === "ordem_chegada") {
            reg.set("tipo_atendimento", "agendamento_geral");
            app.save(reg);
          }
        }
      } catch (e) {
        console.log("Aviso ao atualizar registros de profissionais:", e);
      }
    }

    // 4. Seed de Demonstração / Teste para Barbearia Belchior
    let barbBelchior;
    try {
      barbBelchior = app.findFirstRecordByFilter("barbearias", "slug = 'belchior'");
    } catch {}

    if (barbBelchior) {
      let planoBlack;
      try {
        planoBlack = app.findFirstRecordByFilter(
          "clube_planos",
          `barbearia = '${barbBelchior.id}' && nome = 'Plano Black'`
        );
      } catch {}

      if (!planoBlack) {
        planoBlack = new Record(clubePlanos);
        planoBlack.set("barbearia", barbBelchior.id);
        planoBlack.set("nome", "Plano Black");
        planoBlack.set("valor_mensal", 119.90);
        planoBlack.set("desconto_produtos_pct", 15);
        planoBlack.set("permite_corte_ilimitado", true);
        planoBlack.set("limite_cortes_mes", 0);
        planoBlack.set("ativo", true);
        app.save(planoBlack);
      }

      let planoBarba;
      try {
        planoBarba = app.findFirstRecordByFilter(
          "clube_planos",
          `barbearia = '${barbBelchior.id}' && nome = 'Plano Barba'`
        );
      } catch {}

      if (!planoBarba) {
        planoBarba = new Record(clubePlanos);
        planoBarba.set("barbearia", barbBelchior.id);
        planoBarba.set("nome", "Plano Barba");
        planoBarba.set("valor_mensal", 69.90);
        planoBarba.set("desconto_produtos_pct", 10);
        planoBarba.set("permite_corte_ilimitado", false);
        planoBarba.set("limite_cortes_mes", 4);
        planoBarba.set("ativo", true);
        app.save(planoBarba);
      }

      let membroAtivo;
      try {
        membroAtivo = app.findFirstRecordByFilter(
          "clube_membros",
          `barbearia = '${barbBelchior.id}' && telefone = '19999990001'`
        );
      } catch {}

      if (!membroAtivo && planoBlack) {
        membroAtivo = new Record(clubeMembros);
        membroAtivo.set("barbearia", barbBelchior.id);
        membroAtivo.set("plano", planoBlack.id);
        membroAtivo.set("nome", "Carlos Silva VIP");
        membroAtivo.set("telefone", "19999990001");
        membroAtivo.set("status", "ativo");
        membroAtivo.set("validade", "2026-12-31 23:59:59.000Z");
        app.save(membroAtivo);
      }

      let membroInadimplente;
      try {
        membroInadimplente = app.findFirstRecordByFilter(
          "clube_membros",
          `barbearia = '${barbBelchior.id}' && telefone = '19999990002'`
        );
      } catch {}

      if (!membroInadimplente && planoBarba) {
        membroInadimplente = new Record(clubeMembros);
        membroInadimplente.set("barbearia", barbBelchior.id);
        membroInadimplente.set("plano", planoBarba.id);
        membroInadimplente.set("nome", "Marcos Inadimplente");
        membroInadimplente.set("telefone", "19999990002");
        membroInadimplente.set("status", "inadimplente");
        membroInadimplente.set("validade", "2026-10-10 23:59:59.000Z");
        app.save(membroInadimplente);
      }

      try {
        const barbeiros = app.findRecordsByFilter("profissionais", `barbearia_id = '${barbBelchior.id}'`);
        if (barbeiros.length > 0) {
          barbeiros[0].set("tipo_atendimento", "hibrido_clube_geral");
          app.save(barbeiros[0]);
        }

        if (barbeiros.length === 1) {
          const profVip = new Record(profissionais);
          profVip.set("barbearia_id", barbBelchior.id);
          profVip.set("nome", "Rodrigo Mestre (Exclusivo Clube)");
          profVip.set("apelido", "Mestre Rodrigo");
          profVip.set("telefone", "19998270099");
          profVip.set("taxa_comissao", 50);
          profVip.set("ativo", true);
          profVip.set("tipo_atendimento", "exclusivo_clube");
          profVip.set("aceita_clube", true);
          profVip.set("servicos_ids", barbeiros[0].get("servicos_ids") || []);
          app.save(profVip);

          const profGeral = new Record(profissionais);
          profGeral.set("barbearia_id", barbBelchior.id);
          profGeral.set("nome", "Lucas Barbeiro (Agendamento Geral)");
          profGeral.set("apelido", "Lucas");
          profGeral.set("telefone", "19998270088");
          profGeral.set("taxa_comissao", 40);
          profGeral.set("ativo", true);
          profGeral.set("tipo_atendimento", "agendamento_geral");
          profGeral.set("aceita_clube", false);
          profGeral.set("servicos_ids", barbeiros[0].get("servicos_ids") || []);
          app.save(profGeral);
        }
      } catch (e) {
        console.log("Aviso ao configurar barbeiros de teste:", e);
      }
    }
  },
  (app) => {
    try {
      const clubeMembros = app.findCollectionByNameOrId("clube_membros");
      if (clubeMembros) app.delete(clubeMembros);
    } catch {}

    try {
      const clubePlanos = app.findCollectionByNameOrId("clube_planos");
      if (clubePlanos) app.delete(clubePlanos);
    } catch {}
  }
);
