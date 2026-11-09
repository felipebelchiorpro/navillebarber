/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    const barbearias = app.findCollectionByNameOrId("barbearias");

    // 1. Cadastrar usuário SuperAdmin Oficial se não existir
    let superAdmin;
    try {
      superAdmin = app.findFirstRecordByFilter("users", "email = 'admin@navillebarber.com'");
    } catch {}

    if (!superAdmin && users) {
      superAdmin = new Record(users);
      superAdmin.set("email", "admin@navillebarber.com");
      superAdmin.setPassword("Password123!");
      superAdmin.set("name", "SuperAdmin Naville");
      superAdmin.set("papel", "superadmin");
      superAdmin.set("status", "ativo");
      superAdmin.set("pode_acessar_admin", true);
      app.save(superAdmin);
    }

    // 2. Cadastrar barbearias de teste adicionais para enriquecer o painel SuperAdmin BI
    let barbFenix;
    try {
      barbFenix = app.findFirstRecordByFilter("barbearias", "slug = 'fenix-prime'");
    } catch {}

    if (!barbFenix && barbearias) {
      barbFenix = new Record(barbearias);
      barbFenix.set("nome", "Barbearia Fênix Prime");
      barbFenix.set("slug", "fenix-prime");
      barbFenix.set("nome_proprietario", "Rodrigo Fênix");
      barbFenix.set("telefone_proprietario", "(11) 97777-4444");
      barbFenix.set("status", "ativo");
      barbFenix.set("status_assinatura", "ativo");
      barbFenix.set("plano_saas", "pro");
      barbFenix.set("e_vitalicio", false);
      barbFenix.set("max_barbeiros", 6);
      barbFenix.set("valor_adicional_barbeiro", 25.0);
      barbFenix.set("bloqueio_automatico", true);
      barbFenix.set("descricao_espaco", "Ambiente moderno com barbearia e lounge premium.");
      barbFenix.set("e_publico", true);
      app.save(barbFenix);
    }

    let barbCorleone;
    try {
      barbCorleone = app.findFirstRecordByFilter("barbearias", "slug = 'don-corleone'");
    } catch {}

    if (!barbCorleone && barbearias) {
      barbCorleone = new Record(barbearias);
      barbCorleone.set("nome", "Don Corleone Barber Club");
      barbCorleone.set("slug", "don-corleone");
      barbCorleone.set("nome_proprietario", "Vito Corleone");
      barbCorleone.set("telefone_proprietario", "(21) 96666-3333");
      barbCorleone.set("status", "bloqueado");
      barbCorleone.set("status_assinatura", "bloqueado");
      barbCorleone.set("plano_saas", "starter");
      barbCorleone.set("e_vitalicio", false);
      barbCorleone.set("max_barbeiros", 3);
      barbCorleone.set("valor_adicional_barbeiro", 25.0);
      barbCorleone.set("bloqueio_automatico", true);
      barbCorleone.set("descricao_espaco", "Tradição clássica italiana em cortes masculinos.");
      barbCorleone.set("e_publico", false);
      app.save(barbCorleone);
    }
  },
  (app) => {}
);
