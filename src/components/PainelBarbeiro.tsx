import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Scissors,
  CalendarDays,
  Clock,
  User,
  Users,
  DollarSign,
  Lock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ExternalLink,
  TrendingUp,
  Package,
  Crown,
  MessageSquare,
  CreditCard,
  LayoutDashboard,
  Receipt,
  Store,
  LogOut,
  Ban,
  Check,
  RefreshCw,
  Phone,
  CalendarCheck2,
  AlertTriangle,
  Flame,
  ShieldCheck
} from 'lucide-react';
import {
  Barbearia,
  Usuario,
  Servico,
  Profissional,
  Produto,
  Agendamento,
  BloqueioHorario,
  Cliente,
  PlanoAssinatura,
  ValidacaoVipResult,
  servicosService,
  profissionaisService,
  produtosService,
  agendamentosService,
  bloqueiosService,
  clientesService,
  planosService,
  validarElegibilidadeVip,
  pb
} from '../services/pocketbase';
import { FechamentoComandaModal } from './FechamentoComandaModal';
import { ServicosManager } from './ServicosManager';
import { ProfissionaisManager } from './ProfissionaisManager';
import { ProdutosManager } from './ProdutosManager';
import { ClubeVipManager } from './ClubeVipManager';
import { WhatsAppManager } from './WhatsAppManager';
import { PlanoAssinaturaManager } from './PlanoAssinaturaManager';
import { RelatoriosManager } from './RelatoriosManager';
import {
  validateContiguousSlots,
  calculateServicesTotals,
  generateDayTimeSlots,
  timeToMinutes,
  minutesToTime,
  buildBarberDailyTimeline,
  DEFAULT_OPENING_TIME,
  DEFAULT_CLOSING_TIME
} from '../services/slotEngine';

export interface PainelBarbeiroProps {
  user: Usuario;
  barbearia: Barbearia | null;
  onBarbeariaUpdated?: (barbearia: Barbearia) => void;
  onLogout?: () => void;
  onOpenVitrine?: (slug: string) => void;
  onOpenSuperAdmin?: () => void;
}

export type MenuSection =
  | 'agenda'
  | 'comandas'
  | 'caixa'
  | 'profissionais'
  | 'servicos'
  | 'produtos'
  | 'clube_vip'
  | 'relatorios'
  | 'whatsapp'
  | 'plano_saas'
  | 'visao_geral';

