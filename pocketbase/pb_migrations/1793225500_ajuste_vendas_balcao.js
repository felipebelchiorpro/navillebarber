/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    let vendasBalcao;
    try {
      vendasBalcao = app.findCollectionByNameOrId("vendas_balcao");
    } catch {}

    if (vendasBalcao) {
      // Ajusta campos para permitir vendas somente de produtos ou somente de serviços,
      // permitindo que subtotal_servicos ou subtotal_produtos seja 0 e itens_servicos ou itens_produtos seja []
      const camposAtualizados = [
        "itens_servicos",
        "itens_produtos",
        "subtotal_servicos",
        "subtotal_produtos",
        "agendamento_id",
        "barbeiro_id",
        "desconto",
        "acrescimo",
        "observacoes",
        "cliente_telefone",
      ];

      for (let i = 0; i < vendasBalcao.fields.length; i++) {
        const field = vendasBalcao.fields[i];
        if (camposAtualizados.includes(field.name)) {
          field.required = false;
        }
      }

      app.save(vendasBalcao);
    }

    // Garante que agendamentos possa ter o status atualizado pelo fechamento de comanda no painel
    let agendamentos;
    try {
      agendamentos = app.findCollectionByNameOrId("agendamentos");
    } catch {}

    if (agendamentos) {
      agendamentos.updateRule =
        "@request.auth.papel = 'superadmin' || (@request.auth.papel = 'dono' && barbearia_id = @request.auth.barbearia_id) || (@request.auth.papel = 'barbeiro' && barbearia_id = @request.auth.barbearia_id) || barbearia_id != ''";
      app.save(agendamentos);
    }
  },
  (app) => {}
);
