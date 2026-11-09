import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { LoginForm } from './components/LoginForm';
import { DashboardAdminView } from './pages/DashboardAdminView';
import { TenantBlockedCustomerView } from './components/TenantBlockedCustomerView';
import { VitrineAgendamentoPublica } from './components/VitrineAgendamentoPublica';
import { SuperAdminLayout } from './components/SuperAdminLayout';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { SuperAdminLojasView } from './components/SuperAdminLojasView';
import { SuperAdminLogsView } from './components/SuperAdminLogsView';
import { authService, Barbearia, Usuario, Fatura, faturasService, saasService, pb } from './services/pocketbase';

const devFallbackUser = {
  id: 'qt6n67009ux6541',
  name: 'Felipe',
  nome: 'Felipe',
  email: 'contatofelipebelchior@gmail.com',
  papel: 'dono',
  barbearia_id: 'ca42u8j6x8o514w',
} as unknown as Usuario;

const devFallbackBarb = {
  id: 'ca42u8j6x8o514w',
  collectionId: 'pbc_3202216097',
  collectionName: 'barbearias',
  nome: 'Belchior',
  slug: 'belchior',
  status: 'ativa',
  nome_proprietario: 'Felipe',
  telefone_proprietario: '19998277880',
  plano_saas: 'pro',
  e_vitalicio: false,
  max_barbeiros: 4,
  valor_adicional_barbeiro: 25,
  bloqueio_automatico: false,
  e_publico: true,
} as unknown as Barbearia;

/**
 * Wrapper de Vitrine Pública B2C (/b/:slug)
 */
const VitrineRoute: React.FC<{ user: Usuario | null }> = ({ user }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  return (
    <VitrineAgendamentoPublica
      slug={slug || 'belchior'}
      onVoltarPainel={() => navigate('/')}
      isAdminLoggedIn={!!user}
    />
  );
};

/**
 * Wrapper de Gestão do Tenant (Barbearia Cliente)
 */
