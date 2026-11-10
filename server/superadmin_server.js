import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import PocketBase from 'pocketbase';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'superadmin-secret-jwt-key-naville-2026';
const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';

const pb = new PocketBase(PB_URL);

// Base de dados fallback em memória para teste imediato e desenvolvimento independente
const localMockDB = {
  users: [
    {
      id: 'usr_super',
      email: 'admin@navillebarber.com',
      password: 'Password123!',
      nome: 'Super Administrador',
      papel: 'superadmin', // estritamente superuser/superadmin
      status: 'ativo'
    },
    {
      id: 'usr_dono',
      email: 'dono@zerograu.com',
      password: 'Password123!',
      nome: 'Carlos Dono',
      papel: 'dono', // admin comum / dono de barbearia (NÃO superuser)
      status: 'ativo'
    }
  ],
  tenants: [
    {
      id: 'ten_01',
      nome: 'Barbearia Zero Grau',
      slug: 'zero-grau',
      nome_proprietario: 'Carlos Eduardo',
      plano_saas: 'pro',
      status: 'ativo',
      faturamento: 4590.00
    },
    {
      id: 'ten_02',
      nome: 'Navalha de Ouro',
      slug: 'navalha-de-ouro',
      nome_proprietario: 'Marcos Silva',
      plano_saas: 'starter',
      status: 'ativo',
      faturamento: 1850.00
    },
    {
      id: 'ten_03',
      nome: 'Barbearia Fênix',
      slug: 'fenix-barber',
      nome_proprietario: 'Roberto Lima',
      plano_saas: 'enterprise',
      status: 'bloqueado',
      faturamento: 6200.00
    }
  ]
};

// ============================================================
// 4. SEGURANÇA E ROTAS PROTEGIDAS (MIDDLEWARE)
// ============================================================
export const requireSuperUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acesso não autorizado: Token não informado.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Validação estrita: apenas 'superadmin' ou 'superuser'
    if (decoded.role !== 'superadmin' && decoded.role !== 'superuser') {
      return res.status(403).json({
        error: 'Acesso Proibido (403): O seu papel não possui permissão de Superuser.'
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Acesso Proibido (403): Token inválido ou expirado.' });
  }
};

// ============================================================
// 1. AUTENTICAÇÃO DE SUPERUSER
// ============================================================
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  try {
    // 1. Tenta autenticar via PocketBase oficial
    let userRecord = null;
    let isSuper = false;

    try {
      const authData = await pb.collection('users').authWithPassword(email.trim(), password);
      userRecord = authData.record;
      isSuper = userRecord.papel === 'superadmin' || userRecord.papel === 'superuser';
    } catch {
      // 2. Fallback resiliente para banco local de desenvolvimento
      const mock = localMockDB.users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
      );
      if (mock) {
        userRecord = mock;
        isSuper = mock.papel === 'superadmin' || mock.papel === 'superuser';
      }
    }

    if (!userRecord) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // Regra estrita: se não for superuser/superadmin, barra imediatamente
    if (!isSuper) {
      return res.status(403).json({
        error: 'Acesso Negado (403): Este painel exige privilégios de Superuser.'
      });
    }

    // Geração do token JWT seguro
    const token = jwt.sign(
      {
        id: userRecord.id,
        email: userRecord.email,
        nome: userRecord.nome || userRecord.name,
        role: 'superuser'
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        nome: userRecord.nome || userRecord.name,
        role: 'superuser'
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao processar autenticação.' });
  }
});

