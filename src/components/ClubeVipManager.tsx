import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Crown,
  Sparkles,
  Users,
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Phone,
  Mail,
  Edit2,
  Trash2,
  X,
  ExternalLink,
  Copy,
  Check,
  Scissors,
  Filter,
  RefreshCw,
  Coins,
  ChevronRight,
  TrendingUp,
  UserCheck,
  ShieldCheck,
  DollarSign
} from 'lucide-react';
import {
  Barbearia,
  PlanoAssinatura,
  Cliente,
  Servico,
  Profissional,
  planosService,
  clientesService,
} from '../services/pocketbase';

interface ClubeVipManagerProps {
  barbearia: Barbearia;
  servicesList: Servico[];
  profissionaisList: Profissional[];
}

type TabType = 'assinantes' | 'planos';

const DIAS_SEMANA_MAP = [
  { id: 1, nome: 'Segunda-feira', abrev: 'Seg' },
  { id: 2, nome: 'Terça-feira', abrev: 'Ter' },
  { id: 3, nome: 'Quarta-feira', abrev: 'Qua' },
  { id: 4, nome: 'Quinta-feira', abrev: 'Qui' },
  { id: 5, nome: 'Sexta-feira', abrev: 'Sex' },
  { id: 6, nome: 'Sábado', abrev: 'Sáb' },
  { id: 0, nome: 'Domingo', abrev: 'Dom' },
];

