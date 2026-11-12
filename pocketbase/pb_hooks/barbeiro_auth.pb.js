/// <reference path="../pb_data/types.d.ts" />

/**
 * Login e senha dos barbeiros (App do Barbeiro).
 *
 * - O dono define/redefine a senha de cada barbeiro (painel → Acessos da Equipe).
 * - O barbeiro entra com telefone (ou seleção) + senha e pode trocar a própria senha.
 * - A senha nunca sai do servidor: hash + salt ficam em campos "hidden" da coleção profissionais.
 */

// POST /api/barbeiro/login  { senha, profissional_id? , telefone?, slug? }
routerAdd("POST", "/api/barbeiro/login", (e) => {
  const u = require(`${__hooks}/barbeiro_auth_utils.js`);
  const body = e.requestInfo().body || {};
  const senha = String(body.senha || "");
  const erroGenerico = { error: "Telefone/barbeiro ou senha incorretos." };

  if (!senha) {
    return e.json(400, { error: "Informe a senha." });
  }

  let candidatos = [];
  try {
    if (body.profissional_id) {
      candidatos = [$app.findRecordById("profissionais", String(body.profissional_id))];
    } else {
      const tel = u.onlyDigits(body.telefone);
      if (tel.length < 8) {
        return e.json(400, { error: "Informe o telefone cadastrado." });
      }
      const sufixo = tel.slice(-8);
      let filtro = "telefone ~ {:sufixo}";
      const params = { sufixo: sufixo };

      if (body.slug) {
        try {
          const barb = $app.findFirstRecordByData("barbearias", "slug", String(body.slug).trim().toLowerCase());
          filtro += " && (barbearia_id = {:bid} || barbearia = {:bid})";
          params.bid = barb.id;
        } catch (_) {}
      }

      const encontrados = $app.findRecordsByFilter("profissionais", filtro, "", 20, 0, params);
      for (let i = 0; i < encontrados.length; i++) {
        const r = encontrados[i];
        const t = u.onlyDigits(r.getString("telefone"));
        if (t && (t === tel || t.slice(-10) === tel.slice(-10) || t.slice(-9) === tel.slice(-9))) {
          candidatos.push(r);
        }
      }
    }
  } catch (_) {
    return e.json(401, erroGenerico);
  }

  const encontrado = candidatos.find((r) => u.senhaConfere(r, senha));
  if (!encontrado) {
    const semSenha = candidatos.length > 0 && candidatos.every((r) => !r.getBool("senha_definida"));
    if (semSenha) {
      return e.json(403, { error: "Seu acesso ainda não foi liberado. Peça ao dono da barbearia para criar sua senha." });
    }
    return e.json(401, erroGenerico);
  }

  if (!encontrado.getBool("ativo")) {
    return e.json(403, { error: "Seu cadastro está inativo. Fale com o dono da barbearia." });
  }
  if (encontrado.get("acesso_ativo") === false) {
    return e.json(403, { error: "Seu acesso ao app foi bloqueado pelo dono da barbearia." });
  }

  let barbearia = null;
  try {
    const b = $app.findRecordById("barbearias", u.barbeariaDoProfissional(encontrado));
    barbearia = { id: b.id, slug: b.getString("slug"), nome: b.getString("nome") };
  } catch (_) {}

  return e.json(200, {
    token: u.emitirToken(encontrado),
    profissional: u.exportar(encontrado),
    barbearia: barbearia,
  });
});

// POST /api/barbeiro/sessao  { token }  → valida sessão e devolve dados atualizados
routerAdd("POST", "/api/barbeiro/sessao", (e) => {
  const u = require(`${__hooks}/barbeiro_auth_utils.js`);
  const body = e.requestInfo().body || {};
  const rec = u.profissionalPorToken(body.token);
  if (!rec) {
    return e.json(401, { error: "Sessão expirada. Entre novamente." });
  }
  return e.json(200, { profissional: u.exportar(rec) });
});

