/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const barbearias = app.findCollectionByNameOrId("barbearias");
    let servicos;
    try {
      servicos = app.findCollectionByNameOrId("servicos");
    } catch {}
    let profissionais;
    try {
      profissionais = app.findCollectionByNameOrId("profissionais");
    } catch {}

    // 1. Coleção 'planos_assinatura'
    let planosAssinatura;
    try {
      planosAssinatura = app.findCollectionByNameOrId("planos_assinatura");
    } catch {}

    if (!planosAssinatura) {
      planosAssinatura = new Collection({
        name: "planos_assinatura",
        type: "base",
        system: false,
        fields: [
          {
            name: "barbearia_id",
            type: "relation",
            required: true,
            collectionId: barbearias.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: "nome", type: "text", required: true },
          { name: "valor_mensal", type: "number", required: true },
          { name: "limite_cortes_mes", type: "number", required: true },
          { name: "permite_barba", type: "bool", required: false },
          { name: "servicos_inclusos", type: "json", required: false },
          { name: "dias_permitidos", type: "json", required: false },
          { name: "barbeiros_permitidos", type: "json", required: false },
          { name: "ativo", type: "bool", required: false },
          { name: "link_mercado_pago", type: "text", required: false },
        ],
        listRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id) || (@request.auth.papel = 'barbeiro' && barbearia_id = @request.auth.barbearia_id) || barbearia_id != ''",
        viewRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id) || (@request.auth.papel = 'barbeiro' && barbearia_id = @request.auth.barbearia_id) || barbearia_id != ''",
        createRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id) || (@request.auth.papel = 'barbeiro' && barbearia_id = @request.auth.barbearia_id) || barbearia_id != ''",
        updateRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id) || (@request.auth.papel = 'barbeiro' && barbearia_id = @request.auth.barbearia_id) || barbearia_id != ''",
        deleteRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id)",
      });
      app.save(planosAssinatura);
    }

    // 2. Coleção 'clientes'
    let clientes;
    try {
      clientes = app.findCollectionByNameOrId("clientes");
    } catch {}

    if (!clientes) {
      clientes = new Collection({
        name: "clientes",
        type: "base",
        system: false,
        fields: [
          {
            name: "barbearia_id",
            type: "relation",
            required: true,
            collectionId: barbearias.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: "nome", type: "text", required: true },
          { name: "telefone", type: "text", required: true },
          { name: "email", type: "email", required: false },
          { name: "observacoes", type: "text", required: false },
          { name: "total_visitas", type: "number", required: false },
          { name: "total_gasto", type: "number", required: false },
          {
            name: "plano_assinatura_id",
            type: "relation",
            required: false,
            collectionId: planosAssinatura.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: "status_assinatura",
            type: "select",
            values: ["ativo", "atrasado", "vencido", "cancelado", "sem_plano"],
            required: true,
          },
          { name: "data_vencimento", type: "text", required: false },
          { name: "cortes_utilizados_mes", type: "number", required: false },
        ],
        listRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id) || (@request.auth.papel = 'barbeiro' && barbearia_id = @request.auth.barbearia_id) || barbearia_id != ''",
        viewRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id) || (@request.auth.papel = 'barbeiro' && barbearia_id = @request.auth.barbearia_id) || barbearia_id != ''",
        createRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id) || (@request.auth.papel = 'barbeiro' && barbearia_id = @request.auth.barbearia_id) || barbearia_id != ''",
        updateRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id) || (@request.auth.papel = 'barbeiro' && barbearia_id = @request.auth.barbearia_id) || barbearia_id != ''",
        deleteRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id)",
      });
      app.save(clientes);
    }

    // 3. Seed de Teste: Barbearia Zero Grau
    let testBarbearia;
    try {
      testBarbearia = app.findFirstRecordByFilter("barbearias", "slug = 'zero-grau'");
    } catch {}

    if (testBarbearia) {
      // Procura serviços de corte para incluir no plano
      let servicoCorte;
      try {
        servicoCorte = app.findFirstRecordByFilter(
          "servicos",
          `barbearia_id = '${testBarbearia.id}' && (categoria = 'cabelo' || nome ~ 'Corte')`
        );
      } catch {}

      // Procura barbeiros da barbearia
      let barbeirosIds = [];
      try {
        const barbers = app.findRecordsByFilter(
          "profissionais",
          `barbearia_id = '${testBarbearia.id}' && ativo = true`,
          "",
          10,
          0
        );
        barbeirosIds = barbers.map((b) => b.id);
      } catch {}

      // Plano "Clube VIP Cabelo"
      let planoVipCabelo;
      try {
        planoVipCabelo = app.findFirstRecordByFilter(
          "planos_assinatura",
          `barbearia_id = '${testBarbearia.id}' && nome = 'Clube VIP Cabelo'`
        );
      } catch {}

      if (!planoVipCabelo) {
        planoVipCabelo = new Record(planosAssinatura);
        planoVipCabelo.set("barbearia_id", testBarbearia.id);
        planoVipCabelo.set("nome", "Clube VIP Cabelo");
        planoVipCabelo.set("valor_mensal", 89.90);
        planoVipCabelo.set("limite_cortes_mes", 4);
        planoVipCabelo.set("permite_barba", false);
        planoVipCabelo.set(
          "servicos_inclusos",
          servicoCorte ? [servicoCorte.id] : []
        );
        planoVipCabelo.set("dias_permitidos", [1, 2, 3, 4]); // Segunda a Quinta
        planoVipCabelo.set("barbeiros_permitidos", barbeirosIds);
        planoVipCabelo.set("ativo", true);
        planoVipCabelo.set("link_mercado_pago", "https://mpago.la/clube-vip-cabelo");
        app.save(planoVipCabelo);
      }

      // Cliente 1: Lucas Albuquerque (Assinante Ativo)
      let clienteVip;
      try {
        clienteVip = app.findFirstRecordByFilter(
          "clientes",
          `barbearia_id = '${testBarbearia.id}' && telefone = '11999998888'`
        );
      } catch {}

      if (!clienteVip) {
        clienteVip = new Record(clientes);
        clienteVip.set("barbearia_id", testBarbearia.id);
        clienteVip.set("nome", "Lucas Albuquerque");
        clienteVip.set("telefone", "11999998888");
        clienteVip.set("email", "lucas.vip@gmail.com");
        clienteVip.set("observacoes", "Cliente VIP assíduo. Gosta de corte na tesoura com finalização matte.");
        clienteVip.set("total_visitas", 5);
        clienteVip.set("total_gasto", 269.70);
        clienteVip.set("plano_assinatura_id", planoVipCabelo.id);
        clienteVip.set("status_assinatura", "ativo");
        clienteVip.set("data_vencimento", "2026-11-28");
        clienteVip.set("cortes_utilizados_mes", 1);
        app.save(clienteVip);
      }

      // Cliente 2: Bruno Henrique (Cliente Avulso sem plano)
      let clienteAvulso;
      try {
        clienteAvulso = app.findFirstRecordByFilter(
          "clientes",
          `barbearia_id = '${testBarbearia.id}' && telefone = '11988887777'`
        );
      } catch {}

      if (!clienteAvulso) {
        clienteAvulso = new Record(clientes);
        clienteAvulso.set("barbearia_id", testBarbearia.id);
        clienteAvulso.set("nome", "Bruno Henrique");
        clienteAvulso.set("telefone", "11988887777");
        clienteAvulso.set("email", "bruno.h@outlook.com");
        clienteAvulso.set("observacoes", "Atendimento aos sábados.");
        clienteAvulso.set("total_visitas", 2);
        clienteAvulso.set("total_gasto", 90.00);
        clienteAvulso.set("status_assinatura", "sem_plano");
        clienteAvulso.set("cortes_utilizados_mes", 0);
        app.save(clienteAvulso);
      }
    }
  },
  (app) => {
    try {
      const clientes = app.findCollectionByNameOrId("clientes");
      if (clientes) app.delete(clientes);
    } catch {}

    try {
      const planosAssinatura = app.findCollectionByNameOrId("planos_assinatura");
      if (planosAssinatura) app.delete(planosAssinatura);
    } catch {}
  }
);
