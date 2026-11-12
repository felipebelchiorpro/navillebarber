import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, Routes, Route } from 'react-router-dom';
import {
  Scissors,
  Users,
  LayoutDashboard,
  Receipt,
  Package,
  Crown,
  LogOut,
  ExternalLink,
  Calendar,
  Grid as GridIcon,
  MonitorSmartphone,
  Store,
  UsersRound,
  Settings,
  MessageCircle,
  Bot,
  GitFork,
  Lock,
  ShieldAlert
} from 'lucide-react';
import SplitPaymentView from '../components/SplitPaymentView';
import {
  Barbearia,
  Usuario,
  Profissional,
  Servico,
  Agendamento,
  profissionaisService,
  servicosService,
  agendamentosService,
  pb
} from '../services/pocketbase';
import { AreaChart } from '@/components/charts/area-chart';
import { Area } from '@/components/charts/area';
import { Grid as ChartGrid } from '@/components/charts/grid';
import { XAxis } from '@/components/charts/x-axis';
import { ChartTooltip } from '@/components/charts/tooltip';
import { AreaSparkline } from '@/components/charts/sparkline';
import { ServicosManager } from '../components/ServicosManager';
import { ProfissionaisManager } from '../components/ProfissionaisManager';
import { ProdutosManager } from '../components/ProdutosManager';
import { ClubeVipManager } from '../components/ClubeVipManager';
import { BaseClientesView } from '../components/BaseClientesView';
import { WhatsAppManager } from '../components/WhatsAppManager';
import { MensagensConfigView } from '../components/MensagensConfigView';
import { PlanoAssinaturaManager } from '../components/PlanoAssinaturaManager';
import { RelatoriosManager } from '../components/RelatoriosManager';
import { AgendaManager } from '../components/AgendaManager';
import { VitrineAgendamentoPublica } from '../components/VitrineAgendamentoPublica';
import { NavilleLogo } from '../components/NavilleLogo';
import { AgendaView } from './AgendaView';
import { VitrineView } from './VitrineView';

const Grid = GridIcon;

export interface DashboardAdminViewProps {
  user: Usuario;
  barbearia: Barbearia | null;
  onBarbeariaUpdated?: (barbearia: Barbearia) => void;
  onLogout?: () => void;
  onOpenVitrine?: (slug: string) => void;
  onOpenSuperAdmin?: () => void;
}

export type AdminTab =
  | 'visao_geral'
  | 'agenda'
  | 'comandas'
  | 'profissionais'
  | 'servicos'
  | 'produtos'
  | 'clube_vip'
  | 'relatorios'
  | 'whatsapp'
  | 'plano_saas';

type ChartTimeframe = 'Hoje' | '7D' | '30D';