// ============================================================
// 2. DASHBOARD DE RESUMO (CARDS BÁSICOS)
// ============================================================
app.get('/api/admin/metrics', requireSuperUser, async (req, res) => {
  try {
    let totalUsuarios = 0;
    let barbeariasList = [];
    let faturamentoBruto = 0;

    try {
      const [users, barbs, faturas] = await Promise.all([
        pb.collection('users').getFullList({ fields: 'id' }),
        pb.collection('barbearias').getFullList(),
        pb.collection('faturas').getFullList().catch(() => [])
      ]);
      totalUsuarios = users.length;
      barbeariasList = barbs;
      faturamentoBruto = faturas
        .filter((f) => f.status === 'pago')
        .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
    } catch {
      // Fallback local
      totalUsuarios = localMockDB.users.length;
      barbeariasList = localMockDB.tenants;
      faturamentoBruto = localMockDB.tenants.reduce((acc, curr) => acc + curr.faturamento, 0);
    }

    const empresasAtivas = barbeariasList.filter(
      (b) => b.status === 'ativo' || b.status_assinatura === 'ativo'
    ).length;

    return res.json({
      totalUsuarios,
      empresasAtivas,
      totalEmpresas: barbeariasList.length,
      faturamentoBruto: Number(faturamentoBruto.toFixed(2)),
      statusServidor: 'online'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao consolidar métricas.' });
  }
});

// ============================================================
// 3. LISTAGEM E GESTÃO SIMPLES (TOGGLE DE STATUS)
// ============================================================

// Listar empresas/tenants
app.get('/api/admin/tenants', requireSuperUser, async (req, res) => {
  try {
    let records = [];
    try {
      records = await pb.collection('barbearias').getFullList({ sort: '-created' });
    } catch {
      records = localMockDB.tenants;
    }
    return res.json(records);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar empresas.' });
  }
});

// Alterar status dinamicamente (Ativar / Inativar)
app.patch('/api/admin/tenants/:id/toggle-status', requireSuperUser, async (req, res) => {
  const { id } = req.params;

  try {
    let updatedRecord = null;

    try {
      const current = await pb.collection('barbearias').getOne(id);
      const novoStatus = current.status === 'ativo' ? 'bloqueado' : 'ativo';
      const novoStatusAssinatura = novoStatus === 'ativo' ? 'ativo' : 'bloqueado';

      updatedRecord = await pb.collection('barbearias').update(id, {
        status: novoStatus,
        status_assinatura: novoStatusAssinatura
      });
    } catch {
      const item = localMockDB.tenants.find((t) => t.id === id);
      if (!item) {
        return res.status(404).json({ error: 'Empresa não encontrada.' });
      }
      item.status = item.status === 'ativo' ? 'bloqueado' : 'ativo';
      updatedRecord = item;
    }

    return res.json({
      success: true,
      id: updatedRecord.id,
      nome: updatedRecord.nome,
      status: updatedRecord.status
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao atualizar status do registro.' });
  }
});

// ============================================================
// 4. SINCRONIZAÇÃO SEGURA ASAAS NO BACKEND (SEM EXPOR CHAVE)
// ============================================================
app.post('/api/tenants/:id/sync-asaas', async (req, res) => {
  const { id } = req.params;

  if (!id || id === 'undefined' || id === 'null') {
    return res.status(400).json({ error: 'ID do tenant/barbearia não foi informado ou é inválido.' });
  }

  const asaasKey = process.env.ASAAS_API_KEY || process.env.VITE_ASAAS_API_KEY || '';
  const asaasUrl = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';

  if (!asaasKey) {
    return res.status(500).json({
      error: 'Chave ASAAS_API_KEY não configurada nas variáveis de ambiente do servidor (Coolify).'
    });
  }

  try {
    const tenant = await pb.collection('barbearias').getOne(id);
    const asaasIdAtual = tenant.asaas_id || tenant.asaas_customer_id || '';
    const nomeComprador = tenant.proprietario || tenant.nome_proprietario || tenant.nome || 'Cliente Naville';
    const email = tenant.email_dono || tenant.email || `${tenant.slug}@navillebarber.com`;
    let doc = (tenant.documento || tenant.cpf_cnpj || tenant.cnpj || '').replace(/\D/g, '');

    const payload = {
      name: nomeComprador,
      email: email
    };
    if (doc.length === 11 || doc.length === 14) {
      payload.cpfCnpj = doc;
    }

    // Se NÃO possui ID prévio gravado, NUNCA tenta GET: cria diretamente via POST /customers
    const endpoint = asaasIdAtual
      ? `${asaasUrl}/customers/${encodeURIComponent(asaasIdAtual)}`
      : `${asaasUrl}/customers`;

    const asaasResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasKey
      },
      body: JSON.stringify(payload)
    });

    const asaasData = await asaasResponse.json().catch(() => ({}));

    if (!asaasResponse.ok) {
      const errMsg = asaasData.errors?.[0]?.description || asaasData.message || `Erro no Asaas (${asaasResponse.status})`;
      return res.status(asaasResponse.status).json({ error: errMsg });
    }

    const customerId = asaasData.id || asaasIdAtual;
    await pb.collection('barbearias').update(id, {
      asaas_id: customerId
    });

    return res.json({
      success: true,
      asaas_id: customerId,
      customer: asaasData
    });
  } catch (err) {
    console.error('Erro em sync-asaas:', err);
    return res.status(500).json({ error: err.message || 'Erro interno ao sincronizar com Asaas.' });
  }
});

app.post('/api/tenants/:id/sync-subconta', async (req, res) => {
  const { id } = req.params;
  const asaasKey = process.env.ASAAS_API_KEY || process.env.VITE_ASAAS_API_KEY || '';
  const asaasUrl = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';

  if (!asaasKey) {
    return res.status(500).json({
      error: 'Chave ASAAS_API_KEY não configurada nas variáveis de ambiente do servidor (Coolify).'
    });
  }

  try {
    const tenant = await pb.collection('barbearias').getOne(id);
    const chavePix = (req.body?.chavePix || tenant.pix_chave_repasse || '').replace(/\D/g, '');
    let doc = (tenant.documento || tenant.cpf_cnpj || '').replace(/\D/g, '');
    if (!doc && (chavePix.length === 11 || chavePix.length === 14)) {
      doc = chavePix;
    }

    const payload = {
      name: tenant.nome,
      email: tenant.email_dono || tenant.email || `${tenant.slug}@navillebarber.com`,
      cpfCnpj: doc || chavePix.padEnd(11, '0'),
      mobilePhone: (tenant.telefone || '11999999999').replace(/\D/g, ''),
      address: tenant.endereco || 'Rua Principal',
      addressNumber: tenant.numero || 'S/N',
      postalCode: (tenant.cep || '13770000').replace(/\D/g, ''),
      incomeValue: 2500
    };

    const asaasResponse = await fetch(`${asaasUrl}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasKey
      },
      body: JSON.stringify(payload)
    });

    const asaasData = await asaasResponse.json().catch(() => ({}));

    if (!asaasResponse.ok) {
      const errMsg = asaasData.errors?.[0]?.description || asaasData.message || `Erro no Asaas (${asaasResponse.status})`;
      return res.status(asaasResponse.status).json({ error: errMsg });
    }

    const walletId = asaasData.walletId || asaasData.id;
    const patch = {
      asaas_wallet_id: walletId,
      asaas_account_id: asaasData.id
    };
    if (req.body?.chavePix) patch.pix_chave_repasse = req.body.chavePix;
    if (req.body?.tipoChave) patch.pix_tipo_chave = req.body.tipoChave;

    await pb.collection('barbearias').update(id, patch);

    return res.json({
      success: true,
      walletId,
      id: asaasData.id,
      account: asaasData
    });
  } catch (err) {
    console.error('Erro em sync-subconta:', err);
    return res.status(500).json({ error: err.message || 'Erro interno ao provisionar subconta no Asaas.' });
  }
});

app.post('/api/profissionais/:id/sync-subconta', async (req, res) => {
  const { id } = req.params;
  const asaasKey = process.env.ASAAS_API_KEY || process.env.VITE_ASAAS_API_KEY || '';
  const asaasUrl = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';

  if (!asaasKey) {
    return res.status(500).json({
      error: 'Chave ASAAS_API_KEY não configurada nas variáveis de ambiente do servidor (Coolify).'
    });
  }

  try {
    const profissional = await pb.collection('profissionais').getOne(id);
    const nome = req.body?.name || profissional.nome || 'Profissional Parceiro';
    const email = req.body?.email || profissional.email || `${id}@navillebarber.com`;
    let cpfCnpj = (req.body?.cpfCnpj || profissional.cpf_cnpj || req.body?.pix_chave || profissional.pix_chave || '').replace(/\D/g, '');
    if (cpfCnpj.length < 11) {
      cpfCnpj = cpfCnpj.padEnd(11, '0');
    }
    const mobilePhone = (req.body?.mobilePhone || profissional.telefone || '11999999999').replace(/\D/g, '');

    const payload = {
      name: nome,
      email: email,
      cpfCnpj: cpfCnpj,
      mobilePhone: mobilePhone,
      incomeValue: req.body?.incomeValue || 2000
    };

    const asaasResponse = await fetch(`${asaasUrl}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasKey
      },
      body: JSON.stringify(payload)
    });

    const asaasData = await asaasResponse.json().catch(() => ({}));

    if (!asaasResponse.ok) {
      const errMsg = asaasData.errors?.[0]?.description || asaasData.message || `Erro no Asaas (${asaasResponse.status})`;
      return res.status(asaasResponse.status).json({ error: errMsg });
    }

    const walletId = asaasData.walletId || asaasData.id;
    const patchProf = {
      asaas_wallet_id: walletId,
      asaas_account_id: asaasData.id,
      split_status: 'ativo'
    };
    if (req.body?.taxa_comissao !== undefined) {
      patchProf.porcentagem_comissao = Number(req.body.taxa_comissao);
      patchProf.taxa_comissao = Number(req.body.taxa_comissao);
    }
    if (req.body?.cpfCnpj) patchProf.cpf_cnpj = req.body.cpfCnpj;
    if (req.body?.pix_chave) patchProf.pix_chave = req.body.pix_chave;

    const profAtualizado = await pb.collection('profissionais').update(id, patchProf);

    return res.json({
      success: true,
      walletId,
      id: asaasData.id,
      account: asaasData,
      profissional: profAtualizado
    });
  } catch (err) {
    console.error('Erro em sync-subconta profissional:', err);
    return res.status(500).json({ error: err.message || 'Erro interno ao provisionar subconta do profissional no Asaas.' });
  }
});

// Inicialização do servidor se executado diretamente
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[SuperAdmin Server] Rodando em http://localhost:${PORT}`);
  });
}

export default app;

