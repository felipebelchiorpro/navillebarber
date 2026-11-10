/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook do PocketBase para sincronização segura com o Gateway Asaas no servidor.
 * Protege a ASAAS_API_KEY mantendo-a estritamente no backend.
 */

routerAdd("POST", "/api/tenants/{id}/sync-asaas", (e) => {
    const id = e.request.pathValue("id");

    let tenant;
    try {
        tenant = $app.findRecordById("barbearias", id);
    } catch (err) {
        return e.json(404, { error: "Barbearia não encontrada no PocketBase." });
    }

    const asaasKey = $os.getenv("ASAAS_API_KEY") || $os.getenv("VITE_ASAAS_API_KEY") || "";
    const asaasUrl = $os.getenv("ASAAS_API_URL") || "https://api.asaas.com/v3";

    if (!asaasKey) {
        return e.json(500, {
            error: "Chave ASAAS_API_KEY não configurada nas variáveis de ambiente do servidor (Coolify)."
        });
    }

    const nomeComprador = tenant.getString("proprietario") || tenant.getString("nome_proprietario") || tenant.getString("nome");
    const email = tenant.getString("email_dono") || tenant.getString("email") || (tenant.getString("slug") + "@navillebarber.com");
    let doc = tenant.getString("documento") || tenant.getString("cpf_cnpj") || tenant.getString("cnpj") || "";
    doc = doc.replace(/\D/g, "");

    const payload = {
        name: nomeComprador,
        email: email
    };
    if (doc.length === 11 || doc.length === 14) {
        payload.cpfCnpj = doc;
    }

    const res = $http.send({
        url: asaasUrl + "/customers",
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
            "Content-Type": "application/json",
            "access_token": asaasKey
        }
    });

    if (res.statusCode >= 400) {
        let errMsg = "Erro retornado pelo Asaas (" + res.statusCode + ")";
        try {
            errMsg = res.json.errors?.[0]?.description || res.json.message || errMsg;
        } catch (_) {}
        return e.json(res.statusCode, { error: errMsg });
    }

    const customerId = res.json.id;

    // Salva o ID retornado diretamente na barbearia
    tenant.set("asaas_id", customerId);
    $app.save(tenant);

    return e.json(200, {
        success: true,
        asaas_id: customerId,
        customer: res.json
    });
});

routerAdd("POST", "/api/tenants/{id}/sync-subconta", (e) => {
    const id = e.request.pathValue("id");

    let tenant;
    try {
        tenant = $app.findRecordById("barbearias", id);
    } catch (err) {
        return e.json(404, { error: "Barbearia não encontrada no PocketBase." });
    }

    const asaasKey = $os.getenv("ASAAS_API_KEY") || $os.getenv("VITE_ASAAS_API_KEY") || "";
    const asaasUrl = $os.getenv("ASAAS_API_URL") || "https://api.asaas.com/v3";

    if (!asaasKey) {
        return e.json(500, {
            error: "Chave ASAAS_API_KEY não configurada nas variáveis de ambiente do servidor (Coolify)."
        });
    }

    let body = {};
    try {
        body = e.requestInfo().body || {};
    } catch (_) {}

    const chavePix = (body.chavePix || tenant.getString("pix_chave_repasse") || "").replace(/\D/g, "");
    let doc = (tenant.getString("documento") || tenant.getString("cpf_cnpj") || "").replace(/\D/g, "");
    if (!doc && (chavePix.length === 11 || chavePix.length === 14)) {
        doc = chavePix;
    }

    const payload = {
        name: tenant.getString("nome"),
        email: tenant.getString("email_dono") || tenant.getString("email") || (tenant.getString("slug") + "@navillebarber.com"),
        cpfCnpj: doc || chavePix.padEnd(11, "0"),
        mobilePhone: (tenant.getString("telefone") || "11999999999").replace(/\D/g, ""),
        address: tenant.getString("endereco") || "Rua Principal",
        addressNumber: tenant.getString("numero") || "S/N",
        postalCode: (tenant.getString("cep") || "13770000").replace(/\D/g, ""),
        incomeValue: 2500
    };

    const res = $http.send({
        url: asaasUrl + "/accounts",
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
            "Content-Type": "application/json",
            "access_token": asaasKey
        }
    });

    if (res.statusCode >= 400) {
        let errMsg = "Erro retornado pelo Asaas (" + res.statusCode + ")";
        try {
            errMsg = res.json.errors?.[0]?.description || res.json.message || errMsg;
        } catch (_) {}
        return e.json(res.statusCode, { error: errMsg });
    }

    const walletId = res.json.walletId || res.json.id;
    tenant.set("asaas_wallet_id", walletId);
    tenant.set("asaas_account_id", res.json.id);
    if (body.chavePix) {
        tenant.set("pix_chave_repasse", body.chavePix);
    }
    if (body.tipoChave) {
        tenant.set("pix_tipo_chave", body.tipoChave);
    }
    $app.save(tenant);

    return e.json(200, {
        success: true,
        walletId: walletId,
        id: res.json.id,
        account: res.json
    });
});

