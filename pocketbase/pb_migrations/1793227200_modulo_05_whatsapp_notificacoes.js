/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const barbearias = app.findCollectionByNameOrId("barbearias");
    let agendamentos;
    try {
      agendamentos = app.findCollectionByNameOrId("agendamentos");
    } catch {}

    let clientes;
    try {
      clientes = app.findCollectionByNameOrId("clientes");
    } catch {}

    // 0. Atualizar campos na coleção 'barbearias' para status do WhatsApp
    if (barbearias) {
      if (!barbearias.fields.getByName("whatsapp_status")) {
        barbearias.fields.add(
          new SelectField({
            name: "whatsapp_status",
            values: ["desconectado", "qrcode", "conectado"],
            required: false,
          })
        );
      }
      if (!barbearias.fields.getByName("whatsapp_numero")) {
        barbearias.fields.add(
          new TextField({
            name: "whatsapp_numero",
            required: false,
          })
        );
      }
      app.save(barbearias);
    }

    // 1. Coleção 'templates_mensagens'
    let templatesMensagens;
    try {
      templatesMensagens = app.findCollectionByNameOrId("templates_mensagens");
    } catch {}

    if (!templatesMensagens) {
      templatesMensagens = new Collection({
        name: "templates_mensagens",
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
            name: "tipo_gatilho",
            type: "select",
            values: [
              "confirmacao_agendamento",
              "lembrete_horario",
              "cancelamento_agendamento",
              "pos_atendimento",
              "cobranca_vip",
              "avulso",
            ],
            required: true,
          },
          { name: "titulo", type: "text", required: true },
          { name: "conteudo", type: "text", required: true },
          { name: "ativo", type: "bool", required: false },
          { name: "variaveis_disponiveis", type: "json", required: false },
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
      app.save(templatesMensagens);
    }

    // 2. Coleção 'historico_mensagens_whatsapp'
    let historicoWhatsapp;
    try {
      historicoWhatsapp = app.findCollectionByNameOrId("historico_mensagens_whatsapp");
    } catch {}

    if (!historicoWhatsapp) {
      const historicoFields = [
        {
          name: "barbearia_id",
          type: "relation",
          required: true,
          collectionId: barbearias.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: "template_id",
          type: "relation",
          required: false,
          collectionId: templatesMensagens.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
      ];

      if (agendamentos) {
        historicoFields.push({
          name: "agendamento_id",
          type: "relation",
          required: false,
          collectionId: agendamentos.id,
          cascadeDelete: false,
          maxSelect: 1,
        });
      }

      if (clientes) {
        historicoFields.push({
          name: "cliente_id",
          type: "relation",
          required: false,
          collectionId: clientes.id,
          cascadeDelete: false,
          maxSelect: 1,
        });
      }

      historicoFields.push(
        { name: "destinatario_nome", type: "text", required: true },
        { name: "destinatario_telefone", type: "text", required: true },
        {
          name: "tipo_gatilho",
          type: "select",
          values: [
            "confirmacao_agendamento",
            "lembrete_horario",
            "cancelamento_agendamento",
            "pos_atendimento",
            "cobranca_vip",
            "avulso",
          ],
          required: true,
        },
        { name: "mensagem", type: "text", required: true },
        {
          name: "status",
          type: "select",
          values: ["enviado", "entregue", "lido", "falha", "pendente"],
          required: true,
        },
        { name: "erro_detalhe", type: "text", required: false },
        { name: "data_envio", type: "text", required: false }
      );

      historicoWhatsapp = new Collection({
        name: "historico_mensagens_whatsapp",
        type: "base",
        system: false,
        fields: historicoFields,
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
      app.save(historicoWhatsapp);
    }

    // 3. Seed de Teste na Barbearia Modelo: Barbearia Zero Grau
    let testBarbearia;
    try {
      testBarbearia = app.findFirstRecordByFilter("barbearias", "slug = 'zero-grau'");
    } catch {}

    if (testBarbearia) {
      // Define status padrão como desconectado se não definido
      if (!testBarbearia.get("whatsapp_status")) {
        testBarbearia.set("whatsapp_status", "desconectado");
        app.save(testBarbearia);
      }

      // Templates Padrão
      const templatesPadrao = [
        {
          tipo_gatilho: "confirmacao_agendamento",
          titulo: "Confirmação de Agendamento",
          conteudo:
            "💈 Olá, {cliente_nome}! Seu agendamento na *{barbearia_nome}* foi confirmado com sucesso!\n\n✂️ Profissional: {barbeiro}\n📅 Data: {data}\n⏰ Horário: {horario}\n⭐ Serviço: {servico}\n\nCaso precise remarcar, entre em contato com antecedência. Te aguardamos!",
          ativo: true,
          variaveis_disponiveis: [
            "{cliente_nome}",
            "{barbearia_nome}",
            "{barbeiro}",
            "{data}",
            "{horario}",
            "{servico}",
          ],
        },
        {
          tipo_gatilho: "lembrete_horario",
          titulo: "Lembrete de Horário (2h antes)",
          conteudo:
            "⏰ Fala {cliente_nome}! Passando para lembrar do seu horário hoje às *{horario}* na *{barbearia_nome}* com {barbeiro} ({servico}). Até daqui a pouco!",
          ativo: true,
          variaveis_disponiveis: [
            "{cliente_nome}",
            "{barbearia_nome}",
            "{barbeiro}",
            "{data}",
            "{horario}",
            "{servico}",
          ],
        },
        {
          tipo_gatilho: "pos_atendimento",
          titulo: "Agradecimento & Avaliação",
          conteudo:
            "🔥 Fala {cliente_nome}! Valeu pela presença hoje na *{barbearia_nome}*. O que achou do seu visual com {barbeiro}? Se puder nos avaliar, ficaremos muito gratos. Até a próxima!",
          ativo: true,
          variaveis_disponiveis: [
            "{cliente_nome}",
            "{barbearia_nome}",
            "{barbeiro}",
          ],
        },
        {
          tipo_gatilho: "cancelamento_agendamento",
          titulo: "Cancelamento de Agendamento",
          conteudo:
            "⚠️ Olá {cliente_nome}, informamos que seu agendamento para {data} às {horario} com {barbeiro} na *{barbearia_nome}* foi cancelado. Para reagendar um novo horário, fale conosco por aqui.",
          ativo: true,
          variaveis_disponiveis: [
            "{cliente_nome}",
            "{barbearia_nome}",
            "{barbeiro}",
            "{data}",
            "{horario}",
          ],
        },
        {
          tipo_gatilho: "cobranca_vip",
          titulo: "Aviso de Renovação Clube VIP",
          conteudo:
            "👑 Olá {cliente_nome}! Seu plano do Clube VIP na *{barbearia_nome}* vence em breve. Renove agora para continuar desfrutando de seus cortes exclusivos sem fila!",
          ativo: true,
          variaveis_disponiveis: [
            "{cliente_nome}",
            "{barbearia_nome}",
            "{data_vencimento}",
          ],
        },
      ];

      for (const tpl of templatesPadrao) {
        let existente;
        try {
          existente = app.findFirstRecordByFilter(
            "templates_mensagens",
            `barbearia_id = '${testBarbearia.id}' && tipo_gatilho = '${tpl.tipo_gatilho}'`
          );
        } catch {}

        if (!existente) {
          const rec = new Record(templatesMensagens);
          rec.set("barbearia_id", testBarbearia.id);
          rec.set("tipo_gatilho", tpl.tipo_gatilho);
          rec.set("titulo", tpl.titulo);
          rec.set("conteudo", tpl.conteudo);
          rec.set("ativo", tpl.ativo);
          rec.set("variaveis_disponiveis", tpl.variaveis_disponiveis);
          app.save(rec);
        }
      }

      // Histórico de teste inicial
      const historicoInicial = [
        {
          destinatario_nome: "Lucas Albuquerque",
          destinatario_telefone: "11999998888",
          tipo_gatilho: "confirmacao_agendamento",
          mensagem:
            "💈 Olá, Lucas Albuquerque! Seu agendamento na Barbearia Zero Grau foi confirmado com sucesso!\n\n✂️ Profissional: Marcão da Navalha\n📅 Data: 29/10/2026\n⏰ Horário: 14:00\n⭐ Serviço: Corte Degradê Navalhado\n\nCaso precise remarcar, entre em contato com antecedência. Te aguardamos!",
          status: "entregue",
          data_envio: "2026-10-28 14:30:12",
        },
        {
          destinatario_nome: "Bruno Henrique",
          destinatario_telefone: "11988887777",
          tipo_gatilho: "lembrete_horario",
          mensagem:
            "⏰ Fala Bruno Henrique! Passando para lembrar do seu horário hoje às 16:30 na Barbearia Zero Grau com Diego Fade (Corte Clássico). Até daqui a pouco!",
          status: "lido",
          data_envio: "2026-10-28 14:35:00",
        },
        {
          destinatario_nome: "Carlos Eduardo",
          destinatario_telefone: "11977776666",
          tipo_gatilho: "pos_atendimento",
          mensagem:
            "🔥 Fala Carlos Eduardo! Valeu pela presença hoje na Barbearia Zero Grau. O que achou do seu visual com Marcão da Navalha? Se puder nos avaliar, ficaremos muito gratos. Até a próxima!",
          status: "enviado",
          data_envio: "2026-10-28 15:10:45",
        },
      ];

      for (const hist of historicoInicial) {
        let existente;
        try {
          existente = app.findFirstRecordByFilter(
            "historico_mensagens_whatsapp",
            `barbearia_id = '${testBarbearia.id}' && destinatario_telefone = '${hist.destinatario_telefone}' && tipo_gatilho = '${hist.tipo_gatilho}'`
          );
        } catch {}

        if (!existente) {
          const rec = new Record(historicoWhatsapp);
          rec.set("barbearia_id", testBarbearia.id);
          rec.set("destinatario_nome", hist.destinatario_nome);
          rec.set("destinatario_telefone", hist.destinatario_telefone);
          rec.set("tipo_gatilho", hist.tipo_gatilho);
          rec.set("mensagem", hist.mensagem);
          rec.set("status", hist.status);
          rec.set("data_envio", hist.data_envio);
          app.save(rec);
        }
      }
    }
  },
  (app) => {
    try {
      const historicoWhatsapp = app.findCollectionByNameOrId("historico_mensagens_whatsapp");
      if (historicoWhatsapp) app.delete(historicoWhatsapp);
    } catch {}

    try {
      const templatesMensagens = app.findCollectionByNameOrId("templates_mensagens");
      if (templatesMensagens) app.delete(templatesMensagens);
    } catch {}
  }
);
