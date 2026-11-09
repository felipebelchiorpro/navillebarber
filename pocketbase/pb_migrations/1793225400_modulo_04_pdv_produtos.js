/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const barbearias = app.findCollectionByNameOrId("barbearias");
    let profissionais;
    try {
      profissionais = app.findCollectionByNameOrId("profissionais");
    } catch {}
    let agendamentos;
    try {
      agendamentos = app.findCollectionByNameOrId("agendamentos");
    } catch {}

    // 1. Coleção 'produtos'
    let produtos;
    try {
      produtos = app.findCollectionByNameOrId("produtos");
    } catch {}

    if (!produtos) {
      produtos = new Collection({
        name: "produtos",
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
          {
            name: "categoria",
            type: "select",
            values: ["cabelo", "barba", "bebidas", "cuidados", "acessorios"],
            required: true,
          },
          { name: "preco_venda", type: "number", required: true },
          { name: "preco_custo", type: "number", required: false },
          { name: "estoque_atual", type: "number", required: true },
          { name: "estoque_minimo", type: "number", required: false },
          { name: "codigo_barras", type: "text", required: false },
          { name: "ativo", type: "bool", required: false },
          { name: "descricao", type: "text", required: false },
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
      app.save(produtos);
    }

    // 2. Coleção 'vendas_balcao'
    let vendasBalcao;
    try {
      vendasBalcao = app.findCollectionByNameOrId("vendas_balcao");
    } catch {}

    if (!vendasBalcao) {
      vendasBalcao = new Collection({
        name: "vendas_balcao",
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
          {
            name: "agendamento_id",
            type: "relation",
            required: false,
            collectionId: agendamentos ? agendamentos.id : undefined,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: "barbeiro_id",
            type: "relation",
            required: false,
            collectionId: profissionais ? profissionais.id : undefined,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: "cliente_nome", type: "text", required: true },
          { name: "cliente_telefone", type: "text", required: false },
          { name: "itens_servicos", type: "json", required: false },
          { name: "itens_produtos", type: "json", required: false },
          { name: "subtotal_servicos", type: "number", required: false },
          { name: "subtotal_produtos", type: "number", required: false },
          { name: "desconto", type: "number", required: false },
          { name: "acrescimo", type: "number", required: false },
          { name: "valor_total", type: "number", required: true },
          {
            name: "forma_pagamento",
            type: "select",
            values: ["dinheiro", "pix", "cartao_credito", "cartao_debito", "misto", "outros"],
            required: true,
          },
          {
            name: "status_pagamento",
            type: "select",
            values: ["pago", "pendente", "cancelado"],
            required: true,
          },
          { name: "observacoes", type: "text", required: false },
        ],
        listRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id) || (@request.auth.papel = 'barbeiro' && barbearia_id = @request.auth.barbearia_id) || barbearia_id != ''",
        viewRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id) || (@request.auth.papel = 'barbeiro' && barbearia_id = @request.auth.barbearia_id) || barbearia_id != ''",
        createRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id) || (@request.auth.papel = 'barbeiro' && barbearia_id = @request.auth.barbearia_id) || barbearia_id != ''",
        updateRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id)",
        deleteRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id)",
      });
      app.save(vendasBalcao);
    }

    // 3. Cadastrar Produtos Semente de Teste na Barbearia Zero Grau
    let testBarbearia;
    try {
      testBarbearia = app.findFirstRecordByFilter("barbearias", "slug = 'zero-grau'");
    } catch {}

    if (testBarbearia) {
      const produtosIniciais = [
        {
          nome: "Pomada Modeladora Matte 150g",
          categoria: "cabelo",
          preco_venda: 45.0,
          preco_custo: 20.0,
          estoque_atual: 18,
          estoque_minimo: 5,
          codigo_barras: "7891000101",
          ativo: true,
          descricao: "Efeito seco, fixação forte sem brilho excessivo.",
        },
        {
          nome: "Óleo Hidratante de Barba 30ml",
          categoria: "barba",
          preco_venda: 38.0,
          preco_custo: 16.0,
          estoque_atual: 12,
          estoque_minimo: 4,
          codigo_barras: "7891000102",
          ativo: true,
          descricao: "Fragrância amadeirada com óleo de argan e jojoba.",
        },
        {
          nome: "Shampoo Anticaspa Mentolado 250ml",
          categoria: "cabelo",
          preco_venda: 32.0,
          preco_custo: 14.5,
          estoque_atual: 3,
          estoque_minimo: 6,
          codigo_barras: "7891000103",
          ativo: true,
          descricao: "Ação refrescante e controle de oleosidade.",
        },
        {
          nome: "Cerveja IPA Artesanal 500ml",
          categoria: "bebidas",
          preco_venda: 18.0,
          preco_custo: 9.0,
          estoque_atual: 24,
          estoque_minimo: 8,
          codigo_barras: "7891000104",
          ativo: true,
          descricao: "Cerveja gelada servida no balcão aos clientes.",
        },
        {
          nome: "Refrigerante Lata 350ml",
          categoria: "bebidas",
          preco_venda: 7.0,
          preco_custo: 3.0,
          estoque_atual: 35,
          estoque_minimo: 12,
          codigo_barras: "7891000105",
          ativo: true,
          descricao: "Coca-Cola, Guaraná e Soda bem gelados.",
        },
        {
          nome: "Balm Alinhador de Barba 100g",
          categoria: "barba",
          preco_venda: 42.0,
          preco_custo: 19.0,
          estoque_atual: 2,
          estoque_minimo: 5,
          codigo_barras: "7891000106",
          ativo: true,
          descricao: "Modela os fios rebeldes e hidrata a pele por baixo da barba.",
        },
      ];

      for (const prod of produtosIniciais) {
        let existente;
        try {
          existente = app.findFirstRecordByFilter(
            "produtos",
            `barbearia_id = '${testBarbearia.id}' && nome = '${prod.nome}'`
          );
        } catch {}

        if (!existente) {
          const rec = new Record(produtos);
          rec.set("barbearia_id", testBarbearia.id);
          rec.set("nome", prod.nome);
          rec.set("categoria", prod.categoria);
          rec.set("preco_venda", prod.preco_venda);
          rec.set("preco_custo", prod.preco_custo);
          rec.set("estoque_atual", prod.estoque_atual);
          rec.set("estoque_minimo", prod.estoque_minimo);
          rec.set("codigo_barras", prod.codigo_barras);
          rec.set("ativo", prod.ativo);
          rec.set("descricao", prod.descricao);
          app.save(rec);
        }
      }
    }
  },
  (app) => {
    try {
      const produtos = app.findCollectionByNameOrId("produtos");
      if (produtos) app.delete(produtos);
    } catch {}

    try {
      const vendasBalcao = app.findCollectionByNameOrId("vendas_balcao");
      if (vendasBalcao) app.delete(vendasBalcao);
    } catch {}
  }
);
