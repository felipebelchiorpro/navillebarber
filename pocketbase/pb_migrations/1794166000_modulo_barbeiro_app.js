/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Coleção 'profissionais'
    let profissionais;
    try {
      profissionais = app.findCollectionByNameOrId("profissionais");
    } catch {}

    if (profissionais) {
      if (!profissionais.fields.getByName("pin_acesso")) {
        profissionais.fields.add(new TextField({ name: "pin_acesso", required: false }));
      }
      if (!profissionais.fields.getByName("porcentagem_comissao")) {
        profissionais.fields.add(new NumberField({ name: "porcentagem_comissao", required: false }));
      }
      app.save(profissionais);

      // Atualiza registros existentes
      try {
        const profs = app.findRecordsByFilter("profissionais", "id != ''");
        for (const p of profs) {
          if (!p.getString("pin_acesso")) {
            p.set("pin_acesso", "1234");
          }
          if (!p.getInt("porcentagem_comissao")) {
            const taxa = p.getInt("taxa_comissao") || 50;
            p.set("porcentagem_comissao", taxa);
          }
          app.save(p);
        }
      } catch (e) {
        console.log("Erro ao atualizar profissionais:", e);
      }
    }

    // 2. Coleção 'agendamentos'
    let agendamentos;
    try {
      agendamentos = app.findCollectionByNameOrId("agendamentos");
    } catch {}

    if (agendamentos) {
      if (!agendamentos.fields.getByName("servico_nome")) {
        agendamentos.fields.add(new TextField({ name: "servico_nome", required: false }));
      }
      if (!agendamentos.fields.getByName("valor")) {
        agendamentos.fields.add(new NumberField({ name: "valor", required: false }));
      }
      if (!agendamentos.fields.getByName("comissao_valor")) {
        agendamentos.fields.add(new NumberField({ name: "comissao_valor", required: false }));
      }
      if (!agendamentos.fields.getByName("data_hora")) {
        agendamentos.fields.add(new TextField({ name: "data_hora", required: false }));
      }

      // Atualiza status select para incluir 'em_andamento'
      let statusField = agendamentos.fields.getByName("status");
      if (statusField) {
        statusField.values = ["pendente", "confirmado", "em_andamento", "concluido", "cancelado"];
      }

      app.save(agendamentos);

      // Atualiza registros existentes de agendamentos
      try {
        const agds = app.findRecordsByFilter("agendamentos", "id != ''");
        for (const a of agds) {
          if (!a.getFloat("valor")) {
            a.set("valor", a.getFloat("valor_total") || 0);
          }
          if (!a.getString("servico_nome")) {
            a.set("servico_nome", "Corte Masculino");
          }
          app.save(a);
        }
      } catch (e) {
        console.log("Erro ao atualizar agendamentos:", e);
      }
    }

    // 3. Seed de agendamentos de teste para hoje para o barbeiro da barbearia Belchior
    try {
      const barbBelchior = app.findFirstRecordByFilter("barbearias", "slug = 'belchior'");
      if (barbBelchior && agendamentos) {
        const prof = app.findFirstRecordByFilter("profissionais", `barbearia_id = '${barbBelchior.id}'`);
        if (prof) {
          const today = new Date().toISOString().split('T')[0];
          const existingToday = app.findRecordsByFilter("agendamentos", `barbeiro_id = '${prof.id}' && data = '${today}'`);
          if (existingToday.length === 0) {
            const a1 = new Record(agendamentos);
            a1.set("barbearia_id", barbBelchior.id);
            a1.set("barbeiro_id", prof.id);
            a1.set("cliente_nome", "Matheus Ribeiro");
            a1.set("cliente_telefone", "19991234567");
            a1.set("servico_nome", "Corte Degradê + Barba");
            a1.set("data", today);
            a1.set("horario", "14:30");
            a1.set("duracao_total_minutos", 45);
            a1.set("valor_total", 65.0);
            a1.set("valor", 65.0);
            a1.set("comissao_valor", 32.5);
            a1.set("status", "pendente");
            app.save(a1);

            const a2 = new Record(agendamentos);
            a2.set("barbearia_id", barbBelchior.id);
            a2.set("barbeiro_id", prof.id);
            a2.set("cliente_nome", "Carlos Silva VIP");
            a2.set("cliente_telefone", "19999990001");
            a2.set("servico_nome", "Corte na Tesoura");
            a2.set("data", today);
            a2.set("horario", "15:30");
            a2.set("duracao_total_minutos", 35);
            a2.set("valor_total", 45.0);
            a2.set("valor", 45.0);
            a2.set("comissao_valor", 22.5);
            a2.set("status", "em_andamento");
            app.save(a2);

            const a3 = new Record(agendamentos);
            a3.set("barbearia_id", barbBelchior.id);
            a3.set("barbeiro_id", prof.id);
            a3.set("cliente_nome", "Gustavo Mendes");
            a3.set("cliente_telefone", "19988776655");
            a3.set("servico_nome", "Barba Alinhada");
            a3.set("data", today);
            a3.set("horario", "13:30");
            a3.set("duracao_total_minutos", 30);
            a3.set("valor_total", 40.0);
            a3.set("valor", 40.0);
            a3.set("comissao_valor", 20.0);
            a3.set("status", "concluido");
            app.save(a3);
          }
        }
      }
    } catch (e) {
      console.log("Erro no seed do barbeiro app:", e);
    }
  },
  (app) => {}
);

