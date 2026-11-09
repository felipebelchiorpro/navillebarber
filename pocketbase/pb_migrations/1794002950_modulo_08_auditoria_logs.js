/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    let logs;
    try {
      logs = app.findCollectionByNameOrId("logs");
    } catch {}

    if (!logs) {
      logs = new Collection({
        name: "logs",
        type: "base",
        system: false,
        fields: [
          { name: "level", type: "text", required: false },
          { name: "tenant_slug", type: "text", required: false },
          { name: "action", type: "text", required: false },
          { name: "message", type: "text", required: false },
          { name: "details", type: "json", required: false },
        ],
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "@request.auth.papel = 'superadmin'",
        deleteRule: "@request.auth.papel = 'superadmin'",
      });
      app.save(logs);

      // Seed alguns logs iniciais para visualização imediata no terminal live
      const sampleLogs = [
        {
          level: "info",
          tenant_slug: "zero-grau",
          action: "auth.login",
          message: "Autenticação bem-sucedida para o operador Dono (Barbearia Zero Grau).",
        },
        {
          level: "info",
          tenant_slug: "fenix-prime",
          action: "agendamento.criado",
          message: "Novo agendamento confirmado (#AGD-9821) via Vitrine Pública B2C.",
        },
        {
          level: "warning",
          tenant_slug: "don-corleone",
          action: "saas.fatura_vencida",
          message: "Fatura de mensalidade pendente há 5 dias. Aviso preventivo emitido.",
        },
        {
          level: "error",
          tenant_slug: "sistema_global",
          action: "webhook.asaas",
          message: "Timeout na sincronização do webhook de pagamento bancário (tentativa 3/3).",
        },
        {
          level: "info",
          tenant_slug: "sistema_global",
          action: "cron.backup",
          message: "Snapshot automático do banco de dados PocketBase concluído com sucesso.",
        },
      ];

      for (const item of sampleLogs) {
        const record = new Record(logs);
        record.set("level", item.level);
        record.set("tenant_slug", item.tenant_slug);
        record.set("action", item.action);
        record.set("message", item.message);
        app.save(record);
      }
    }
  },
  (app) => {}
);

