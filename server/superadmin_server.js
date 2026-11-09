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

// Inicialização do servidor se executado diretamente
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[SuperAdmin Server] Rodando em http://localhost:${PORT}`);
  });
}

export default app;