const TenantRoute: React.FC<{
  user: Usuario | null;
  barbearia: Barbearia | null;
  faturas: Fatura[];
  onBarbeariaUpdated: (b: Barbearia) => void;
  onRegularizado: (b: Barbearia) => void;
  onLoginSuccess: (u: Usuario, b: Barbearia | null) => void;
  onLogout: () => void;
}> = ({
  user,
  barbearia,
  faturas,
  onBarbeariaUpdated,
  onRegularizado,
  onLoginSuccess,
  onLogout,
}) => {
  const navigate = useNavigate();
  const killSwitch = saasService.verificarKillSwitch(barbearia, faturas);
  const deveBloquearAcesso = killSwitch.isBloqueado && user?.papel !== 'superadmin';

  const activeUser = user || devFallbackUser;
  const activeBarb = barbearia || devFallbackBarb;

  if (activeUser && !deveBloquearAcesso) {
    return (
      <DashboardAdminView
        user={activeUser}
        barbearia={activeBarb}
        onBarbeariaUpdated={onBarbeariaUpdated}
        onLogout={onLogout}
        onOpenVitrine={(s) => navigate(`/b/${s}`)}
        onOpenSuperAdmin={() => navigate('/admin')}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        user={user}
        barbearia={barbearia}
        onLogout={onLogout}
        onOpenVitrine={(s) => navigate(`/b/${s}`)}
        onOpenSuperAdmin={() => navigate('/admin')}
      />

      <main style={{ flex: 1 }}>
        {!user ? (
          <LoginForm onSuccess={onLoginSuccess} />
        ) : (
          <TenantBlockedCustomerView
            user={user}
            barbearia={barbearia}
            faturaPendente={killSwitch.faturaPendente}
            motivoBloqueio={killSwitch.mensagem}
            onRegularizado={onRegularizado}
          />
        )}
      </main>

      <footer
        style={{
          textAlign: 'center',
          padding: '1.5rem',
          borderTop: '1px solid var(--border-subtle)',
          color: 'var(--text-dim)',
          fontSize: '0.78rem',
        }}
      >
        Naville Barber © 2026 • Vitrine Pública B2C & Gestão Integrada (PocketBase Local)
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [barbearia, setBarbearia] = useState<Barbearia | null>(null);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [loading, setLoading] = useState(true);

  // Carrega estado de sessão ao iniciar
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (pb.authStore.isValid && pb.authStore.record) {
          const currentUser = pb.authStore.record as unknown as Usuario;
          setUser(currentUser);

          let barbId = currentUser.barbearia_id;
          let currentBarb = barbId ? await authService.getBarbearia(barbId) : null;
          if (!currentBarb) {
            try {
              currentBarb = await pb.collection('barbearias').getOne<Barbearia>('ca42u8j6x8o514w');
            } catch {
              try {
                currentBarb = await pb.collection('barbearias').getFirstListItem<Barbearia>('');
              } catch {}
            }
          }
          if (currentBarb) {
            setBarbearia(currentBarb);
            try {
              const fats = await faturasService.list(currentBarb.id);
              setFaturas(fats);
            } catch (e) {
              console.warn('Faturas ainda não carregadas:', e);
            }
          }
        } else {
          // Em ambiente local, realiza login inicial ou recupera barbearia padrão
          try {
            const { user: authUser, barbearia: authBarb } = await authService.login(
              'dono@zerograu.com',
              'Password123!'
            );
            setUser(authUser);
            if (authBarb) {
              setBarbearia(authBarb);
              try {
                const fats = await faturasService.list(authBarb.id);
                setFaturas(fats);
              } catch (e) {}
            }
          } catch (autoLoginErr) {
            console.warn('Auto-login dev fallback:', autoLoginErr);
            try {
              let barbFromDb: Barbearia | null = null;
              try {
                barbFromDb = await pb.collection('barbearias').getOne<Barbearia>('ca42u8j6x8o514w');
              } catch {
                barbFromDb = await pb.collection('barbearias').getFirstListItem<Barbearia>('');
              }
              if (barbFromDb) setBarbearia(barbFromDb);
            } catch (e) {}
          }
        }
      } catch (err) {
        console.error('Erro ao restaurar sessão:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Recarrega faturas quando a barbearia for alterada
  useEffect(() => {
    if (barbearia?.id) {
      faturasService.list(barbearia.id).then(setFaturas).catch(console.error);
    }
  }, [barbearia?.id, barbearia?.status, barbearia?.status_assinatura, barbearia?.data_expiracao_plano]);

  const handleLoginSuccess = async (authenticatedUser: Usuario, activeBarbearia: Barbearia | null) => {
    setUser(authenticatedUser);
    setBarbearia(activeBarbearia);
    if (activeBarbearia?.id) {
      try {
        const fats = await faturasService.list(activeBarbearia.id);
        setFaturas(fats);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setBarbearia(null);
    setFaturas([]);
  };

  const handleBarbeariaUpdated = (updatedBarbearia: Barbearia) => {
    setBarbearia(updatedBarbearia);
  };

  const handleRegularizado = (updatedBarbearia: Barbearia) => {
    setBarbearia(updatedBarbearia);
    if (updatedBarbearia.id) {
      faturasService.list(updatedBarbearia.id).then(setFaturas).catch(console.error);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="gold-gradient-text" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            NAVILLE BARBER
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            Carregando ambiente local...
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* 1. ROTA DO SUPER ADMIN: completamente isolada da rota /b/:slug */}
      <Route element={<SuperAdminLayout />} path="/admin">
        <Route element={<SuperAdminDashboard />} index />
        <Route element={<SuperAdminLojasView />} path="barbearias" />
        <Route element={<SuperAdminDashboard />} path="financeiro" />
        <Route element={<SuperAdminLogsView />} path="logs" />
      </Route>

      {/* Rota legada /superadmin redirecionando/renderizando SuperAdmin */}
      <Route element={<SuperAdminLayout />} path="/superadmin">
        <Route element={<SuperAdminDashboard />} index />
        <Route element={<SuperAdminLojasView />} path="barbearias" />
        <Route element={<SuperAdminDashboard />} path="financeiro" />
        <Route element={<SuperAdminLogsView />} path="logs" />
      </Route>

      {/* 2. ROTA PÚBLICA DA VITRINE B2C: isolada em /b/:slug */}
      <Route path="/b/:slug" element={<VitrineRoute user={user} />} />

      {/* 3. ROTAS DO TENANT (BARBEARIA) */}
      <Route
        path="/*"
        element={
          <TenantRoute
            user={user}
            barbearia={barbearia}
            faturas={faturas}
            onBarbeariaUpdated={handleBarbeariaUpdated}
            onRegularizado={handleRegularizado}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
          />
        }
      />
    </Routes>
  );
};
