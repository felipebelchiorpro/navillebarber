/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const barbearias = app.findCollectionByNameOrId("barbearias");

    // 1. Coleção 'servicos'
    let servicos;
    try {
      servicos = app.findCollectionByNameOrId("servicos");
    } catch {}

    if (!servicos) {
      servicos = new Collection({
        name: "servicos",
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
          { name: "preco", type: "number", required: true },
          { name: "duracao_minutos", type: "number", required: true },
          {
            name: "categoria",
            type: "select",
            values: ["cabelo", "barba", "combos", "tratamento", "clube"],
            required: true,
          },
          { name: "ativo", type: "bool", required: false },
          { name: "descricao", type: "text", required: false },
        ],
        listRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id) || (ativo = true && barbearia_id = @request.auth.barbearia_id) || (ativo = true && barbearia_id != '')",
        viewRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id) || (ativo = true && barbearia_id = @request.auth.barbearia_id) || (ativo = true && barbearia_id != '')",
        createRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id)",
        updateRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id)",
        deleteRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id)",
      });
      app.save(servicos);
    }

    // 2. Coleção 'profissionais'
    let profissionais;
    try {
      profissionais = app.findCollectionByNameOrId("profissionais");
    } catch {}

    if (!profissionais) {
      profissionais = new Collection({
        name: "profissionais",
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
          { name: "apelido", type: "text", required: false },
          { name: "telefone", type: "text", required: false },
          { name: "taxa_comissao", type: "number", required: false },
          { name: "ativo", type: "bool", required: false },
          {
            name: "tipo_atendimento",
            type: "select",
            values: ["agenda", "ordem_chegada", "ambos"],
            required: true,
          },
          { name: "aceita_clube", type: "bool", required: false },
          { name: "servicos_ids", type: "json", required: false },
        ],
        listRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id) || (ativo = true && barbearia_id = @request.auth.barbearia_id) || (ativo = true && barbearia_id != '')",
        viewRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id) || (ativo = true && barbearia_id = @request.auth.barbearia_id) || (ativo = true && barbearia_id != '')",
        createRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id)",
        updateRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id)",
        deleteRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id)",
      });
      app.save(profissionais);
    }

    // 3. Cadastrar dados de teste (Seed):
    // Barbearia Zero Grau
    let testBarbearia;
    try {
      testBarbearia = app.findFirstRecordByFilter("barbearias", "slug = 'zero-grau'");
    } catch {}

    if (testBarbearia) {
      // 3 Serviços de Teste
      let sCorte;
      try {
        sCorte = app.findFirstRecordByFilter(
          "servicos",
          `barbearia_id = '${testBarbearia.id}' && nome = 'Corte Clássico / Degradê'`
        );
      } catch {}
      if (!sCorte) {
        sCorte = new Record(servicos);
        sCorte.set("barbearia_id", testBarbearia.id);
        sCorte.set("nome", "Corte Clássico / Degradê");
        sCorte.set("preco", 45.0);
        sCorte.set("duracao_minutos", 35);
        sCorte.set("categoria", "cabelo");
        sCorte.set("ativo", true);
        sCorte.set("descricao", "Corte moderno com tesoura e máquina, finalização com navalha e lavagem especial.");
        app.save(sCorte);
      }

      let sBarba;
      try {
        sBarba = app.findFirstRecordByFilter(
          "servicos",
          `barbearia_id = '${testBarbearia.id}' && nome = 'Barba Terapia Tradicional'`
        );
      } catch {}
      if (!sBarba) {
        sBarba = new Record(servicos);
        sBarba.set("barbearia_id", testBarbearia.id);
        sBarba.set("nome", "Barba Terapia Tradicional");
        sBarba.set("preco", 35.0);
        sBarba.set("duracao_minutos", 30);
        sBarba.set("categoria", "barba");
        sBarba.set("ativo", true);
        sBarba.set("descricao", "Barboterapia com toalha quente, esfoliação facial e óleos nobres para hidratação.");
        app.save(sBarba);
      }

      let sCombo;
      try {
        sCombo = app.findFirstRecordByFilter(
          "servicos",
          `barbearia_id = '${testBarbearia.id}' && nome = 'Combo Master: Cabelo & Barba'`
        );
      } catch {}
      if (!sCombo) {
        sCombo = new Record(servicos);
        sCombo.set("barbearia_id", testBarbearia.id);
        sCombo.set("nome", "Combo Master: Cabelo & Barba");
        sCombo.set("preco", 70.0);
        sCombo.set("duracao_minutos", 60);
        sCombo.set("categoria", "combos");
        sCombo.set("ativo", true);
        sCombo.set("descricao", "O combo mais pedido da casa. Corte completo alinhado com barba terapia premium.");
        app.save(sCombo);
      }

      // 2 Barbeiros de Teste
      let pMarcos;
      try {
        pMarcos = app.findFirstRecordByFilter(
          "profissionais",
          `barbearia_id = '${testBarbearia.id}' && nome = 'Marcos Silva'`
        );
      } catch {}
      if (!pMarcos) {
        pMarcos = new Record(profissionais);
        pMarcos.set("barbearia_id", testBarbearia.id);
        pMarcos.set("nome", "Marcos Silva");
        pMarcos.set("apelido", "Marcão Navalha");
        pMarcos.set("telefone", "(11) 97777-1111");
        pMarcos.set("taxa_comissao", 0.5);
        pMarcos.set("ativo", true);
        pMarcos.set("tipo_atendimento", "ambos");
        pMarcos.set("aceita_clube", true);
        pMarcos.set("servicos_ids", [sCorte.id, sBarba.id, sCombo.id]);
        app.save(pMarcos);
      }

      let pLucas;
      try {
        pLucas = app.findFirstRecordByFilter(
          "profissionais",
          `barbearia_id = '${testBarbearia.id}' && nome = 'Lucas Blade'`
        );
      } catch {}
      if (!pLucas) {
        pLucas = new Record(profissionais);
        pLucas.set("barbearia_id", testBarbearia.id);
        pLucas.set("nome", "Lucas Blade");
        pLucas.set("apelido", "Lucas Fade Master");
        pLucas.set("telefone", "(11) 96666-2222");
        pLucas.set("taxa_comissao", 0.45);
        pLucas.set("ativo", true);
        pLucas.set("tipo_atendimento", "agenda");
        pLucas.set("aceita_clube", true);
        pLucas.set("servicos_ids", [sCorte.id, sCombo.id]);
        app.save(pLucas);
      }
    }
  },
  (app) => {
    try {
      const profissionais = app.findCollectionByNameOrId("profissionais");
      if (profissionais) app.delete(profissionais);
    } catch {}

    try {
      const servicos = app.findCollectionByNameOrId("servicos");
      if (servicos) app.delete(servicos);
    } catch {}
  }
);