// POST /api/barbeiro/alterar-senha  { token, senha_atual, nova_senha }  (o próprio barbeiro)
routerAdd("POST", "/api/barbeiro/alterar-senha", (e) => {
  const u = require(`${__hooks}/barbeiro_auth_utils.js`);
  const body = e.requestInfo().body || {};
  const rec = u.profissionalPorToken(body.token);
  if (!rec) {
    return e.json(401, { error: "Sessão expirada. Entre novamente." });
  }
  if (!u.senhaConfere(rec, body.senha_atual)) {
    return e.json(400, { error: "A senha atual está incorreta." });
  }
  const erro = u.validarNovaSenha(body.nova_senha);
  if (erro) {
    return e.json(400, { error: erro });
  }

  u.aplicarSenha(rec, body.nova_senha);
  $app.save(rec);

  return e.json(200, { token: u.emitirToken(rec), profissional: u.exportar(rec) });
});

// POST /api/barbeiro/verificar-senha  { token, senha }  (confirmação de ações sensíveis, ex: Pix)
routerAdd("POST", "/api/barbeiro/verificar-senha", (e) => {
  const u = require(`${__hooks}/barbeiro_auth_utils.js`);
  const body = e.requestInfo().body || {};
  const rec = u.profissionalPorToken(body.token);
  if (!rec) {
    return e.json(401, { error: "Sessão expirada. Entre novamente." });
  }
  if (!u.senhaConfere(rec, body.senha)) {
    return e.json(400, { error: "Senha incorreta." });
  }
  return e.json(200, { ok: true });
});

// POST /api/barbeiro/definir-acesso  { profissional_id, senha?, acesso_ativo? }  (dono/gerente/superadmin)
routerAdd(
  "POST",
  "/api/barbeiro/definir-acesso",
  (e) => {
    const u = require(`${__hooks}/barbeiro_auth_utils.js`);
    const body = e.requestInfo().body || {};

    let rec;
    try {
      rec = $app.findRecordById("profissionais", String(body.profissional_id || ""));
    } catch (_) {
      return e.json(404, { error: "Barbeiro não encontrado." });
    }

    if (!u.podeGerenciar(e.auth, rec)) {
      return e.json(403, { error: "Você não tem permissão para gerenciar o acesso deste barbeiro." });
    }

    if (body.senha !== undefined && body.senha !== null && body.senha !== "") {
      const erro = u.validarNovaSenha(body.senha);
      if (erro) {
        return e.json(400, { error: erro });
      }
      u.aplicarSenha(rec, body.senha);
      rec.set("acesso_ativo", true);
    }

    if (typeof body.acesso_ativo === "boolean") {
      rec.set("acesso_ativo", body.acesso_ativo);
      if (!body.acesso_ativo) {
        // Bloqueio derruba todas as sessões abertas
        rec.set("senha_token_key", $security.randomString(48));
      }
    }

    $app.save(rec);
    return e.json(200, { profissional: u.exportar(rec) });
  },
  $apis.requireAuth("users")
);

// Impede que os campos de senha sejam alterados pela API pública de records
onRecordCreateRequest((e) => {
  if (!e.hasSuperuserAuth()) {
    e.record.set("senha_hash", "");
    e.record.set("senha_salt", "");
    e.record.set("senha_token_key", "");
    e.record.set("senha_definida", false);
    e.record.set("senha_atualizada_em", "");
  }
  e.next();
}, "profissionais");

onRecordUpdateRequest((e) => {
  if (!e.hasSuperuserAuth()) {
    const original = e.record.original();
    const protegidos = ["senha_hash", "senha_salt", "senha_token_key", "senha_definida", "senha_atualizada_em"];
    for (let i = 0; i < protegidos.length; i++) {
      e.record.set(protegidos[i], original.get(protegidos[i]));
    }
  }
  e.next();
}, "profissionais");
