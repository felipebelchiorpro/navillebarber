/// <reference path="../pb_data/types.d.ts" />

/**
 * Utilitários compartilhados do login dos barbeiros.
 * Carregado via require() dentro de cada handler (handlers do JSVM rodam isolados).
 */

const SESSION_SECONDS = 60 * 60 * 24 * 30; // 30 dias
const HASH_ROUNDS = 5000;
const MIN_SENHA = 4;

function onlyDigits(v) {
  return String(v || "").replace(/\D/g, "");
}

function hashSenha(senha, salt) {
  let h = $security.sha256(salt + ":" + senha);
  for (let i = 0; i < HASH_ROUNDS; i++) {
    h = $security.sha256(h + ":" + salt);
  }
  return h;
}

function senhaConfere(rec, senha) {
  const salt = rec.getString("senha_salt");
  const hash = rec.getString("senha_hash");
  if (!salt || !hash || !senha) return false;
  return $security.equal(hashSenha(String(senha), salt), hash);
}

/** Grava uma nova senha e invalida todas as sessões anteriores. Não salva o record. */
function aplicarSenha(rec, senha) {
  const salt = $security.randomString(24);
  rec.set("senha_salt", salt);
  rec.set("senha_hash", hashSenha(String(senha), salt));
  rec.set("senha_token_key", $security.randomString(48));
  rec.set("senha_definida", true);
  rec.set("senha_atualizada_em", new Date().toISOString());
}

function validarNovaSenha(senha) {
  const s = String(senha || "");
  if (s.length < MIN_SENHA) {
    return "A senha deve ter pelo menos " + MIN_SENHA + " caracteres.";
  }
  if (s.length > 64) {
    return "A senha deve ter no máximo 64 caracteres.";
  }
  return null;
}

function emitirToken(rec) {
  let key = rec.getString("senha_token_key");
  if (!key) {
    key = $security.randomString(48);
    rec.set("senha_token_key", key);
    $app.save(rec);
  }
  return $security.createJWT({ pid: rec.id, typ: "barbeiro" }, key, SESSION_SECONDS);
}

/** Valida o token do barbeiro e retorna o record do profissional (ou null). */
function profissionalPorToken(token) {
  if (!token) return null;
  try {
    const claims = $security.parseUnverifiedJWT(String(token));
    if (!claims || claims.typ !== "barbeiro" || !claims.pid) return null;
    const rec = $app.findRecordById("profissionais", String(claims.pid));
    const key = rec.getString("senha_token_key");
    if (!key) return null;
    $security.parseJWT(String(token), key); // lança erro se assinatura/expiração inválida
    if (!rec.getBool("ativo") || rec.get("acesso_ativo") === false) return null;
    return rec;
  } catch (_) {
    return null;
  }
}

function barbeariaDoProfissional(rec) {
  return rec.getString("barbearia_id") || rec.getString("barbearia");
}

/** Dados públicos (campos hidden ficam de fora automaticamente). */
function exportar(rec) {
  return JSON.parse(JSON.stringify(rec));
}

/** Dono/gerente da mesma barbearia ou superadmin podem gerenciar o acesso. */
function podeGerenciar(auth, rec) {
  if (!auth) return false;
  try {
    if (auth.collection().name !== "users") return false;
  } catch (_) {
    return false;
  }
  const papel = auth.getString("papel");
  const role = auth.getString("role");
  if (papel === "superadmin" || role === "superadmin") return true;

  const isGestor = role === "proprietario" || papel === "dono" || papel === "gerente";
  if (!isGestor) return false;

  const barbAuth = auth.getString("barbearia") || auth.getString("barbearia_id");
  return !!barbAuth && barbAuth === barbeariaDoProfissional(rec);
}

module.exports = {
  onlyDigits,
  senhaConfere,
  aplicarSenha,
  validarNovaSenha,
  emitirToken,
  profissionalPorToken,
  barbeariaDoProfissional,
  exportar,
  podeGerenciar,
};