export const ClubeVipManager: React.FC<ClubeVipManagerProps> = ({
  barbearia,
  servicesList,
  profissionaisList,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('assinantes');

  // Dados
  const [planos, setPlanos] = useState<PlanoAssinatura[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Modais de Planos
  const [isPlanoModalOpen, setIsPlanoModalOpen] = useState<boolean>(false);
  const [editingPlano, setEditingPlano] = useState<PlanoAssinatura | null>(null);
  const [planoFormNome, setPlanoFormNome] = useState<string>('');
  const [planoFormValor, setPlanoFormValor] = useState<number>(89.9);
  const [planoFormLimite, setPlanoFormLimite] = useState<number>(4);
  const [planoFormPermiteBarba, setPlanoFormPermiteBarba] = useState<boolean>(false);
  const [planoFormServicos, setPlanoFormServicos] = useState<string[]>([]);
  const [planoFormDias, setPlanoFormDias] = useState<number[]>([1, 2, 3, 4]);
  const [planoFormBarbeiros, setPlanoFormBarbeiros] = useState<string[]>([]);
  const [planoFormAtivo, setPlanoFormAtivo] = useState<boolean>(true);
  const [planoFormLinkMp, setPlanoFormLinkMp] = useState<string>('');
  const [savingPlano, setSavingPlano] = useState<boolean>(false);

  // Modais de Clientes
  const [isClienteModalOpen, setIsClienteModalOpen] = useState<boolean>(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [clienteFormNome, setClienteFormNome] = useState<string>('');
  const [clienteFormTelefone, setClienteFormTelefone] = useState<string>('');
  const [clienteFormEmail, setClienteFormEmail] = useState<string>('');
  const [clienteFormObservacoes, setClienteFormObservacoes] = useState<string>('');
  const [clienteFormPlanoId, setClienteFormPlanoId] = useState<string>('');
  const [clienteFormStatus, setClienteFormStatus] = useState<Cliente['status_assinatura']>('ativo');
  const [clienteFormDataVencimento, setClienteFormDataVencimento] = useState<string>('');
  const [clienteFormCortesMes, setClienteFormCortesMes] = useState<number>(0);
  const [savingCliente, setSavingCliente] = useState<boolean>(false);

  // Carrega planos e clientes da barbearia
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [planosRes, clientesRes] = await Promise.all([
        planosService.list(barbearia.id),
        clientesService.list(barbearia.id, '', 'todos'),
      ]);
      setPlanos(planosRes);
      setClientes(clientesRes);
    } catch (err) {
      console.error('Erro ao carregar dados do Clube VIP:', err);
    } finally {
      setLoading(false);
    }
  }, [barbearia.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Métricas do Clube VIP
  const metrics = useMemo(() => {
    const assinantesAtivos = clientes.filter((c) => c.status_assinatura === 'ativo');
    const assinantesAtrasados = clientes.filter((c) => c.status_assinatura === 'atrasado');
    const assinantesVencidos = clientes.filter((c) => c.status_assinatura === 'vencido');

    // Calcula MRR (Receita Recorrente Mensal) estimada
    const mrr = assinantesAtivos.reduce((total, c) => {
      const plano = planos.find((p) => p.id === c.plano_assinatura_id);
      return total + (plano ? plano.valor_mensal : 0);
    }, 0);

    const totalCortesMes = clientes.reduce((acc, curr) => acc + (curr.cortes_utilizados_mes || 0), 0);

    return {
      totalAssinantes: assinantesAtivos.length,
      mrr,
      totalCortesMes,
      totalClientes: clientes.length,
      pendentesRegularizacao: assinantesAtrasados.length + assinantesVencidos.length,
    };
  }, [clientes, planos]);

  // Lista filtrada de clientes
  const filteredClientes = useMemo(() => {
    return clientes.filter((c) => {
      // Filtro de status
      if (statusFilter !== 'todos' && c.status_assinatura !== statusFilter) {
        return false;
      }
      // Busca por nome, telefone ou email
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const qDigits = searchTerm.replace(/\D/g, '');
        const matchNome = (c.nome || '').toLowerCase().includes(q);
        const matchEmail = (c.email || '').toLowerCase().includes(q);
        const cDigits = (c.telefone || '').replace(/\D/g, '');
        const matchTel = qDigits ? cDigits.includes(qDigits) : false;
        if (!matchNome && !matchEmail && !matchTel) return false;
      }
      return true;
    });
  }, [clientes, statusFilter, searchTerm]);

  // Helpers de Ações de Plano
  const handleOpenNewPlano = () => {
    setEditingPlano(null);
    setPlanoFormNome('');
    setPlanoFormValor(89.9);
    setPlanoFormLimite(4);
    setPlanoFormPermiteBarba(false);
    // Seleciona o primeiro serviço de corte disponível por padrão
    const corte = servicesList.find((s) => s.categoria === 'cabelo' || s.nome.toLowerCase().includes('corte'));
    setPlanoFormServicos(corte ? [corte.id] : []);
    setPlanoFormDias([1, 2, 3, 4]); // Segunda a Quinta
    setPlanoFormBarbeiros(profissionaisList.map((p) => p.id));
    setPlanoFormAtivo(true);
    setPlanoFormLinkMp('');
    setIsPlanoModalOpen(true);
  };

  const handleOpenEditPlano = (plano: PlanoAssinatura) => {
    setEditingPlano(plano);
    setPlanoFormNome(plano.nome);
    setPlanoFormValor(plano.valor_mensal);
    setPlanoFormLimite(plano.limite_cortes_mes);
    setPlanoFormPermiteBarba(!!plano.permite_barba);
    setPlanoFormServicos(Array.isArray(plano.servicos_inclusos) ? plano.servicos_inclusos : []);
    setPlanoFormDias(Array.isArray(plano.dias_permitidos) ? plano.dias_permitidos : []);
    setPlanoFormBarbeiros(Array.isArray(plano.barbeiros_permitidos) ? plano.barbeiros_permitidos : []);
    setPlanoFormAtivo(plano.ativo !== false);
    setPlanoFormLinkMp(plano.link_mercado_pago || '');
    setIsPlanoModalOpen(true);
  };

  const handleSavePlano = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planoFormNome.trim()) {
      alert('Por favor, informe o nome do plano de assinatura.');
      return;
    }

    try {
      setSavingPlano(true);
      const payload = {
        barbearia_id: barbearia.id,
        nome: planoFormNome.trim(),
        valor_mensal: Number(planoFormValor) || 0,
        limite_cortes_mes: Number(planoFormLimite) || 0,
        permite_barba: planoFormPermiteBarba,
        servicos_inclusos: planoFormServicos,
        dias_permitidos: planoFormDias,
        barbeiros_permitidos: planoFormBarbeiros,
        ativo: planoFormAtivo,
        link_mercado_pago: planoFormLinkMp.trim(),
      };

      if (editingPlano) {
        await planosService.update(editingPlano.id, payload);
      } else {
        await planosService.create(payload);
      }

      setIsPlanoModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('Erro ao salvar plano:', err);
      alert('Erro ao salvar plano de assinatura.');
    } finally {
      setSavingPlano(false);
    }
  };

  const handleDeletePlano = async (id: string, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o plano "${nome}"? Clientes vinculados a este plano precisarão ser reatribuídos.`)) {
      return;
    }
    try {
      await planosService.delete(id);
      await loadData();
    } catch (err) {
      console.error('Erro ao excluir plano:', err);
      alert('Não foi possível excluir o plano.');
    }
  };

  // Helpers de Ações de Cliente
  const handleOpenNewCliente = () => {
    setEditingCliente(null);
    setClienteFormNome('');
    setClienteFormTelefone('');
    setClienteFormEmail('');
    setClienteFormObservacoes('');
    setClienteFormPlanoId(planos[0]?.id || '');
    setClienteFormStatus('ativo');
    // Vencimento padrão: daqui a 30 dias
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    setClienteFormDataVencimento(nextMonth.toISOString().split('T')[0]);
    setClienteFormCortesMes(0);
    setIsClienteModalOpen(true);
  };

  const handleOpenEditCliente = (c: Cliente) => {
    setEditingCliente(c);
    setClienteFormNome(c.nome);
    setClienteFormTelefone(c.telefone);
    setClienteFormEmail(c.email || '');
    setClienteFormObservacoes(c.observacoes || '');
    setClienteFormPlanoId(c.plano_assinatura_id || '');
    setClienteFormStatus(c.status_assinatura || 'sem_plano');
    setClienteFormDataVencimento(c.data_vencimento || '');
    setClienteFormCortesMes(c.cortes_utilizados_mes || 0);
    setIsClienteModalOpen(true);
  };

  const handleSaveCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteFormNome.trim() || !clienteFormTelefone.trim()) {
      alert('Por favor, informe ao menos o nome e telefone do cliente.');
      return;
    }

    try {
      setSavingCliente(true);
      const payload: Partial<Cliente> & { barbearia_id: string; nome: string; telefone: string } = {
        barbearia_id: barbearia.id,
        nome: clienteFormNome.trim(),
        telefone: clienteFormTelefone.trim(),
        email: clienteFormEmail.trim() || undefined,
        observacoes: clienteFormObservacoes.trim() || undefined,
        plano_assinatura_id: clienteFormPlanoId || undefined,
        status_assinatura: clienteFormStatus,
        data_vencimento: clienteFormDataVencimento || undefined,
        cortes_utilizados_mes: Number(clienteFormCortesMes) || 0,
      };

      if (editingCliente) {
        await clientesService.update(editingCliente.id, payload);
      } else {
        await clientesService.create(payload);
      }

      setIsClienteModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('Erro ao salvar cliente:', err);
      alert('Erro ao salvar cadastro do cliente.');
    } finally {
      setSavingCliente(false);
    }
  };

  const handleDeleteCliente = async (id: string, nome: string) => {
    if (!window.confirm(`Confirma a exclusão de "${nome}" da base de clientes?`)) {
      return;
    }
    try {
      await clientesService.delete(id);
      await loadData();
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
      alert('Não foi possível excluir o cliente.');
    }
  };

  // Ajuste rápido de cortes no card
  const handleAjustarCortes = async (c: Cliente, delta: number) => {
    const novoValor = Math.max(0, (c.cortes_utilizados_mes || 0) + delta);
    try {
      await clientesService.update(c.id, { cortes_utilizados_mes: novoValor });
      setClientes((prev) =>
        prev.map((item) => (item.id === c.id ? { ...item, cortes_utilizados_mes: novoValor } : item))
      );
    } catch (err) {
      console.error('Erro ao ajustar cortes:', err);
    }
  };

  // Resetar cortes do mês para zero
  const handleResetCortesMes = async (c: Cliente) => {
    if (!window.confirm(`Deseja reiniciar a contagem de cortes do mês para 0 para "${c.nome}"?`)) {
      return;
    }
    try {
      await clientesService.update(c.id, { cortes_utilizados_mes: 0 });
      setClientes((prev) =>
        prev.map((item) => (item.id === c.id ? { ...item, cortes_utilizados_mes: 0 } : item))
      );
    } catch (err) {
      console.error('Erro ao resetar cortes:', err);
    }
  };

  // Alteração rápida de status do cliente
  const handleQuickStatusChange = async (c: Cliente, novoStatus: Cliente['status_assinatura']) => {
    try {
      await clientesService.update(c.id, { status_assinatura: novoStatus });
      setClientes((prev) =>
        prev.map((item) => (item.id === c.id ? { ...item, status_assinatura: novoStatus } : item))
      );
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  // Formatação de status badge
  const renderStatusBadge = (status: Cliente['status_assinatura'], dataVencimento?: string) => {
    const hojeStr = new Date().toLocaleDateString('en-CA');
    const isVencidoData = dataVencimento && dataVencimento < hojeStr;

    switch (status) {
      case 'ativo':
        if (isVencidoData) {
          return (
            <span className="badge badge-amber" title="Data de vencimento ultrapassada">
              <AlertTriangle style={{ width: '0.75rem', height: '0.75rem' }} />
              Ativo (Vencido)
            </span>
          );
        }
        return (
          <span className="badge badge-green">
            <CheckCircle2 style={{ width: '0.75rem', height: '0.75rem' }} />
            Ativo
          </span>
        );
      case 'atrasado':
        return (
          <span className="badge badge-amber">
            <Clock style={{ width: '0.75rem', height: '0.75rem' }} />
            Atrasado
          </span>
        );
      case 'vencido':
        return (
          <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
            <AlertTriangle style={{ width: '0.75rem', height: '0.75rem' }} />
            Vencido
          </span>
        );
      case 'cancelado':
        return (
          <span className="badge badge-gray">
            <X style={{ width: '0.75rem', height: '0.75rem' }} />
            Cancelado
          </span>
        );
      case 'sem_plano':
      default:
        return (
          <span className="badge badge-gray">
            Avulso
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* KPI Cards: Métricas do Clube VIP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
        
        {/* Card 1: Assinantes Ativos */}
        <div className="glass-panel" style={{ padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            padding: '0.5rem',
            borderRadius: '0.5rem',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(180, 83, 9, 0.25) 100%)',
            color: '#fbbf24',
            border: '1px solid rgba(245, 158, 11, 0.35)',
          }}>
            <Crown style={{ width: '1.2rem', height: '1.2rem' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Assinantes VIP Ativos
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.1rem' }}>
              {metrics.totalAssinantes} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-dim)' }}>membros</span>
            </div>
          </div>
        </div>

        {/* Card 2: Receita Recorrente Mensal (MRR) */}
        <div className="glass-panel" style={{ padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            padding: '0.5rem',
            borderRadius: '0.5rem',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.25) 100%)',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.35)',
          }}>
            <TrendingUp style={{ width: '1.2rem', height: '1.2rem' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              MRR Clube VIP (Estimado)
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399', marginTop: '0.1rem' }}>
              R$ {metrics.mrr.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Card 3: Cortes Utilizados no Mês */}
        <div className="glass-panel" style={{ padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            padding: '0.5rem',
            borderRadius: '0.5rem',
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(2, 132, 199, 0.25) 100%)',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.35)',
          }}>
            <Scissors style={{ width: '1.2rem', height: '1.2rem' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Cortes Resgatados no Mês
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.1rem' }}>
              {metrics.totalCortesMes} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-dim)' }}>cortes</span>
            </div>
          </div>
        </div>

        {/* Card 4: Base Geral de Clientes */}
        <div className="glass-panel" style={{ padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            padding: '0.5rem',
            borderRadius: '0.5rem',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-subtle)',
          }}>
            <Users style={{ width: '1.2rem', height: '1.2rem' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Base de Clientes Cadastrados
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.1rem' }}>
              {metrics.totalClientes}
            </div>
          </div>
        </div>

      </div>

      {/* Sub-Abas: Assinantes vs Planos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('assinantes')}
            className={`nav-tab-btn ${activeTab === 'assinantes' ? 'active' : ''}`}
          >
            <Users style={{ width: '1rem', height: '1rem' }} />
            <span>Assinantes & Clientes ({filteredClientes.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('planos')}
            className={`nav-tab-btn ${activeTab === 'planos' ? 'active' : ''}`}
          >
            <Crown style={{ width: '1rem', height: '1rem' }} />
            <span>Planos de Assinatura ({planos.length})</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {activeTab === 'assinantes' ? (
            <button
              type="button"
              onClick={handleOpenNewCliente}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', padding: '0.38rem 0.85rem' }}
            >
              <Plus style={{ width: '0.85rem', height: '0.85rem' }} />
              Novo Cliente / Assinante
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenNewPlano}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', padding: '0.38rem 0.85rem' }}
            >
              <Plus style={{ width: '0.85rem', height: '0.85rem' }} />
              Criar Novo Plano VIP
            </button>
          )}
        </div>
      </div>

      {/* CONTEÚDO DA ABA 1: ASSINANTES & CLIENTES */}
      {activeTab === 'assinantes' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Barra de Filtros e Busca */}
          <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
                <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '0.95rem', height: '0.95rem', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome, telefone ou e-mail..."
                  className="form-input"
                  style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
                />
              </div>

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Filtros Rápidos por Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Filter style={{ width: '0.85rem', height: '0.85rem' }} /> Status:
              </span>
              {(['todos', 'ativo', 'atrasado', 'vencido', 'sem_plano'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  style={{
                    background: statusFilter === st ? 'rgba(217, 119, 6, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                    border: statusFilter === st ? '1px solid #fbbf24' : '1px solid var(--border-subtle)',
                    color: statusFilter === st ? '#fbbf24' : 'var(--text-muted)',
                    borderRadius: '999px',
                    padding: '0.25rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {st === 'sem_plano' ? 'Avulsos' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Listagem de Clientes */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
              Carregando base de clientes e assinaturas...
            </div>
          ) : filteredClientes.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
              <Users style={{ width: '2.5rem', height: '2.5rem', color: 'var(--text-dim)', margin: '0 auto 0.75rem' }} />
              <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.35rem' }}>
                Nenhum cliente encontrado
              </div>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto 1.25rem' }}>
                Não foram encontrados clientes com os critérios de busca ou filtros selecionados.
              </p>
              <button
                type="button"
                onClick={handleOpenNewCliente}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}
              >
                <Plus style={{ width: '0.9rem', height: '0.9rem' }} />
                Cadastrar Primeiro Cliente VIP
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
              {filteredClientes.map((c) => {
                const plano = planos.find((p) => p.id === c.plano_assinatura_id);
                const isVip = c.status_assinatura === 'ativo' && plano;
                const limiteCortes = plano ? plano.limite_cortes_mes : 0;
                const cortesUsados = c.cortes_utilizados_mes || 0;

                return (
                  <div
                    key={c.id}
                    className="glass-panel"
                    style={{
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem',
                      border: isVip ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-subtle)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Header do Card */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '0.65rem',
                            background: isVip
                              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(180, 83, 9, 0.25) 100%)'
                              : 'rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isVip ? '#fbbf24' : 'var(--text-muted)',
                            fontWeight: 700,
                            fontSize: '1rem',
                            border: isVip ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)',
                          }}
                        >
                          {c.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <span>{c.nome}</span>
                            {isVip && <Crown style={{ width: '0.85rem', height: '0.85rem', color: '#fbbf24' }} />}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Phone style={{ width: '0.75rem', height: '0.75rem' }} />
                              {c.telefone}
                            </span>
                            {c.email && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Mail style={{ width: '0.75rem', height: '0.75rem' }} />
                                {c.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <div>{renderStatusBadge(c.status_assinatura, c.data_vencimento)}</div>
                    </div>

                    {/* Detalhes do Plano Vinculado */}
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '0.65rem',
                        padding: '0.75rem 0.85rem',
                        fontSize: '0.82rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-dim)' }}>Plano Atual:</span>
                        <span style={{ fontWeight: 700, color: plano ? '#fbbf24' : 'var(--text-muted)' }}>
                          {plano ? plano.nome : 'Sem Plano (Cliente Avulso)'}
                        </span>
                      </div>

                      {plano && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-dim)' }}>Vencimento:</span>
                            <span style={{ fontWeight: 600, color: c.data_vencimento ? 'var(--text-main)' : 'var(--text-dim)' }}>
                              {c.data_vencimento || 'Não configurado'}
                            </span>
                          </div>

                          {/* Controle de Cortes Utilizados no Mês */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '0.45rem' }}>
                            <span style={{ color: 'var(--text-dim)' }}>Cortes no Mês:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <button
                                type="button"
                                onClick={() => handleAjustarCortes(c, -1)}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid var(--border-subtle)',
                                  color: 'var(--text-main)',
                                  borderRadius: '0.35rem',
                                  width: '24px',
                                  height: '24px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.85rem',
                                }}
                                title="Diminuir 1 corte"
                              >
                                -
                              </button>
                              <span style={{ fontWeight: 700, color: '#38bdf8' }}>
                                {cortesUsados} {limiteCortes > 0 ? `/ ${limiteCortes}` : '(Ilimitado)'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAjustarCortes(c, 1)}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid var(--border-subtle)',
                                  color: 'var(--text-main)',
                                  borderRadius: '0.35rem',
                                  width: '24px',
                                  height: '24px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.85rem',
                                }}
                                title="Incrementar 1 corte"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResetCortesMes(c)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-dim)',
                                  cursor: 'pointer',
                                  padding: '0.2rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                                title="Zerar cortes do mês"
                              >
                                <RefreshCw style={{ width: '0.8rem', height: '0.8rem' }} />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Resumo de Visitas e Total Gasto */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                      <span>Visitas: <strong style={{ color: 'var(--text-main)' }}>{c.total_visitas || 0}</strong></span>
                      <span>Total Gasto: <strong style={{ color: '#10b981' }}>R$ {(c.total_gasto || 0).toFixed(2)}</strong></span>
                    </div>

                    {/* Rodapé com Ações */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: 'auto' }}>
                      {/* Atalho para alterar status */}
                      <select
                        value={c.status_assinatura}
                        onChange={(e) => handleQuickStatusChange(c, e.target.value as any)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '0.45rem',
                          color: 'var(--text-muted)',
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.5rem',
                        }}
                      >
                        <option value="ativo">● Ativo</option>
                        <option value="atrasado">● Atrasado</option>
                        <option value="vencido">● Vencido</option>
                        <option value="cancelado">● Cancelado</option>
                        <option value="sem_plano">● Sem Plano</option>
                      </select>

                      <div style={{ display: 'flex', gap: '0.45rem' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditCliente(c)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-main)',
                            borderRadius: '0.45rem',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit2 style={{ width: '0.75rem', height: '0.75rem' }} /> Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCliente(c.id, c.nome)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#f87171',
                            borderRadius: '0.45rem',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 style={{ width: '0.75rem', height: '0.75rem' }} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* CONTEÚDO DA ABA 2: PLANOS DE ASSINATURA */}
      {activeTab === 'planos' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Planos de Recorrência da Barbearia
              </h3>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
                Configure as cotas mensais de cortes, serviços inclusos e dias elegíveis para os clientes VIP.
              </p>
            </div>
          </div>

          {planos.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3.5rem', textAlign: 'center' }}>
              <Crown style={{ width: '2.75rem', height: '2.75rem', color: '#fbbf24', margin: '0 auto 0.85rem' }} />
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.35rem' }}>
                Nenhum Plano VIP Criado
              </div>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', maxWidth: '440px', margin: '0 auto 1.5rem' }}>
                Crie o primeiro plano de assinatura recorrente da sua barbearia para fidelizar clientes com planos mensais.
              </p>
              <button
                type="button"
                onClick={handleOpenNewPlano}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <Plus style={{ width: '1rem', height: '1rem' }} />
                Criar Plano VIP Agora
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
              {planos.map((plano) => {
                const totalAssinantesPlano = clientes.filter(
                  (c) => c.plano_assinatura_id === plano.id && c.status_assinatura === 'ativo'
                ).length;

                return (
                  <div
                    key={plano.id}
                    className="glass-panel"
                    style={{
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      border: plano.ativo ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid var(--border-subtle)',
                      boxShadow: plano.ativo ? '0 15px 30px -10px rgba(245, 158, 11, 0.15)' : 'none',
                    }}
                  >
                    {/* Header do Card do Plano */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <span className={plano.ativo ? 'gold-badge' : 'badge badge-gray'}>
                            <Crown style={{ width: '0.75rem', height: '0.75rem' }} />
                            {plano.ativo ? 'Plano Ativo' : 'Inativo'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            {totalAssinantesPlano} assinantes ativos
                          </span>
                        </div>
                        <h4 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                          {plano.nome}
                        </h4>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fbbf24' }}>
                          R$ {plano.valor_mensal.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>/ mês</div>
                      </div>
                    </div>

                    {/* Regras e Cotas */}
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '0.65rem',
                        padding: '0.85rem',
                        fontSize: '0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-dim)' }}>Limite de Cortes:</span>
                        <strong style={{ color: '#38bdf8' }}>
                          {plano.limite_cortes_mes === 0 ? 'Ilimitado' : `${plano.limite_cortes_mes} cortes/mês`}
                        </strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-dim)' }}>Inclui Barba:</span>
                        <strong style={{ color: plano.permite_barba ? '#10b981' : 'var(--text-dim)' }}>
                          {plano.permite_barba ? 'Sim (100% Coberta)' : 'Não'}
                        </strong>
                      </div>

                      {/* Dias permitidos */}
                      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '0.45rem' }}>
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'block', marginBottom: '0.35rem' }}>
                          Dias de Atendimento Elegíveis:
                        </span>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {(!plano.dias_permitidos || plano.dias_permitidos.length === 0) ? (
                            <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>Todos os dias</span>
                          ) : (
                            DIAS_SEMANA_MAP.map((dia) => {
                              const isPermitido = plano.dias_permitidos.includes(dia.id);
                              return (
                                <span
                                  key={dia.id}
                                  style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '0.35rem',
                                    background: isPermitido ? 'rgba(217, 119, 6, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                                    color: isPermitido ? '#fbbf24' : 'var(--text-dim)',
                                    border: isPermitido ? '1px solid rgba(217, 119, 6, 0.35)' : '1px solid transparent',
                                  }}
                                >
                                  {dia.abrev}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Serviços Inclusos */}
                      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '0.45rem' }}>
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'block', marginBottom: '0.35rem' }}>
                          Serviços Cobertos (100% OFF):
                        </span>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {(!plano.servicos_inclusos || plano.servicos_inclusos.length === 0) ? (
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                              Nenhum serviço mapeado
                            </span>
                          ) : (
                            plano.servicos_inclusos.map((sId) => {
                              const s = servicesList.find((srv) => srv.id === sId);
                              return (
                                <span
                                  key={sId}
                                  className="badge badge-blue"
                                  style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}
                                >
                                  {s ? s.nome : 'Serviço'}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Link de Adesão Mercado Pago */}
                    {plano.link_mercado_pago && (
                      <div
                        style={{
                          background: 'rgba(56, 189, 248, 0.05)',
                          border: '1px solid rgba(56, 189, 248, 0.2)',
                          borderRadius: '0.55rem',
                          padding: '0.65rem 0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          fontSize: '0.78rem',
                        }}
                      >
                        <span style={{ color: '#38bdf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {plano.link_mercado_pago}
                        </span>
                        <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(plano.link_mercado_pago!)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: copiedLink === plano.link_mercado_pago ? '#10b981' : '#38bdf8',
                              cursor: 'pointer',
                              padding: '0.2rem',
                            }}
                            title="Copiar link de adesão recorrente"
                          >
                            {copiedLink === plano.link_mercado_pago ? (
                              <Check style={{ width: '0.9rem', height: '0.9rem' }} />
                            ) : (
                              <Copy style={{ width: '0.9rem', height: '0.9rem' }} />
                            )}
                          </button>
                          <a
                            href={plano.link_mercado_pago}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#38bdf8', padding: '0.2rem' }}
                            title="Abrir link de pagamento"
                          >
                            <ExternalLink style={{ width: '0.9rem', height: '0.9rem' }} />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Rodapé Card Plano */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', marginTop: 'auto' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditPlano(plano)}
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                      >
                        <Edit2 style={{ width: '0.8rem', height: '0.8rem' }} /> Editar Plano
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlano(plano.id, plano.nome)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: '#f87171',
                          borderRadius: '0.55rem',
                          padding: '0.45rem 0.85rem',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <Trash2 style={{ width: '0.8rem', height: '0.8rem' }} /> Excluir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* MODAL: CRIAR / EDITAR CLIENTE */}
      {isClienteModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            className="glass-panel animate-scale-up"
            style={{
              width: '100%',
              maxWidth: '560px',
              borderRadius: '1.25rem',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            }}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(245, 158, 11, 0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Crown style={{ width: '1.25rem', height: '1.25rem', color: '#fbbf24' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                  {editingCliente ? 'Editar Cliente / Assinatura' : 'Novo Cliente / Assinante VIP'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsClienteModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
            </div>

            <form onSubmit={handleSaveCliente} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={clienteFormNome}
                  onChange={(e) => setClienteFormNome(e.target.value)}
                  placeholder="Ex: Carlos Eduardo"
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                    Telefone (Chave de Identificação) *
                  </label>
                  <input
                    type="text"
                    required
                    value={clienteFormTelefone}
                    onChange={(e) => setClienteFormTelefone(e.target.value)}
                    placeholder="11999998888"
                    className="form-input"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                    E-mail (opcional)
                  </label>
                  <input
                    type="email"
                    value={clienteFormEmail}
                    onChange={(e) => setClienteFormEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                    Plano de Assinatura
                  </label>
                  <select
                    value={clienteFormPlanoId}
                    onChange={(e) => setClienteFormPlanoId(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Nenhum / Cliente Avulso</option>
                    {planos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} (R$ {p.valor_mensal.toFixed(2)}/mês)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                    Status da Assinatura *
                  </label>
                  <select
                    value={clienteFormStatus}
                    onChange={(e) => setClienteFormStatus(e.target.value as any)}
                    className="form-input"
                  >
                    <option value="ativo">● Ativo</option>
                    <option value="atrasado">● Atrasado</option>
                    <option value="vencido">● Vencido</option>
                    <option value="cancelado">● Cancelado</option>
                    <option value="sem_plano">● Sem Plano</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    value={clienteFormDataVencimento}
                    onChange={(e) => setClienteFormDataVencimento(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                    Cortes Utilizados no Mês
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={clienteFormCortesMes}
                    onChange={(e) => setClienteFormCortesMes(parseInt(e.target.value) || 0)}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Observações e Preferências
                </label>
                <textarea
                  rows={2}
                  value={clienteFormObservacoes}
                  onChange={(e) => setClienteFormObservacoes(e.target.value)}
                  placeholder="Ex: Prefere corte na tesoura, cerveja gelada aos sábados..."
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsClienteModalOpen(false)}
                  className="btn-secondary"
                  disabled={savingCliente}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={savingCliente}
                >
                  {savingCliente ? 'Salvando...' : 'Salvar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR PLANO DE ASSINATURA */}
      {isPlanoModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            className="glass-panel animate-scale-up"
            style={{
              width: '100%',
              maxWidth: '640px',
              maxHeight: '92vh',
              borderRadius: '1.25rem',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            }}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(245, 158, 11, 0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Crown style={{ width: '1.25rem', height: '1.25rem', color: '#fbbf24' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                  {editingPlano ? 'Editar Plano VIP' : 'Criar Novo Plano de Assinatura'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPlanoModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
            </div>

            <form onSubmit={handleSavePlano} style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Nome do Plano VIP *
                </label>
                <input
                  type="text"
                  required
                  value={planoFormNome}
                  onChange={(e) => setPlanoFormNome(e.target.value)}
                  placeholder="Ex: Clube VIP Cabelo, Corte Semanal, VIP Gold"
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                    Valor Mensal (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={planoFormValor}
                    onChange={(e) => setPlanoFormValor(parseFloat(e.target.value) || 0)}
                    className="form-input"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                    Limite de Cortes / Mês (0 = Ilimitado) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={planoFormLimite}
                    onChange={(e) => setPlanoFormLimite(parseInt(e.target.value) || 0)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Permite Barba */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                <input
                  type="checkbox"
                  id="permite-barba"
                  checked={planoFormPermiteBarba}
                  onChange={(e) => setPlanoFormPermiteBarba(e.target.checked)}
                  style={{ width: '1.1rem', height: '1.1rem', accentColor: '#fbbf24', cursor: 'pointer' }}
                />
                <label htmlFor="permite-barba" style={{ fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                  Permite Barba no Plano (Cobre serviços de barba além de cortes)
                </label>
              </div>

              {/* Dias Permitidos da Semana */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.45rem' }}>
                  Dias Permitidos para Atendimento no Plano
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  {DIAS_SEMANA_MAP.map((dia) => {
                    const checked = planoFormDias.includes(dia.id);
                    return (
                      <button
                        key={dia.id}
                        type="button"
                        onClick={() => {
                          if (checked) {
                            setPlanoFormDias(planoFormDias.filter((d) => d !== dia.id));
                          } else {
                            setPlanoFormDias([...planoFormDias, dia.id]);
                          }
                        }}
                        style={{
                          background: checked ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                          border: checked ? '1px solid #fbbf24' : '1px solid var(--border-subtle)',
                          color: checked ? '#fbbf24' : 'var(--text-dim)',
                          padding: '0.5rem',
                          borderRadius: '0.45rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        {checked && <Check style={{ width: '0.75rem', height: '0.75rem' }} />}
                        {dia.abrev}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Serviços Inclusos (Checkboxes) */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.45rem' }}>
                  Serviços Cobertos a 100% (R$ 0,00 no Checkout)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '140px', overflowY: 'auto', background: 'rgba(255, 255, 255, 0.02)', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                  {servicesList.map((srv) => {
                    const isSelected = planoFormServicos.includes(srv.id);
                    return (
                      <label
                        key={srv.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          padding: '0.35rem 0.5rem',
                          borderRadius: '0.35rem',
                          background: isSelected ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPlanoFormServicos([...planoFormServicos, srv.id]);
                            } else {
                              setPlanoFormServicos(planoFormServicos.filter((id) => id !== srv.id));
                            }
                          }}
                          style={{ accentColor: '#38bdf8' }}
                        />
                        <span style={{ fontWeight: 600 }}>{srv.nome}</span>
                        <span style={{ color: 'var(--text-dim)', marginLeft: 'auto' }}>
                          R$ {srv.preco.toFixed(2)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Barbeiros Permitidos */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.45rem' }}>
                  Barbeiros que Atendem pelo Plano
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {profissionaisList.map((p) => {
                    const isSelected = planoFormBarbeiros.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setPlanoFormBarbeiros(planoFormBarbeiros.filter((id) => id !== p.id));
                          } else {
                            setPlanoFormBarbeiros([...planoFormBarbeiros, p.id]);
                          }
                        }}
                        style={{
                          background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                          border: isSelected ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                          color: isSelected ? '#34d399' : 'var(--text-dim)',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '0.45rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        {isSelected && <Check style={{ width: '0.75rem', height: '0.75rem' }} />}
                        {p.nome}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Link de Adesão Mercado Pago */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Link de Adesão Recorrente (Mercado Pago / Link do Dono)
                </label>
                <input
                  type="text"
                  value={planoFormLinkMp}
                  onChange={(e) => setPlanoFormLinkMp(e.target.value)}
                  placeholder="https://mpago.la/..."
                  className="form-input"
                />
              </div>

              {/* Ativo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <input
                  type="checkbox"
                  id="plano-ativo"
                  checked={planoFormAtivo}
                  onChange={(e) => setPlanoFormAtivo(e.target.checked)}
                  style={{ width: '1.1rem', height: '1.1rem', accentColor: '#fbbf24', cursor: 'pointer' }}
                />
                <label htmlFor="plano-ativo" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                  Plano ativo para novas adesões
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsPlanoModalOpen(false)}
                  className="btn-secondary"
                  disabled={savingPlano}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={savingPlano}
                >
                  {savingPlano ? 'Salvando...' : 'Salvar Plano'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