export const DashboardAdminView: React.FC<DashboardAdminViewProps> = ({
  user,
  barbearia,
  onBarbeariaUpdated,
  onLogout,
  onOpenVitrine,
}) => {
  const [timeFilter, setTimeFilter] = useState<ChartTimeframe>('30D');
  const [profissionaisList, setProfissionaisList] = useState<Profissional[]>([]);
  const [servicesList, setServicesList] = useState<Servico[]>([]);
  const [agendamentosList, setAgendamentosList] = useState<Agendamento[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(true);

  const fetchDashboardData = () => {
    const targetId = barbearia?.id || 'ca42u8j6x8o514w';
    setLoadingDashboard(true);
    Promise.all([
      profissionaisService.list(targetId).catch(() => [] as Profissional[]),
      servicosService.list(targetId).catch(() => [] as Servico[]),
      agendamentosService.list(targetId).catch(() => [] as Agendamento[]),
      pb.collection('barbearias').getOne<Barbearia>(targetId).catch(() => null)
    ]).then(([profs, servs, ags, fresh]) => {
      setProfissionaisList(profs);
      setServicesList(servs);
      setAgendamentosList(ags);
      if (fresh && onBarbeariaUpdated) {
        onBarbeariaUpdated(fresh);
      }
    }).finally(() => {
      setLoadingDashboard(false);
    });
  };

  useEffect(() => {
    fetchDashboardData();
  }, [barbearia?.id]);

  const validBarbearia = useMemo<Barbearia>(() => {
    if (barbearia) return barbearia;
    return {
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
      max_barbeiros: 1,
      valor_adicional_barbeiro: 25,
      bloqueio_automatico: false,
      e_publico: true,
    } as unknown as Barbearia;
  }, [barbearia]);

  // Governança Estrita de Módulos (definidas no SuperAdmin)
  const temModuloFinanceiro = Boolean(validBarbearia.modulo_financeiro);
  const temModuloClube = Boolean(validBarbearia.vip_club_ativo || validBarbearia.modulo_clube_vip);
  const temModuloWhatsApp = Boolean(validBarbearia.modulo_whatsapp);
  const temModuloSplit = Boolean(validBarbearia.split_ativo ?? validBarbearia.modulo_split_asaas);

  const limiteCadeirasBadge = Math.max(
    1,
    Number(validBarbearia.max_barbeiros) ||
    Number(validBarbearia.limite_profissionais) ||
    1
  );

  const todayIso = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const formattedDate = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }, []);

  // Sparklines com cor Laranja #F97316
  const sparkline1 = useMemo(() => [
    { v: 4 }, { v: 7 }, { v: 5 }, { v: 10 }, { v: 8 }, { v: 14 }, { v: 12 }, { v: 18 }
  ], []);

  const sparkline2 = useMemo(() => [
    { v: 3 }, { v: 6 }, { v: 4 }, { v: 8 }, { v: 7 }, { v: 11 }, { v: 9 }, { v: 14 }
  ], []);

  const sparkline3 = useMemo(() => [
    { v: 32 }, { v: 34 }, { v: 33 }, { v: 36 }, { v: 35 }, { v: 38 }, { v: 36 }, { v: 37 }
  ], []);

  // Dados do Gráfico Principal
  const chartData = useMemo(() => {
    if (timeFilter === 'Hoje') {
      return [
        { date: `${todayIso}T08:00:00Z`, faturamento: 70 },
        { date: `${todayIso}T10:00:00Z`, faturamento: 150 },
        { date: `${todayIso}T12:00:00Z`, faturamento: 210 },
        { date: `${todayIso}T14:00:00Z`, faturamento: 310 },
        { date: `${todayIso}T16:00:00Z`, faturamento: 420 },
        { date: `${todayIso}T18:00:00Z`, faturamento: 480 },
        { date: `${todayIso}T20:00:00Z`, faturamento: 520 },
      ];
    }
    if (timeFilter === '7D') {
      return [
        { date: '2026-10-28T12:00:00Z', faturamento: 420 },
        { date: '2026-10-29T12:00:00Z', faturamento: 610 },
        { date: '2026-10-30T12:00:00Z', faturamento: 480 },
        { date: '2026-10-31T12:00:00Z', faturamento: 820 },
        { date: '2026-11-01T12:00:00Z', faturamento: 950 },
        { date: '2026-11-02T12:00:00Z', faturamento: 590 },
        { date: '2026-11-03T12:00:00Z', faturamento: 880 },
      ];
    }
    return [
      { date: '2026-10-05T12:00:00Z', faturamento: 1400 },
      { date: '2026-10-10T12:00:00Z', faturamento: 1100 },
      { date: '2026-10-15T12:00:00Z', faturamento: 920 },
      { date: '2026-10-20T12:00:00Z', faturamento: 1820 },
      { date: '2026-10-25T12:00:00Z', faturamento: 890 },
      { date: '2026-10-30T12:00:00Z', faturamento: 1950 },
      { date: '2026-11-03T12:00:00Z', faturamento: 1600 }
    ];
  }, [timeFilter, todayIso]);

  const location = useLocation();

  const isRouteActive = (routePath: string) => {
    if (routePath === '/' || routePath === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    if (routePath === '/grade') {
      return location.pathname === '/grade' || location.pathname === '/agenda';
    }
    return location.pathname === routePath || location.pathname.startsWith(`${routePath}/`);
  };

  const getItemClass = (routePath: string, hasRightElement = false) => {
    const active = isRouteActive(routePath);
    const layout = hasRightElement ? 'flex items-center justify-between' : 'flex items-center gap-2.5';
    if (active) {
      return `${layout} px-3 py-2 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)] font-semibold text-xs transition-all`;
    }
    return `${layout} px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all font-medium text-xs`;
  };

  const VisaoGeral = () => (
    <>
      {/* HEADER */}
      <header className="flex flex-col gap-1 shrink-0">
        <h1 className="text-2xl font-bold text-white">
          {greeting}, {user.nome?.split(' ')[0] || user.name?.split(' ')[0] || 'Carlos'}
        </h1>
        <p className="text-sm text-zinc-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          {formattedDate} • Painel Operacional
        </p>
      </header>

      {/* GRID DE KPIs REAIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* CARD 1 - FATURAMENTO HOJE */}
        <div className="flex flex-col justify-between p-6 rounded-[2rem] backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-xl min-h-[160px]">
          <div>
            <h3 className="text-sm font-medium text-zinc-400">Faturamento Hoje</h3>
            <p className="text-3xl font-bold text-white mt-1">
              R$ {agendamentosList
                .filter((a) => a.data === todayIso && (a.status === 'concluido' || a.status === 'confirmado'))
                .reduce((acc, curr) => acc + (Number(curr.valor_total) || 0), 0)
                .toFixed(2)
                .replace('.', ',')}
            </p>
          </div>
          <div className="flex items-end justify-between mt-4">
            <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-md">
              {agendamentosList.filter((a) => a.data === todayIso).length} agendamentos hoje
            </span>
            <div className="w-20 h-10">
              <AreaSparkline
                data={sparkline1}
                dataKey="v"
                color="#F97316"
                fill="gradient"
                fillOpacity={0.25}
                height={40}
                curve="monotone"
              />
            </div>
          </div>
        </div>

        {/* CARD 2 - AGENDAMENTOS HOJE */}
        <div className="flex flex-col justify-between p-6 rounded-[2rem] backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-xl min-h-[160px]">
          <div>
            <h3 className="text-sm font-medium text-zinc-400">Agendamentos Hoje</h3>
            <p className="text-3xl font-bold text-white mt-1">
              {agendamentosList.filter((a) => a.data === todayIso).length}
            </p>
          </div>
          <div className="flex items-end justify-between mt-4">
            <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-md">
              {agendamentosList.filter((a) => a.data === todayIso && a.status === 'concluido').length} finalizados
            </span>
            <div className="w-20 h-10">
              <AreaSparkline
                data={sparkline2}
                dataKey="v"
                color="#F97316"
                fill="gradient"
                fillOpacity={0.25}
                height={40}
                curve="monotone"
              />
            </div>
          </div>
        </div>

        {/* CARD 3 - TICKET MÉDIO REAL */}
        <div className="flex flex-col justify-between p-6 rounded-[2rem] backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-xl min-h-[160px]">
          <div>
            <h3 className="text-sm font-medium text-zinc-400">Ticket Médio</h3>
            <p className="text-3xl font-bold text-white mt-1">
              {(() => {
                const concluidos = agendamentosList.filter((a) => a.status === 'concluido');
                if (concluidos.length === 0) return 'R$ 0,00';
                const total = concluidos.reduce((acc, curr) => acc + (Number(curr.valor_total) || 0), 0);
                return `R$ ${(total / concluidos.length).toFixed(2).replace('.', ',')}`;
              })()}
            </p>
          </div>
          <div className="flex items-end justify-between mt-4">
            <span className="text-xs font-medium text-zinc-400 bg-white/[0.04] px-2.5 py-1 rounded-md">
              Base real concluída
            </span>
            <div className="w-20 h-10">
              <AreaSparkline
                data={sparkline3}
                dataKey="v"
                color="#F97316"
                fill="gradient"
                fillOpacity={0.25}
                height={40}
                curve="monotone"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CARD DO GRÁFICO DIÁRIO */}
      <div className="flex flex-col p-6 rounded-[2rem] backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-xl w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-bold text-white">Faturamento Diário</h3>
          <div className="flex gap-2 text-xs font-medium text-zinc-500">
            <span
              onClick={() => setTimeFilter('Hoje')}
              className={timeFilter === 'Hoje' ? 'text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-md cursor-pointer' : 'hover:text-white cursor-pointer transition-colors'}
            >
              Hoje
            </span>
            <span
              onClick={() => setTimeFilter('7D')}
              className={timeFilter === '7D' ? 'text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-md cursor-pointer' : 'hover:text-white cursor-pointer transition-colors'}
            >
              7D
            </span>
            <span
              onClick={() => setTimeFilter('30D')}
              className={timeFilter === '30D' ? 'text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-md cursor-pointer' : 'hover:text-white cursor-pointer transition-colors'}
            >
              30D
            </span>
          </div>
        </div>
        <div className="w-full h-[280px]">
          <AreaChart
            data={chartData}
            xDataKey="date"
            aspectRatio="3.2 / 1"
            className="w-full h-full"
          >
            <ChartGrid
              horizontal
              stroke="rgba(255, 255, 255, 0.05)"
              strokeDasharray="4 4"
            />
            <Area
              dataKey="faturamento"
              fill="#F97316"
              stroke="#F97316"
              strokeWidth={2.5}
              fillOpacity={0.15}
              gradientToOpacity={0}
              showLine
              showHighlight
            />
            <XAxis tickMode="data" />
            <ChartTooltip
              rows={(point) => [
                {
                  label: 'Faturamento',
                  value: Number(point.faturamento || 0).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }),
                  color: '#F97316',
                }
              ]}
            />
          </AreaChart>
        </div>
      </div>

      {/* SESSÃO INFERIOR: FILA E METAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        
        {/* COLUNA ESQUERDA: Fila ao Vivo (Ocupa 2 espaços) */}
        <div className="lg:col-span-2 flex flex-col p-6 rounded-[2rem] backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-xl relative">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-white">Fila de Atendimento ao Vivo</h3>
            <span className="text-xs font-medium text-orange-500 bg-orange-500/10 px-2 py-1 rounded-md">Atualizando...</span>
          </div>
          
          <div className="flex flex-col gap-3">
            {agendamentosList.filter((a) => a.data === todayIso).length === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-sm">
                Nenhum agendamento agendado para hoje.
              </div>
            ) : (
              agendamentosList
                .filter((a) => a.data === todayIso)
                .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''))
                .map((ag) => {
                  const servsNomes = (ag.servicos_ids || [])
                    .map((sid) => servicesList.find((s) => s.id === sid)?.nome)
                    .filter(Boolean)
                    .join(' + ') || 'Atendimento Geral';

                  let badgeColor = 'text-orange-400 bg-orange-400/10';
                  let statusLabel = 'Aguardando';

                  if (ag.status === 'concluido') {
                    badgeColor = 'text-zinc-400 bg-zinc-400/10';
                    statusLabel = 'Concluído';
                  } else if (ag.status === 'confirmado') {
                    badgeColor = 'text-emerald-400 bg-emerald-400/10';
                    statusLabel = 'Na Cadeira';
                  }

                  return (
                    <div
                      key={ag.id}
                      className={`flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.02] transition-colors ${
                        ag.status === 'concluido' ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-sm font-bold text-zinc-300 w-14">{ag.horario || '--:--'}</div>
                        <div>
                          <p className="text-sm font-bold text-white">{ag.cliente_nome}</p>
                          <p className="text-xs text-zinc-500">{servsNomes} • R$ {Number(ag.valor_total || 0).toFixed(2).replace('.', ',')}</p>
                        </div>
                      </div>
                      <div className={`text-xs font-medium px-3 py-1 rounded-full flex items-center gap-2 ${badgeColor}`}>
                        {statusLabel === 'Na Cadeira' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        )}
                        {statusLabel}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: Metas e Estoque (Ocupa 1 espaço) */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Card Meta Mensal */}
          <div className="flex flex-col p-6 rounded-[2rem] backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-xl relative">
            <h3 className="text-base font-bold text-white mb-1">Meta de Novembro</h3>
            <p className="text-xs text-zinc-400 mb-6">Restam 26 dias</p>
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-white">75%</span>
                <span className="text-xs text-zinc-500 mt-1">R$ 15.000 / R$ 20.000</span>
              </div>
              {/* Placeholder para um anel circular */}
              <div className="w-16 h-16 rounded-full border-4 border-white/5 border-t-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]"></div>
            </div>
          </div>

          {/* Card Alertas Rápidos */}
          <div className="flex flex-col p-6 rounded-[2rem] backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-xl relative flex-1">
            <h3 className="text-sm font-bold text-white mb-4">Avisos do Sistema</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5"></div>
                <div>
                  <p className="text-sm text-zinc-300">Estoque Baixo</p>
                  <p className="text-xs text-zinc-500">Pomada Matte (Restam 2)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
                <div>
                  <p className="text-sm text-zinc-300">Novo Assinante VIP</p>
                  <p className="text-xs text-zinc-500">Fernando adicionou o plano.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );

  // Componente de Bloqueio Estrito de Módulos Inativos
  const ModuloBloqueadoView: React.FC<{ modulo: string }> = ({ modulo }) => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] text-center gap-3 my-auto">
      <div className="w-14 h-14 rounded-2xl bg-zinc-800 text-zinc-400 flex items-center justify-center shadow-inner">
        <Lock size={26} />
      </div>
      <div>
        <span className="text-[10px] font-bold tracking-widest uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
          Módulo Não Contratado
        </span>
        <h3 className="text-base font-bold text-white mt-1.5">{modulo}</h3>
        <p className="text-xs text-zinc-400 max-w-sm mt-1">
          Este módulo está desativado para a sua barbearia no painel de governança. Entre em contato com o suporte ou administrador para ativá-lo.
        </p>
      </div>
      <Link
        to="/"
        className="mt-3 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs border border-white/10 transition-colors"
      >
        Voltar à Visão Geral
      </Link>
    </div>
  );

  return (
    <div className="!flex !h-screen !w-full bg-[#050505] text-zinc-300 !p-6 !gap-8 overflow-hidden relative">
      
      {/* LUZES DE FUNDO */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* 1. CONTAINER PRINCIPAL DA SIDEBAR */}
      <aside className="w-72 h-full flex flex-col p-6 rounded-3xl backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-2xl relative z-10 overflow-y-auto select-none no-scrollbar custom-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        
        {/* Cabeçalho da Sidebar (Logo NAVILLE BARBER Oficial) */}
        <div className="flex items-center justify-between pb-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.15)] p-2">
              <NavilleLogo className="w-full h-full text-orange-500" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-base tracking-tight text-white leading-tight">
                NAVILLE BARBER
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]" />
                <span className="text-xs text-zinc-400 truncate">
                  {barbearia?.nome || 'Unidade Centro'}
                </span>
              </div>
            </div>
          </div>

          {barbearia?.slug && (
            <button
              onClick={() => onOpenVitrine && onOpenVitrine(barbearia.slug)}
              title="Abrir Vitrine Pública"
              className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.05] flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 2. ESTRUTURA DOS MENUS (ESTRUTURA CATEGORIZADA) */}
        <div className="flex flex-col gap-1 mt-5">
          
          {/* CATEGORIA: ATENDIMENTOS & CAIXA */}
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-3 mb-1.5 px-3">Atendimentos & Caixa</p>
          
          {/* Item Ativo (Exemplo: Visão Geral / Dashboard) */}
          <Link className={getItemClass('/')} to="/">
            <LayoutDashboard size={16}/> Visão Geral
          </Link>
          
          <Link className={getItemClass('/agendamentos')} to="/agendamentos">
            <Calendar size={16}/> Agendamentos
          </Link>
          
          <Link className={getItemClass('/pdv')} to="/pdv">
            <MonitorSmartphone size={16}/> PDV & Caixa do Dia
          </Link>
          
          {/* MÓDULO FINANCEIRO: EXCLUSIVO SE ATIVO NO SUPERADMIN */}
          {temModuloFinanceiro && (
            <Link className={getItemClass('/gastos')} to="/gastos">
              <Receipt size={16}/> Controle de Gastos
            </Link>
          )}


          {/* CATEGORIA: GESTÃO DA BARBEARIA */}
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-5 mb-1.5 px-3">Gestão da Barbearia</p>
          
          <Link className={getItemClass('/profissionais', true)} to="/profissionais">
            <div className="flex items-center gap-2.5"><Users size={16}/> Profissionais</div>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
              {profissionaisList.length}/{limiteCadeirasBadge}
            </span>
          </Link>
          
          <Link className={getItemClass('/servicos', true)} to="/servicos">
            <div className="flex items-center gap-2.5"><Scissors size={16}/> Serviços & Preços</div>
            <span className="text-[9px] bg-white/5 text-zinc-400 px-1.5 py-0.5 rounded-full font-semibold">
              {servicesList.length}
            </span>
          </Link>
          
          <Link className={getItemClass('/estoque')} to="/estoque">
            <Package size={16}/> Produtos & Estoque
          </Link>

          <Link className={getItemClass('/vitrine', true)} to="/vitrine">
            <div className="flex items-center gap-2.5"><Store size={16}/> Meu Espaço & Vitrine</div>
            <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-full border border-amber-500/20 font-semibold">Vitrine</span>
          </Link>

          <Link className={getItemClass('/clientes')} to="/clientes">
            <UsersRound size={16}/> Base de Clientes
          </Link>

          {/* MÓDULO CLUBE DE ASSINATURAS: EXCLUSIVO SE ATIVO NO SUPERADMIN */}
          {temModuloClube && (
            <Link className={getItemClass('/clube', true)} to="/clube">
              <div className="flex items-center gap-2.5"><Crown size={16}/> Clube de Assinaturas</div>
              <span className="text-[9px] bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded-full border border-orange-500/20 font-semibold shadow-[0_0_10px_rgba(249,115,22,0.2)]">VIP</span>
            </Link>
          )}


          {/* CATEGORIA: CONFIGURAÇÕES & INTEGRAÇÕES */}
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-5 mb-1.5 px-3">Config. & Integrações</p>
          
          <Link className={getItemClass('/regras')} to="/regras">
            <Settings size={16}/> Regras da Agenda
          </Link>
          
          {/* MÓDULO WHATSAPP: EXCLUSIVO SE ATIVO NO SUPERADMIN */}
          {temModuloWhatsApp && (
            <Link className={getItemClass('/whatsapp', true)} to="/whatsapp">
              <div className="flex items-center gap-2.5"><MessageCircle size={16}/> WhatsApp Conexão</div>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>Online</span>
            </Link>
          )}

          {/* MÓDULO SPLIT DE PAGAMENTOS & TERMINAIS: EXCLUSIVO SE ATIVO NO SUPERADMIN */}
          {temModuloSplit && (
            <Link className={getItemClass('/split', true)} to="/split">
              <div className="flex items-center gap-2.5"><GitFork size={16}/> Split & Terminais</div>
              <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded-full border border-indigo-500/20 font-semibold">D+0</span>
            </Link>
          )}

        </div>

        {/* Perfil no Rodapé */}
        <div className="pt-4 mt-8 border-t border-white/[0.05] shrink-0">
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-400 font-bold flex items-center justify-center text-xs shrink-0">
                {(user.nome || user.name || 'CO').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {user.nome || user.name || 'Carlos Oliveira'}
                </div>
                <div className="text-xs text-zinc-400 truncate">
                  {user.papel === 'dono' || user.papel === 'superadmin' ? 'Administrador' : 'Barbeiro'}
                </div>
              </div>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                title="Encerrar Sessão"
                className="p-1.5 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Área Principal */}
      <main className="flex-1 h-full flex flex-col pt-4 pr-6 pb-6 overflow-y-auto custom-scrollbar relative z-10 gap-5">
        <Routes>
          <Route path="/" element={<VisaoGeral />} />
          <Route path="/dashboard" element={<VisaoGeral />} />
          <Route
            path="/agendamentos"
            element={
              <AgendaManager
                barbearia={validBarbearia}
                profissionaisList={profissionaisList}
                servicesList={servicesList}
              />
            }
          />
          <Route path="/grade" element={<AgendaView barbearia={barbearia} />} />
          <Route path="/agenda" element={<AgendaView barbearia={barbearia} />} />
          <Route
            path="/pdv"
            element={
              <ProdutosManager
                barbearia={validBarbearia}
                servicesList={servicesList}
                profissionaisList={profissionaisList}
              />
            }
          />
          <Route
            path="/comandas"
            element={
              <ProdutosManager
                barbearia={validBarbearia}
                servicesList={servicesList}
                profissionaisList={profissionaisList}
              />
            }
          />
          <Route
            path="/gastos"
            element={
              temModuloFinanceiro ? (
                <RelatoriosManager
                  barbearia={validBarbearia}
                  profissionaisList={profissionaisList}
                />
              ) : (
                <ModuloBloqueadoView modulo="Controle Financeiro / Gastos" />
              )
            }
          />
          <Route
            path="/profissionais"
            element={
              <ProfissionaisManager
                barbearia={validBarbearia}
                servicesList={servicesList}
              />
            }
          />
          <Route
            path="/servicos"
            element={<ServicosManager barbearia={validBarbearia} />}
          />
          <Route
            path="/estoque"
            element={
              <ProdutosManager
                barbearia={validBarbearia}
                servicesList={servicesList}
                profissionaisList={profissionaisList}
              />
            }
          />
          <Route
            path="/produtos"
            element={
              <ProdutosManager
                barbearia={validBarbearia}
                servicesList={servicesList}
                profissionaisList={profissionaisList}
              />
            }
          />
          <Route
            path="/vitrine"
            element={
              <VitrineView
                barbearia={validBarbearia}
                onBarbeariaUpdated={onBarbeariaUpdated}
                onOpenVitrine={onOpenVitrine}
              />
            }
          />
          <Route
            path="/clientes"
            element={
              <BaseClientesView barbearia={validBarbearia} />
            }
          />
          <Route
            path="/clube"
            element={
              temModuloClube ? (
                <ClubeVipManager
                  barbearia={validBarbearia}
                  servicesList={servicesList}
                  profissionaisList={profissionaisList}
                />
              ) : (
                <ModuloBloqueadoView modulo="Clube de Assinaturas" />
              )
            }
          />
          <Route
            path="/clube_vip"
            element={
              temModuloClube ? (
                <ClubeVipManager
                  barbearia={validBarbearia}
                  servicesList={servicesList}
                  profissionaisList={profissionaisList}
                />
              ) : (
                <ModuloBloqueadoView modulo="Clube de Assinaturas" />
              )
            }
          />
          <Route path="/regras" element={<AgendaView barbearia={barbearia} />} />
          <Route
            path="/whatsapp"
            element={
              temModuloWhatsApp ? (
                <WhatsAppManager
                  barbearia={validBarbearia}
                  onBarbeariaUpdated={onBarbeariaUpdated}
                />
              ) : (
                <ModuloBloqueadoView modulo="WhatsApp & Automações" />
              )
            }
          />
          <Route
            path="/automacoes"
            element={
              temModuloWhatsApp ? (
                <WhatsAppManager
                  barbearia={validBarbearia}
                  onBarbeariaUpdated={onBarbeariaUpdated}
                />
              ) : (
                <ModuloBloqueadoView modulo="WhatsApp & Automações" />
              )
            }
          />
          <Route
            path="/mensagens"
            element={
              temModuloWhatsApp ? (
                <MensagensConfigView
                  barbearia={validBarbearia}
                  onBarbeariaUpdated={onBarbeariaUpdated}
                />
              ) : (
                <ModuloBloqueadoView modulo="WhatsApp & Automações" />
              )
            }
          />
          <Route
            path="/templates_whatsapp"
            element={
              temModuloWhatsApp ? (
                <MensagensConfigView
                  barbearia={validBarbearia}
                  onBarbeariaUpdated={onBarbeariaUpdated}
                />
              ) : (
                <ModuloBloqueadoView modulo="WhatsApp & Automações" />
              )
            }
          />
          <Route
            path="/relatorios"
            element={
              temModuloFinanceiro ? (
                <RelatoriosManager
                  barbearia={validBarbearia}
                  profissionaisList={profissionaisList}
                />
              ) : (
                <ModuloBloqueadoView modulo="Relatórios e Finanças" />
              )
            }
          />
          <Route
            path="/split"
            element={
              temModuloSplit ? (
                <SplitPaymentView
                  barbearia={validBarbearia}
                  onBarbeariaUpdated={onBarbeariaUpdated}
                />
              ) : (
                <ModuloBloqueadoView modulo="Split de Pagamentos Asaas" />
              )
            }
          />
          <Route
            path="/plano_saas"
            element={
              <PlanoAssinaturaManager
                user={user}
                barbearia={validBarbearia}
                onBarbeariaUpdated={onBarbeariaUpdated || (() => {})}
              />
            }
          />
          <Route path="*" element={<VisaoGeral />} />
        </Routes>
      </main>
    </div>
  );
};
