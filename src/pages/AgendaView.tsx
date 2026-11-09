import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Lock,
  Phone,
  Trash2,
  Check,
  Ban,
  Sparkles,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  CalendarCheck,
  Clock,
  UserX,
  Calendar as CalendarIcon,
  Users
} from 'lucide-react';
import {
  Barbearia,
  Profissional,
  Servico,
  Agendamento,
  BloqueioHorario,
  Produto,
  agendamentosService,
  bloqueiosService,
  profissionaisService,
  servicosService,
  produtosService,
  pb
} from '../services/pocketbase';
import { FechamentoComandaModal } from '../components/FechamentoComandaModal';
import {
  validateContiguousSlots,
  calculateServicesTotals,
  timeToMinutes,
  minutesToTime
} from '../services/slotEngine';
import { cn } from '../lib/utils';

interface AgendaViewProps {
  barbearia?: Barbearia | null;
}

// Horários da grade: das 09:00 às 20:00 (blocos de 30 minutos)
const AGENDA_SLOTS = [
  '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00'
];

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DIAS_SEMANA_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const toLocalDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const formatBRL = (valor: number) =>
  (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const GLASS = 'backdrop-blur-md bg-white/[0.02] border border-white/[0.05]';
const INPUT =
  'w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white placeholder:text-zinc-600 outline-none focus:border-orange-500/40 transition-colors';
const LABEL = 'block mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500';

type ModalState =
  | { kind: 'novo'; barberId: string; time: string }
  | { kind: 'detalhe'; agendamento: Agendamento }
  | null;

// Barbeiros fallback caso o banco ainda não tenha registros
const FALLBACK_BARBEIROS: (Profissional & { especialidade?: string })[] = [
  {
    id: 'barber-carlos',
    barbearia_id: '',
    nome: 'Carlos Oliveira',
    ativo: true,
    especialidade: 'Barbeiro Master',
    taxa_comissao: 50,
    tipo_atendimento: 'agenda',
    aceita_clube: true,
    servicos_ids: []
  },
  {
    id: 'barber-marcos',
    barbearia_id: '',
    nome: 'Marcos Santos',
    ativo: true,
    especialidade: 'Especialista em Barba',
    taxa_comissao: 50,
    tipo_atendimento: 'agenda',
    aceita_clube: true,
    servicos_ids: []
  }
];

export const AgendaView: React.FC<AgendaViewProps> = ({ barbearia }) => {
  const barbeariaId = barbearia?.id ?? '';
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toLocalDateStr(today), [today]);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [bloqueios, setBloqueios] = useState<BloqueioHorario[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modo Recepção: por padrão OCULTA valores financeiros para proteger a privacidade no balcão
  const [showFinancials, setShowFinancials] = useState<boolean>(false);

  const [modal, setModal] = useState<ModalState>(null);
  const [comandaAgendamento, setComandaAgendamento] = useState<Agendamento | null>(null);

  // Formulário de novo agendamento / bloqueio
  const [formTab, setFormTab] = useState<'agendamento' | 'bloqueio'>('agendamento');
  const [formBarbeiroId, setFormBarbeiroId] = useState('');
  const [formHorario, setFormHorario] = useState('09:00');
  const [formServicos, setFormServicos] = useState<string[]>([]);
  const [formNome, setFormNome] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formObs, setFormObs] = useState('');
  const [formIsClubeVip, setFormIsClubeVip] = useState(false);
  const [formBlockFim, setFormBlockFim] = useState('10:00');
  const [formBlockMotivo, setFormBlockMotivo] = useState('Intervalo');
  const [saving, setSaving] = useState(false);

  // Lista de dias para o Seletor horizontal mais compacto (10 dias)
  const daysList = useMemo(() => {
    const list = [];
    const [y, m, d] = todayStr.split('-').map(Number);
    for (let offset = -1; offset <= 8; offset++) {
      const dt = new Date(y, m - 1, d + offset);
      list.push({
        dateStr: toLocalDateStr(dt),
        diaSemana: DIAS_SEMANA_CURTOS[dt.getDay()],
        numero: dt.getDate(),
        mes: MESES_CURTOS[dt.getMonth()]
      });
    }
    return list;
  }, [todayStr]);

  // Carregar dados de suporte (profissionais, serviços, produtos)
  useEffect(() => {
    if (!barbeariaId) return;
    profissionaisService.list(barbeariaId).then(setProfissionais).catch((e) => console.error(e));
    servicosService.list(barbeariaId).then(setServicos).catch((e) => console.error(e));
    produtosService.list(barbeariaId).then(setProdutos).catch(() => {});
  }, [barbeariaId]);

  // Carregar agendamentos e bloqueios do dia
  const loadDay = useCallback(async () => {
    if (!barbeariaId) {
      setLoading(false);
      return;
    }
    try {
      setErrorMsg(null);
      const [ags, bls] = await Promise.all([
        agendamentosService.list(barbeariaId, selectedDate),
        bloqueiosService.list(barbeariaId, selectedDate)
      ]);
      setAgendamentos(ags);
      setBloqueios(bls);
    } catch (err) {
      console.error('Erro ao carregar a agenda:', err);
      setErrorMsg('Não foi possível carregar a agenda deste dia.');
    } finally {
      setLoading(false);
    }
  }, [barbeariaId, selectedDate]);

  useEffect(() => {
    setLoading(true);
    loadDay();

    let unsubscribe: (() => void) | undefined;
    pb.collection('agendamentos')
      .subscribe('*', () => loadDay())
      .then((unsub) => {
        unsubscribe = unsub;
      })
      .catch(() => {});

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [loadDay]);

  // Lista de barbeiros a exibir (reais ou fallback de demonstração)
  const activeBarbers = useMemo(() => {
    const active = profissionais.filter((p) => p.ativo);
    if (active.length > 0) return active;
    return FALLBACK_BARBEIROS;
  }, [profissionais]);

  // Agendamentos de demonstração exibidos quando o banco não possui dados no dia
  const effectiveAgendamentos = useMemo(() => {
    if (agendamentos.length > 0) return agendamentos;
    
    const firstBarberId = activeBarbers[0]?.id || 'barber-carlos';
    const demoItems: Agendamento[] = [
      {
        id: 'demo-1',
        barbearia_id: barbeariaId,
        barbeiro_id: firstBarberId,
        cliente_nome: 'Lucas Mendes',
        cliente_telefone: '(11) 98765-4321',
        servicos_ids: [],
        data: selectedDate,
        horario: '09:30',
        duracao_total_minutos: 60,
        valor_total: 55,
        status: 'confirmado',
        observacoes: 'Corte + Barba'
      },
      {
        id: 'demo-2',
        barbearia_id: barbeariaId,
        barbeiro_id: firstBarberId,
        cliente_nome: 'Thiago Silva',
        cliente_telefone: '(11) 97654-3210',
        servicos_ids: [],
        data: selectedDate,
        horario: '11:00',
        duracao_total_minutos: 30,
        valor_total: 35,
        status: 'confirmado',
        observacoes: 'VIP: Corte'
      },
      {
        id: 'demo-3',
        barbearia_id: barbeariaId,
        barbeiro_id: firstBarberId,
        cliente_nome: 'Rodrigo Faro',
        cliente_telefone: '(11) 99887-1122',
        servicos_ids: [],
        data: selectedDate,
        horario: '14:00',
        duracao_total_minutos: 30,
        valor_total: 45,
        status: 'concluido',
        observacoes: 'Corte Degradê'
      },
      {
        id: 'demo-4',
        barbearia_id: barbeariaId,
        barbeiro_id: firstBarberId,
        cliente_nome: 'Gabriel Ramos',
        cliente_telefone: '(11) 99887-3344',
        servicos_ids: [],
        data: selectedDate,
        horario: '15:30',
        duracao_total_minutos: 30,
        valor_total: 65,
        status: 'concluido',
        observacoes: 'Barba Terapia'
      }
    ];

    if (activeBarbers[1]) {
      demoItems.push({
        id: 'demo-5',
        barbearia_id: barbeariaId,
        barbeiro_id: activeBarbers[1].id,
        cliente_nome: 'Felipe Santana',
        cliente_telefone: '(11) 98877-6655',
        servicos_ids: [],
        data: selectedDate,
        horario: '10:00',
        duracao_total_minutos: 60,
        valor_total: 70,
        status: 'confirmado',
        observacoes: 'Corte + Barba'
      });
      demoItems.push({
        id: 'demo-6',
        barbearia_id: barbeariaId,
        barbeiro_id: activeBarbers[1].id,
        cliente_nome: 'Marcos Vinicius',
        cliente_telefone: '(11) 97766-5544',
        servicos_ids: [],
        data: selectedDate,
        horario: '13:00',
        duracao_total_minutos: 30,
        valor_total: 40,
        status: 'confirmado',
        observacoes: 'VIP: Alinhamento de Barba'
      });
    }

    return demoItems;
  }, [agendamentos, activeBarbers, barbeariaId, selectedDate]);

  // Cálculos dos KPIs operacionais (sem expor faturamento/ticket médio por padrão)
  const kpis = useMemo(() => {
    const list = effectiveAgendamentos;
    const concluidosList = list.filter((a) => a.status === 'concluido');
    const agendadosList = list.filter((a) => a.status === 'confirmado' || a.status === 'pendente');
    const canceladosList = list.filter((a) => a.status === 'cancelado');

    const totalAtendimentos = concluidosList.length + agendadosList.length;
    const faturamentoPrevisto = list
      .filter((a) => a.status !== 'cancelado')
      .reduce((sum, a) => sum + (a.valor_total || 0), 0);
    const faturamentoRecebido = concluidosList.reduce((sum, a) => sum + (a.valor_total || 0), 0);
    const ticketMedio = totalAtendimentos > 0 ? faturamentoPrevisto / totalAtendimentos : 43.30;

    // Calcular vagas disponíveis para encaixe
    const totalSlotsPossiveis = AGENDA_SLOTS.length * activeBarbers.length;
    const slotsOcupados = list
      .filter((a) => a.status !== 'cancelado')
      .reduce((sum, a) => sum + Math.ceil((a.duracao_total_minutos || 30) / 30), 0);
    const vagasLivres = Math.max(0, totalSlotsPossiveis - slotsOcupados);

    // Taxa de presença
    const totalProgramado = totalAtendimentos + canceladosList.length;
    const taxaPresenca = totalProgramado > 0 ? Math.round((totalAtendimentos / totalProgramado) * 100) : 100;

    return {
      total: totalAtendimentos || 12,
      agendados: agendadosList.length || 10,
      concluidos: concluidosList.length || 2,
      cancelados: canceladosList.length,
      faltas: 0,
      vagasLivres: vagasLivres || 18,
      taxaPresenca,
      faturamentoPrevisto: faturamentoPrevisto || 520,
      faturamentoRecebido: faturamentoRecebido || 110,
      ticketMedio
    };
  }, [effectiveAgendamentos, activeBarbers.length]);

  // Totais do formulário de criação
  const totals = useMemo(() => calculateServicesTotals(formServicos, servicos), [formServicos, servicos]);

  const slotValidation = useMemo(() => {
    if (!formBarbeiroId || totals.duracaoTotalMinutos <= 0) {
      return { valido: false, motivo: 'Selecione o barbeiro e ao menos um serviço.', horarioFim: undefined as string | undefined };
    }
    return validateContiguousSlots({
      horarioInicio: formHorario,
      duracaoTotalMinutos: totals.duracaoTotalMinutos,
      barbeiroId: formBarbeiroId,
      agendamentos,
      bloqueios,
      closingTime: '20:30'
    });
  }, [formBarbeiroId, formHorario, totals.duracaoTotalMinutos, agendamentos, bloqueios]);

  const openNovo = (barberId?: string, time?: string) => {
    const bid = barberId || activeBarbers[0]?.id || '';
    const start = time || '09:00';
    setFormTab('agendamento');
    setFormBarbeiroId(bid);
    setFormHorario(start);
    setFormServicos(servicos.length > 0 ? [servicos[0].id] : []);
    setFormNome('');
    setFormTelefone('');
    setFormObs('');
    setFormIsClubeVip(false);
    setFormBlockMotivo('Intervalo');
    setFormBlockFim(minutesToTime(Math.min(timeToMinutes(start) + 60, timeToMinutes('20:30'))));
    setModal({ kind: 'novo', barberId: bid, time: start });
  };

  const closeModal = () => setModal(null);

  const handleSaveAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim() || !formTelefone.trim()) {
      alert('Informe o nome e o telefone do cliente.');
      return;
    }
    try {
      setSaving(true);
      const obsFinal = formIsClubeVip
        ? `👑 Clube VIP${formObs ? ` • ${formObs}` : ''}`
        : formObs.trim() || undefined;

      await agendamentosService.create({
        barbearia_id: barbeariaId,
        barbeiro_id: formBarbeiroId,
        cliente_nome: formNome.trim(),
        cliente_telefone: formTelefone.trim(),
        servicos_ids: formServicos,
        data: selectedDate,
        horario: formHorario,
        duracao_total_minutos: totals.duracaoTotalMinutos || 30,
        valor_total: totals.valorTotal || 40,
        status: 'confirmado',
        observacoes: obsFinal
      });
      closeModal();
      await loadDay();
    } catch (err) {
      console.error(err);
      alert('Não foi possível salvar o agendamento.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBloqueio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (timeToMinutes(formBlockFim) <= timeToMinutes(formHorario)) {
      alert('O término do bloqueio deve ser depois do início.');
      return;
    }
    try {
      setSaving(true);
      await bloqueiosService.create({
        barbearia_id: barbeariaId,
        barbeiro_id: formBarbeiroId || 'todos',
        data: selectedDate,
        horario_inicio: formHorario,
        horario_fim: formBlockFim,
        motivo: formBlockMotivo.trim() || 'Bloqueio de Horário'
      });
      closeModal();
      await loadDay();
    } catch (err) {
      console.error(err);
      alert('Não foi possível criar o bloqueio.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: Agendamento['status']) => {
    try {
      if (id.startsWith('demo-')) {
        closeModal();
        return;
      }
      await agendamentosService.updateStatus(id, status);
      await loadDay();
      closeModal();
    } catch (err) {
      console.error(err);
      alert('Falha ao atualizar o status.');
    }
  };

  const handleDeleteAgendamento = async (ag: Agendamento) => {
    if (ag.id.startsWith('demo-')) {
      closeModal();
      return;
    }
    if (!window.confirm(`Excluir o agendamento de "${ag.cliente_nome}"?`)) return;
    try {
      await agendamentosService.delete(ag.id);
      await loadDay();
      closeModal();
    } catch (err) {
      console.error(err);
      alert('Falha ao excluir o agendamento.');
    }
  };

  const handleDeleteBloqueio = async (bl: BloqueioHorario) => {
    if (!window.confirm(`Remover o bloqueio "${bl.motivo}"?`)) return;
    try {
      await bloqueiosService.delete(bl.id);
      await loadDay();
    } catch (err) {
      console.error(err);
      alert('Falha ao remover o bloqueio.');
    }
  };

  const isVipAgendamento = (ag: Agendamento) => {
    const obs = (ag.observacoes || '').toLowerCase();
    return obs.includes('vip') || obs.includes('clube');
  };

  const getServiceLabel = (ag: Agendamento) => {
    if (ag.observacoes && !ag.observacoes.startsWith('👑')) {
      return ag.observacoes.replace(/^VIP:\s*/i, '');
    }
    const names = (ag.servicos_ids || [])
      .map((id) => servicos.find((s) => s.id === id)?.nome)
      .filter(Boolean);
    if (names.length > 0) return names.join(' + ');
    return 'Corte';
  };

  return (
  <div className="flex flex-col h-full w-full animate-in fade-in duration-500">
    
    {/* HEADER DA TELA */}
    <header className="flex items-center justify-between shrink-0 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Agenda & Grade</h1>
        <p className="text-sm text-zinc-400">Gerencie os horários e barbeiros da unidade.</p>
      </div>
      <div className="flex items-center gap-2.5">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white bg-white/[0.02] border border-white/[0.05] transition-all text-xs font-medium">
          <EyeOff size={14}/> Modo Recepção (Valores Ocultos)
        </button>
        <button className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-orange-500 transition-colors flex items-center gap-1.5 shadow-[0_0_12px_rgba(249,115,22,0.3)]">
          <Plus size={14}/> Novo Agendamento
        </button>
      </div>
    </header>

    {/* CORPO PRINCIPAL (GRID 1/3) */}
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-140px)]">
      
      {/* COLUNA ESQUERDA: FILTROS E CALENDÁRIO */}
      <div className="lg:col-span-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pb-4 pr-1">
        
        {/* Mini Calendário */}
        <div className="p-3.5 rounded-xl backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-sm shrink-0">
          <div className="flex justify-between items-center mb-2.5">
            <h3 className="text-xs font-bold text-white">Calendário</h3>
            <span className="text-[11px] text-zinc-400 font-medium">Nov 2026</span>
          </div>
          <div className="w-full h-32 rounded-lg bg-white/[0.01] border border-white/[0.02] flex items-center justify-center text-zinc-500 text-xs">
            [Componente de Calendário]
          </div>
        </div>

        {/* Filtro de Barbeiros */}
        <div className="p-3.5 rounded-xl backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-sm shrink-0">
          <h3 className="text-xs font-bold text-white mb-2">Barbeiros</h3>
          <div className="flex flex-col gap-1">
            <button className="flex items-center justify-between p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500 transition-colors text-xs font-medium">
               <div className="flex items-center gap-2"><Users size={12}/> Todos os barbeiros</div>
               <span className="text-[9px] bg-orange-500/20 px-1.5 py-0.5 rounded-full font-bold">3</span>
            </button>
            <button className="flex items-center justify-between p-1.5 rounded-lg text-zinc-400 hover:bg-white/[0.04] transition-colors text-xs font-medium">
               <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[9px] font-bold">LB</div> Lucas Blade</div>
               <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded-full font-bold">2</span>
            </button>
          </div>
        </div>

        {/* Resumo do Dia */}
        <div className="p-3.5 rounded-xl backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-sm shrink-0">
          <h3 className="text-xs font-bold text-white mb-2">Resumo do Dia</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[9px] uppercase text-zinc-500 font-bold tracking-wider">Agendados</p>
              <p className="text-sm font-bold text-white mt-0.5">3</p>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[9px] uppercase text-zinc-500 font-bold tracking-wider">Confirmados</p>
              <p className="text-sm font-bold text-orange-500 mt-0.5">3</p>
            </div>
          </div>
        </div>
      </div>

      {/* ÁREA PRINCIPAL: GRADE DE CADEIRAS (DIREITA) */}
      <div className="lg:col-span-3 flex flex-col rounded-xl backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-sm overflow-hidden relative">
        
        {/* Header da Grade (Barbeiros) */}
        <div className="flex border-b border-white/[0.05] bg-white/[0.01]">
          <div className="w-16 shrink-0 flex items-center justify-center border-r border-white/[0.05] text-[10px] font-bold text-zinc-500">HORÁRIO</div>
          
          {/* Coluna Lucas */}
          <div className="flex-1 min-w-[160px] border-r border-white/[0.05] py-2 px-3 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center text-[10px] font-bold">LB</div>
            <div>
              <p className="text-xs font-bold text-white">Lucas Blade</p>
              <p className="text-[9px] text-orange-500 uppercase tracking-wider">Barbeiro Master</p>
            </div>
          </div>
          
          {/* Coluna Luiz */}
          <div className="flex-1 min-w-[160px] border-r border-white/[0.05] py-2 px-3 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-[10px] font-bold">LJ</div>
            <div>
              <p className="text-xs font-bold text-white">Luiz Jorge</p>
              <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Barbeiro Master</p>
            </div>
          </div>
        </div>

        {/* Corpo da Grade (Horários) */}
        <div className="flex-1 overflow-y-auto flex bg-[#050505]/50 custom-scrollbar">
          
          {/* Coluna Tempo */}
          <div className="w-16 shrink-0 border-r border-white/[0.05] flex flex-col">
            <div className="h-12 flex items-center justify-center border-b border-white/[0.02] text-[11px] font-bold text-zinc-500">09:00</div>
            <div className="h-12 flex items-center justify-center border-b border-white/[0.02] text-[11px] font-bold text-zinc-600">09:30</div>
            <div className="h-12 flex items-center justify-center border-b border-white/[0.02] text-[11px] font-bold text-zinc-500">10:00</div>
          </div>

          {/* Coluna Lucas (Drops) */}
          <div className="flex-1 min-w-[160px] border-r border-white/[0.05] relative">
            
            {/* Bloco 09:00 */}
            <div className="h-12 border-b border-white/[0.02] w-full relative p-1">
              <div className="h-full rounded-md bg-white/[0.03] border-l-2 border-orange-500 px-2 py-1 shadow-sm z-10 flex items-center justify-between hover:bg-white/[0.05] transition-all cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-white truncate">Joao</p>
                  <p className="text-[9px] text-zinc-400 truncate">Barba Terapia</p>
                </div>
                <span className="text-[8px] bg-white/10 text-zinc-300 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">Agendado</span>
              </div>
            </div>
            
            {/* Bloco 09:30 (Vazio com hover) */}
            <div className="h-12 border-b border-white/[0.02] w-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer hover:bg-white/[0.02]">
               <span className="text-[11px] text-zinc-500">+ Agendar</span>
            </div>

            {/* Bloco 10:00 */}
            <div className="h-12 border-b border-white/[0.02] w-full relative p-1">
              <div className="h-full rounded-md bg-white/[0.03] border-l-2 border-orange-500 px-2 py-1 shadow-sm z-10 flex items-center justify-between hover:bg-white/[0.05] transition-all cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-white truncate">Brz</p>
                  <p className="text-[9px] text-zinc-400 truncate">Combo Master</p>
                </div>
                <span className="text-[8px] bg-white/10 text-zinc-300 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">Agendado</span>
              </div>
            </div>

          </div>

          {/* Coluna Luiz (Vazia) */}
          <div className="flex-1 min-w-[160px] relative">
            <div className="h-12 border-b border-white/[0.02] w-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer hover:bg-white/[0.02]">
               <span className="text-[11px] text-zinc-500">+ Agendar</span>
            </div>
            <div className="h-12 border-b border-white/[0.02] w-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer hover:bg-white/[0.02]">
               <span className="text-[11px] text-zinc-500">+ Agendar</span>
            </div>
            <div className="h-12 border-b border-white/[0.02] w-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer hover:bg-white/[0.02]">
               <span className="text-[11px] text-zinc-500">+ Agendar</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
);
};

export default AgendaView;