routerAdd("POST", "/api/profissionais/{id}/sync-subconta", (e) => {
    const id = e.request.pathValue("id");

    let profissional;
    try {
        profissional = $app.findRecordById("profissionais", id);
    } catch (err) {
        return e.json(404, { error: "Profissional não encontrado no PocketBase." });
    }

    const asaasKey = $os.getenv("ASAAS_API_KEY") || $os.getenv("VITE_ASAAS_API_KEY") || "";
    const asaasUrl = $os.getenv("ASAAS_API_URL") || "https://api.asaas.com/v3";

    if (!asaasKey) {
        return e.json(500, {
            error: "Chave ASAAS_API_KEY não configurada nas variáveis de ambiente do servidor (Coolify)."
        });
    }

    let body = {};
    try {
        body = e.requestInfo().body || {};
    } catch (_) {}

    const nome = body.name || profissional.getString("nome") || "Profissional Parceiro";
    const email = body.email || profissional.getString("email") || (id + "@navillebarber.com");
    let cpfCnpj = (body.cpfCnpj || profissional.getString("cpf_cnpj") || body.pix_chave || profissional.getString("pix_chave") || "").replace(/\D/g, "");
    if (cpfCnpj.length < 11) {
        cpfCnpj = cpfCnpj.padEnd(11, "0");
    }
    const mobilePhone = (body.mobilePhone || profissional.getString("telefone") || "11999999999").replace(/\D/g, "");

    const payload = {
        name: nome,
        email: email,
        cpfCnpj: cpfCnpj,
        mobilePhone: mobilePhone,
        incomeValue: body.incomeValue || 2000
    };

    const res = $http.send({
        url: asaasUrl + "/accounts",
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
            "Content-Type": "application/json",
            "access_token": asaasKey
        }
    });

    if (res.statusCode >= 400) {
        let errMsg = "Erro retornado pelo Asaas (" + res.statusCode + ")";
        try {
            errMsg = res.json.errors?.[0]?.description || res.json.message || errMsg;
        } catch (_) {}
        return e.json(res.statusCode, { error: errMsg });
    }

    const walletId = res.json.walletId || res.json.id;
    profissional.set("asaas_wallet_id", walletId);
    profissional.set("asaas_account_id", res.json.id);
    profissional.set("split_status", "ativo");
    if (body.taxa_comissao !== undefined) {
        profissional.set("porcentagem_comissao", Number(body.taxa_comissao));
        profissional.set("taxa_comissao", Number(body.taxa_comissao));
    }
    if (body.cpfCnpj) {
        profissional.set("cpf_cnpj", body.cpfCnpj);
    }
    if (body.pix_chave) {
        profissional.set("pix_chave", body.pix_chave);
    }
    $app.save(profissional);

    return e.json(200, {
        success: true,
        walletId: walletId,
        id: res.json.id,
        account: res.json
    });
});
