/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const ALL_TRIGGERS = [
      "confirmacao_agendamento",
      "lembrete_horario",
      "lembrete_2h",
      "cancelamento_agendamento",
      "pos_atendimento",
      "pos_atendimento_avaliacao",
      "cobranca_vip",
      "pagamento_pix_confirmado",
      "cobranca_sinal_pix",
      "reengajamento_sumido",
      "avulso",
    ];

    // 1. Atualiza valores e regras de 'templates_mensagens'
    let templatesMensagens;
    try {
      templatesMensagens = app.findCollectionByNameOrId("templates_mensagens");
    } catch {}

    if (templatesMensagens) {
      const gatilhoField = templatesMensagens.fields.getByName("tipo_gatilho");
      if (gatilhoField) {
        gatilhoField.values = ALL_TRIGGERS;
      }
      templatesMensagens.listRule = "";
      templatesMensagens.viewRule = "";
      templatesMensagens.createRule = "";
      templatesMensagens.updateRule = "";
      templatesMensagens.deleteRule = "@request.auth.id != '' || barbearia_id != ''";
      app.save(templatesMensagens);
    }

    // 2. Atualiza valores e regras de 'historico_mensagens_whatsapp'
    let historicoWhatsapp;
    try {
      historicoWhatsapp = app.findCollectionByNameOrId("historico_mensagens_whatsapp");
    } catch {}

    if (historicoWhatsapp) {
      const gatilhoHistField = historicoWhatsapp.fields.getByName("tipo_gatilho");
      if (gatilhoHistField) {
        gatilhoHistField.values = ALL_TRIGGERS;
      }
      historicoWhatsapp.listRule = "";
      historicoWhatsapp.viewRule = "";
      historicoWhatsapp.createRule = "";
      historicoWhatsapp.updateRule = "";
      historicoWhatsapp.deleteRule = "@request.auth.id != '' || barbearia_id != ''";
      app.save(historicoWhatsapp);
    }

    // 3. Garante templates pré-definidos (JSON + coleção templates_mensagens) em TODAS as barbearias existentes
    const defaultJsonTemplates = {
      confirmacao_agendamento: {
        ativo: true,
        texto:
          "Fala, {cliente}! ✂️\n\nSeu horário com o barbeiro {barbeiro} na {barbearia} tá confirmado!\n\n📅 Data: {data}\n⏰ Horário: {hora}\n💈 Serviço: {servico}\n\nQualquer imprevisto, avise a gente por aqui com antecedência. Te esperamos! 👊",
      },
      lembrete_2h: {
        ativo: true,
        texto:
          "Opa, {cliente}, tudo bem? Passando só para lembrar do seu horário hoje! ⏱️\n\n⏰ Horário: {hora} com {barbeiro}\n📍 Local: {barbearia}\n\nSe puder chegar 5 minutinhos antes, a cadeira já tá pronta te esperando. Até já! 💈",
      },
      pagamento_pix_confirmado: {
        ativo: true,
        texto:
          "Olá, {cliente}! Recebemos o seu pagamento referente ao agendamento na {barbearia} com sucesso. ✅\n\n💈 Serviço: {servico}\n⏰ Horário: {data} às {hora}\n\nSeu atendimento com {barbeiro} está 100% garantido!",
      },
      cobranca_sinal_pix: {
        ativo: true,
        texto:
          "Fala, {cliente}! Para garantir sua vaga na cadeira do {barbeiro} no dia {data} às {hora}, finalize o pagamento do sinal pelo Pix abaixo:\n\n🔑 Pix Copia e Cola:\n{chave_pix}\n\nAssim que compensar, o seu horário é travado automaticamente na nossa agenda! ✂️",
      },
      pos_atendimento_avaliacao: {
        ativo: true,
        texto:
          "E aí, {cliente}, curtiu o visual novo? 🔥\n\nValeu demais pela moral e pela preferência hoje aqui na {barbearia} com o {barbeiro}!\n\nSe puder avaliar o nosso atendimento em 5 estrelas no Google, ajuda demais a gente:\n🔗 {link_agendamento}\n\nTmj e até a próxima! 👊",
      },
      reengajamento_sumido: {
        ativo: true,
        texto:
          "Fala, {cliente}! Sumiu, pô! 💈\n\nJá faz um tempo desde o seu último corte aqui na {barbearia} com o {barbeiro}.\n\nA cadeira já tá com saudade de você! Bora dar aquele talento no visual essa semana?\n\nAgende seu horário direto pelo link:\n🔗 {link_agendamento}\n\nTe esperamos! 👊",
      },
    };

    const defaultCollectionTemplates = [
      {
        tipo_gatilho: "confirmacao_agendamento",
        titulo: "Confirmação de Agendamento",
        conteudo:
          "💈 Olá, {cliente_nome}! Seu agendamento na *{barbearia_nome}* foi confirmado com sucesso!\n\n✂️ Profissional: {barbeiro}\n📅 Data: {data}\n⏰ Horário: {horario}\n⭐ Serviço: {servico}\n\nCaso precise remarcar, entre em contato com antecedência. Te aguardamos!",
        ativo: true,
        variaveis_disponiveis: ["{cliente_nome}", "{barbearia_nome}", "{barbeiro}", "{data}", "{horario}", "{servico}"],
      },
      {
        tipo_gatilho: "lembrete_horario",
        titulo: "Lembrete de Horário (2h antes)",
        conteudo:
          "⏰ Fala {cliente_nome}! Passando para lembrar do seu horário hoje às *{horario}* na *{barbearia_nome}* com {barbeiro} ({servico}). Até daqui a pouco!",
        ativo: true,
        variaveis_disponiveis: ["{cliente_nome}", "{barbearia_nome}", "{barbeiro}", "{data}", "{horario}", "{servico}"],
      },
      {
        tipo_gatilho: "pos_atendimento",
        titulo: "Agradecimento & Avaliação",
        conteudo:
          "🔥 Fala {cliente_nome}! Valeu pela presença hoje na *{barbearia_nome}*. O que achou do seu visual com {barbeiro}? Se puder nos avaliar, ficaremos muito gratos. Até a próxima!",
        ativo: true,
        variaveis_disponiveis: ["{cliente_nome}", "{barbearia_nome}", "{barbeiro}"],
      },
      {
        tipo_gatilho: "cancelamento_agendamento",
        titulo: "Cancelamento de Agendamento",
        conteudo:
          "⚠️ Olá {cliente_nome}, informamos que seu agendamento para {data} às {horario} com {barbeiro} na *{barbearia_nome}* foi cancelado. Para reagendar um novo horário, fale conosco por aqui.",
        ativo: true,
        variaveis_disponiveis: ["{cliente_nome}", "{barbearia_nome}", "{barbeiro}", "{data}", "{horario}"],
      },
      {
        tipo_gatilho: "cobranca_vip",
        titulo: "Aviso de Renovação Clube VIP",
        conteudo:
          "👑 Olá {cliente_nome}! Seu plano do Clube VIP na *{barbearia_nome}* vence em breve. Renove agora para continuar desfrutando de seus cortes exclusivos sem fila!",
        ativo: true,
        variaveis_disponiveis: ["{cliente_nome}", "{barbearia_nome}", "{data_vencimento}"],
      },
    ];

    try {
      const barbeariasList = app.findRecordsByFilter("barbearias", "id != ''", "", 500);
      for (const b of barbeariasList) {
        let changed = false;
        const currentJson = b.get("templates_whatsapp");
        if (!currentJson || Object.keys(currentJson).length === 0) {
          b.set("templates_whatsapp", defaultJsonTemplates);
          changed = true;
        }
        if (!b.get("whatsapp_status")) {
          b.set("whatsapp_status", "desconectado");
          changed = true;
        }
        if (changed) {
          app.save(b);
        }

        if (templatesMensagens) {
          const existingTpls = app.findRecordsByFilter(
            "templates_mensagens",
            `barbearia_id = '${b.id}'`,
            "",
            50
          );
          if (existingTpls.length === 0) {
            for (const tpl of defaultCollectionTemplates) {
              const rec = new Record(templatesMensagens);
              rec.set("barbearia_id", b.id);
              rec.set("tipo_gatilho", tpl.tipo_gatilho);
              rec.set("titulo", tpl.titulo);
              rec.set("conteudo", tpl.conteudo);
              rec.set("ativo", tpl.ativo);
              rec.set("variaveis_disponiveis", tpl.variaveis_disponiveis);
              app.save(rec);
            }
          }
        }
      }
    } catch (errSeed) {
      console.log("Aviso ao semear templates WhatsApp nas barbearias:", errSeed);
    }
  },
  (app) => {}
);