export const PainelBarbeiro: React.FC<PainelBarbeiroProps> = ({
  user,
  barbearia: initialBarbearia,
  onBarbeariaUpdated,
  onLogout,
  onOpenVitrine,
  onOpenSuperAdmin
}) => {
  const [barbearia, setBarbearia] = useState<Barbearia | null>(initialBarbearia);
  const [activeTab, setActiveTab] = useState<MenuSection>('agenda');

  // Estados de dados compartilhados
  const [servicesList, setServicesList] = useState<Servico[]>([]);
  const [profissionaisList, setProfissionaisList] = useState<Profissional[]>([]);
  const [produtosList, setProdutosList] = useState<Produto[]>([]);

  // Estados da Agenda do Dia
  const getTodayIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIso());
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [bloqueios, setBloqueios] = useState<BloqueioHorario[]>([]);
  const [loadingAgenda, setLoadingAgenda] = useState<boolean>(true);

  // Filtros de Pesquisa
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterBarbeiroId, setFilterBarbeiroId] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'cards' | 'grade'>('cards');

  // Modais
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState<boolean>(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState<boolean>(false);
  const [isComandaModalOpen, setIsComandaModalOpen] = useState<boolean>(false);
  const [selectedComandaAgendamento, setSelectedComandaAgendamento] = useState<Agendamento | null>(null);

  // Form de Novo Agendamento
  const [formBarbeiroId, setFormBarbeiroId] = useState<string>('');
  const [formSelectedServices, setFormSelectedServices] = useState<string[]>([]);
  const [formHorario, setFormHorario] = useState<string>('09:00');
  const [formClienteNome, setFormClienteNome] = useState<string>('');
  const [formClienteTelefone, setFormClienteTelefone] = useState<string>('');
  const [formObservacoes, setFormObservacoes] = useState<string>('');
  const [savingAppointment, setSavingAppointment] = useState<boolean>(false);

  // Validação VIP no modal de agendamento
  const [formClienteVip, setFormClienteVip] = useState<Cliente | null>(null);
  const [formPlanoVip, setFormPlanoVip] = useState<PlanoAssinatura | null>(null);
  const [formVipResult, setFormVipResult] = useState<ValidacaoVipResult | null>(null);
  const [formSearchingVip, setFormSearchingVip] = useState<boolean>(false);

  // Form de Bloqueio de Horário
  const [formBlockBarbeiroId, setFormBlockBarbeiroId] = useState<string>('todos');
  const [formBlockInicio, setFormBlockInicio] = useState<string>('12:00');
  const [formBlockFim, setFormBlockFim] = useState<string>('13:00');
  const [formBlockMotivo, setFormBlockMotivo] = useState<string>('Intervalo de Almoço');
  const [savingBlock, setSavingBlock] = useState<boolean>(false);

  // Sincroniza barbearia inicial
  useEffect(() => {
    setBarbearia(initialBarbearia);
  }, [initialBarbearia]);

  // Carrega listas fundamentais da barbearia
  const loadBaseData = useCallback(async () => {
    if (!barbearia?.id) return;
    try {
      const [srvs, profs, prods] = await Promise.all([
        servicosService.list(barbearia.id).catch(() => [] as Servico[]),
        profissionaisService.list(barbearia.id).catch(() => [] as Profissional[]),
        produtosService.list(barbearia.id).catch(() => [] as Produto[])
      ]);
      setServicesList(srvs);
      setProfissionaisList(profs);
      setProdutosList(prods);
    } catch (err) {
      console.error('Erro ao carregar dados base da barbearia:', err);
    }
  }, [barbearia?.id]);

  useEffect(() => {
    loadBaseData();
  }, [loadBaseData]);

  // Carrega agendamentos e bloqueios da data selecionada
  const loadDayAgenda = useCallback(async () => {
    if (!barbearia?.id) return;
    try {
      setLoadingAgenda(true);
      const [ags, bls] = await Promise.all([
        agendamentosService.list(barbearia.id, selectedDate).catch(() => [] as Agendamento[]),
        bloqueiosService.list(barbearia.id, selectedDate).catch(() => [] as BloqueioHorario[])
      ]);
      setAgendamentos(ags);
      setBloqueios(bls);
    } catch (err) {
      console.error('Erro ao carregar agenda do dia:', err);
    } finally {
      setLoadingAgenda(false);
    }
  }, [barbearia?.id, selectedDate]);

  useEffect(() => {
    loadDayAgenda();

    // Inscrição em tempo real para sincronizar agendamentos da vitrine pública instantaneamente
    let unsubAg: (() => void) | undefined;
    let unsubBl: (() => void) | undefined;

    pb.collection('agendamentos').subscribe('*', () => {
      loadDayAgenda();
    }).then(u => { unsubAg = u; }).catch(() => {});

    pb.collection('bloqueios_horarios').subscribe('*', () => {
      loadDayAgenda();
    }).then(u => { unsubBl = u; }).catch(() => {});

    return () => {
      if (unsubAg) unsubAg();
      else pb.collection('agendamentos').unsubscribe('*').catch(() => {});
      if (unsubBl) unsubBl();
      else pb.collection('bloqueios_horarios').unsubscribe('*').catch(() => {});
    };
  }, [loadDayAgenda]);

  // Carrossel compacto de datas (Ontem, Hoje, Amanhã e próximos 11 dias = 14 dias)
  const carouselDates = useMemo(() => {
    const list: { iso: string; label: string; diaSemana: string; diaNumero: number; isToday: boolean }[] = [];
    const nomesSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

    for (let offset = -1; offset < 13; offset++) {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      let label = nomesSemana[d.getDay()];
      if (offset === -1) label = 'ONTEM';
      else if (offset === 0) label = 'HOJE';
      else if (offset === 1) label = 'AMANHÃ';

      list.push({
        iso,
        label,
        diaSemana: nomesSemana[d.getDay()],
        diaNumero: d.getDate(),
        isToday: offset === 0
      });
    }
    return list;
  }, []);

  // Data formatada para o topo direito
  const formattedDateTitle = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const str = dateObj.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      return str.charAt(0).toUpperCase() + str.slice(1);
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // KPIs do Dia
  const kpis = useMemo(() => {
    const total = agendamentos.length;
    const concluidos = agendamentos.filter(a => a.status === 'concluido').length;
    const confirmados = agendamentos.filter(a => a.status === 'confirmado').length;
    const pendentes = agendamentos.filter(a => a.status === 'pendente').length;
    const cancelados = agendamentos.filter(a => a.status === 'cancelado').length;

    // Faturamento bruto previsto
    const faturamentoTotal = agendamentos
      .filter(a => a.status !== 'cancelado')
      .reduce((sum, a) => sum + (a.valor_total || 0), 0);

    // Faturamento já concluído/recebido
    const faturamentoRecebido = agendamentos
      .filter(a => a.status === 'concluido')
      .reduce((sum, a) => sum + (a.valor_total || 0), 0);

    // Ticket Médio
    const atendimentosValidos = total - cancelados;
    const ticketMedio = atendimentosValidos > 0 ? faturamentoTotal / atendimentosValidos : 0;

    // Duração média
    const minutosTotais = agendamentos
      .filter(a => a.status !== 'cancelado')
      .reduce((sum, a) => sum + (a.duracao_total_minutos || 0), 0);
    const tempoMedioMinutos = atendimentosValidos > 0 ? Math.round(minutosTotais / atendimentosValidos) : 30;

    // Taxa de cancelamento
    const taxaCancelamento = total > 0 ? Math.round((cancelados / total) * 100) : 0;
    const taxaConclusao = total > 0 ? Math.round((concluidos / total) * 100) : 0;

    return {
      total,
      concluidos,
      confirmados,
      pendentes,
      cancelados,
      faturamentoTotal,
      faturamentoRecebido,
      ticketMedio,
      tempoMedioMinutos,
      taxaCancelamento,
      taxaConclusao
    };
  }, [agendamentos]);

  // Contagem de comandas abertas (pendente ou confirmado do dia)
  const comandasAbertasCount = useMemo(() => {
    return agendamentos.filter(a => a.status === 'pendente' || a.status === 'confirmado').length;
  }, [agendamentos]);

  // Filtragem dos Agendamentos para exibição
  const filteredAgendamentos = useMemo(() => {
    return agendamentos.filter(ag => {
      // Filtro por Barbeiro
      if (filterBarbeiroId !== 'todos' && ag.barbeiro_id !== filterBarbeiroId) {
        return false;
      }
      // Filtro por Status
      if (filterStatus !== 'todos' && ag.status !== filterStatus) {
        return false;
      }
      // Filtro da aba Comandas Abertas
      if (activeTab === 'comandas' && (ag.status === 'concluido' || ag.status === 'cancelado')) {
        return false;
      }
      // Busca textual por cliente ou serviços
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const nomeCliente = (ag.cliente_nome || '').toLowerCase();
        const foneCliente = (ag.cliente_telefone || '').toLowerCase();
        const matchObs = (ag.observacoes || '').toLowerCase().includes(query);
        const matchService = ag.servicos_ids?.some(sId => {
          const s = servicesList.find(x => x.id === sId);
          return s && s.nome.toLowerCase().includes(query);
        });

        if (!nomeCliente.includes(query) && !foneCliente.includes(query) && !matchObs && !matchService) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));
  }, [agendamentos, filterBarbeiroId, filterStatus, searchTerm, activeTab, servicesList]);

  // Ações de Agendamento
  const handleUpdateStatus = async (agendamentoId: string, newStatus: Agendamento['status']) => {
    try {
      await agendamentosService.updateStatus(agendamentoId, newStatus);
      await loadDayAgenda();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      alert('Falha ao atualizar o status do agendamento.');
    }
  };

  const handleOpenFechoComanda = (ag: Agendamento) => {
    setSelectedComandaAgendamento(ag);
    setIsComandaModalOpen(true);
  };

  // Motor de Slots do Modal de Agendamento
  const formTotals = useMemo(() => {
    const base = calculateServicesTotals(formSelectedServices, servicesList);
    if (formVipResult?.elegivel) {
      let valorCobrado = 0;
      for (const sId of formSelectedServices) {
        const srv = servicesList.find(s => s.id === sId);
        if (!srv) continue;
        const isCovered =
          (formVipResult.servicosCobertos && formVipResult.servicosCobertos.includes(sId)) ||
          (formVipResult.permiteBarba && (srv.categoria === 'barba' || srv.nome.toLowerCase().includes('barba')));
        if (!isCovered) {
          valorCobrado += srv.preco;
        }
      }
      return {
        ...base,
        valorTotal: valorCobrado,
        descontoVip: base.valorTotal - valorCobrado
      };
    }
    return {
      ...base,
      descontoVip: 0
    };
  }, [formSelectedServices, servicesList, formVipResult]);

  const slotValidation = useMemo(() => {
    if (!formBarbeiroId || formTotals.duracaoTotalMinutos <= 0 || !formHorario) {
      return { valido: false, motivo: 'Selecione o profissional e ao menos um serviço para validar o horário.' };
    }
    return validateContiguousSlots({
      horarioInicio: formHorario,
      duracaoTotalMinutos: formTotals.duracaoTotalMinutos,
      barbeiroId: formBarbeiroId,
      agendamentos,
      bloqueios
    });
  }, [formBarbeiroId, formTotals.duracaoTotalMinutos, formHorario, agendamentos, bloqueios]);

  // Busca cliente e Clube VIP no modal de agendamento
  useEffect(() => {
    if (!barbearia?.id) return;
    const raw = formClienteTelefone.replace(/\D/g, '');
    if (raw.length < 8) {
      setFormClienteVip(null);
      setFormPlanoVip(null);
      setFormVipResult(null);
      return;
    }

    let isSubscribed = true;
    setFormSearchingVip(true);

    clientesService
      .getByTelefone(barbearia.id, formClienteTelefone)
      .then(async found => {
        if (!isSubscribed) return;
        setFormSearchingVip(false);
        if (found) {
          setFormClienteVip(found);
          if (!formClienteNome || formClienteNome.trim() === '') {
            setFormClienteNome(found.nome);
          }
          let plano: PlanoAssinatura | null = null;
          if (found.expand?.plano_assinatura_id) {
            plano = found.expand.plano_assinatura_id;
          } else if (found.plano_assinatura_id) {
            try {
              plano = await planosService.getOne(found.plano_assinatura_id);
            } catch {}
          }
          setFormPlanoVip(plano);
          const res = validarElegibilidadeVip(found, plano, {
            dataIso: selectedDate,
            barbeiroId: formBarbeiroId
          });
          setFormVipResult(res);
        } else {
          setFormClienteVip(null);
          setFormPlanoVip(null);
          setFormVipResult(null);
        }
      })
      .catch(() => {
        if (isSubscribed) setFormSearchingVip(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [formClienteTelefone, formBarbeiroId, barbearia?.id, selectedDate]);

  const handleOpenNewAppointment = (defaultBarberId?: string, defaultSlot?: string) => {
    const bId = defaultBarberId || (profissionaisList.length > 0 ? profissionaisList[0].id : '');
    setFormBarbeiroId(bId);
    setFormHorario(defaultSlot || '09:00');
    if (servicesList.length > 0) {
      setFormSelectedServices([servicesList[0].id]);
    } else {
      setFormSelectedServices([]);
    }
    setFormClienteNome('');
    setFormClienteTelefone('');
    setFormObservacoes('');
    setFormClienteVip(null);
    setFormPlanoVip(null);
    setFormVipResult(null);
    setIsAppointmentModalOpen(true);
  };

  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barbearia?.id) return;
    if (!slotValidation.valido) {
      alert(`Horário inválido: ${slotValidation.motivo}`);
      return;
    }
    if (!formClienteNome.trim() || !formClienteTelefone.trim()) {
      alert('Por favor, informe o nome e telefone do cliente.');
      return;
    }

    try {
      setSavingAppointment(true);
      await agendamentosService.create({
        barbearia_id: barbearia.id,
        barbeiro_id: formBarbeiroId,
        cliente_nome: formClienteNome.trim(),
        cliente_telefone: formClienteTelefone.trim(),
        servicos_ids: formSelectedServices,
        data: selectedDate,
        horario: formHorario,
        duracao_total_minutos: formTotals.duracaoTotalMinutos,
        valor_total: formTotals.valorTotal,
        status: 'confirmado',
        observacoes: formObservacoes.trim() ? `${formObservacoes.trim()} • [Painel do Barbeiro]` : '[Painel do Barbeiro]'
      });

      setIsAppointmentModalOpen(false);
      await loadDayAgenda();
    } catch (err: any) {
      console.error('Erro ao salvar agendamento:', err);
      alert('Não foi possível salvar o agendamento.');
    } finally {
      setSavingAppointment(false);
    }
  };

  const handleSaveBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barbearia?.id) return;
    const startM = timeToMinutes(formBlockInicio);
    const endM = timeToMinutes(formBlockFim);

    if (endM <= startM) {
      alert('O horário de término do bloqueio deve ser maior que o horário de início.');
      return;
    }

    try {
      setSavingBlock(true);
      await bloqueiosService.create({
        barbearia_id: barbearia.id,
        barbeiro_id: formBlockBarbeiroId,
        data: selectedDate,
        horario_inicio: formBlockInicio,
        horario_fim: formBlockFim,
        motivo: formBlockMotivo.trim() || 'Intervalo de Almoço'
      });

      setIsBlockModalOpen(false);
      await loadDayAgenda();
    } catch (err: any) {
      console.error('Erro ao cadastrar bloqueio:', err);
      alert('Não foi possível criar o bloqueio de horário.');
    } finally {
      setSavingBlock(false);
    }
  };

  // Helper para renderizar os serviços do agendamento
  const getServiceNames = (servicosIds?: string[]) => {
    if (!servicosIds || servicosIds.length === 0) return 'Atendimento Padrão';
    return servicosIds
      .map(id => servicesList.find(s => s.id === id)?.nome)
      .filter(Boolean)
      .join(' + ');
  };

  // Helper para dados do barbeiro
  const getBarber = (barbeiroId?: string) => {
    return profissionaisList.find(p => p.id === barbeiroId);
  };

  // Cores de status
  const getStatusBadge = (status: Agendamento['status']) => {
    switch (status) {
      case 'concluido':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#10B981',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          label: 'Concluído'
        };
      case 'confirmado':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          color: '#F59E0B',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          label: 'Confirmado'
        };
      case 'pendente':
        return {
          bg: 'rgba(56, 189, 248, 0.15)',
          color: '#38BDF8',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          label: 'Pendente'
        };
      case 'cancelado':
        return {
          bg: 'rgba(239, 68, 68, 0.15)',
          color: '#EF4444',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          label: 'Cancelado'
        };
      default:
        return {
          bg: 'rgba(156, 163, 175, 0.15)',
          color: '#9CA3AF',
          border: '1px solid rgba(156, 163, 175, 0.3)',
          label: status
        };
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0B0F19',
      color: '#F8FAFC',
      display: 'flex',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>

      {/* =========================================================================
          2. SIDEBAR LATERAL
          ========================================================================= */}
      <aside style={{
        width: '280px',
        backgroundColor: '#0C101B',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 40
      }}>

        {/* Topo da Sidebar: Logótipo & Identificação */}
        <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '2.4rem',
              height: '2.4rem',
              borderRadius: '0.7rem',
              background: 'linear-gradient(135deg, #F59E0B 0%, #B45309 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
              color: '#0B0F19',
              fontWeight: 900
            }}>
              <Scissors style={{ width: '1.3rem', height: '1.3rem', strokeWidth: 2.5 }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#ffffff', letterSpacing: '0.04em' }}>
                  NAVILLE
                </span>
                <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#F59E0B', letterSpacing: '0.04em' }}>
                  BARBER
                </span>
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '0.1rem 0.45rem',
                borderRadius: '0.35rem',
                marginTop: '3px'
              }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  PAINEL DO BARBEIRO
                </span>
              </div>
            </div>
          </div>

          {/* Barbearia Ativa Context */}
          {barbearia && (
            <div style={{
              marginTop: '0.95rem',
              backgroundColor: '#121827',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: '0.85rem',
              padding: '0.65rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem'
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {barbearia.nome}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
                  <span style={{ fontSize: '0.68rem', color: '#10B981', fontWeight: 700 }}>Online</span>
                  <span style={{ fontSize: '0.68rem', color: '#6B7280' }}>•</span>
                  <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{barbearia.cidade || 'Caconde-SP'}</span>
                </div>
              </div>
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 900,
                color: '#F59E0B',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                padding: '0.15rem 0.45rem',
                borderRadius: '0.35rem',
                textTransform: 'uppercase'
              }}>
                {barbearia.plano_saas}
              </span>
            </div>
          )}

          {/* Botão Superior "Bloquear Horário / Almoço" com Contorno Dourado */}
          <button
            onClick={() => setIsBlockModalOpen(true)}
            style={{
              width: '100%',
              marginTop: '0.85rem',
              padding: '0.65rem 0.85rem',
              borderRadius: '0.85rem',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid #F59E0B',
              color: '#F59E0B',
              fontSize: '0.78rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 2px 10px rgba(245, 158, 11, 0.15)'
            }}
          >
            <Lock style={{ width: '0.95rem', height: '0.95rem' }} />
            <span>Bloquear Horário / Almoço</span>
          </button>
        </div>

        {/* Menu de Navegação agrupado em 3 Blocos */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Bloco 1: ATENDIMENTOS & CAIXA */}
          <div>
            <div style={{
              fontSize: '0.65rem',
              fontWeight: 900,
              letterSpacing: '0.08em',
              color: '#6B7280',
              textTransform: 'uppercase',
              padding: '0 0.5rem',
              marginBottom: '0.45rem'
            }}>
              ATENDIMENTOS & CAIXA
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <button
                onClick={() => setActiveTab('agenda')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.75rem',
                  border: activeTab === 'agenda' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid transparent',
                  backgroundColor: activeTab === 'agenda' ? 'rgba(245, 158, 11, 0.14)' : 'transparent',
                  color: activeTab === 'agenda' ? '#F59E0B' : '#9CA3AF',
                  fontSize: '0.8rem',
                  fontWeight: activeTab === 'agenda' ? 800 : 600,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <CalendarDays style={{ width: '1.05rem', height: '1.05rem', color: activeTab === 'agenda' ? '#F59E0B' : '#6B7280' }} />
                  <span>Agenda & Grade Diária</span>
                </div>
                {agendamentos.length > 0 && (
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    backgroundColor: activeTab === 'agenda' ? '#F59E0B' : '#1F2937',
                    color: activeTab === 'agenda' ? '#0B0F19' : '#D1D5DB',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '9999px'
                  }}>
                    {agendamentos.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('comandas')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.75rem',
                  border: activeTab === 'comandas' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid transparent',
                  backgroundColor: activeTab === 'comandas' ? 'rgba(245, 158, 11, 0.14)' : 'transparent',
                  color: activeTab === 'comandas' ? '#F59E0B' : '#9CA3AF',
                  fontSize: '0.8rem',
                  fontWeight: activeTab === 'comandas' ? 800 : 600,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Receipt style={{ width: '1.05rem', height: '1.05rem', color: activeTab === 'comandas' ? '#F59E0B' : '#6B7280' }} />
                  <span>Comandas Abertas</span>
                </div>
                {comandasAbertasCount > 0 && (
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    backgroundColor: '#10B981',
                    color: '#ffffff',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '9999px'
                  }}>
                    {comandasAbertasCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Bloco 2: GESTÃO DA BARBEARIA */}
          <div>
            <div style={{
              fontSize: '0.65rem',
              fontWeight: 900,
              letterSpacing: '0.08em',
              color: '#6B7280',
              textTransform: 'uppercase',
              padding: '0 0.5rem',
              marginBottom: '0.45rem'
            }}>
              GESTÃO DA BARBEARIA
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <button
                onClick={() => setActiveTab('profissionais')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.75rem',
                  border: activeTab === 'profissionais' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid transparent',
                  backgroundColor: activeTab === 'profissionais' ? 'rgba(245, 158, 11, 0.14)' : 'transparent',
                  color: activeTab === 'profissionais' ? '#F59E0B' : '#9CA3AF',
                  fontSize: '0.8rem',
                  fontWeight: activeTab === 'profissionais' ? 800 : 600,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Users style={{ width: '1.05rem', height: '1.05rem', color: activeTab === 'profissionais' ? '#F59E0B' : '#6B7280' }} />
                  <span>Equipe de Barbeiros</span>
                </div>
                {profissionaisList.length > 0 && (
                  <span style={{ fontSize: '0.68rem', color: '#6B7280', fontWeight: 700 }}>
                    {profissionaisList.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('servicos')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.75rem',
                  border: activeTab === 'servicos' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid transparent',
                  backgroundColor: activeTab === 'servicos' ? 'rgba(245, 158, 11, 0.14)' : 'transparent',
                  color: activeTab === 'servicos' ? '#F59E0B' : '#9CA3AF',
                  fontSize: '0.8rem',
                  fontWeight: activeTab === 'servicos' ? 800 : 600,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Scissors style={{ width: '1.05rem', height: '1.05rem', color: activeTab === 'servicos' ? '#F59E0B' : '#6B7280' }} />
                  <span>Catálogo de Serviços</span>
                </div>
                {servicesList.length > 0 && (
                  <span style={{ fontSize: '0.68rem', color: '#6B7280', fontWeight: 700 }}>
                    {servicesList.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('produtos')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.75rem',
                  border: activeTab === 'produtos' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid transparent',
                  backgroundColor: activeTab === 'produtos' ? 'rgba(245, 158, 11, 0.14)' : 'transparent',
                  color: activeTab === 'produtos' ? '#F59E0B' : '#9CA3AF',
                  fontSize: '0.8rem',
                  fontWeight: activeTab === 'produtos' ? 800 : 600,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Package style={{ width: '1.05rem', height: '1.05rem', color: activeTab === 'produtos' ? '#F59E0B' : '#6B7280' }} />
                  <span>Produtos & Estoque (PDV)</span>
                </div>
                {produtosList.length > 0 && (
                  <span style={{ fontSize: '0.68rem', color: '#6B7280', fontWeight: 700 }}>
                    {produtosList.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('clube_vip')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.75rem',
                  border: activeTab === 'clube_vip' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid transparent',
                  backgroundColor: activeTab === 'clube_vip' ? 'rgba(245, 158, 11, 0.14)' : 'transparent',
                  color: activeTab === 'clube_vip' ? '#F59E0B' : '#9CA3AF',
                  fontSize: '0.8rem',
                  fontWeight: activeTab === 'clube_vip' ? 800 : 600,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Crown style={{ width: '1.05rem', height: '1.05rem', color: '#F59E0B' }} />
                  <span>Clube VIP & Clientes</span>
                </div>
                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, #A855F7, #EC4899)',
                  color: '#ffffff',
                  padding: '0.12rem 0.45rem',
                  borderRadius: '0.35rem',
                  textTransform: 'uppercase'
                }}>
                  NOVO
                </span>
              </button>

              <button
                onClick={() => setActiveTab('relatorios')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.75rem',
                  border: activeTab === 'relatorios' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid transparent',
                  backgroundColor: activeTab === 'relatorios' ? 'rgba(245, 158, 11, 0.14)' : 'transparent',
                  color: activeTab === 'relatorios' ? '#F59E0B' : '#9CA3AF',
                  fontSize: '0.8rem',
                  fontWeight: activeTab === 'relatorios' ? 800 : 600,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <TrendingUp style={{ width: '1.05rem', height: '1.05rem', color: activeTab === 'relatorios' ? '#10B981' : '#6B7280' }} />
                  <span>Relatórios & Finanças</span>
                </div>
              </button>
            </div>
          </div>

          {/* Bloco 3: CONFIGURAÇÕES & INTEGRAÇÕES */}
          <div>
            <div style={{
              fontSize: '0.65rem',
              fontWeight: 900,
              letterSpacing: '0.08em',
              color: '#6B7280',
              textTransform: 'uppercase',
              padding: '0 0.5rem',
              marginBottom: '0.45rem'
            }}>
              CONFIGURAÇÕES & INTEGRAÇÕES
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <button
                onClick={() => setActiveTab('whatsapp')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.75rem',
                  border: activeTab === 'whatsapp' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid transparent',
                  backgroundColor: activeTab === 'whatsapp' ? 'rgba(245, 158, 11, 0.14)' : 'transparent',
                  color: activeTab === 'whatsapp' ? '#F59E0B' : '#9CA3AF',
                  fontSize: '0.8rem',
                  fontWeight: activeTab === 'whatsapp' ? 800 : 600,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <MessageSquare style={{ width: '1.05rem', height: '1.05rem', color: '#10B981' }} />
                  <span>WhatsApp & Disparos</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#10B981',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '0.35rem'
                  }}>
                    Anti-Ban
                  </span>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                </div>
              </button>

              <button
                onClick={() => setActiveTab('plano_saas')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.75rem',
                  border: activeTab === 'plano_saas' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid transparent',
                  backgroundColor: activeTab === 'plano_saas' ? 'rgba(245, 158, 11, 0.14)' : 'transparent',
                  color: activeTab === 'plano_saas' ? '#F59E0B' : '#9CA3AF',
                  fontSize: '0.8rem',
                  fontWeight: activeTab === 'plano_saas' ? 800 : 600,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <CreditCard style={{ width: '1.05rem', height: '1.05rem', color: activeTab === 'plano_saas' ? '#F59E0B' : '#6B7280' }} />
                  <span>Plano & Assinatura</span>
                </div>
                {barbearia?.status_assinatura === 'ativo' ? (
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#10B981' }}>ATIVO</span>
                ) : (
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#EF4444' }}>PENDENTE</span>
                )}
              </button>

              {/* Acesso Direto à Vitrine Pública */}
              {barbearia && (
                <button
                  onClick={() => {
                    if (onOpenVitrine) {
                      onOpenVitrine(barbearia.slug);
                    } else {
                      window.history.pushState({}, '', `/b/${barbearia.slug}`);
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '0.75rem',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    color: '#38BDF8',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginTop: '0.25rem'
                  }}
                  title="Abrir Vitrine Pública Online em /b/:slug"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <ExternalLink style={{ width: '1.05rem', height: '1.05rem' }} />
                    <span>Ver Vitrine Pública</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: '#6B7280' }}>/b/{barbearia.slug}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé da Sidebar: Usuário & Logout */}
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.07)',
          backgroundColor: '#090D16',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
            <div style={{
              width: '2.1rem',
              height: '2.1rem',
              borderRadius: '50%',
              backgroundColor: '#1E293B',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: 800,
              color: '#F59E0B',
              flexShrink: 0
            }}>
              {user.nome ? user.nome.slice(0, 2).toUpperCase() : 'NB'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.nome || 'Barbeiro'}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#6B7280', textTransform: 'capitalize' }}>
                {user.papel || 'Gestor'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {user.papel === 'superadmin' && onOpenSuperAdmin && (
              <button
                onClick={onOpenSuperAdmin}
                title="SuperAdmin BI"
                style={{
                  padding: '0.45rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#1E293B',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#F59E0B',
                  cursor: 'pointer'
                }}
              >
                <ShieldCheck style={{ width: '1rem', height: '1rem' }} />
              </button>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                title="Sair da Conta"
                style={{
                  padding: '0.45rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#1E293B',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#EF4444',
                  cursor: 'pointer'
                }}
              >
                <LogOut style={{ width: '1rem', height: '1rem' }} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* =========================================================================
          3. ÁREA PRINCIPAL DO DASHBOARD
          ========================================================================= */}
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '1.75rem 2.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* 3. CABEÇALHO & SELETOR DE DATAS */}
        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Controle da Barbearia
              </h1>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 6px #10B981' }} />
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#34D399' }}>Sistema Ativo</span>
              </div>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#9CA3AF' }}>
              Gestão operacional de cortes, barbas, comandas e fluxo financeiro em tempo real.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <div style={{
              backgroundColor: '#121827',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '0.85rem',
              padding: '0.55rem 0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.82rem',
              color: '#D1D5DB',
              fontWeight: 700
            }}>
              <CalendarDays style={{ width: '1rem', height: '1rem', color: '#F59E0B' }} />
              <span>{formattedDateTitle}</span>
            </div>

            <button
              onClick={() => handleOpenNewAppointment()}
              style={{
                backgroundColor: '#F59E0B',
                color: '#0B0F19',
                border: 'none',
                borderRadius: '0.85rem',
                padding: '0.6rem 1.25rem',
                fontSize: '0.82rem',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <Plus style={{ width: '1.05rem', height: '1.05rem', strokeWidth: 3 }} />
              <span>Novo Agendamento</span>
            </button>
          </div>
        </header>

        {/* SE FOR UMA ABA SECUNDÁRIA (Clube VIP, WhatsApp, Produtos, etc.), RENDERIZA O RESPECTIVO GERENCIADOR */}
        {activeTab === 'servicos' && barbearia && (
          <div style={{ backgroundColor: '#121827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '1.25rem', padding: '1.5rem' }}>
            <ServicosManager barbearia={barbearia} onServicesChanged={() => { loadBaseData(); }} />
          </div>
        )}

        {activeTab === 'profissionais' && barbearia && (
          <div style={{ backgroundColor: '#121827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '1.25rem', padding: '1.5rem' }}>
            <ProfissionaisManager barbearia={barbearia} servicesList={servicesList} />
          </div>
        )}

        {activeTab === 'produtos' && barbearia && (
          <div style={{ backgroundColor: '#121827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '1.25rem', padding: '1.5rem' }}>
            <ProdutosManager barbearia={barbearia} servicesList={servicesList} profissionaisList={profissionaisList} onProductsChanged={() => { loadBaseData(); }} />
          </div>
        )}

        {activeTab === 'clube_vip' && barbearia && (
          <div style={{ backgroundColor: '#121827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '1.25rem', padding: '1.5rem' }}>
            <ClubeVipManager barbearia={barbearia} servicesList={servicesList} profissionaisList={profissionaisList} />
          </div>
        )}

        {activeTab === 'whatsapp' && barbearia && (
          <div style={{ backgroundColor: '#121827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '1.25rem', padding: '1.5rem' }}>
            <WhatsAppManager barbearia={barbearia} onBarbeariaUpdated={b => { setBarbearia(b); onBarbeariaUpdated?.(b); }} />
          </div>
        )}

        {activeTab === 'relatorios' && barbearia && (
          <div style={{ backgroundColor: '#121827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '1.25rem', padding: '1.5rem' }}>
            <RelatoriosManager barbearia={barbearia} profissionaisList={profissionaisList} />
          </div>
        )}

        {activeTab === 'plano_saas' && barbearia && (
          <div style={{ backgroundColor: '#121827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '1.25rem', padding: '1.5rem' }}>
            <PlanoAssinaturaManager user={user} barbearia={barbearia} onBarbeariaUpdated={b => { setBarbearia(b); if (onBarbeariaUpdated) onBarbeariaUpdated(b); }} />
          </div>
        )}

        {/* SE FOR A ABA PRINCIPAL: AGENDA OU COMANDAS */}
        {(activeTab === 'agenda' || activeTab === 'comandas') && (
          <>
            {/* CARROSSEL HORIZONTAL DE DATAS COM PÍLULAS COMPACTAS */}
            <div style={{
              backgroundColor: '#121827',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '1.15rem',
              padding: '0.65rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              overflowX: 'auto',
              scrollbarWidth: 'none'
            }}>
              {carouselDates.map(item => {
                const isSelected = selectedDate === item.iso;
                return (
                  <button
                    key={item.iso}
                    onClick={() => setSelectedDate(item.iso)}
                    style={{
                      minWidth: '70px',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '0.85rem',
                      backgroundColor: isSelected ? '#F59E0B' : '#0F1523',
                      color: isSelected ? '#0B0F19' : '#9CA3AF',
                      border: isSelected ? 'none' : '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      flexShrink: 0
                    }}
                  >
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 900,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      color: isSelected ? '#0B0F19' : item.isToday ? '#F59E0B' : '#9CA3AF'
                    }}>
                      {item.label}
                    </span>
                    <span style={{
                      fontSize: '1.05rem',
                      fontWeight: 900,
                      marginTop: '2px',
                      color: isSelected ? '#0B0F19' : '#ffffff'
                    }}>
                      {item.diaNumero}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 4. CARTÕES DE KPI (GRELHA DE 4 MÉTRICAS DO DIA) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>

              {/* KPI 1: Atendimentos */}
              <div style={{
                backgroundColor: '#121827',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '1.15rem',
                padding: '1.15rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    ATENDIMENTOS
                  </span>
                  <div style={{ width: '2rem', height: '2rem', borderRadius: '0.55rem', backgroundColor: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
                    <CalendarCheck2 style={{ width: '1.1rem', height: '1.1rem' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff' }}>
                    {kpis.total}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>agendados</span>
                </div>
                {/* Barra de progresso */}
                <div style={{ width: '100%', height: '6px', backgroundColor: '#1F2937', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ width: `${kpis.taxaConclusao}%`, height: '100%', backgroundColor: '#10B981', transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700 }}>
                  {kpis.concluidos} concluídos ({kpis.taxaConclusao}%) • {kpis.pendentes} pendentes
                </div>
              </div>

              {/* KPI 2: Faturamento */}
              <div style={{
                backgroundColor: '#121827',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '1.15rem',
                padding: '1.15rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    FATURAMENTO DO DIA
                  </span>
                  <div style={{ width: '2rem', height: '2rem', borderRadius: '0.55rem', backgroundColor: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                    <DollarSign style={{ width: '1.1rem', height: '1.1rem' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff' }}>
                    R$ {kpis.faturamentoTotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#10B981', fontWeight: 800 }}>
                  <CheckCircle2 style={{ width: '0.85rem', height: '0.85rem' }} />
                  <span>R$ {kpis.faturamentoRecebido.toFixed(2).replace('.', ',')} recebidos</span>
                </div>
              </div>

              {/* KPI 3: Ticket Médio */}
              <div style={{
                backgroundColor: '#121827',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '1.15rem',
                padding: '1.15rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    TICKET MÉDIO
                  </span>
                  <div style={{ width: '2rem', height: '2rem', borderRadius: '0.55rem', backgroundColor: 'rgba(56, 189, 248, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8' }}>
                    <TrendingUp style={{ width: '1.1rem', height: '1.1rem' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff' }}>
                    R$ {kpis.ticketMedio.toFixed(2).replace('.', ',')}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>/ cliente</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#38BDF8', fontWeight: 700 }}>
                  <Clock style={{ width: '0.85rem', height: '0.85rem' }} />
                  <span>{kpis.tempoMedioMinutos} min duração média</span>
                </div>
              </div>

              {/* KPI 4: Faltas / Cancelamentos */}
              <div style={{
                backgroundColor: '#121827',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '1.15rem',
                padding: '1.15rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    FALTAS & CANCELAMENTOS
                  </span>
                  <div style={{ width: '2rem', height: '2rem', borderRadius: '0.55rem', backgroundColor: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                    <AlertTriangle style={{ width: '1.1rem', height: '1.1rem' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.75rem', fontWeight: 900, color: kpis.cancelados > 0 ? '#EF4444' : '#ffffff' }}>
                    {kpis.cancelados}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>cancelados</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: kpis.cancelados > 0 ? '#EF4444' : '#9CA3AF', fontWeight: 700 }}>
                  {kpis.taxaCancelamento}% de perda sobre a grade
                </div>
              </div>

            </div>

            {/* 5. BARRA DE PESQUISA E FILTROS */}
            <div style={{
              backgroundColor: '#121827',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '1.15rem',
              padding: '0.85rem 1.15rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              {/* Input de Busca */}
              <div style={{ position: 'relative', flex: '1 1 260px' }}>
                <Search style={{
                  position: 'absolute',
                  left: '0.9rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '1rem',
                  height: '1rem',
                  color: '#6B7280'
                }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar agendamento por cliente, serviço ou telefone..."
                  style={{
                    width: '100%',
                    backgroundColor: '#0C121E',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '0.75rem',
                    padding: '0.55rem 0.85rem 0.55rem 2.4rem',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Selects de Filtros */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                {/* Filtro por Profissional */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <User style={{ width: '0.9rem', height: '0.9rem', color: '#9CA3AF' }} />
                  <select
                    value={filterBarbeiroId}
                    onChange={e => setFilterBarbeiroId(e.target.value)}
                    style={{
                      backgroundColor: '#0C121E',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '0.75rem',
                      padding: '0.55rem 0.85rem',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="todos">Todos os Barbeiros</option>
                    {profissionaisList.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Filtro por Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Filter style={{ width: '0.9rem', height: '0.9rem', color: '#9CA3AF' }} />
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    style={{
                      backgroundColor: '#0C121E',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '0.75rem',
                      padding: '0.55rem 0.85rem',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="confirmado">Confirmados</option>
                    <option value="pendente">Pendentes</option>
                    <option value="concluido">Concluídos</option>
                    <option value="cancelado">Cancelados</option>
                  </select>
                </div>

                {/* Alternador de Visão Cards / Grade */}
                <div style={{ display: 'flex', backgroundColor: '#0C121E', borderRadius: '0.75rem', padding: '0.2rem', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <button
                    onClick={() => setViewMode('cards')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.55rem',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: viewMode === 'cards' ? '#F59E0B' : 'transparent',
                      color: viewMode === 'cards' ? '#0B0F19' : '#9CA3AF',
                      cursor: 'pointer'
                    }}
                  >
                    Cards
                  </button>
                  <button
                    onClick={() => setViewMode('grade')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.55rem',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: viewMode === 'grade' ? '#F59E0B' : 'transparent',
                      color: viewMode === 'grade' ? '#0B0F19' : '#9CA3AF',
                      cursor: 'pointer'
                    }}
                  >
                    Grade
                  </button>
                </div>
              </div>
            </div>

            {/* LISTAGEM DE AGENDAMENTOS */}
            {loadingAgenda ? (
              <div style={{
                backgroundColor: '#121827',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '1.25rem',
                padding: '3rem',
                textAlign: 'center',
                color: '#9CA3AF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.65rem'
              }}>
                <RefreshCw className="animate-spin" style={{ width: '1.2rem', height: '1.2rem', color: '#F59E0B' }} />
                <span>Atualizando agendamentos da barbearia...</span>
              </div>
            ) : filteredAgendamentos.length === 0 ? (
              /* ESTADO VAZIO ELEGANTE */
              <div style={{
                backgroundColor: '#121827',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '1.25rem',
                padding: '3.5rem 2rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.95rem'
              }}>
                <div style={{
                  width: '3.8rem',
                  height: '3.8rem',
                  borderRadius: '1rem',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#F59E0B'
                }}>
                  <CalendarDays style={{ width: '1.8rem', height: '1.8rem' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                    Nenhum agendamento encontrado
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#6B7280', maxWidth: '380px' }}>
                    Não há cortes ou atendimentos para a data ou filtros selecionados. Você pode registrar um atendimento manual agora mesmo.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenNewAppointment()}
                  style={{
                    backgroundColor: '#F59E0B',
                    color: '#0B0F19',
                    border: 'none',
                    borderRadius: '0.75rem',
                    padding: '0.6rem 1.25rem',
                    fontSize: '0.8rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)'
                  }}
                >
                  <Plus style={{ width: '1rem', height: '1rem', strokeWidth: 3 }} />
                  <span>Criar Novo Agendamento</span>
                </button>
              </div>
            ) : viewMode === 'cards' ? (
              /* MODO CARDS */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filteredAgendamentos.map(ag => {
                  const barber = getBarber(ag.barbeiro_id);
                  const statusStyle = getStatusBadge(ag.status);
                  const isVip = ag.observacoes?.includes('Clube VIP');

                  return (
                    <div
                      key={ag.id}
                      style={{
                        backgroundColor: '#121827',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '1.15rem',
                        padding: '1rem 1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        transition: 'border-color 0.15s ease'
                      }}
                    >
                      {/* Horário & Barbeiro */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '220px' }}>
                        <div style={{
                          backgroundColor: '#0C121E',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '0.85rem',
                          padding: '0.55rem 0.85rem',
                          textAlign: 'center',
                          flexShrink: 0
                        }}>
                          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff', fontFamily: 'monospace' }}>
                            {ag.horario}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#F59E0B', fontWeight: 700 }}>
                            {ag.duracao_total_minutos} min
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <div style={{
                              width: '1.8rem',
                              height: '1.8rem',
                              borderRadius: '50%',
                              backgroundColor: '#1E293B',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.7rem',
                              color: '#F59E0B'
                            }}>
                              {barber?.nome?.slice(0, 2).toUpperCase() || 'BB'}
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff' }}>
                              {barber?.nome || 'Profissional'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '2px' }}>
                            {barber?.apelido ? `"${barber.apelido}"` : 'Barbeiro da Casa'}
                          </div>
                        </div>
                      </div>

                      {/* Cliente & Serviços */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                            {ag.cliente_nome}
                          </span>
                          {isVip && (
                            <span style={{
                              fontSize: '0.62rem',
                              fontWeight: 900,
                              backgroundColor: 'rgba(245, 158, 11, 0.15)',
                              color: '#F59E0B',
                              border: '1px solid rgba(245, 158, 11, 0.35)',
                              padding: '0.1rem 0.45rem',
                              borderRadius: '0.35rem'
                            }}>
                              👑 CLUBE VIP
                            </span>
                          )}
                          <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                            • {ag.cliente_telefone}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {getServiceNames(ag.servicos_ids)}
                        </div>
                      </div>

                      {/* Valor & Status Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1rem', fontWeight: 900, color: ag.valor_total === 0 ? '#10B981' : '#ffffff' }}>
                            {ag.valor_total === 0 ? 'R$ 0,00 (VIP)' : `R$ ${ag.valor_total.toFixed(2).replace('.', ',')}`}
                          </div>
                          <span style={{
                            display: 'inline-block',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '0.35rem',
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color,
                            border: statusStyle.border,
                            marginTop: '2px'
                          }}>
                            {statusStyle.label}
                          </span>
                        </div>

                        {/* Ações Rápidas */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          {ag.status !== 'concluido' && ag.status !== 'cancelado' && (
                            <button
                              onClick={() => handleOpenFechoComanda(ag)}
                              title="Fechar Comanda / Pagamento"
                              style={{
                                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                color: '#10B981',
                                padding: '0.45rem 0.75rem',
                                borderRadius: '0.65rem',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}
                            >
                              <Receipt style={{ width: '0.85rem', height: '0.85rem' }} />
                              <span>Comanda</span>
                            </button>
                          )}

                          {ag.status === 'pendente' && (
                            <button
                              onClick={() => handleUpdateStatus(ag.id, 'confirmado')}
                              title="Confirmar Agendamento"
                              style={{
                                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                border: '1px solid rgba(245, 158, 11, 0.35)',
                                color: '#F59E0B',
                                padding: '0.45rem',
                                borderRadius: '0.65rem',
                                cursor: 'pointer'
                              }}
                            >
                              <Check style={{ width: '0.9rem', height: '0.9rem' }} />
                            </button>
                          )}

                          {ag.status !== 'cancelado' && ag.status !== 'concluido' && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Cancelar agendamento de "${ag.cliente_nome}"?`)) {
                                  handleUpdateStatus(ag.id, 'cancelado');
                                }
                              }}
                              title="Cancelar Agendamento"
                              style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                color: '#EF4444',
                                padding: '0.45rem',
                                borderRadius: '0.65rem',
                                cursor: 'pointer'
                              }}
                            >
                              <Ban style={{ width: '0.9rem', height: '0.9rem' }} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* MODO GRADE HORÁRIA / TIMELINE */
              <div style={{
                backgroundColor: '#121827',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '1.25rem',
                overflowX: 'auto',
                padding: '1.25rem'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `90px repeat(${profissionaisList.length || 1}, minmax(280px, 1fr))`,
                  gap: '0.85rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  paddingBottom: '0.85rem'
                }}>
                  <div style={{ color: '#6B7280', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                    Horário
                  </div>
                  {profissionaisList.map(barber => (
                    <div key={barber.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '50%',
                        backgroundColor: '#F59E0B',
                        color: '#0B0F19',
                        fontWeight: 900,
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {barber.nome.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff' }}>{barber.nome}</div>
                        <div style={{ fontSize: '0.68rem', color: '#6B7280' }}>{barber.apelido || barber.tipo_atendimento}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {generateDayTimeSlots(DEFAULT_OPENING_TIME, DEFAULT_CLOSING_TIME, 30).map(slotTime => (
                    <div
                      key={slotTime}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `90px repeat(${profissionaisList.length || 1}, minmax(280px, 1fr))`,
                        gap: '0.85rem',
                        padding: '0.45rem 0',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.03)'
                      }}
                    >
                      <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#9CA3AF', fontWeight: 700 }}>
                        {slotTime}
                      </div>

                      {profissionaisList.map(barber => {
                        const barberSlots = buildBarberDailyTimeline({
                          barbeiroId: barber.id,
                          agendamentos,
                          bloqueios
                        });
                        const slot = barberSlots.find(s => s.horario === slotTime);

                        if (!slot || slot.tipo === 'livre') {
                          return (
                            <button
                              key={barber.id}
                              onClick={() => handleOpenNewAppointment(barber.id, slotTime)}
                              style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                border: '1px dashed rgba(255, 255, 255, 0.08)',
                                borderRadius: '0.65rem',
                                padding: '0.35rem 0.65rem',
                                color: '#6B7280',
                                fontSize: '0.72rem',
                                textAlign: 'left',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              + Livre
                            </button>
                          );
                        }

                        if (slot.tipo === 'bloqueio') {
                          return (
                            <div
                              key={barber.id}
                              style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '0.65rem',
                                padding: '0.35rem 0.65rem',
                                color: '#F87171',
                                fontSize: '0.72rem',
                                fontWeight: 700
                              }}
                            >
                              🔒 {slot.motivo || 'Bloqueado'}
                            </div>
                          );
                        }

                        // Agendamento Ocupado
                        const ag = slot.agendamento;
                        return (
                          <div
                            key={barber.id}
                            onClick={() => ag && handleOpenFechoComanda(ag)}
                            style={{
                              backgroundColor: 'rgba(245, 158, 11, 0.15)',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              borderRadius: '0.65rem',
                              padding: '0.35rem 0.65rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                          >
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ffffff' }}>
                              ✂️ {slot.clienteNome}
                            </span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#F59E0B' }}>
                              R$ {ag?.valor_total?.toFixed(0) || 0}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* =========================================================================
          MODAIS INTEGRADOS (Novo Agendamento, Bloqueio, Fechamento de Comanda)
          ========================================================================= */}

      {/* MODAL 1: NOVO AGENDAMENTO */}
      {isAppointmentModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#121827',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '1.5rem',
            width: '100%',
            maxWidth: '520px',
            padding: '1.5rem',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.6)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#ffffff' }}>
                  Novo Agendamento
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#9CA3AF' }}>
                  Data: {selectedDate.split('-').reverse().join('/')}
                </p>
              </div>
              <button
                onClick={() => setIsAppointmentModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Seleção do Barbeiro */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#D1D5DB', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Profissional *
                </label>
                <select
                  value={formBarbeiroId}
                  onChange={e => setFormBarbeiroId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    backgroundColor: '#0C121E',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    color: '#ffffff',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="">Selecione o Barbeiro</option>
                  {profissionaisList.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              {/* Seleção de Serviços */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#D1D5DB', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Serviços * ({formTotals.duracaoTotalMinutos} min • R$ {formTotals.valorTotal.toFixed(2)})
                </label>
                <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', backgroundColor: '#0C121E', padding: '0.6rem', borderRadius: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  {servicesList.map(srv => {
                    const isChecked = formSelectedServices.includes(srv.id);
                    return (
                      <label key={srv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#ffffff', cursor: 'pointer', padding: '0.35rem', borderRadius: '0.45rem', backgroundColor: isChecked ? 'rgba(245, 158, 11, 0.1)' : 'transparent' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setFormSelectedServices(formSelectedServices.filter(id => id !== srv.id));
                              } else {
                                setFormSelectedServices([...formSelectedServices, srv.id]);
                              }
                            }}
                          />
                          <span>{srv.nome}</span>
                        </div>
                        <span style={{ color: '#F59E0B', fontWeight: 800 }}>R$ {srv.preco.toFixed(2)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Horário */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#D1D5DB', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Horário de Início *
                </label>
                <input
                  type="time"
                  value={formHorario}
                  onChange={e => setFormHorario(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    backgroundColor: '#0C121E',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    color: '#ffffff',
                    fontSize: '0.85rem'
                  }}
                />
                {!slotValidation.valido && (
                  <div style={{ fontSize: '0.72rem', color: '#EF4444', marginTop: '4px' }}>
                    ⚠️ {slotValidation.motivo}
                  </div>
                )}
              </div>

              {/* Dados do Cliente */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#D1D5DB', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Telefone (WhatsApp) *
                </label>
                <input
                  type="text"
                  value={formClienteTelefone}
                  onChange={e => setFormClienteTelefone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  required
                  style={{
                    width: '100%',
                    backgroundColor: '#0C121E',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    color: '#ffffff',
                    fontSize: '0.85rem'
                  }}
                />
                {formSearchingVip && (
                  <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>Verificando Clube VIP...</span>
                )}
                {formVipResult?.elegivel && (
                  <div style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 800, marginTop: '4px' }}>
                    👑 Assinante VIP Identificado! Desconto de R$ {formTotals.descontoVip.toFixed(2)} aplicado.
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#D1D5DB', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  value={formClienteNome}
                  onChange={e => setFormClienteNome(e.target.value)}
                  placeholder="Nome completo"
                  required
                  style={{
                    width: '100%',
                    backgroundColor: '#0C121E',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    color: '#ffffff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              {/* Botões do Modal */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAppointmentModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '0.75rem',
                    backgroundColor: '#1F2937',
                    color: '#9CA3AF',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAppointment || !slotValidation.valido}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '0.75rem',
                    backgroundColor: savingAppointment || !slotValidation.valido ? '#4B5563' : '#F59E0B',
                    color: '#0B0F19',
                    border: 'none',
                    fontWeight: 900,
                    cursor: savingAppointment || !slotValidation.valido ? 'not-allowed' : 'pointer'
                  }}
                >
                  {savingAppointment ? 'Salvando...' : 'Confirmar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BLOQUEAR HORÁRIO / ALMOÇO */}
      {isBlockModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#121827',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '1.5rem',
            width: '100%',
            maxWidth: '460px',
            padding: '1.5rem',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.6)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ padding: '0.55rem', borderRadius: '0.65rem', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>
                  <Lock style={{ width: '1.1rem', height: '1.1rem' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#ffffff' }}>
                    Bloquear Horário / Almoço
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#9CA3AF' }}>
                    Data: {selectedDate.split('-').reverse().join('/')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBlockModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBlock} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#D1D5DB', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Barbeiro Afetado
                </label>
                <select
                  value={formBlockBarbeiroId}
                  onChange={e => setFormBlockBarbeiroId(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#0C121E',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    color: '#ffffff',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="todos">Todos os Profissionais da Barbearia</option>
                  {profissionaisList.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#D1D5DB', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Início do Bloqueio *
                  </label>
                  <input
                    type="time"
                    value={formBlockInicio}
                    onChange={e => setFormBlockInicio(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      backgroundColor: '#0C121E',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.75rem',
                      padding: '0.65rem 0.85rem',
                      color: '#ffffff',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#D1D5DB', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Fim do Bloqueio *
                  </label>
                  <input
                    type="time"
                    value={formBlockFim}
                    onChange={e => setFormBlockFim(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      backgroundColor: '#0C121E',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.75rem',
                      padding: '0.65rem 0.85rem',
                      color: '#ffffff',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#D1D5DB', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Motivo do Bloqueio
                </label>
                <input
                  type="text"
                  value={formBlockMotivo}
                  onChange={e => setFormBlockMotivo(e.target.value)}
                  placeholder="Ex.: Intervalo de Almoço, Treinamento, Manutenção"
                  required
                  style={{
                    width: '100%',
                    backgroundColor: '#0C121E',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    color: '#ffffff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsBlockModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '0.75rem',
                    backgroundColor: '#1F2937',
                    color: '#9CA3AF',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingBlock}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '0.75rem',
                    backgroundColor: '#F59E0B',
                    color: '#0B0F19',
                    border: 'none',
                    fontWeight: 900,
                    cursor: savingBlock ? 'not-allowed' : 'pointer'
                  }}
                >
                  {savingBlock ? 'Gravando...' : 'Salvar Bloqueio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: FECHAMENTO DE COMANDA / PDV */}
      {isComandaModalOpen && selectedComandaAgendamento && barbearia && (
        <FechamentoComandaModal
          isOpen={isComandaModalOpen}
          onClose={() => {
            setIsComandaModalOpen(false);
            setSelectedComandaAgendamento(null);
          }}
          onSuccess={async () => {
            setIsComandaModalOpen(false);
            setSelectedComandaAgendamento(null);
            await loadDayAgenda();
          }}
          barbeariaId={barbearia.id}
          agendamento={selectedComandaAgendamento}
          servicesList={servicesList}
          profissionaisList={profissionaisList}
          produtosList={produtosList}
        />
      )}
    </div>
  );
};

