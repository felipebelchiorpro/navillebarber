/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const barbearias = app.findCollectionByNameOrId("barbearias");

    // 1. Atualizar e enriquecer campos de governança SaaS na coleção 'barbearias'
    if (barbearias) {
      if (!barbearias.fields.getByName("status_assinatura")) {
        barbearias.fields.add(
          new SelectField({
            name: "status_assinatura",
            values: ["ativo", "trial", "bloqueado", "cancelado"],
            required: false,
          })
        );
      }

      if (!barbearias.fields.getByName("limite_profissionais")) {
        barbearias.fields.add(
          new NumberField({
            name: "limite_profissionais",
            required: false,
          })
        );
      }

      if (!barbearias.fields.getByName("data_expiracao_plano")) {
        barbearias.fields.add(
          new TextField({
            name: "data_expiracao_plano",
            required: false,
          })
        );
      }

      app.save(barbearias);
    }

    // 2. Coleção 'faturas' (Cobranças SaaS B2B)
    let faturas;
    try {
      faturas = app.findCollectionByNameOrId("faturas");
    } catch {}

    if (!faturas) {
      faturas = new Collection({
        name: "faturas",
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
          { name: "descricao", type: "text", required: false },
          { name: "valor", type: "number", required: true },
          { name: "data_vencimento", type: "text", required: true },
          { name: "data_pagamento", type: "text", required: false },
          {
            name: "status",
            type: "select",
            values: ["pendente", "pago", "atrasado", "cancelado"],
            required: true,
          },
          {
            name: "metodo_pagamento",
            type: "select",
            values: ["pix", "cartao", "boleto"],
            required: true,
          },
          { name: "link_pagamento", type: "text", required: false },
          { name: "comprovante", type: "text", required: false },
        ],
        listRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id) || barbearia_id != ''",
        viewRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id) || barbearia_id != ''",
        createRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id)",
        updateRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id)",
        deleteRule: "@request.auth.papel = 'superadmin'",
      });
      app.save(faturas);
    }

    // 3. Atualizar dados da Barbearia Zero Grau e semear faturas de teste
    try {
      const zeroGrau = app.findFirstRecordByFilter("barbearias", "slug = 'zero-grau'");
      if (zeroGrau) {
        zeroGrau.set("status_assinatura", "ativo");
        zeroGrau.set("bloqueio_automatico", true);
        zeroGrau.set("limite_profissionais", 5);
        zeroGrau.set("data_expiracao_plano", "2026-11-28");
        app.save(zeroGrau);

        // Semear fatura quitada anterior
        let faturaPaga;
        try {
          faturaPaga = app.findFirstRecordByFilter(
            "faturas",
            `barbearia_id = '${zeroGrau.id}' && status = 'pago'`
          );
        } catch {}

        if (!faturaPaga) {
          faturaPaga = new Record(faturas);
          faturaPaga.set("barbearia_id", zeroGrau.id);
          faturaPaga.set("descricao", "Mensalidade Plano Pro — Setembro/2026");
          faturaPaga.set("valor", 197.0);
          faturaPaga.set("data_vencimento", "2026-09-28");
          faturaPaga.set("data_pagamento", "2026-09-28 10:30:00");
          faturaPaga.set("status", "pago");
          faturaPaga.set("metodo_pagamento", "pix");
          faturaPaga.set("link_pagamento", "https://pix.navillebarber.local/sim/fat_0926");
          app.save(faturaPaga);
        }

        // Semear fatura atual (aberta/pendente)
        let faturaPendente;
        try {
          faturaPendente = app.findFirstRecordByFilter(
            "faturas",
            `barbearia_id = '${zeroGrau.id}' && status = 'pendente'`
          );
        } catch {}

        if (!faturaPendente) {
          faturaPendente = new Record(faturas);
          faturaPendente.set("barbearia_id", zeroGrau.id);
          faturaPendente.set("descricao", "Mensalidade Plano Pro — Outubro/2026");
          faturaPendente.set("valor", 197.0);
          faturaPendente.set("data_vencimento", "2026-10-31");
          faturaPendente.set("status", "pendente");
          faturaPendente.set("metodo_pagamento", "pix");
          faturaPendente.set("link_pagamento", "https://pix.navillebarber.local/sim/fat_1026");
          app.save(faturaPendente);
        }
      }
    } catch (e) {
      console.log("Erro ao inicializar dados de faturas:", e);
    }
  },
  (app) => {
    try {
      const faturas = app.findCollectionByNameOrId("faturas");
      if (faturas) app.delete(faturas);
    } catch {}
  }
);
