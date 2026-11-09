/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const barbearias = app.findCollectionByNameOrId("barbearias");
    const profissionais = app.findCollectionByNameOrId("profissionais");

    // 1. Coleção 'agendamentos'
    let agendamentos;
    try {
      agendamentos = app.findCollectionByNameOrId("agendamentos");
    } catch {}

    if (!agendamentos) {
      agendamentos = new Collection({
        name: "agendamentos",
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
            name: "barbeiro_id",
            type: "relation",
            required: true,
            collectionId: profissionais.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: "cliente_nome", type: "text", required: true },
          { name: "cliente_telefone", type: "text", required: true },
          { name: "servicos_ids", type: "json", required: true },
          { name: "data", type: "text", required: true },
          { name: "horario", type: "text", required: true },
          { name: "duracao_total_minutos", type: "number", required: true },
          { name: "valor_total", type: "number", required: true },
          {
            name: "status",
            type: "select",
            values: ["pendente", "confirmado", "concluido", "cancelado"],
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
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id) || (@request.auth.papel = 'barbeiro' && barbearia_id = @request.auth.barbearia_id)",
        deleteRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id)",
      });
      app.save(agendamentos);
    }

    // 2. Coleção 'bloqueios_horario'
    let bloqueios;
    try {
      bloqueios = app.findCollectionByNameOrId("bloqueios_horario");
    } catch {}

    if (!bloqueios) {
      bloqueios = new Collection({
        name: "bloqueios_horario",
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
          { name: "barbeiro_id", type: "text", required: true },
          { name: "data", type: "text", required: true },
          { name: "horario_inicio", type: "text", required: true },
          { name: "horario_fim", type: "text", required: true },
          { name: "motivo", type: "text", required: true },
        ],
        listRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id) || (@request.auth.papel = 'barbeiro' && barbearia_id = @request.auth.barbearia_id) || barbearia_id != ''",
        viewRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id) || (@request.auth.papel = 'barbeiro' && barbearia_id = @request.auth.barbearia_id) || barbearia_id != ''",
        createRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id) || (@request.auth.papel = 'barbeiro' && barbearia_id = @request.auth.barbearia_id)",
        updateRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id) || (@request.auth.papel = 'barbeiro' && barbearia_id = @request.auth.barbearia_id)",
        deleteRule:
          "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id)",
      });
      app.save(bloqueios);
    }

    // 3. Cadastrar dados de teste (Seed)
    let testBarbearia;
    try {
      testBarbearia = app.findFirstRecordByFilter("barbearias", "slug = 'zero-grau'");
    } catch {}

    if (testBarbearia) {
      let pMarcos;
      try {
        pMarcos = app.findFirstRecordByFilter(
          "profissionais",
          `barbearia_id = '${testBarbearia.id}' && nome = 'Marcos Silva'`
        );
      } catch {}

      let sCombo;
      try {
        sCombo = app.findFirstRecordByFilter(
          "servicos",
          `barbearia_id = '${testBarbearia.id}' && nome = 'Combo Master: Cabelo & Barba'`
        );
      } catch {}

      // Obter data de hoje no formato YYYY-MM-DD
      const todayStr = new Date().toISOString().split("T")[0];

      if (pMarcos && sCombo) {
        // Criar agendamento de teste se ainda não existir
        let testAgendamento;
        try {
          testAgendamento = app.findFirstRecordByFilter(
            "agendamentos",
            `barbearia_id = '${testBarbearia.id}' && barbeiro_id = '${pMarcos.id}' && data = '${todayStr}' && horario = '10:00'`
          );
        } catch {}

        if (!testAgendamento) {
          testAgendamento = new Record(agendamentos);
          testAgendamento.set("barbearia_id", testBarbearia.id);
          testAgendamento.set("barbeiro_id", pMarcos.id);
          testAgendamento.set("cliente_nome", "Carlos Eduardo");
          testAgendamento.set("cliente_telefone", "(11) 98888-7777");
          testAgendamento.set("servicos_ids", [sCombo.id]);
          testAgendamento.set("data", todayStr);
          testAgendamento.set("horario", "10:00");
          testAgendamento.set("duracao_total_minutos", 60);
          testAgendamento.set("valor_total", 70.0);
          testAgendamento.set("status", "confirmado");
          testAgendamento.set("observacoes", "Cliente VIP, prefere degradê navalhado baixo.");
          app.save(testAgendamento);
        }

        // Criar bloqueio de teste (ex: Almoço das 12:00 às 13:00)
        let testBloqueio;
        try {
          testBloqueio = app.findFirstRecordByFilter(
            "bloqueios_horario",
            `barbearia_id = '${testBarbearia.id}' && data = '${todayStr}' && horario_inicio = '12:00'`
          );
        } catch {}

        if (!testBloqueio) {
          testBloqueio = new Record(bloqueios);
          testBloqueio.set("barbearia_id", testBarbearia.id);
          testBloqueio.set("barbeiro_id", pMarcos.id);
          testBloqueio.set("data", todayStr);
          testBloqueio.set("horario_inicio", "12:00");
          testBloqueio.set("horario_fim", "13:00");
          testBloqueio.set("motivo", "Intervalo de Almoço");
          app.save(testBloqueio);
        }
      }
    }
  },
  (app) => {
    try {
      const agendamentos = app.findCollectionByNameOrId("agendamentos");
      if (agendamentos) app.delete(agendamentos);
    } catch {}

    try {
      const bloqueios = app.findCollectionByNameOrId("bloqueios_horario");
      if (bloqueios) app.delete(bloqueios);
    } catch {}
  }
);
