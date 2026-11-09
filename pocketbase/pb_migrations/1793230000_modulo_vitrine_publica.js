/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Ajustes na coleção 'barbearias'
    const barbearias = app.findCollectionByNameOrId("barbearias");
    if (barbearias) {
      if (!barbearias.fields.getByName("foto_capa")) {
        barbearias.fields.add(new FileField({ name: "foto_capa", maxSelect: 1 }));
      }
      if (!barbearias.fields.getByName("logo")) {
        barbearias.fields.add(new FileField({ name: "logo", maxSelect: 1 }));
      }
      if (!barbearias.fields.getByName("whatsapp")) {
        barbearias.fields.add(new TextField({ name: "whatsapp" }));
      }
      if (!barbearias.fields.getByName("instagram")) {
        barbearias.fields.add(new TextField({ name: "instagram" }));
      }
      if (!barbearias.fields.getByName("maps_url")) {
        barbearias.fields.add(new TextField({ name: "maps_url" }));
      }
      if (!barbearias.fields.getByName("vip_club_ativo")) {
        barbearias.fields.add(new BoolField({ name: "vip_club_ativo" }));
      }
      if (!barbearias.fields.getByName("cidade")) {
        barbearias.fields.add(new TextField({ name: "cidade" }));
      }
      if (!barbearias.fields.getByName("estado")) {
        barbearias.fields.add(new TextField({ name: "estado" }));
      }
      if (!barbearias.fields.getByName("horario_abertura")) {
        barbearias.fields.add(new TextField({ name: "horario_abertura" }));
      }
      if (!barbearias.fields.getByName("horario_fechamento")) {
        barbearias.fields.add(new TextField({ name: "horario_fechamento" }));
      }

      // Regra de leitura pública para a vitrine
      barbearias.listRule = "@request.auth.papel = 'superadmin' || id = @request.auth.barbearia_id || (e_publico = true && slug != '') || id != ''";
      barbearias.viewRule = "@request.auth.papel = 'superadmin' || id = @request.auth.barbearia_id || (e_publico = true && slug != '') || id != ''";
      app.save(barbearias);
    }

    // 2. Ajustes na coleção 'servicos'
    const servicos = app.findCollectionByNameOrId("servicos");
    if (servicos) {
      if (!servicos.fields.getByName("destaque")) {
        servicos.fields.add(new BoolField({ name: "destaque" }));
      }
      if (!servicos.fields.getByName("foto")) {
        servicos.fields.add(new FileField({ name: "foto", maxSelect: 1 }));
      }
      if (!servicos.fields.getByName("categoria_id")) {
        servicos.fields.add(new TextField({ name: "categoria_id" }));
      }
      servicos.listRule = "";
      servicos.viewRule = "";
      app.save(servicos);
    }

    // 3. Coleção 'categorias_servicos'
    let categoriasServicos;
    try {
      categoriasServicos = app.findCollectionByNameOrId("categorias_servicos");
    } catch {}

    if (!categoriasServicos) {
      categoriasServicos = new Collection({
        name: "categorias_servicos",
        type: "base",
        system: false,
        fields: [
          { name: "barbearia", type: "text", required: true },
          { name: "nome", type: "text", required: true },
          { name: "ordem", type: "number" },
          { name: "icone", type: "text" },
        ],
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
      });
      app.save(categoriasServicos);
    }

    // 4. Coleção 'assinaturas_vip'
    let assinaturasVip;
    try {
      assinaturasVip = app.findCollectionByNameOrId("assinaturas_vip");
    } catch {}

    if (!assinaturasVip) {
      assinaturasVip = new Collection({
        name: "assinaturas_vip",
        type: "base",
        system: false,
        fields: [
          { name: "barbearia", type: "text", required: true },
          { name: "cliente_telefone", type: "text", required: true },
          { name: "cliente_nome", type: "text" },
          { name: "ativo", type: "bool" },
          { name: "plano_nome", type: "text" },
          { name: "servicos_inclusos", type: "json" },
        ],
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
      });
      app.save(assinaturasVip);
    }

    // 5. Atualizar registro Zero Grau e inserir dados iniciais
    try {
      const zeroGrau = app.findFirstRecordByFilter("barbearias", "slug = 'zero-grau'");
      if (zeroGrau) {
        zeroGrau.set("cidade", "Caconde");
        zeroGrau.set("estado", "SP");
        zeroGrau.set("whatsapp", "5511999998888");
        zeroGrau.set("instagram", "barbeariazerograu");
        zeroGrau.set("maps_url", "https://maps.google.com");
        zeroGrau.set("vip_club_ativo", true);
        zeroGrau.set("horario_abertura", "09:00");
        zeroGrau.set("horario_fechamento", "20:00");
        app.save(zeroGrau);

        // Categorias para a barbearia
        const existingCats = app.findRecordsByFilter("categorias_servicos", `barbearia = '${zeroGrau.id}'`);
        if (existingCats.length === 0) {
          const catsData = [
            { nome: "Cabelo", ordem: 1, icone: "scissors" },
            { nome: "Barba", ordem: 2, icone: "sparkles" },
            { nome: "Combos VIP", ordem: 3, icone: "crown" },
            { nome: "Estética", ordem: 4, icone: "gem" }
          ];
          for (const c of catsData) {
            const catRecord = new Record(categoriasServicos);
            catRecord.set("barbearia", zeroGrau.id);
            catRecord.set("nome", c.nome);
            catRecord.set("ordem", c.ordem);
            catRecord.set("icone", c.icone);
            app.save(catRecord);
          }
        }

        // Marcar serviço de Combo como destaque
        try {
          const combo = app.findFirstRecordByFilter("servicos", `barbearia_id = '${zeroGrau.id}' && categoria = 'combos'`);
          if (combo) {
            combo.set("destaque", true);
            app.save(combo);
          }
        } catch {}

        // Assinatura VIP de teste para o cliente
        const existingVip = app.findRecordsByFilter("assinaturas_vip", `barbearia = '${zeroGrau.id}'`);
        if (existingVip.length === 0) {
          const vipRecord = new Record(assinaturasVip);
          vipRecord.set("barbearia", zeroGrau.id);
          vipRecord.set("cliente_telefone", "11999998888");
          vipRecord.set("cliente_nome", "Carlos Assinante");
          vipRecord.set("ativo", true);
          vipRecord.set("plano_nome", "Clube VIP Gold");
          vipRecord.set("servicos_inclusos", []);
          app.save(vipRecord);
        }
      }
    } catch (e) {
      console.log("Erro seed vitrine:", e);
    }
  },
  (app) => {}
);

