import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Clock,
  User,
  Users,
  Scissors,
  Plus,
  Lock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Phone,
  Trash2,
  Check,
  Ban,
  Sparkles,
  Crown
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  Barbearia,
  Profissional,
  Servico,
  Agendamento,
  BloqueioHorario,
  Produto,
  agendamentosService,
  bloqueiosService,
  produtosService,
  Cliente,
  PlanoAssinatura,
  ValidacaoVipResult,
  validarElegibilidadeVip,
  clientesService,
  planosService,
  pb,
} from '../services/pocketbase';
import { FechamentoComandaModal } from './FechamentoComandaModal';
import {
  buildBarberDailyTimeline,
  validateContiguousSlots,
  calculateServicesTotals,
  generateDayTimeSlots,
  timeToMinutes,
  minutesToTime,
  DEFAULT_OPENING_TIME,
  DEFAULT_CLOSING_TIME,
  DEFAULT_SLOT_INTERVAL_MINUTES
} from '../services/slotEngine';

// ===== Constantes e helpers de apresentação (layout Dark Glassmorphism) =====
const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DIAS_SEMANA_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_SEMANA_INICIAIS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

// Formata uma data local como YYYY-MM-DD (sem conversão para UTC)
const toLocalDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getInitials = (nome: string) => {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatBRL = (valor: number) =>
  (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_UI: Record<Agendamento['status'], { label: string; border: string; badge: string }> = {
  pendente: { label: 'Pendente', border: 'border-l-amber-400', badge: 'text-amber-400 bg-amber-400/10' },
  confirmado: { label: 'Confirmado', border: 'border-l-orange-500', badge: 'text-orange-400 bg-orange-400/10' },
  em_andamento: { label: 'Em Andamento', border: 'border-l-blue-500', badge: 'text-blue-400 bg-blue-400/10' },
  concluido: { label: 'Concluído', border: 'border-l-emerald-500', badge: 'text-emerald-400 bg-emerald-400/10' },
  cancelado: { label: 'Cancelado', border: 'border-l-zinc-600', badge: 'text-zinc-400 bg-zinc-400/10' }
};

const GLASS_CARD = 'rounded-[2rem] backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-xl';

interface AgendaManagerProps {
  barbearia: Barbearia;
  profissionaisList: Profissional[];
  servicesList: Servico[];
  onAppointmentsCountChanged?: (count: number) => void;
}

export const AgendaManager: React.FC<AgendaManagerProps> = ({
  barbearia,
  profissionaisList,
  servicesList,
  onAppointmentsCountChanged
}) => {
  // Estado da data selecionada (formato YYYY-MM-DD)
  // Usa a data local (evita "saltar" para o dia seguinte à noite por causa do UTC)
  const getTodayStr = () => toLocalDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());

  // Barbeiro selecionado ('todos' ou id do barbeiro)
  const [selectedBarbeiroId, setSelectedBarbeiroId] = useState<string>('todos');

  // Dados carregados do PocketBase
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [bloqueios, setBloqueios] = useState<BloqueioHorario[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estados de Modais
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState<boolean>(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState<boolean>(false);
  const [isComandaModalOpen, setIsComandaModalOpen] = useState<boolean>(false);
  const [selectedComandaAgendamento, setSelectedComandaAgendamento] = useState<Agendamento | null>(null);
  const [produtosList, setProdutosList] = useState<Produto[]>([]);

  // Formulário de Novo Agendamento
  const [formBarbeiroId, setFormBarbeiroId] = useState<string>('');
  const [formSelectedServices, setFormSelectedServices] = useState<string[]>([]);
  const [formHorario, setFormHorario] = useState<string>('09:00');
  const [formClienteNome, setFormClienteNome] = useState<string>('');
  const [formClienteTelefone, setFormClienteTelefone] = useState<string>('');
  const [formObservacoes, setFormObservacoes] = useState<string>('');
  const [savingAppointment, setSavingAppointment] = useState<boolean>(false);

  // Estados de Validação do Clube VIP no Agendamento
  const [formClienteVip, setFormClienteVip] = useState<Cliente | null>(null);
  const [formPlanoVip, setFormPlanoVip] = useState<PlanoAssinatura | null>(null);
  const [formVipResult, setFormVipResult] = useState<ValidacaoVipResult | null>(null);
  const [formSearchingVip, setFormSearchingVip] = useState<boolean>(false);

  // Formulário de Bloqueio de Horário
  const [formBlockBarbeiroId, setFormBlockBarbeiroId] = useState<string>('todos');
  const [formBlockInicio, setFormBlockInicio] = useState<string>('12:00');
  const [formBlockFim, setFormBlockFim] = useState<string>('13:00');
  const [formBlockMotivo, setFormBlockMotivo] = useState<string>('Intervalo de Almoço');
  const [savingBlock, setSavingBlock] = useState<boolean>(false);

  // Carregar dados de agendamentos e bloqueios
  const loadDayData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [agList, blList] = await Promise.all([
        agendamentosService.list(barbearia.id, selectedDate),
        bloqueiosService.list(barbearia.id, selectedDate)
      ]);
      setAgendamentos(agList);
      setBloqueios(blList);
      if (onAppointmentsCountChanged) {
        onAppointmentsCountChanged(agList.length);
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados da agenda:', err);
      setErrorMsg('Falha ao comunicar com o PocketBase para carregar a agenda.');
    } finally {
      setLoading(false);
    }
  }, [barbearia.id, selectedDate, onAppointmentsCountChanged]);

  // Carrega produtos disponíveis para a comanda
  const loadProdutos = useCallback(async () => {
    try {
      const prods = await produtosService.list(barbearia.id);
      setProdutosList(prods);
    } catch (err) {
      console.error('Erro ao carregar produtos para a comanda:', err);
    }
  }, [barbearia.id]);

  useEffect(() => {
    loadDayData();
    loadProdutos();

    // Inscrição em tempo real para refletir agendamentos da vitrine instantaneamente
    let unsubscribe: (() => void) | undefined;
    pb.collection('agendamentos').subscribe('*', () => {
      loadDayData();
    }).then((unsub) => {
      unsubscribe = unsub;
    }).catch((err) => {
      console.warn('Falha ao registrar listener em tempo real de agendamentos:', err);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      } else {
        pb.collection('agendamentos').unsubscribe('*').catch(() => {});
      }
    };
  }, [loadDayData, loadProdutos]);

  const handleOpenFechoComanda = (ag: Agendamento) => {
    setSelectedComandaAgendamento(ag);
    setIsComandaModalOpen(true);
  };

  // Navegação de dias
  const handleShiftDate = (days: number) => {
    const current = new Date(selectedDate + 'T12:00:00');
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleSetToday = () => {
    setSelectedDate(getTodayStr());
  };

  // Formatação de data amigável em português
  const formattedDateTitle = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Métricas do Dia
  const metrics = useMemo(() => {
    const filteredAg = selectedBarbeiroId === 'todos'
      ? agendamentos
      : agendamentos.filter(a => a.barbeiro_id === selectedBarbeiroId);

    const total = filteredAg.length;
    const confirmados = filteredAg.filter(a => a.status === 'confirmado').length;
    const pendentes = filteredAg.filter(a => a.status === 'pendente').length;
    const concluidos = filteredAg.filter(a => a.status === 'concluido').length;
    const cancelados = filteredAg.filter(a => a.status === 'cancelado').length;

    // Faturamento previsto (apenas não cancelados)
    const faturamentoPrevisto = filteredAg
      .filter(a => a.status !== 'cancelado')
      .reduce((acc, curr) => acc + (curr.valor_total || 0), 0);

    const minutosOcupados = filteredAg
      .filter(a => a.status !== 'cancelado')
      .reduce((acc, curr) => acc + (curr.duracao_total_minutos || 0), 0);

    const horasOcupadas = (minutosOcupados / 60).toFixed(1);

    return { total, confirmados, pendentes, concluidos, cancelados, faturamentoPrevisto, horasOcupadas };
  }, [agendamentos, selectedBarbeiroId]);

  // Lista de barbeiros a exibir na grade
  const displayedBarbers = useMemo(() => {
    if (selectedBarbeiroId === 'todos') {
      return profissionaisList.filter(p => p.ativo);
    }
    return profissionaisList.filter(p => p.id === selectedBarbeiroId && p.ativo);
  }, [profissionaisList, selectedBarbeiroId]);

  // Busca cliente e valida VIP no modal de agendamento
  useEffect(() => {
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
      .then(async (found) => {
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
            barbeiroId: formBarbeiroId,
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
  }, [formClienteTelefone, formBarbeiroId, barbearia.id, selectedDate]);

  // Totais calculados para o modal de agendamento com abatimento VIP
  const formTotals = useMemo(() => {
    const base = calculateServicesTotals(formSelectedServices, servicesList);
    if (formVipResult?.elegivel) {
      let valorCobrado = 0;
      for (const sId of formSelectedServices) {
        const srv = servicesList.find((s) => s.id === sId);
        if (!srv) continue;
        const isCovered =
          (formVipResult.servicosCobertos && formVipResult.servicosCobertos.includes(sId)) ||
          (formVipResult.permiteBarba &&
            (srv.categoria === 'barba' || srv.nome.toLowerCase().includes('barba')));
        if (!isCovered) {
          valorCobrado += srv.preco;
        }
      }
      return {
        ...base,
        valorTotal: valorCobrado,
        descontoVip: base.valorTotal - valorCobrado,
      };
    }
    return {
      ...base,
      descontoVip: 0,
    };
  }, [formSelectedServices, servicesList, formVipResult]);

  // Validação em Tempo Real do Slot no Modal de Agendamento
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

  // Abertura do modal de novo agendamento com pré-preenchimento
  const handleOpenNewAppointment = (defaultBarberId?: string, defaultSlot?: string) => {
    const barberId = defaultBarberId || (profissionaisList.length > 0 ? profissionaisList[0].id : '');
    setFormBarbeiroId(barberId);
    setFormHorario(defaultSlot || '09:00');
    // Pré-seleciona primeiro serviço se houver
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

  // Salvar novo agendamento
  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
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
        observacoes: formObservacoes.trim() || undefined
      });

      setIsAppointmentModalOpen(false);
      await loadDayData();
    } catch (err: any) {
      console.error('Erro ao salvar agendamento:', err);
      alert('Não foi possível salvar o agendamento. Verifique os dados inseridos.');
    } finally {
      setSavingAppointment(false);
    }
  };

  // Salvar bloqueio de horário
  const handleSaveBlock = async (e: React.FormEvent) => {
    e.preventDefault();
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
        motivo: formBlockMotivo.trim() || 'Bloqueio de Horário'
      });

      setIsBlockModalOpen(false);
      await loadDayData();
    } catch (err: any) {
      console.error('Erro ao cadastrar bloqueio:', err);
      alert('Não foi possível criar o bloqueio de horário.');
    } finally {
      setSavingBlock(false);
    }
  };

  // Ações rápidas de status
  const handleUpdateStatus = async (agendamentoId: string, newStatus: Agendamento['status']) => {
    try {
      await agendamentosService.updateStatus(agendamentoId, newStatus);
      await loadDayData();
    } catch (err) {
      console.error('Erro ao alterar status:', err);
      alert('Falha ao atualizar o status do agendamento.');
    }
  };

  // Excluir agendamento
  const handleDeleteAppointment = async (agendamentoId: string, clienteNome: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o agendamento de "${clienteNome}"?`)) return;
    try {
      await agendamentosService.delete(agendamentoId);
      await loadDayData();
    } catch (err) {
      console.error('Erro ao excluir agendamento:', err);
      alert('Falha ao excluir o agendamento.');
    }
  };

  // Excluir bloqueio
  const handleDeleteBlock = async (bloqueioId: string, motivo: string) => {
    if (!window.confirm(`Deseja remover o bloqueio "${motivo}"?`)) return;
    try {
      await bloqueiosService.delete(bloqueioId);
      await loadDayData();
    } catch (err) {
      console.error('Erro ao remover bloqueio:', err);
      alert('Falha ao remover o bloqueio.');
    }
  };

  // Slots padrão de horário
  const daySlots = useMemo(() => generateDayTimeSlots(), []);

  // ===== Estado e derivações exclusivas do layout =====
  const todayStr = getTodayStr();
  const isViewingToday = selectedDate === todayStr;

  // Card de agendamento expandido (mostra ações rápidas)
  const [expandedAgId, setExpandedAgId] = useState<string | null>(null);

  // Mês exibido no mini-calendário
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });

  // Mantém o mini-calendário sincronizado quando a data muda pelas setas
  useEffect(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    setCalendarMonth((prev) =>
      prev.getFullYear() === y && prev.getMonth() === m - 1 ? prev : new Date(y, m - 1, 1)
    );
    setExpandedAgId(null);
  }, [selectedDate]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(toLocalDateStr(new Date(year, month, d)));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendarMonth]);

  const handleShiftCalendarMonth = (delta: number) => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  // Rótulo curto do header: "Hoje, 4 Nov", "Amanhã, 5 Nov", "Sex, 7 Nov"...
  const headerDateLabel = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((dt.getTime() - today.getTime()) / 86400000);
    const base = `${d} ${MESES_CURTOS[m - 1]}`;
    if (diffDays === 0) return `Hoje, ${base}`;
    if (diffDays === 1) return `Amanhã, ${base}`;
    if (diffDays === -1) return `Ontem, ${base}`;
    return `${DIAS_SEMANA_CURTOS[dt.getDay()]}, ${base}${y !== today.getFullYear() ? ` ${y}` : ''}`;
  }, [selectedDate]);

  // Minuto atual (para o indicador de "agora" na linha do tempo)
  const [nowMinutes, setNowMinutes] = useState<number>(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });
  useEffect(() => {
    const id = window.setInterval(() => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    }, 60000);
    return () => window.clearInterval(id);
  }, []);

  // Linha do tempo de cada barbeiro calculada uma única vez por render de dados
  const barberTimelines = useMemo(() => {
    const map: Record<string, ReturnType<typeof buildBarberDailyTimeline>> = {};
    for (const barber of displayedBarbers) {
      map[barber.id] = buildBarberDailyTimeline({ barbeiroId: barber.id, agendamentos, bloqueios });
    }
    return map;
  }, [displayedBarbers, agendamentos, bloqueios]);

  const activeBarbers = useMemo(() => profissionaisList.filter((p) => p.ativo), [profissionaisList]);

  // Abre o modal de bloqueio pré-preenchido a partir de um slot livre
  const handleOpenBlockAt = (slotTime?: string, barberId?: string) => {
    if (slotTime) {
      const startM = timeToMinutes(slotTime);
      const endM = Math.min(startM + 60, timeToMinutes(DEFAULT_CLOSING_TIME));
      setFormBlockInicio(slotTime);
      setFormBlockFim(minutesToTime(endM));
    }
    setFormBlockBarbeiroId(barberId && barberId !== 'todos' ? barberId : 'todos');
    setIsBlockModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-8 w-full h-full animate-in fade-in duration-500 animate-fade-in">

      {/* HEADER DA AGENDA */}
      <header className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-white">Agenda &amp; Grade</h1>
          <p className="text-xs text-zinc-400">Gere os horários e barbeiros da unidade.</p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Botões de navegação de data */}
          <div className="flex items-center p-0.5 rounded-lg backdrop-blur-md bg-white/[0.02] border border-white/[0.05]">
            <button
              type="button"
              onClick={() => handleShiftDate(-1)}
              title="Dia anterior"
              className="p-1.5 text-zinc-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={handleSetToday}
              title={isViewingToday ? formattedDateTitle : `${formattedDateTitle} • clique para voltar a hoje`}
              className="px-3 min-w-[6.5rem] text-center text-xs font-semibold text-white"
            >
              {headerDateLabel}
            </button>
            <button
              type="button"
              onClick={() => handleShiftDate(1)}
              title="Próximo dia"
              className="p-1.5 text-zinc-400 hover:text-white transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => handleOpenNewAppointment(selectedBarbeiroId !== 'todos' ? selectedBarbeiroId : undefined)}
            className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-[0_0_12px_rgba(249,115,22,0.3)] hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            <Plus size={14} /> Novo Agendamento
          </button>
        </div>
      </header>

      {errorMsg && (
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-red-500/[0.06] border border-red-500/20 text-xs text-red-300">
          <AlertCircle size={14} className="shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button type="button" onClick={loadDayData} className="text-xs font-semibold text-red-200 hover:text-white transition-colors">
            Tentar novamente
          </button>
        </div>
      )}

      {/* CORPO DA AGENDA (GRID 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full pb-4">

        {/* COLUNA DE FILTROS E MINI-CALENDÁRIO */}
        <div className="lg:col-span-1 flex flex-col gap-3">

          {/* Mini-calendário mensal */}
          <div className={cn('p-3.5 rounded-xl', GLASS_CARD)}>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-white">Calendário</h3>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => handleShiftCalendarMonth(-1)}
                  title="Mês anterior"
                  className="p-0.5 rounded-md text-zinc-500 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="min-w-[4.2rem] text-center text-[11px] font-semibold text-zinc-300">
                  {MESES_CURTOS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                </span>
                <button
                  type="button"
                  onClick={() => handleShiftCalendarMonth(1)}
                  title="Próximo mês"
                  className="p-0.5 rounded-md text-zinc-500 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-0.5 text-center">
              {DIAS_SEMANA_INICIAIS.map((dia, idx) => (
                <span key={`wd-${idx}`} className="pb-0.5 text-[9px] font-bold uppercase text-zinc-500">
                  {dia}
                </span>
              ))}
              {calendarDays.map((dateStr, idx) => {
                if (!dateStr) return <span key={`empty-${idx}`} className="h-6 w-6" />;
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === todayStr;
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDate(dateStr)}
                    className={cn(
                      'h-6 w-6 mx-auto flex items-center justify-center rounded-md text-[11px] font-medium transition-all',
                      isSelected
                        ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold shadow-[0_0_8px_rgba(249,115,22,0.35)]'
                        : isToday
                          ? 'text-orange-400 bg-orange-500/10 border border-orange-500/20'
                          : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'
                    )}
                  >
                    {Number(dateStr.slice(8))}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filtro de barbeiros */}
          <div className={cn('p-3 rounded-xl', GLASS_CARD)}>
            <h3 className="text-xs font-bold text-white mb-2">Barbeiros</h3>
            <div className="flex flex-col gap-1">
              {[{ id: 'todos', nome: 'Todos os barbeiros' }, ...activeBarbers].map((barber) => {
                const isAll = barber.id === 'todos';
                const isSelected = selectedBarbeiroId === barber.id;
                const count = agendamentos.filter(
                  (a) => a.status !== 'cancelado' && (isAll || a.barbeiro_id === barber.id)
                ).length;
                return (
                  <button
                    key={barber.id}
                    type="button"
                    onClick={() => setSelectedBarbeiroId(barber.id)}
                    className={cn(
                      'flex items-center gap-2 w-full px-2 py-1.5 rounded-lg border transition-colors text-xs font-medium text-left',
                      isSelected
                        ? 'bg-orange-500/10 border-orange-500/20 text-orange-500 font-semibold'
                        : 'border-transparent text-zinc-400 hover:bg-white/[0.04]'
                    )}
                  >
                    <div
                      className={cn(
                        'w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold',
                        isSelected ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-zinc-400'
                      )}
                    >
                      {isAll ? <Users size={12} /> : getInitials(barber.nome)}
                    </div>
                    <span className="flex-1 truncate">{barber.nome}</span>
                    {count > 0 && (
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded-full text-[9px] font-bold',
                          isSelected ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-zinc-500'
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resumo do dia */}
          <div className={cn('p-3 rounded-xl', GLASS_CARD)}>
            <h3 className="text-xs font-bold text-white mb-2">Resumo do Dia</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Agendados', value: String(metrics.total), color: 'text-white' },
                { label: 'Confirmados', value: String(metrics.confirmados), color: 'text-orange-400' },
                { label: 'Ocupação', value: `${metrics.horasOcupadas}h`, color: 'text-white' },
                { label: 'Previsto', value: formatBRL(metrics.faturamentoPrevisto), color: 'text-emerald-400' }
              ].map((item) => (
                <div key={item.label} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[9px] uppercase font-bold tracking-wider text-zinc-500">{item.label}</p>
                  <p className={cn('mt-0.5 text-xs sm:text-sm font-bold truncate', item.color)}>{item.value}</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => handleOpenBlockAt(undefined, selectedBarbeiroId)}
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-white/[0.06] text-xs font-medium text-zinc-400 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/[0.04] transition-colors cursor-pointer"
            >
              <Lock size={12} /> Bloquear Horário
            </button>
          </div>
        </div>

        {/* LINHA DE TEMPO / HORÁRIOS */}
        <div className={cn('lg:col-span-3 p-3.5 sm:p-4 overflow-y-auto custom-scrollbar lg:max-h-[calc(100vh-10rem)] rounded-xl', GLASS_CARD)}>
          {loading ? (
            <div className="min-h-[320px] flex flex-col items-center justify-center gap-3 text-sm text-zinc-500">
              <div className="w-6 h-6 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin" />
              A carregar a grade horária...
            </div>
          ) : displayedBarbers.length === 0 ? (
            <div className="min-h-[320px] flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-zinc-500">
                <Scissors size={20} />
              </div>
              <p className="text-sm text-zinc-400">Nenhum barbeiro ativo para exibir na agenda.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {daySlots.map((slotTime) => {
                const slotStart = timeToMinutes(slotTime);
                const isCurrentSlot =
                  isViewingToday && nowMinutes >= slotStart && nowMinutes < slotStart + DEFAULT_SLOT_INTERVAL_MINUTES;

                const entries = displayedBarbers.map((barber) => ({
                  barber,
                  slot: barberTimelines[barber.id]?.find((s) => s.horario === slotTime)
                }));
                const freeBarbers = entries
                  .filter(({ slot }) => !slot?.bloqueio && !slot?.pertenceAoAgendamentoId)
                  .map(({ barber }) => barber);
                const hasContent = freeBarbers.length < entries.length;

                // Bloqueios gerais ('todos') aparecem uma única vez por slot
                const renderedBlocks = new Set<string>();

                return (
                  <div key={slotTime} className="flex gap-3 items-center group">
                    <div className="w-12 shrink-0 text-right">
                      <span
                        className={cn(
                          'text-xs font-bold transition-colors',
                          isCurrentSlot ? 'text-orange-400' : 'text-zinc-500 group-hover:text-zinc-300'
                        )}
                      >
                        {slotTime}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col gap-1.5 border-l border-white/5 pl-3 pb-1 relative">
                      {/* Indicador da linha do tempo */}
                      {isCurrentSlot ? (
                        <div className="absolute top-1/2 -translate-y-1/2 -left-[4px] w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                      ) : (
                        <div
                          className={cn(
                            'absolute top-1/2 -translate-y-1/2 -left-[3px] w-1.5 h-1.5 rounded-full',
                            hasContent ? 'bg-orange-500/40' : 'bg-white/10'
                          )}
                        />
                      )}

                      {entries.map(({ barber, slot }) => {
                        if (!slot) return null;

                        // 1. Bloqueio de horário
                        if (slot.bloqueio) {
                          const bl = slot.bloqueio;
                          if (renderedBlocks.has(bl.id)) return null;
                          renderedBlocks.add(bl.id);

                          const isBlockStart = slotStart - DEFAULT_SLOT_INTERVAL_MINUTES < timeToMinutes(bl.horario_inicio);
                          const blockOwner =
                            bl.barbeiro_id === 'todos'
                              ? 'Todos os barbeiros'
                              : profissionaisList.find((p) => p.id === bl.barbeiro_id)?.nome || barber.nome;

                          if (!isBlockStart) {
                            return (
                              <div
                                key={`bl-${bl.id}`}
                                className="w-full px-3 py-1 rounded-md bg-red-500/[0.03] border border-red-500/10 text-[11px] italic text-red-300/60 truncate"
                              >
                                ↳ Bloqueado • {bl.motivo}
                              </div>
                            );
                          }

                          return (
                            <div
                              key={`bl-${bl.id}`}
                              className="w-full px-3 py-1.5 rounded-lg bg-red-500/[0.04] bg-[repeating-linear-gradient(135deg,transparent,transparent_10px,rgba(239,68,68,0.04)_10px,rgba(239,68,68,0.04)_20px)] border border-red-500/15 border-l-4 border-l-red-500/70 flex justify-between items-center gap-2 shadow-sm"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 shrink-0 rounded-md bg-red-500/10 flex items-center justify-center text-red-400">
                                  <Lock size={12} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <p className="text-xs font-bold text-red-200 truncate">{bl.motivo}</p>
                                  <p className="text-[10px] text-zinc-400 truncate">
                                    {bl.horario_inicio} – {bl.horario_fim} • {blockOwner}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteBlock(bl.id, bl.motivo)}
                                title="Remover bloqueio"
                                className="p-1 rounded-md text-red-400/70 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          );
                        }

                        // 2. Início de um agendamento
                        if (slot.agendamento) {
                          const ag = slot.agendamento;
                          const ui = STATUS_UI[ag.status] ?? STATUS_UI.pendente;
                          const serviceNames =
                            (ag.servicos_ids || [])
                              .map((id) => servicesList.find((s) => s.id === id)?.nome)
                              .filter(Boolean)
                              .join(' + ') || 'Serviço';
                          const isExpanded = expandedAgId === ag.id;
                          const horarioFim = minutesToTime(timeToMinutes(ag.horario) + (ag.duracao_total_minutos || 0));

                          return (
                            <div
                              key={`ag-${ag.id}`}
                              onClick={() => setExpandedAgId(isExpanded ? null : ag.id)}
                              className={cn(
                                'w-full p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05] border-l-4 hover:bg-white/[0.05] transition-all cursor-pointer flex flex-col gap-2 shadow-sm',
                                ui.border,
                                isExpanded && 'bg-white/[0.05] border-white/[0.08]'
                              )}
                            >
                              <div className="flex justify-between items-center gap-3">
                                <div className="flex flex-col min-w-0">
                                  <p className="text-xs font-bold text-white truncate">{ag.cliente_nome}</p>
                                  <p className="text-[10px] text-zinc-400 truncate">
                                    {serviceNames} • {barber.nome}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs font-bold text-white">{formatBRL(ag.valor_total)}</span>
                                  <span
                                    className={cn(
                                      'text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full',
                                      ui.badge
                                    )}
                                  >
                                    {ui.label}
                                  </span>
                                </div>
                              </div>

                              {isExpanded && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex flex-col gap-2 pt-2 border-t border-white/[0.05] cursor-default"
                                >
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
                                    <span className="flex items-center gap-1">
                                      <Phone size={11} /> {ag.cliente_telefone}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock size={11} /> {ag.horario} – {horarioFim} ({ag.duracao_total_minutos} min)
                                    </span>
                                  </div>
                                  {ag.observacoes && (
                                    <p className="text-[11px] italic text-zinc-400">“{ag.observacoes}”</p>
                                  )}
                                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {ag.status !== 'confirmado' && ag.status !== 'concluido' && (
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateStatus(ag.id, 'confirmado')}
                                          className="flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                                        >
                                          <Check size={11} /> Confirmar
                                        </button>
                                      )}
                                      {ag.status !== 'concluido' && (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenFechoComanda(ag)}
                                          title="Concluir atendimento e abrir o fecho de comanda (PDV)"
                                          className="flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-semibold text-orange-400 bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20 transition-colors cursor-pointer"
                                        >
                                          <Sparkles size={11} /> Concluir (PDV)
                                        </button>
                                      )}
                                      {ag.status !== 'cancelado' && ag.status !== 'concluido' && (
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateStatus(ag.id, 'cancelado')}
                                          className="flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-semibold text-red-400 bg-red-500/10 border-red-500/20 hover:bg-red-500/20 transition-colors cursor-pointer"
                                        >
                                          <Ban size={11} /> Cancelar
                                        </button>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAppointment(ag.id, ag.cliente_nome)}
                                      title="Excluir agendamento"
                                      className="p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-white/[0.04] transition-colors cursor-pointer"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }

                        // 3. Continuação de um agendamento iniciado num slot anterior
                        if (slot.pertenceAoAgendamentoId) {
                          const parent = agendamentos.find((a) => a.id === slot.pertenceAoAgendamentoId);
                          return (
                            <div
                              key={`cont-${barber.id}`}
                              className="w-full px-3 py-1 rounded-md bg-white/[0.015] border border-white/[0.03] text-[11px] italic text-zinc-500 truncate"
                            >
                              ↳ Em atendimento{parent ? `: ${parent.cliente_nome}` : ''} • {barber.nome}
                            </div>
                          );
                        }

                        return null;
                      })}

                      {/* 4. Horário livre */}
                      {!hasContent ? (
                        <div
                          onClick={() => handleOpenNewAppointment(freeBarbers[0]?.id, slotTime)}
                          className="w-full px-3 py-1.5 rounded-lg border border-dashed border-white/10 hover:border-white/20 hover:bg-white/[0.02] transition-all cursor-pointer flex items-center justify-center gap-1.5 h-[34px] text-xs font-medium text-zinc-500"
                        >
                          <span>+</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenBlockAt(slotTime, selectedBarbeiroId);
                            }}
                            className="hover:text-red-400 transition-colors"
                          >
                            Bloquear
                          </button>
                          <span>ou</span>
                          <span className="hover:text-orange-400 transition-colors">Agendar</span>
                        </div>
                      ) : (
                        freeBarbers.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleOpenNewAppointment(freeBarbers[0].id, slotTime)}
                            className="w-full px-3 py-1.5 rounded-lg border border-dashed border-white/[0.06] hover:border-white/20 hover:bg-white/[0.02] text-left text-xs text-zinc-500 hover:text-zinc-300 transition-all truncate h-[34px] flex items-center"
                          >
                            + Agendar com {freeBarbers.map((b) => b.nome.split(' ')[0]).join(', ')}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* 5. Modal de Novo Agendamento com Algoritmo de Slots Contíguos */}
      {isAppointmentModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  Novo Agendamento na Grade
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  Validação automática de slots contíguos em tempo real.
                </p>
              </div>
              <button
                onClick={() => setIsAppointmentModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAppointment} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Seleção de Barbeiro */}
              <div>
                <label className="field-label">Profissional / Barbeiro *</label>
                <select
                  value={formBarbeiroId}
                  onChange={(e) => setFormBarbeiroId(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Selecione um barbeiro...</option>
                  {profissionaisList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} {p.apelido ? `(${p.apelido})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seleção Múltipla de Serviços */}
              <div>
                <label className="field-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Serviços Desejados * (Múltipla Seleção)</span>
                  <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>
                    Duração: {formTotals.duracaoTotalMinutos} min | R$ {formTotals.valorTotal.toFixed(2)}
                  </span>
                </label>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '0.65rem',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  padding: '0.5rem',
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: '0.65rem',
                  border: '1px solid var(--border-subtle)'
                }}>
                  {servicesList.map((serv) => {
                    const isChecked = formSelectedServices.includes(serv.id);
                    return (
                      <label
                        key={serv.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: isChecked ? 'rgba(217, 119, 6, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                          border: isChecked ? '1px solid #fbbf24' : '1px solid var(--border-subtle)',
                          borderRadius: '0.45rem',
                          padding: '0.5rem 0.65rem',
                          cursor: 'pointer',
                          fontSize: '0.82rem'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormSelectedServices([...formSelectedServices, serv.id]);
                            } else {
                              setFormSelectedServices(formSelectedServices.filter(id => id !== serv.id));
                            }
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {serv.nome}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            {serv.duracao_minutos} min • R$ {serv.preco.toFixed(2)}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Data e Horário com Motor de Slots Contíguos */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="field-label">Data do Agendamento *</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="field-label">Horário de Início *</label>
                  <select
                    value={formHorario}
                    onChange={(e) => setFormHorario(e.target.value)}
                    className="input-field"
                    required
                  >
                    {daySlots.map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Feedback em Tempo Real da Validação de Slots Contíguos */}
              <div style={{
                padding: '0.85rem 1rem',
                borderRadius: '0.65rem',
                border: `1px solid ${slotValidation.valido ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                background: slotValidation.valido ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem'
              }}>
                {slotValidation.valido ? (
                  <>
                    <CheckCircle2 style={{ width: '1.15rem', height: '1.15rem', color: '#34d399', flexShrink: 0, marginTop: '0.1rem' }} />
                    <div style={{ fontSize: '0.82rem' }}>
                      <strong style={{ color: '#34d399' }}>Slots Contíguos Livres:</strong> O atendimento iniciará às{' '}
                      <strong>{formHorario}</strong> e terminará às <strong>{slotValidation.horarioFim}</strong> ({formTotals.duracaoTotalMinutos} min).
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle style={{ width: '1.15rem', height: '1.15rem', color: '#f87171', flexShrink: 0, marginTop: '0.1rem' }} />
                    <div style={{ fontSize: '0.82rem', color: '#fca5a5' }}>
                      <strong>Horário Indisponível:</strong> {slotValidation.motivo}
                    </div>
                  </>
                )}
              </div>

              {/* Dados do Cliente */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="field-label">Nome do Cliente *</label>
                  <input
                    type="text"
                    value={formClienteNome}
                    onChange={(e) => setFormClienteNome(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="field-label">Telefone / WhatsApp *</label>
                  <input
                    type="text"
                    value={formClienteTelefone}
                    onChange={(e) => setFormClienteTelefone(e.target.value)}
                    placeholder="Ex: 11999998888"
                    className="input-field"
                    required
                  />
                </div>
              </div>

              {/* Banner de Identificação VIP no Agendamento */}
              {formSearchingVip ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Sparkles style={{ width: '0.85rem', height: '0.85rem', color: '#fbbf24' }} />
                  Verificando cadastro VIP...
                </div>
              ) : formClienteVip && (
                <div>
                  {formVipResult?.isVip ? (
                    formVipResult.elegivel ? (
                      <div
                        style={{
                          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(180, 83, 9, 0.15) 100%)',
                          border: '1px solid rgba(245, 158, 11, 0.45)',
                          borderRadius: '0.65rem',
                          padding: '0.75rem 0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                        }}
                      >
                        <div style={{ padding: '0.45rem', borderRadius: '0.45rem', background: 'rgba(245, 158, 11, 0.25)', color: '#fbbf24' }}>
                          <Crown style={{ width: '1.2rem', height: '1.2rem' }} />
                        </div>
                        <div style={{ fontSize: '0.82rem' }}>
                          <div style={{ fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <span>Assinante VIP Ativo: {formPlanoVip?.nome}</span>
                            <span className="badge badge-green" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>Elegível nesta data</span>
                          </div>
                          <div style={{ color: 'var(--text-main)', marginTop: '0.2rem', fontSize: '0.78rem' }}>
                            Cortes usados: <strong>{formClienteVip.cortes_utilizados_mes || 0}</strong> {formPlanoVip?.limite_cortes_mes === 0 ? '(Ilimitado)' : `/ ${formPlanoVip?.limite_cortes_mes}`} • Cobertura 100% aplicada no checkout!
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '0.65rem',
                          padding: '0.75rem 0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                        }}
                      >
                        <div style={{ padding: '0.45rem', borderRadius: '0.45rem', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                          <AlertCircle style={{ width: '1.2rem', height: '1.2rem' }} />
                        </div>
                        <div style={{ fontSize: '0.82rem' }}>
                          <div style={{ fontWeight: 700, color: '#f87171' }}>
                            Assinante VIP: {formPlanoVip?.nome || 'Plano Vinculado'} (Não Elegível nesta data/barbeiro)
                          </div>
                          <div style={{ color: 'var(--text-muted)', marginTop: '0.15rem', fontSize: '0.78rem' }}>
                            {formVipResult?.motivoIneligibilidade}
                          </div>
                        </div>
                      </div>
                    )
                  ) : (
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '0.55rem',
                        padding: '0.5rem 0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <User style={{ width: '0.9rem', height: '0.9rem', color: 'var(--text-dim)' }} />
                      <span>Cliente cadastrado: <strong>{formClienteVip.nome}</strong> (Cliente Avulso)</span>
                    </div>
                  )}
                </div>
              )}

              {/* Observações */}
              <div>
                <label className="field-label">Observações (Opcional)</label>
                <textarea
                  value={formObservacoes}
                  onChange={(e) => setFormObservacoes(e.target.value)}
                  placeholder="Preferências do cliente, detalhes do corte, etc."
                  rows={2}
                  className="input-field"
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Botões do Rodapé */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAppointmentModalOpen(false)}
                  className="btn-secondary"
                  disabled={savingAppointment}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-gold"
                  disabled={savingAppointment || !slotValidation.valido}
                  style={{ opacity: !slotValidation.valido ? 0.5 : 1 }}
                >
                  {savingAppointment ? 'Salvando...' : 'Confirmar Agendamento'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 6. Modal de Bloqueio de Horário */}
      {isBlockModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lock style={{ width: '1.15rem', height: '1.15rem', color: '#f87171' }} />
                  Bloquear Horário na Grade
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  Interdite intervalos para almoço, folga ou manutenção.
                </p>
              </div>
              <button
                onClick={() => setIsBlockModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBlock} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div>
                <label className="field-label">Barbeiro a Bloquear *</label>
                <select
                  value={formBlockBarbeiroId}
                  onChange={(e) => setFormBlockBarbeiroId(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="todos">Todos os Barbeiros (Bloqueio Geral)</option>
                  {profissionaisList.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="field-label">Início *</label>
                  <select
                    value={formBlockInicio}
                    onChange={(e) => setFormBlockInicio(e.target.value)}
                    className="input-field"
                    required
                  >
                    {daySlots.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="field-label">Término *</label>
                  <select
                    value={formBlockFim}
                    onChange={(e) => setFormBlockFim(e.target.value)}
                    className="input-field"
                    required
                  >
                    {daySlots.map(s => <option key={s} value={s}>{s}</option>)}
                    <option value="19:00">19:00</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="field-label">Motivo do Bloqueio *</label>
                <input
                  type="text"
                  value={formBlockMotivo}
                  onChange={(e) => setFormBlockMotivo(e.target.value)}
                  placeholder="Ex: Almoço, Folga, Reunião da Equipe"
                  className="input-field"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsBlockModalOpen(false)}
                  className="btn-secondary"
                  disabled={savingBlock}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-gold"
                  disabled={savingBlock}
                >
                  {savingBlock ? 'Salvando...' : 'Salvar Bloqueio'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal de Fecho de Comanda (Módulo 04 - PDV) */}
      {isComandaModalOpen && (
        <FechamentoComandaModal
          isOpen={isComandaModalOpen}
          onClose={() => {
            setIsComandaModalOpen(false);
            setSelectedComandaAgendamento(null);
          }}
          onSuccess={() => {
            loadDayData();
            loadProdutos();
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
