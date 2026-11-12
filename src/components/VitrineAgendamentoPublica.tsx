import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Scissors,
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Crown,
  Sparkles,
  ArrowRight,
  MessageCircle,
  RefreshCw,
  Store,
  Search,
  Share2,
  Star,
  Ticket,
  Heart,
  Camera,
  Instagram,
  MapPin,
  Zap,
  Layers,
  Gem,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  ShieldCheck,
  Check,
  Lock,
  CreditCard,
  Gift,
  Tag,
  UserCheck,
  BadgeCheck
} from 'lucide-react';
import { NavilleLogo } from './NavilleLogo';
import { SuccessLottieAnimation } from './SuccessLottieAnimation';
import {
  pb,
  Barbearia,
  Servico,
  Profissional,
  Cliente,
  PlanoAssinatura,
  Agendamento,
  BloqueioHorario,
  ValidacaoVipResult,
  CategoriaServico,
  AssinaturaVip,
  ClubePlano,
  ClubeMembro,
  barbeariasService,
  servicosService,
  profissionaisService,
  agendamentosService,
  bloqueiosService,
  clientesService,
  planosService,
  clubePlanosService,
  clubeMembrosService,
  validarElegibilidadeVip
} from '../services/pocketbase';
import {
  validateContiguousSlots,
  generateDayTimeSlots,
  minutesToTime,
  timeToMinutes,
  DEFAULT_OPENING_TIME,
  DEFAULT_CLOSING_TIME
} from '../services/slotEngine';

interface VitrineAgendamentoPublicaProps {
  slug: string;
  onVoltarPainel?: () => void;
  isAdminLoggedIn?: boolean;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6; // 6 = tela de sucesso

export const VitrineAgendamentoPublica: React.FC<VitrineAgendamentoPublicaProps> = ({
  slug,
  onVoltarPainel,
  isAdminLoggedIn = false
}) => {
  // 1. Dados dinâmicos da Barbearia & Categorias
  const [barbearia, setBarbearia] = useState<Barbearia | null>(null);
  const [categorias, setCategorias] = useState<CategoriaServico[]>([]);
  const [featuredService, setFeaturedService] = useState<Servico | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Etapa atual
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Etapa 1: Serviços & Filtros
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Etapa 2: Barbeiro Selecionado ('qualquer' ou ID do profissional)
  const [selectedBarbeiroId, setSelectedBarbeiroId] = useState<string>('qualquer');

  // Etapa 3: Data e Horário
  const getTodayIso = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayIso());
  const [selectedHorario, setSelectedHorario] = useState<string>('');
  const [assignedBarbeiroId, setAssignedBarbeiroId] = useState<string>('');
  const [dayAgendamentos, setDayAgendamentos] = useState<Agendamento[]>([]);
  const [dayBloqueios, setDayBloqueios] = useState<BloqueioHorario[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Etapa 4: Identificação & Clube VIP
  const [clienteNome, setClienteNome] = useState<string>('');
  const [clienteTelefone, setClienteTelefone] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [searchingVip, setSearchingVip] = useState(false);
  const [assinaturaVipAtiva, setAssinaturaVipAtiva] = useState<AssinaturaVip | null>(null);
  const [clienteVip, setClienteVip] = useState<Cliente | null>(null);
  const [planoVip, setPlanoVip] = useState<PlanoAssinatura | null>(null);
  const [vipResult, setVipResult] = useState<ValidacaoVipResult | null>(null);

  // Clube de Assinaturas & Área de Membros (Módulo Clube de Assinaturas)
  const [isClubeModalOpen, setIsClubeModalOpen] = useState<boolean>(false);
  const [membroClube, setMembroClube] = useState<ClubeMembro | null>(null);
  const [clubeTelefoneInput, setClubeTelefoneInput] = useState<string>('');
  const [clubeNomeInput, setClubeNomeInput] = useState<string>('');
  const [clubeLoading, setClubeLoading] = useState<boolean>(false);
  const [clubeError, setClubeError] = useState<string | null>(null);
  const [agendamentoVipAtivo, setAgendamentoVipAtivo] = useState<boolean>(false);

  // Acessar Clube de Assinaturas & Área de Membros
  const handleAcessarClube = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setClubeError(null);

    const cleanPhone = clubeTelefoneInput.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      setClubeError('Informe um telefone válido para acessar o clube.');
      return;
    }

    if (!barbearia?.id) return;

    try {
      setClubeLoading(true);
      const membro = await clubeMembrosService.buscarMembro(barbearia.id, cleanPhone);

      if (!membro) {
        setClubeError('Assinante não encontrado com este número. Solicite seu cadastro no balcão da barbearia.');
        return;
      }

      // Regra de validação: se status !== 'ativo', bloquear o acesso com alerta obrigatório:
      // "Assinatura inativa ou cancelada. Regularize no balcão."
      if (membro.status !== 'ativo') {
        setClubeError('Assinatura inativa ou cancelada. Regularize no balcão.');
        return;
      }

      // Se não tiver o plano expandido, carrega
      if (!membro.expand?.plano && membro.plano) {
        const p = await clubePlanosService.getOne(membro.plano);
        if (p) {
          membro.expand = { ...membro.expand, plano: p };
        }
      }

      setMembroClube(membro);
      setClubeError(null);
      setAgendamentoVipAtivo(true);

      // Sincroniza nome e telefone no agendamento
      if (membro.nome && !clienteNome) setClienteNome(membro.nome);
      if (membro.telefone && !clienteTelefone) setClienteTelefone(membro.telefone);
    } catch (err: any) {
      console.error('Erro ao consultar membro do clube:', err);
      setClubeError('Não foi possível validar o acesso no momento.');
    } finally {
      setClubeLoading(false);
    }
  };

  const handleSairClube = () => {
    setMembroClube(null);
    setAgendamentoVipAtivo(false);
    setClubeError(null);
    setClubeTelefoneInput('');
    setClubeNomeInput('');
  };

  // Etapa 5 & 6: Confirmação e Sucesso
  const [submitting, setSubmitting] = useState(false);
  const [agendamentoConfirmado, setAgendamentoConfirmado] = useState<Agendamento | null>(null);

  // Helpers de mídia e fotos via PocketBase
  const getFotoCapaUrl = (barb: Barbearia) => {
    if (barb.foto_capa) {
      return pb.files.getUrl(barb, barb.foto_capa);
    }
    return barb.foto_capa_url || 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80';
  };

  const getLogoUrl = (barb: Barbearia) => {
    if (barb.logo) {
      return pb.files.getUrl(barb, barb.logo);
    }
    return barb.logo_url || '';
  };

  const getServiceThumbnail = (serv: Servico) => {
    if (serv.foto) {
      return pb.files.getUrl(serv, serv.foto);
    }
    if (serv.foto_url) return serv.foto_url;
    const nome = serv.nome.toLowerCase();
    if (nome.includes('cabelo') && nome.includes('barba')) {
      return 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=400&q=80';
    }
    if (nome.includes('barba')) {
      return 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=400&q=80';
    }
    if (nome.includes('sobrancelha') || nome.includes('estet') || nome.includes('pele')) {
      return 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=400&q=80';
    }
    if (nome.includes('pezinho') || nome.includes('acabamento') || nome.includes('navalha')) {
      return 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=400&q=80';
    }
    return 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=400&q=80';
  };

  // Cálculo dinâmico de status "Aberto agora"
  const statusFuncionamento = useMemo(() => {
    if (!barbearia) {
      return { aberto: true, texto: 'Aberto hoje até 20:00', subtexto: 'Segunda a Sábado • 09:00 às 20:00' };
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const aberturaStr = barbearia.horario_abertura || '09:00';
    const fechamentoStr = barbearia.horario_fechamento || '20:00';

    const [hA, mA] = aberturaStr.split(':').map(Number);
    const [hF, mF] = fechamentoStr.split(':').map(Number);
    const minAbertura = (hA || 9) * 60 + (mA || 0);
    const minFechamento = (hF || 20) * 60 + (mF || 0);

    const estaAberto = currentMinutes >= minAbertura && currentMinutes < minFechamento;
    if (estaAberto) {
      return {
        aberto: true,
        texto: `Aberto hoje até ${fechamentoStr}`,
        subtexto: `Segunda a Sábado • ${aberturaStr} às ${fechamentoStr}`
      };
    } else {
      return {
        aberto: false,
        texto: `Fechado agora • Abre às ${aberturaStr}`,
        subtexto: `Segunda a Sábado • ${aberturaStr} às ${fechamentoStr}`
      };
    }
  }, [barbearia]);

  // Carregamento dinâmico do Tenant e seus dados
  useEffect(() => {
    const fetchBarbeariaData = async () => {
      try {
        setLoading(true);
        setNotFound(false);
        setErrorMsg(null);

        const cleanSlug = slug.trim().toLowerCase();
        let barb: Barbearia | null = null;

        // 1. Mapeamento do Tenant via getFirstListItem com fallback
        try {
          barb = await pb.collection('barbearias').getFirstListItem<Barbearia>(`slug="${cleanSlug}"`);
        } catch {
          barb = await barbeariasService.getBySlug(cleanSlug);
        }

        if (!barb) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setBarbearia(barb);

        // 2. Busca paralela: Categorias, Destaque da Semana, Serviços e Profissionais
        const [catsRes, servList, profList] = await Promise.all([
          // Categorias cadastradas da barbearia
          pb.collection('categorias_servicos')
            .getFullList<CategoriaServico>({
              filter: `barbearia = "${barb.id}"`,
              sort: 'ordem'
            })
            .catch(() => [] as CategoriaServico[]),

          // Serviços da barbearia
          servicosService.list(barb.id).catch(() => [] as Servico[]),

          // Profissionais da barbearia
          profissionaisService.list(barb.id).catch(() => [] as Profissional[])
        ]);

        const servAtivos = servList.filter(s => s.ativo);
        const profAtivos = profList.filter(p => p.ativo && p.tipo_atendimento !== 'ordem_chegada');

        setCategorias(catsRes);
        setServicos(servAtivos);
        setProfissionais(profAtivos);

        // Busca serviço com destaque = true
        try {
          const destaques = await pb.collection('servicos').getFullList<Servico>({
            filter: `barbearia_id = "${barb.id}" && destaque = true`
          });
          if (destaques.length > 0) {
            setFeaturedService(destaques[0]);
          } else {
            // Se nenhum tiver destaque marcado, pode verificar combo
            const comboDestaque = servAtivos.find(s => s.categoria === 'combos' || s.nome.toLowerCase().includes('combo'));
            setFeaturedService(comboDestaque || null);
          }
        } catch {
          const comboDestaque = servAtivos.find(s => s.categoria === 'combos');
          setFeaturedService(comboDestaque || null);
        }

      } catch (err: any) {
        console.error('Erro ao carregar dados da vitrine pública:', err);
        setErrorMsg('Não foi possível carregar a vitrine da barbearia.');
      } finally {
        setLoading(false);
      }
    };

    fetchBarbeariaData();
  }, [slug]);

  // Carregar agendamentos e bloqueios ao mudar a data ou barbearia
  const loadSlotsData = useCallback(async () => {
    if (!barbearia?.id) return;
    try {
      setLoadingSlots(true);
      const [ags, bls] = await Promise.all([
        agendamentosService.list(barbearia.id, selectedDate),
        bloqueiosService.list(barbearia.id, selectedDate)
      ]);
      setDayAgendamentos(ags);
      setDayBloqueios(bls);
    } catch (e) {
      console.warn('Erro ao carregar disponibilidade de slots:', e);
    } finally {
      setLoadingSlots(false);
    }
  }, [barbearia?.id, selectedDate]);

  useEffect(() => {
    if (barbearia?.id) {
      loadSlotsData();
    }
  }, [barbearia?.id, selectedDate, loadSlotsData]);

  // Filtragem de profissionais elegíveis considerando o perfil VIP vs Público Geral
  const barbeirosElegiveis = useMemo(() => {
    if (membroClube || agendamentoVipAtivo) {
      // No Agendamento VIP: listar apenas profissionais elegíveis ('hibrido_clube_geral' ou 'exclusivo_clube')
      // omitindo barbeiros que atendem estritamente público avulso ('agendamento_geral' ou 'agenda')
      return profissionais.filter(p =>
        p.tipo_atendimento === 'hibrido_clube_geral' ||
        p.tipo_atendimento === 'exclusivo_clube' ||
        p.tipo_atendimento === 'ambos' ||
        p.aceita_clube
      );
    } else {
      // Público avulso: omitir barbeiros que são exclusivos do Clube
      return profissionais.filter(p => p.tipo_atendimento !== 'exclusivo_clube');
    }
  }, [profissionais, membroClube, agendamentoVipAtivo]);

  // Se o profissional selecionado não estiver mais elegível na lista, reseta para 'qualquer'
  useEffect(() => {
    if (selectedBarbeiroId !== 'qualquer') {
      const existe = barbeirosElegiveis.some(p => p.id === selectedBarbeiroId);
      if (!existe) {
        setSelectedBarbeiroId('qualquer');
      }
    }
  }, [barbeirosElegiveis, selectedBarbeiroId]);

  // Totais de serviços selecionados (Duração e Valor bruto)
  const { duracaoTotalMinutos, valorTotal, servicosNomes, servicosSelecionados } = useMemo(() => {
    const map = new Map(servicos.map(s => [s.id, s]));
    let duracao = 0;
    let valor = 0;
    const nomes: string[] = [];
    const selecionados: Servico[] = [];

    for (const id of selectedServiceIds) {
      const s = map.get(id);
      if (s) {
        duracao += s.duracao_minutos;
        valor += s.preco;
        nomes.push(s.nome);
        selecionados.push(s);
      }
    }
    return {
      duracaoTotalMinutos: duracao,
      valorTotal: valor,
      servicosNomes: nomes,
      servicosSelecionados: selecionados
    };
  }, [selectedServiceIds, servicos]);

  const normalizeText = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  // Categorias disponíveis dinâmicas (de categorias_servicos ou derivadas de servicos)
  const categoriasDisponiveis = useMemo(() => {
    if (categorias.length > 0) {
      const lista = [
        { id: 'todos', label: 'Todos', count: servicos.length },
        ...categorias.map(cat => ({
          id: cat.id,
          label: cat.nome,
          count: servicos.filter(s => {
            if (s.categoria_id && s.categoria_id === cat.id) return true;
            const nomeNorm = normalizeText(s.nome);
            const catNorm = normalizeText(s.categoria || '');
            const targetNorm = normalizeText(cat.nome);
            return catNorm === targetNorm || catNorm.includes(targetNorm) || nomeNorm.includes(targetNorm);
          }).length
        }))
      ];
      return lista;
    }

    // Fallback: agrupa por servicos.categoria existentes
    const categoriasBase = [
      { id: 'todos', label: 'Todos' },
      { id: 'cabelo', label: 'Cabelo' },
      { id: 'barba', label: 'Barba' },
      { id: 'combos', label: 'Combos VIP' },
      { id: 'tratamento', label: 'Estética' }
    ];

    return categoriasBase.map(cat => ({
      ...cat,
      count: cat.id === 'todos'
        ? servicos.length
        : servicos.filter(s => s.categoria === cat.id || normalizeText(s.nome).includes(cat.id)).length
    }));
  }, [categorias, servicos]);

  // Filtro de Serviços
  const servicosFiltrados = useMemo(() => {
    const termo = normalizeText(searchTerm.trim());

    return servicos.filter(servico => {
      let matchesCat = true;
      if (activeCategory !== 'todos') {
        const catObj = categoriasDisponiveis.find(c => c.id === activeCategory);
        const targetLabel = catObj ? normalizeText(catObj.label) : activeCategory;
        const servCat = normalizeText(servico.categoria || '');
        const servNome = normalizeText(servico.nome);
        matchesCat = servico.categoria_id === activeCategory ||
          servCat.includes(targetLabel) ||
          targetLabel.includes(servCat) ||
          servNome.includes(targetLabel);
      }

      const matchesSearch = termo.length === 0 ||
        normalizeText(`${servico.nome} ${servico.descricao || ''}`).includes(termo);

      return matchesCat && matchesSearch;
    });
  }, [servicos, activeCategory, searchTerm, categoriasDisponiveis]);

  // Formatação de máscara do telefone brasileiro
  const formatTelefone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = formatTelefone(e.target.value);
    setClienteTelefone(masked);
  };

  // 3. Verificacao em tempo real do Clube VIP no PocketBase (assinaturas_vip ou clientes)
  useEffect(() => {
    if (!barbearia?.id) return;
    const digits = clienteTelefone.replace(/\D/g, '');

    if (digits.length < 10) {
      setAssinaturaVipAtiva(null);
      setClienteVip(null);
      setPlanoVip(null);
      setVipResult(null);
      setSearchingVip(false);
      return;
    }

    let isCurrent = true;
    const checkVip = async () => {
      setSearchingVip(true);
      try {
        // 1. Consulta prioritária na coleção 'clube_membros' (Módulo Clube de Assinaturas)
        try {
          const membroFound = await clubeMembrosService.buscarMembro(barbearia.id, digits);
          if (membroFound && isCurrent) {
            if (membroFound.status === 'ativo') {
              setMembroClube(membroFound);
              setAgendamentoVipAtivo(true);
              if (!clienteNome.trim() && membroFound.nome) {
                setClienteNome(membroFound.nome);
              }
            }
          }
        } catch (eClube) {
          console.warn('Consulta em clube_membros:', eClube);
        }

        // 2. Consulta primária na coleção 'assinaturas_vip'
        try {
          const vipRecords = await pb.collection('assinaturas_vip').getFullList<AssinaturaVip>({
            filter: `barbearia = "${barbearia.id}" && cliente_telefone ~ "${digits}" && ativo = true`
          });

          if (vipRecords.length > 0 && isCurrent) {
            const vip = vipRecords[0];
            setAssinaturaVipAtiva(vip);
            if (!clienteNome.trim() && vip.cliente_nome) {
              setClienteNome(vip.cliente_nome);
            }
            setSearchingVip(false);
            return;
          }
        } catch (errVip) {
          console.warn('Consulta em assinaturas_vip:', errVip);
        }

        // Consulta de fallback na coleção 'clientes' / 'planos_assinatura'
        const clienteFound = await clientesService.getByTelefone(barbearia.id, digits);
        if (!isCurrent) return;

        if (clienteFound) {
          if (!clienteNome.trim()) {
            setClienteNome(clienteFound.nome);
          }
          setClienteVip(clienteFound);

          if (clienteFound.plano_assinatura_id) {
            let plano = clienteFound.expand?.plano_assinatura_id as PlanoAssinatura | undefined;
            if (!plano) {
              try {
                plano = await planosService.getOne(clienteFound.plano_assinatura_id);
              } catch (e) {
                console.warn('Plano associado:', e);
              }
            }

            if (plano && isCurrent) {
              setPlanoVip(plano);
              const barbIdParaChecar = selectedBarbeiroId !== 'qualquer' ? selectedBarbeiroId : undefined;
              const result = validarElegibilidadeVip(clienteFound, plano, {
                dataIso: selectedDate,
                barbeiroId: barbIdParaChecar
              });
              setVipResult(result);
            }
          }
        } else {
          setAssinaturaVipAtiva(null);
          setClienteVip(null);
          setPlanoVip(null);
          setVipResult(null);
        }
      } catch (err) {
        console.warn('Erro na checagem VIP:', err);
      } finally {
        if (isCurrent) setSearchingVip(false);
      }
    };

    const timer = setTimeout(checkVip, 350);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [clienteTelefone, barbearia?.id, selectedDate, selectedBarbeiroId]);

  // Cálculo do valor final com abatimento dos benefícios do Clube VIP
  const { valorFinal, descontoTotalVip, servicosDetalhadosComVip, isVipBeneficiario } = useMemo(() => {
    let desconto = 0;
    const isVip = !!assinaturaVipAtiva?.ativo || (vipResult?.elegivel && !!planoVip);

    const detalhados = servicosSelecionados.map(serv => {
      let isCoberto = false;
      let precoFinal = serv.preco;

      if (isVip) {
        // Se assinaturaVip direta: abate serviços elegíveis
        if (assinaturaVipAtiva) {
          isCoberto = true;
          precoFinal = 0;
          desconto += serv.preco;
        } else if (vipResult?.elegivel && planoVip) {
          const cobertoPorLista = Array.isArray(planoVip.servicos_inclusos) && planoVip.servicos_inclusos.includes(serv.id);
          const cobertoPorBarba = planoVip.permite_barba && (serv.categoria === 'barba' || serv.nome.toLowerCase().includes('barba'));
          if (cobertoPorLista || cobertoPorBarba) {
            isCoberto = true;
            precoFinal = 0;
            desconto += serv.preco;
          }
        }
      }

      return {
        ...serv,
        isCobertoVip: isCoberto,
        precoCobrado: precoFinal
      };
    });

    const valorComDesconto = Math.max(0, valorTotal - desconto);
    return {
      valorFinal: valorComDesconto,
      descontoTotalVip: desconto,
      servicosDetalhadosComVip: detalhados,
      isVipBeneficiario: isVip
    };
  }, [servicosSelecionados, valorTotal, assinaturaVipAtiva, vipResult, planoVip]);

  // Lista dos próximos dias liberados (respeita regras de bloqueio semanal da barbearia)
  const quickDays = useMemo(() => {
    const list: { iso: string; diaSemanaAbrev: string; diaNumero: number; diaMes: string }[] = [];
    const nomesSemanaAbrev = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    const nomesMes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    const limitarSemana = Boolean((barbearia as any)?.limitar_agendamento_semana);
    const diaLiberacao = (barbearia as any)?.dia_liberacao_agenda || 'domingo';
    const maxDiasConfig = Number((barbearia as any)?.dias_max_agendamento) || 7;

    let totalDiasExibir = 14;

    if (limitarSemana) {
      if (diaLiberacao === 'domingo' || diaLiberacao === 'segunda') {
        const hoje = new Date();
        const dayOfWeek = hoje.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
        // Se domingo à noite libera a semana, clientes só agendam até o fechamento do ciclo semanal
        const diasRestantesAteDomingo = dayOfWeek === 0 ? 7 : (7 - dayOfWeek);
        totalDiasExibir = Math.max(1, Math.min(diasRestantesAteDomingo + 1, maxDiasConfig));
      } else {
        totalDiasExibir = Math.max(1, Math.min(maxDiasConfig, 30));
      }
    }

    for (let i = 0; i < totalDiasExibir; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      list.push({
        iso,
        diaSemanaAbrev: i === 0 ? 'HOJE' : nomesSemanaAbrev[d.getDay()],
        diaNumero: d.getDate(),
        diaMes: `${d.getDate()} ${nomesMes[d.getMonth()]}`
      });
    }
    return list;
  }, [barbearia]);

  // Motor de cálculo de slots disponíveis
  const availableSlots = useMemo(() => {
    if (duracaoTotalMinutos <= 0) return [];

    const baseSlots = generateDayTimeSlots(
      barbearia?.horario_abertura || DEFAULT_OPENING_TIME,
      barbearia?.horario_fechamento || DEFAULT_CLOSING_TIME,
      30
    );
    const now = new Date();
    const isToday = selectedDate === getTodayIso();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return baseSlots.map(horarioSlot => {
      const slotMin = timeToMinutes(horarioSlot);
      const horarioFim = minutesToTime(slotMin + duracaoTotalMinutos);

      if (isToday && slotMin <= currentMinutes + 15) {
        return {
          horario: horarioSlot,
          horarioFim,
          disponivel: false,
          motivo: 'Horário já transcorrido hoje',
          barbeiroIdAtribuido: undefined
        };
      }

      if (selectedBarbeiroId !== 'qualquer') {
        const val = validateContiguousSlots({
          horarioInicio: horarioSlot,
          duracaoTotalMinutos,
          barbeiroId: selectedBarbeiroId,
          agendamentos: dayAgendamentos,
          bloqueios: dayBloqueios,
          closingTime: barbearia?.horario_fechamento || DEFAULT_CLOSING_TIME
        });

        return {
          horario: horarioSlot,
          horarioFim: val.horarioFim || horarioFim,
          disponivel: val.valido,
          motivo: val.motivo,
          barbeiroIdAtribuido: selectedBarbeiroId
        };
      }

      let barbeiroDisponivelId: string | undefined = undefined;
      let algumDisponivel = false;
      let ultimoMotivo = 'Sem barbeiros com janela disponível';

      for (const prof of profissionais) {
        const val = validateContiguousSlots({
          horarioInicio: horarioSlot,
          duracaoTotalMinutos,
          barbeiroId: prof.id,
          agendamentos: dayAgendamentos,
          bloqueios: dayBloqueios,
          closingTime: barbearia?.horario_fechamento || DEFAULT_CLOSING_TIME
        });

        if (val.valido) {
          algumDisponivel = true;
          barbeiroDisponivelId = prof.id;
          break;
        } else {
          ultimoMotivo = val.motivo || ultimoMotivo;
        }
      }

      return {
        horario: horarioSlot,
        horarioFim,
        disponivel: algumDisponivel,
        motivo: algumDisponivel ? undefined : ultimoMotivo,
        barbeiroIdAtribuido: barbeiroDisponivelId
      };
    });
  }, [duracaoTotalMinutos, selectedDate, selectedBarbeiroId, profissionais, dayAgendamentos, dayBloqueios, barbearia]);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : `/b/${slug}`;
  
  // Rotas de dados dinâmicas para ações
  const whatsAppUrl = useMemo(() => {
    const rawNumber = barbearia?.whatsapp || barbearia?.whatsapp_numero || '';
    const cleanNumber = rawNumber.replace(/\D/g, '');
    return cleanNumber ? `https://wa.me/${cleanNumber}` : '';
  }, [barbearia]);

  const instagramUrl = useMemo(() => {
    const handle = (barbearia?.instagram || barbearia?.instagram_perfil || '').replace('@', '').trim();
    return handle ? `https://instagram.com/${handle}` : '';
  }, [barbearia]);

  const mapsUrl = useMemo(() => {
    if (barbearia?.maps_url) return barbearia.maps_url;
    if (barbearia?.endereco) {
      return `https://maps.google.com/?q=${encodeURIComponent(`${barbearia.endereco} ${barbearia.cidade || ''}`)}`;
    }
    return `https://maps.google.com/?q=${encodeURIComponent(barbearia?.nome || 'Barbearia')}`;
  }, [barbearia]);

  const barbeariaInitials = (barbearia?.nome || 'NB')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${barbearia?.nome} • Agendamento Online`,
          text: `Agende seu horário na ${barbearia?.nome}.`,
          url: shareUrl
        });
        return;
      }
    } catch {}

    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link da vitrine copiado com sucesso.');
    } catch {
      alert(`Copie este link: ${shareUrl}`);
    }
  };

  const handleViewSpace = () => {
    document.getElementById('booking-profile')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleService = (id: string) => {
    setSelectedServiceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const barbeiroEfetivo = useMemo(() => {
    if (selectedBarbeiroId !== 'qualquer') {
      return profissionais.find(p => p.id === selectedBarbeiroId) || null;
    }
    if (assignedBarbeiroId) {
      return profissionais.find(p => p.id === assignedBarbeiroId) || null;
    }
    return profissionais[0] || null;
  }, [selectedBarbeiroId, assignedBarbeiroId, profissionais]);

  const handleSelectSlot = (horario: string, barbeiroIdAtribuido?: string) => {
    setSelectedHorario(horario);
    if (barbeiroIdAtribuido) {
      setAssignedBarbeiroId(barbeiroIdAtribuido);
    }
  };

  // Gravação do Agendamento no PocketBase
  const handleConfirmarAgendamento = async () => {
    if (!barbearia?.id || !barbeiroEfetivo?.id || !selectedHorario || selectedServiceIds.length === 0) {
      alert('Dados incompletos para efetuar o agendamento.');
      return;
    }

    if (!clienteNome.trim() || !clienteTelefone.trim()) {
      alert('Por favor, informe seu nome e telefone.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const obsFinal = observacoes.trim()
        ? `${observacoes.trim()} • [Vitrine Pública /b/${barbearia.slug}${isVipBeneficiario ? ' - Clube VIP' : ''}]`
        : `[Vitrine Pública /b/${barbearia.slug}${isVipBeneficiario ? ' - Clube VIP' : ''}]`;

      const novoAgendamento = await agendamentosService.create({
        barbearia_id: barbearia.id,
        barbeiro_id: barbeiroEfetivo.id,
        cliente_nome: clienteNome.trim(),
        cliente_telefone: clienteTelefone.trim(),
        servicos_ids: selectedServiceIds,
        data: selectedDate,
        horario: selectedHorario,
        duracao_total_minutos: duracaoTotalMinutos,
        valor_total: valorFinal,
        status: 'pendente',
        observacoes: obsFinal
      });

      // A confirmação via WhatsApp (Evolution API + histórico) é disparada automaticamente em agendamentosService.create

      // Base de clientes
      try {
        if (!clienteVip && !assinaturaVipAtiva) {
          await clientesService.create({
            barbearia_id: barbearia.id,
            nome: clienteNome.trim(),
            telefone: clienteTelefone.trim(),
            status_assinatura: 'sem_plano',
            total_visitas: 1,
            total_gasto: valorFinal,
            cortes_utilizados_mes: 0
          });
        } else if (clienteVip?.id && vipResult?.elegivel) {
          await clientesService.incrementarCorte(clienteVip.id);
        }
      } catch (errCli) {
        console.warn('Registro cliente:', errCli);
      }

      setAgendamentoConfirmado(novoAgendamento);
      setCurrentStep(6);
    } catch (err: any) {
      console.error('Erro ao salvar agendamento:', err);
      setErrorMsg(err?.message || 'Falha ao confirmar o agendamento. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. SKELETON / LOADING ELEGANTE
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0B0F19', color: '#F8FAFC', display: 'flex', flexDirection: 'column', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {/* Header Skeleton */}
        <header style={{ height: '56px', backgroundColor: 'rgba(11, 15, 25, 0.95)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', padding: '0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '2rem', height: '2rem', borderRadius: '0.6rem', backgroundColor: '#1F2937' }} className="animate-pulse" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ width: '110px', height: '14px', backgroundColor: '#1F2937', borderRadius: '4px' }} className="animate-pulse" />
              <div style={{ width: '80px', height: '10px', backgroundColor: '#1F2937', borderRadius: '4px' }} className="animate-pulse" />
            </div>
          </div>
          <div style={{ width: '64px', height: '24px', borderRadius: '9999px', backgroundColor: '#1F2937' }} className="animate-pulse" />
        </header>

        {/* Hero Banner Skeleton */}
        <div style={{ width: '100%', height: '240px', backgroundColor: '#111827' }} className="animate-pulse" />

        {/* Card Skeleton */}
        <main style={{ flex: 1, width: '100%', maxWidth: '540px', margin: '0 auto', padding: '0 1rem', marginTop: '-2.75rem' }}>
          <div style={{ backgroundColor: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '1.5rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '4.2rem', height: '4.2rem', borderRadius: '1.1rem', backgroundColor: '#1F2937' }} className="animate-pulse" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ width: '60%', height: '18px', backgroundColor: '#1F2937', borderRadius: '4px' }} className="animate-pulse" />
                <div style={{ width: '40%', height: '12px', backgroundColor: '#1F2937', borderRadius: '4px' }} className="animate-pulse" />
              </div>
            </div>
            <div style={{ width: '100%', height: '44px', backgroundColor: '#0C121E', borderRadius: '1rem' }} className="animate-pulse" />
          </div>

          {/* Search Skeleton */}
          <div style={{ width: '100%', height: '42px', backgroundColor: '#111827', borderRadius: '1rem', marginTop: '1.25rem' }} className="animate-pulse" />

          {/* Cards Skeletons */}
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: '76px', backgroundColor: '#111827', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '1.15rem' }} className="animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // 4. TELA 404 LIMPA NO PADRÃO DARK
  if (notFound || !barbearia) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0B0F19',
        color: '#F8FAFC',
        padding: '2rem',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}>
        <div style={{
          maxWidth: '440px',
          width: '100%',
          backgroundColor: '#111827',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '1.5rem',
          padding: '2.5rem 1.75rem',
          textAlign: 'center',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)'
        }}>
          <div style={{
            width: '3.8rem',
            height: '3.8rem',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            color: '#EF4444'
          }}>
            <Store style={{ width: '1.8rem', height: '1.8rem' }} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, marginBottom: '0.45rem', color: '#ffffff' }}>
            Barbearia Não Encontrada
          </h2>
          <p style={{ color: '#9CA3AF', fontSize: '0.84rem', lineHeight: 1.55, marginBottom: '1.75rem' }}>
            Não localizamos nenhuma barbearia ativa vinculada ao endereço <code style={{ color: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>/b/{slug}</code>.
          </p>
          {onVoltarPainel ? (
            <button
              onClick={onVoltarPainel}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '9999px',
                backgroundColor: '#E5A96E',
                color: '#0B0F19',
                fontWeight: 900,
                fontSize: '0.85rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Voltar ao Painel Principal
            </button>
          ) : (
            <button
              onClick={() => window.location.href = '/'}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '9999px',
                backgroundColor: '#1E293B',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.85rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer'
              }}
            >
              Ir para Página Inicial
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0B0F19', color: '#F8FAFC', display: 'flex', flexDirection: 'column', fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      
      {/* 1. TOPO & HEADER SUPERIOR FIXO */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(11, 15, 25, 0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '2.1rem',
            height: '2.1rem',
            borderRadius: '0.6rem',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.35rem',
            boxShadow: '0 0 10px rgba(245, 158, 11, 0.2)'
          }}>
            <NavilleLogo className="w-full h-full text-amber-500" />
          </div>
          <div>
            <h1 style={{ fontSize: '0.88rem', fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, lineHeight: 1 }}>
              NAVILLE BARBER
            </h1>
            <p style={{ fontSize: '0.7rem', color: '#9CA3AF', margin: '2px 0 0 0', fontWeight: 500 }}>
              {barbearia?.nome ? `${barbearia.nome} • Agendamento` : 'Agendamento Online'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isAdminLoggedIn && onVoltarPainel && (
            <button
              onClick={onVoltarPainel}
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.3rem 0.65rem',
                borderRadius: '0.5rem',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                color: '#F59E0B',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                cursor: 'pointer'
              }}
            >
              Painel
            </button>
          )}

          {/* Botão de Destaque "Área VIP / Clube" */}
          <button
            type="button"
            onClick={() => setIsClubeModalOpen(true)}
            className="bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {membroClube
                ? `Membro ${membroClube.expand?.plano?.nome?.replace('Plano ', '') || 'VIP'}`
                : 'Área VIP / Clube'}
            </span>
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.3rem 0.75rem',
            borderRadius: '9999px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              boxShadow: '0 0 8px #10B981',
              display: 'inline-block'
            }} />
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#34D399' }}>
              Online
            </span>
          </div>
        </div>
      </header>

      {/* RENDERIZAÇÃO DAS ETAPAS 1 A 3 (TELA PRINCIPAL) */}
      {currentStep <= 3 && (
        <main className="flex-1 w-full max-w-lg mx-auto pb-28 relative" style={{ flex: 1, width: '100%', maxWidth: '540px', margin: '0 auto', paddingBottom: '7rem', position: 'relative' }}>
          
          {/* 1. BANNER HERO COM IMAGEM DE CAPA DINÂMICA */}
          <div style={{ position: 'relative', width: '100%', height: '240px', overflow: 'hidden', backgroundColor: '#070A10' }}>
            <img
              src={getFotoCapaUrl(barbearia)}
              alt={barbearia.nome}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(11,15,25,0.2) 50%, #0B0F19 100%)'
            }} />

            {/* Ações circulares translúcidas */}
            <div style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              right: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 10
            }}>
              <button
                onClick={() => {
                  if (onVoltarPainel) onVoltarPainel();
                }}
                aria-label="Voltar"
                style={{
                  width: '2.4rem',
                  height: '2.4rem',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 0, 0, 0.55)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <ChevronLeft style={{ width: '1.2rem', height: '1.2rem' }} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => alert('Barbearia adicionada aos favoritos!')}
                  aria-label="Favorito"
                  style={{
                    width: '2.4rem',
                    height: '2.4rem',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0, 0, 0, 0.55)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <Heart style={{ width: '1rem', height: '1rem' }} />
                </button>

                <button
                  onClick={handleShare}
                  aria-label="Compartilhar"
                  style={{
                    width: '2.4rem',
                    height: '2.4rem',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0, 0, 0, 0.55)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <Share2 style={{ width: '1rem', height: '1rem' }} />
                </button>
              </div>
            </div>

            {/* Botão Ver Espaço */}
            <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', zIndex: 10 }}>
              <button
                onClick={handleViewSpace}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 0.95rem',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Camera style={{ width: '0.95rem', height: '0.95rem', color: '#D1D5DB' }} />
                <span>Ver Espaço</span>
              </button>
            </div>
          </div>

          {/* 2. CARD PRINCIPAL DA BARBEARIA (Mapeamento do Tenant) */}
          <div className="relative z-20 px-4 -mt-12 sm:-mt-16" style={{ position: 'relative', zIndex: 20, padding: '0 1rem' }}>
            <div id="booking-profile" className="p-3.5 sm:p-5" style={{
              backgroundColor: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '1.5rem',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.65)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}>
              {/* Topo do Card: Logo + Dados + Calendário */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-[#0B0F19] border border-white/10 flex items-center justify-center shrink-0 barbearia-logo-box">
                      {getLogoUrl(barbearia) ? (
                        <img src={getLogoUrl(barbearia)} alt={barbearia.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 'clamp(1.1rem, 4vw, 1.4rem)', fontWeight: 900, color: '#F59E0B' }}>{barbeariaInitials}</span>
                      )}
                    </div>
                    {/* Status verde */}
                    <span style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: statusFuncionamento.aberto ? '#10B981' : '#F59E0B',
                      border: '2px solid #111827',
                      display: 'inline-block'
                    }} />
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: 'clamp(0.98rem, 3.8vw, 1.15rem)', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.25 }}>
                        {barbearia.nome}
                      </h2>
                      {/* Badge "VIP CLUB" condicional */}
                      {barbearia.vip_club_ativo && (
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 900,
                          letterSpacing: '0.04em',
                          color: '#F59E0B',
                          backgroundColor: 'rgba(245, 158, 11, 0.14)',
                          border: '1px solid rgba(245, 158, 11, 0.35)',
                          padding: '0.12rem 0.45rem',
                          borderRadius: '0.4rem',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap'
                        }}>
                          VIP CLUB
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                      <MapPin style={{ width: '0.85rem', height: '0.85rem', color: '#9CA3AF', flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {barbearia.cidade || 'Caconde'}{barbearia.estado ? `-${barbearia.estado}` : '-SP'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', color: '#F59E0B', gap: '1px', flexShrink: 0 }}>
                        <Star style={{ width: '0.8rem', height: '0.8rem', fill: '#F59E0B' }} />
                        <Star style={{ width: '0.8rem', height: '0.8rem', fill: '#F59E0B' }} />
                        <Star style={{ width: '0.8rem', height: '0.8rem', fill: '#F59E0B' }} />
                        <Star style={{ width: '0.8rem', height: '0.8rem', fill: '#F59E0B' }} />
                        <Star style={{ width: '0.8rem', height: '0.8rem', fill: '#F59E0B' }} />
                      </div>
                      <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#ffffff' }}>4.9</span>
                      <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>(380+ avaliações)</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const el = document.getElementById('sec-data-horario');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  aria-label="Abrir Calendário"
                  style={{
                    width: '2.4rem',
                    height: '2.4rem',
                    borderRadius: '0.8rem',
                    backgroundColor: '#1E293B',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#D1D5DB',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  <Calendar style={{ width: '1.1rem', height: '1.1rem' }} />
                </button>
              </div>

              {/* Status de funcionamento e Botões de Ação */}
              <div
                className="booking-status-box"
                style={{
                  backgroundColor: '#0C121E',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '1rem',
                  padding: '0.75rem 0.85rem'
                }}
              >
                {/* Linha do Status: Relógio + Texto sempre alinhados lado a lado */}
                <div className="booking-status-info" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                  <div style={{
                    width: '2.1rem',
                    height: '2.1rem',
                    borderRadius: '50%',
                    backgroundColor: statusFuncionamento.aberto ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    border: `1px solid ${statusFuncionamento.aberto ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Clock style={{ width: '1rem', height: '1rem', color: statusFuncionamento.aberto ? '#34D399' : '#F59E0B' }} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, color: statusFuncionamento.aberto ? '#34D399' : '#F59E0B', lineHeight: 1.25 }}>
                      {statusFuncionamento.texto}
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#9CA3AF', lineHeight: 1.25, whiteSpace: 'normal' }}>
                      {statusFuncionamento.subtexto}
                    </p>
                  </div>
                </div>

                {/* Botões dinâmicos de Ação: Zap, Instagram, ExternalLink (Maps) */}
                <div className="booking-status-actions">
                  {whatsAppUrl && (
                    <a
                      href={whatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="WhatsApp"
                      className="booking-btn-zap"
                    >
                      <MessageCircle style={{ width: '1rem', height: '1rem', fill: 'currentColor' }} />
                    </a>
                  )}

                  {instagramUrl && (
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="booking-btn-icon"
                    >
                      <Instagram style={{ width: '1rem', height: '1rem' }} />
                    </a>
                  )}

                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Localização / Maps"
                      className="booking-btn-icon"
                    >
                      <ExternalLink style={{ width: '1rem', height: '1rem' }} />
                    </a>
                  )}
                </div>
              </div>

              {/* Descrição de apresentação */}
              <div style={{
                backgroundColor: 'rgba(12, 18, 30, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '0.9rem',
                padding: '0.75rem 0.85rem'
              }}>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#D1D5DB', lineHeight: 1.5 }}>
                  {barbearia.descricao_espaco || barbearia.descricao || 'Ambiente climatizado, com barbearia clássica, toalha quente na navalha.'}
                </p>
              </div>
            </div>
          </div>

          {/* 3. BUSCA, DESTAQUE DA SEMANA & CARROSSEL DE CATEGORIAS */}
          <div style={{ padding: '0 1rem', marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
            {/* Input de busca */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Search style={{
                position: 'absolute',
                left: '1rem',
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
                placeholder="Buscar corte, barba, combo ou serviço..."
                style={{
                  width: '100%',
                  backgroundColor: '#111827',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '1rem',
                  padding: '0.75rem 1rem 0.75rem 2.6rem',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  outline: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)'
                }}
              />
            </div>

            {/* Card "DESTAQUE DA SEMANA" (Exibido dinamicamente se existir) */}
            {featuredService && (
              <div className="bg-[#121A2C] border border-amber-500/30 rounded-2xl p-3.5 shadow-xl relative overflow-hidden featured-service-card" style={{ backgroundColor: '#121A2C', border: '1px solid rgba(245, 158, 11, 0.28)', borderRadius: '1.35rem', boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)' }}>
                <div className="flex items-center justify-between gap-3 p-3.5" style={{ padding: '0.875rem' }}>
                  <div className="flex-1 min-w-0 flex flex-col gap-1" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <span style={{
                      display: 'inline-block',
                      alignSelf: 'flex-start',
                      fontSize: '0.65rem',
                      fontWeight: 900,
                      letterSpacing: '0.05em',
                      color: '#F59E0B',
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '9999px',
                      textTransform: 'uppercase'
                    }}>
                      DESTAQUE DA SEMANA
                    </span>
                    <h3 className="truncate text-sm sm:text-base font-bold text-white m-0" style={{ margin: 0, fontWeight: 900, color: '#ffffff', lineHeight: 1.25 }}>
                      {featuredService.nome}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#9CA3AF', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {featuredService.descricao || 'O serviço mais recomendado da casa.'}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 'clamp(0.88rem, 3.5vw, 1rem)', fontWeight: 900, color: '#ffffff', whiteSpace: 'nowrap' }}>
                        R$ {featuredService.preco.toFixed(2).replace('.', ',')}
                      </span>
                      <button
                        onClick={() => toggleService(featuredService.id)}
                        className="whitespace-nowrap px-3 py-1.5 rounded-full font-bold text-xs cursor-pointer border-none shadow-md transition-all"
                        style={{
                          padding: '0.38rem 0.85rem',
                          borderRadius: '9999px',
                          backgroundColor: selectedServiceIds.includes(featuredService.id) ? '#10B981' : '#E5A96E',
                          color: selectedServiceIds.includes(featuredService.id) ? '#ffffff' : '#0B0F19',
                          fontWeight: 900,
                          fontSize: '0.74rem',
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(229, 169, 110, 0.3)',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {selectedServiceIds.includes(featuredService.id) ? 'Selecionado ✓' : 'Selecionar'}
                      </button>
                    </div>
                  </div>

                  <img
                    src={getServiceThumbnail(featuredService)}
                    alt={featuredService.nome}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover shrink-0"
                    style={{
                      borderRadius: '0.85rem',
                      objectFit: 'cover',
                      backgroundColor: '#0B0F19',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      flexShrink: 0
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.85rem' }}>
                  <span style={{ width: '18px', height: '5px', borderRadius: '9999px', backgroundColor: '#E5A96E', display: 'inline-block' }} />
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#374151', display: 'inline-block' }} />
                </div>
              </div>
            )}

            {/* Categorias dinâmicas em pílulas */}
            <div
              className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                overflowX: 'auto',
                paddingTop: '0.25rem',
                paddingBottom: '0.35rem',
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {categoriasDisponiveis.map(cat => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap cursor-pointer transition-all border"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.55rem 0.95rem',
                      borderRadius: '0.85rem',
                      fontSize: '0.78rem',
                      fontWeight: isActive ? 900 : 700,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      backgroundColor: isActive ? '#E5A96E' : '#111827',
                      color: isActive ? '#0B0F19' : '#9CA3AF',
                      border: isActive ? 'none' : '1px solid rgba(255, 255, 255, 0.06)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {cat.id === 'todos' && <Layers style={{ width: '0.9rem', height: '0.9rem' }} />}
                    {cat.id !== 'todos' && cat.label.toLowerCase().includes('barba') && <Sparkles style={{ width: '0.9rem', height: '0.9rem' }} />}
                    {cat.id !== 'todos' && cat.label.toLowerCase().includes('cabelo') && <Scissors style={{ width: '0.9rem', height: '0.9rem' }} />}
                    {cat.id !== 'todos' && cat.label.toLowerCase().includes('combo') && <Crown style={{ width: '0.9rem', height: '0.9rem' }} />}
                    {cat.id !== 'todos' && (cat.label.toLowerCase().includes('estet') || cat.label.toLowerCase().includes('tratamento')) && <Gem style={{ width: '0.9rem', height: '0.9rem' }} />}
                    <span>{cat.label} ({cat.count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. LISTAGEM DE SERVIÇOS & ETAPA 1 */}
          <div style={{ padding: '0 1rem', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '0.82rem', fontWeight: 900, letterSpacing: '0.05em', color: '#D1D5DB', textTransform: 'uppercase', margin: 0 }}>
                1. SELECIONE O SERVIÇO ({selectedServiceIds.length})
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#F59E0B', fontWeight: 700 }}>
                <Clock style={{ width: '0.85rem', height: '0.85rem' }} />
                <span>{duracaoTotalMinutos > 0 ? `${duracaoTotalMinutos} min total` : '30 min total'}</span>
              </div>
            </div>

            {/* Cards de Serviços */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {servicosFiltrados.length === 0 ? (
                <div style={{ backgroundColor: '#111827', border: '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: '1rem', padding: '2rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.84rem' }}>
                  Nenhum serviço disponível nesta categoria no momento.
                </div>
              ) : (
                servicosFiltrados.map(serv => {
                  const isSelected = selectedServiceIds.includes(serv.id);
                  const isCombo = serv.duracao_minutos >= 45 || serv.categoria === 'combos' || serv.nome.includes('+');
                  return (
                    <div
                      key={serv.id}
                      onClick={() => toggleService(serv.id)}
                      style={{
                        backgroundColor: isSelected ? '#141D2E' : '#111827',
                        border: isSelected ? '1.5px solid #E5A96E' : '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '1.15rem',
                        padding: '0.85rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 8px 24px rgba(229, 169, 110, 0.15)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                        <div style={{
                          width: '3.4rem',
                          height: '3.4rem',
                          borderRadius: '0.85rem',
                          overflow: 'hidden',
                          backgroundColor: '#0B0F19',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          flexShrink: 0
                        }}>
                          <img
                            src={getServiceThumbnail(serv)}
                            alt={serv.nome}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h4 style={{
                            margin: 0,
                            fontSize: '0.9rem',
                            fontWeight: 900,
                            color: '#ffffff',
                            lineHeight: 1.25,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {serv.nome}
                          </h4>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                            {isCombo && (
                              <span style={{
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                color: '#F59E0B',
                                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                border: '1px solid rgba(245, 158, 11, 0.35)',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '0.35rem',
                                whiteSpace: 'nowrap'
                              }}>
                                2 Horários
                              </span>
                            )}
                            <span style={{
                              fontSize: '0.6rem',
                              fontWeight: 800,
                              color: '#9CA3AF',
                              backgroundColor: '#1E293B',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '0.35rem',
                              textTransform: 'uppercase',
                              whiteSpace: 'nowrap'
                            }}>
                              POPULAR
                            </span>
                          </div>

                          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <Clock style={{ width: '0.75rem', height: '0.75rem', color: '#6B7280', flexShrink: 0 }} />
                            <span>{serv.duracao_minutos} min</span>
                            <span>•</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {serv.descricao || 'Corte completo com lavagem e finalização.'}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#ffffff' }}>
                          R$ {serv.preco.toFixed(0)}
                        </span>
                        <div style={{
                          width: '1.35rem',
                          height: '1.35rem',
                          borderRadius: '50%',
                          border: isSelected ? '2px solid #E5A96E' : '2px solid #4B5563',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'transparent'
                        }}>
                          {isSelected && (
                            <div style={{ width: '0.65rem', height: '0.65rem', borderRadius: '50%', backgroundColor: '#E5A96E' }} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 5. ETAPA 2: ESCOLHA O PROFISSIONAL */}
          <div id="sec-barbeiros" style={{ padding: '0 1rem', marginTop: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '0.82rem', fontWeight: 900, letterSpacing: '0.05em', color: '#D1D5DB', textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>2. ESCOLHA O PROFISSIONAL</span>
                {(membroClube || agendamentoVipAtivo) && (
                  <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    VIP
                  </span>
                )}
              </h3>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#E5A96E' }}>Primeiro Livre</span>
            </div>

            {(membroClube || agendamentoVipAtivo) && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-amber-400 font-semibold">
                  <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Modo VIP • Listando apenas profissionais elegíveis ao Clube</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsClubeModalOpen(true)}
                  className="text-amber-300 underline font-medium hover:text-amber-200 cursor-pointer text-[11px]"
                >
                  Ver Benefícios
                </button>
              </div>
            )}

            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1.1rem',
              overflowX: 'auto',
              paddingBottom: '0.5rem',
              scrollbarWidth: 'none'
            }}>
              {/* Opção Primeiro Livre */}
              <div
                onClick={() => {
                  setSelectedBarbeiroId('qualquer');
                  setAssignedBarbeiroId('');
                }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', flexShrink: 0 }}
              >
                <div style={{
                  width: '3.6rem',
                  height: '3.6rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selectedBarbeiroId === 'qualquer' ? 'rgba(229, 169, 110, 0.15)' : '#111827',
                  border: selectedBarbeiroId === 'qualquer' ? '2px solid #E5A96E' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: selectedBarbeiroId === 'qualquer' ? '#E5A96E' : '#9CA3AF'
                }}>
                  <Zap style={{ width: '1.5rem', height: '1.5rem', fill: 'currentColor' }} />
                </div>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#ffffff', textAlign: 'center' }}>Primeiro Livre</span>
                <span style={{ fontSize: '0.65rem', color: '#6B7280', textAlign: 'center' }}>Mais rápido</span>
              </div>

              {/* Barbeiros Elegíveis da Barbearia */}
              {barbeirosElegiveis.map(prof => {
                const isSelected = selectedBarbeiroId === prof.id;
                const isExclusivoClube = prof.tipo_atendimento === 'exclusivo_clube';
                const isHibrido = prof.tipo_atendimento === 'hibrido_clube_geral' || prof.tipo_atendimento === 'ambos';

                return (
                  <div
                    key={prof.id}
                    onClick={() => {
                      setSelectedBarbeiroId(prof.id);
                      setAssignedBarbeiroId('');
                    }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', flexShrink: 0, position: 'relative' }}
                  >
                    {isExclusivoClube ? (
                      <span style={{
                        position: 'absolute',
                        top: '-6px',
                        zIndex: 10,
                        fontSize: '0.58rem',
                        fontWeight: 900,
                        color: '#FDE68A',
                        backgroundColor: 'rgba(217, 119, 6, 0.75)',
                        border: '1px solid rgba(245, 158, 11, 0.7)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '9999px',
                        boxShadow: '0 0 8px rgba(245, 158, 11, 0.4)'
                      }}>
                        👑 Clube VIP
                      </span>
                    ) : isHibrido ? (
                      <span style={{
                        position: 'absolute',
                        top: '-6px',
                        zIndex: 10,
                        fontSize: '0.58rem',
                        fontWeight: 900,
                        color: '#E9D5FF',
                        backgroundColor: 'rgba(168, 85, 247, 0.5)',
                        border: '1px solid rgba(168, 85, 247, 0.6)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '9999px'
                      }}>
                        ✦ Clube & Geral
                      </span>
                    ) : (
                      <span style={{
                        position: 'absolute',
                        top: '-6px',
                        zIndex: 10,
                        fontSize: '0.58rem',
                        fontWeight: 700,
                        color: '#93C5FD',
                        backgroundColor: 'rgba(30, 58, 138, 0.5)',
                        border: '1px solid rgba(59, 130, 246, 0.5)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '9999px'
                      }}>
                        Geral
                      </span>
                    )}
                    <div style={{
                      width: '3.6rem',
                      height: '3.6rem',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: isSelected ? '2px solid #E5A96E' : '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: isSelected ? '0 0 14px rgba(229, 169, 110, 0.4)' : 'none'
                    }}>
                      <img
                        src={prof.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                        alt={prof.nome}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#ffffff', textAlign: 'center', maxWidth: '70px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {prof.apelido || prof.nome.split(' ')[0]}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      ★ 5
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 6. ETAPA 3: DATA & HORÁRIO */}
          <div id="sec-data-horario" style={{ padding: '0 1rem', marginTop: '1.75rem' }}>
            <div style={{
              backgroundColor: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '1.5rem',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.5)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                  <div style={{
                    width: '2.1rem',
                    height: '2.1rem',
                    borderRadius: '50%',
                    backgroundColor: '#1E293B',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Clock style={{ width: '1rem', height: '1rem', color: '#D1D5DB' }} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, color: '#ffffff' }}>
                      3. DATA & HORÁRIO
                    </h3>
                    <p style={{ margin: '3px 0 0 0', fontSize: '0.72rem', color: '#9CA3AF' }}>
                      Escolha seu horário ou compareça direto por ordem de chegada
                    </p>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '9999px',
                  backgroundColor: '#1E293B',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#E5E7EB',
                  flexShrink: 0
                }}>
                  <Clock style={{ width: '0.85rem', height: '0.85rem', color: '#F59E0B' }} />
                  <span>{selectedHorario || '--:--'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.35rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.04em', color: '#9CA3AF', textTransform: 'uppercase' }}>
                  ESCOLHA A DATA
                </span>
                <span style={{ fontSize: '0.72rem', color: 'rgba(245, 158, 11, 0.85)', fontWeight: 600 }}>
                  {Boolean((barbearia as any)?.limitar_agendamento_semana)
                    ? `Agenda da semana (${quickDays.length} dias liberados)`
                    : 'Próximos 14 dias liberados'}
                </span>
              </div>

              {/* Pílulas de 14 dias */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                overflowX: 'auto',
                paddingBottom: '0.4rem',
                scrollbarWidth: 'none'
              }}>
                {quickDays.map(dia => {
                  const isSelected = selectedDate === dia.iso;
                  return (
                    <button
                      key={dia.iso}
                      onClick={() => {
                        setSelectedDate(dia.iso);
                        setSelectedHorario('');
                      }}
                      style={{
                        minWidth: '56px',
                        padding: '0.75rem 0.5rem',
                        borderRadius: '1rem',
                        backgroundColor: isSelected ? '#F2DFCE' : '#151D2F',
                        color: isSelected ? '#0B0F19' : '#9CA3AF',
                        border: isSelected ? 'none' : '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', color: isSelected ? '#18181B' : '#9CA3AF' }}>
                        {dia.diaSemanaAbrev}
                      </span>
                      <span style={{ fontSize: '1rem', fontWeight: 900, marginTop: '2px', color: isSelected ? '#0B0F19' : '#ffffff' }}>
                        {dia.diaNumero}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Grade de Horários */}
              <div style={{ paddingTop: '0.5rem' }}>
                <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.04em', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
                  HORÁRIOS DISPONÍVEIS
                </span>

                {loadingSlots ? (
                  <div style={{ padding: '2rem 0', textAlign: 'center', fontSize: '0.75rem', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}>
                    <RefreshCw className="animate-spin" style={{ width: '0.9rem', height: '0.9rem', color: '#F59E0B' }} />
                    Verificando horários disponíveis...
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div style={{ padding: '2rem 0', textAlign: 'center', fontSize: '0.75rem', color: '#6B7280' }}>
                    Nenhum horário disponível para esta data.
                  </div>
                ) : (
                  <div className="time-slot-grid">
                    {availableSlots.map(slot => {
                      const isSelected = selectedHorario === slot.horario;
                      return (
                        <button
                          key={slot.horario}
                          disabled={!slot.disponivel}
                          onClick={() => handleSelectSlot(slot.horario, slot.barbeiroIdAtribuido)}
                          style={{
                            padding: '0.65rem 0.2rem',
                            minWidth: 0,
                            borderRadius: '0.75rem',
                            fontSize: '0.78rem',
                            fontWeight: isSelected ? 900 : 700,
                            textAlign: 'center',
                            backgroundColor: isSelected ? '#E5A96E' : slot.disponivel ? '#151D2F' : 'rgba(255, 255, 255, 0.02)',
                            color: isSelected ? '#0B0F19' : slot.disponivel ? '#E5E7EB' : '#4B5563',
                            border: isSelected ? 'none' : slot.disponivel ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(255, 255, 255, 0.03)',
                            cursor: slot.disponivel ? 'pointer' : 'not-allowed',
                            textDecoration: slot.disponivel ? 'none' : 'line-through',
                            transition: 'all 0.15s ease'
                          }}
                          title={slot.disponivel ? `${slot.horario} às ${slot.horarioFim}` : slot.motivo}
                        >
                          {slot.horario}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 7. BARRA FIXA INFERIOR COM VÍNCULO DE CÁLCULO DINÂMICO */}
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#0B0F19]/95 backdrop-blur-md border-t border-white/10 booking-bottom-bar"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 60,
              backgroundColor: 'rgba(11, 15, 25, 0.96)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))',
              boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div className="p-3.5 sm:p-4 pb-5 sm:pb-4 max-w-md mx-auto flex items-center justify-between gap-3 booking-bottom-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div className="min-w-0 flex-1 booking-bottom-summary">
                <p className="truncate m-0" style={{ margin: 0, fontSize: '0.68rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span className="btn-label-desktop">Total a pagar • {duracaoTotalMinutos || 30} min ({selectedServiceIds.length || 1} {selectedServiceIds.length > 1 ? 'horários' : 'horário'})</span>
                  <span className="btn-label-mobile">Total • {duracaoTotalMinutos || 30} min</span>
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '2px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <span style={{ fontSize: 'clamp(1.15rem, 4.5vw, 1.35rem)', fontWeight: 900, color: '#ffffff', flexShrink: 0 }}>
                    R$ {valorTotal.toFixed(2).replace('.', ',')}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#6B7280', flexShrink: 0 }}>(no balcão)</span>
                </div>
              </div>

              <button
                onClick={() => {
                  if (selectedServiceIds.length === 0) {
                    alert('Por favor, selecione pelo menos um serviço.');
                    return;
                  }
                  if (!selectedHorario) {
                    const el = document.getElementById('sec-data-horario');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                    alert('Por favor, selecione o horário desejado antes de continuar.');
                    return;
                  }
                  setCurrentStep(4);
                }}
                className="whitespace-nowrap booking-bottom-btn"
                style={{
                  padding: '0.75rem 1.15rem',
                  borderRadius: '9999px',
                  backgroundColor: '#E5A96E',
                  color: '#0B0F19',
                  fontWeight: 900,
                  fontSize: '0.8rem',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 6px 20px rgba(229, 169, 110, 0.35)',
                  flexShrink: 0,
                  whiteSpace: 'nowrap'
                }}
              >
                <span className="btn-label-desktop">CONTINUAR PARA AGENDAR</span>
                <span className="btn-label-mobile">CONTINUAR</span>
                <ArrowRight style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ETAPA 4: IDENTIFICAÇÃO & VERIFICAÇÃO DO CLUBE VIP NO POCKETBASE */}
      {currentStep === 4 && (
        <main className="flex-1 w-full max-w-lg mx-auto pb-28 px-4" style={{ flex: 1, width: '100%', maxWidth: '540px', margin: '0 auto', padding: '1.5rem 1rem 7rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <button
              onClick={() => setCurrentStep(1)}
              style={{
                width: '2.4rem',
                height: '2.4rem',
                borderRadius: '50%',
                backgroundColor: '#111827',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#D1D5DB',
                cursor: 'pointer'
              }}
            >
              <ChevronLeft style={{ width: '1.2rem', height: '1.2rem' }} />
            </button>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase' }}>Etapa 4 de 5</span>
              <h2 style={{ margin: '2px 0 0 0', fontSize: '1.2rem', fontWeight: 900, color: '#ffffff' }}>Identificação & Clube VIP</h2>
            </div>
          </div>

          <div style={{
            backgroundColor: '#111827',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '1.5rem',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5)'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#D1D5DB', textTransform: 'uppercase', marginBottom: '0.45rem' }}>
                Seu Nome Completo *
              </label>
              <div style={{ position: 'relative' }}>
                <User style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#6B7280' }} />
                <input
                  type="text"
                  value={clienteNome}
                  onChange={e => setClienteNome(e.target.value)}
                  placeholder="Como quer ser chamado?"
                  style={{
                    width: '100%',
                    backgroundColor: '#0C121E',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.9rem',
                    padding: '0.85rem 1rem 0.85rem 2.6rem',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#D1D5DB', textTransform: 'uppercase', marginBottom: '0.45rem' }}>
                WhatsApp com DDD *
              </label>
              <div style={{ position: 'relative' }}>
                <Phone style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#6B7280' }} />
                <input
                  type="tel"
                  value={clienteTelefone}
                  onChange={handleTelefoneChange}
                  placeholder="(19) 99999-9999"
                  maxLength={15}
                  style={{
                    width: '100%',
                    backgroundColor: '#0C121E',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.9rem',
                    padding: '0.85rem 1rem 0.85rem 2.6rem',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>
              <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.7rem', color: '#6B7280' }}>
                Digite seu número para validação automática de assinatura ativa no Clube VIP.
              </p>
            </div>

            {searchingVip && (
              <div style={{ padding: '0.75rem', borderRadius: '0.85rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#FCD34D' }}>
                <RefreshCw className="animate-spin" style={{ width: '0.9rem', height: '0.9rem', color: '#F59E0B' }} />
                <span>Consultando assinatura do Clube VIP na base...</span>
              </div>
            )}

            {/* Banner VIP Dourado se ativo */}
            {isVipBeneficiario && (
              <div style={{
                padding: '1rem',
                borderRadius: '1rem',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(17, 24, 39, 0.95) 100%)',
                border: '2px solid #E5A96E',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Crown style={{ width: '1.2rem', height: '1.2rem', color: '#F59E0B' }} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#FCD34D', textTransform: 'uppercase' }}>
                    Assinante VIP Ativo Identificado!
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#E5E7EB' }}>
                  Olá, <strong style={{ color: '#ffffff' }}>{clienteNome}</strong>! Sua assinatura do <strong>{assinaturaVipAtiva?.plano_nome || planoVip?.nome || 'Clube VIP'}</strong> isenta os serviços elegíveis deste agendamento.
                </p>
                {descontoTotalVip > 0 && (
                  <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 800, color: '#34D399' }}>
                    ✓ Desconto VIP aplicado: R$ {descontoTotalVip.toFixed(2).replace('.', ',')} (Valor final zerado)
                  </p>
                )}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#D1D5DB', textTransform: 'uppercase', marginBottom: '0.45rem' }}>
                Observações ou Pedidos Especiais (Opcional)
              </label>
              <textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                placeholder="Ex: Prefiro acabamento mais baixo, toalha quente extra, etc."
                rows={2}
                style={{
                  width: '100%',
                  backgroundColor: '#0C121E',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '0.9rem',
                  padding: '0.75rem 1rem',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  outline: 'none',
                  resize: 'none'
                }}
              />
            </div>
          </div>

          {/* Barra Fixa Inferior Etapa 4 */}
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#0B0F19]/95 backdrop-blur-md border-t border-white/10 booking-bottom-bar"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 60,
              backgroundColor: 'rgba(11, 15, 25, 0.96)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))',
              boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div className="p-3.5 sm:p-4 pb-5 sm:pb-4 max-w-md mx-auto flex items-center justify-between gap-3 booking-bottom-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div className="min-w-0 flex-1 booking-bottom-summary">
                <p style={{ margin: 0, fontSize: '0.66rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Total a pagar</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 'clamp(1.15rem, 4.5vw, 1.35rem)', fontWeight: 900, color: '#ffffff' }}>
                    {valorFinal === 0 ? 'R$ 0,00' : `R$ ${valorFinal.toFixed(2).replace('.', ',')}`}
                  </span>
                  {isVipBeneficiario && <span style={{ fontSize: '0.75rem', color: '#34D399', fontWeight: 800 }}>(VIP)</span>}
                </div>
              </div>

              <button
                onClick={() => {
                  if (!clienteNome.trim() || clienteTelefone.replace(/\D/g, '').length < 10) {
                    alert('Por favor, informe seu nome e um WhatsApp válido com DDD.');
                    return;
                  }
                  setCurrentStep(5);
                }}
                className="whitespace-nowrap px-4 py-3 text-xs sm:text-sm font-bold booking-bottom-btn"
                style={{
                  padding: '0.75rem 1.15rem',
                  borderRadius: '9999px',
                  backgroundColor: '#E5A96E',
                  color: '#0B0F19',
                  fontWeight: 900,
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 6px 20px rgba(229, 169, 110, 0.35)',
                  flexShrink: 0,
                  whiteSpace: 'nowrap'
                }}
              >
                <span className="btn-label-desktop">REVISAR TICKET</span>
                <span className="btn-label-mobile">REVISAR</span>
                <ArrowRight style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ETAPA 5: VOUCHER / CONFIRMAÇÃO DO TICKET */}
      {currentStep === 5 && (
        <main className="flex-1 w-full max-w-lg mx-auto pb-28 px-4" style={{ flex: 1, width: '100%', maxWidth: '540px', margin: '0 auto', padding: '1.5rem 1rem 7rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <button
              onClick={() => setCurrentStep(4)}
              style={{
                width: '2.4rem',
                height: '2.4rem',
                borderRadius: '50%',
                backgroundColor: '#111827',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#D1D5DB',
                cursor: 'pointer'
              }}
            >
              <ChevronLeft style={{ width: '1.2rem', height: '1.2rem' }} />
            </button>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase' }}>Etapa 5 de 5</span>
              <h2 style={{ margin: '2px 0 0 0', fontSize: '1.2rem', fontWeight: 900, color: '#ffffff' }}>Confirmação do Agendamento</h2>
            </div>
          </div>

          <div style={{
            backgroundColor: '#111827',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '1.5rem',
            overflow: 'hidden',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)'
          }}>
            <div style={{
              backgroundColor: '#151D2F',
              padding: '1.25rem',
              borderBottom: '1px dashed rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.05em', color: '#F59E0B', textTransform: 'uppercase' }}>
                  TICKET DE AGENDAMENTO
                </span>
                <h3 style={{ margin: '3px 0 0 0', fontSize: '1.1rem', fontWeight: 900, color: '#ffffff' }}>
                  {barbearia.nome}
                </h3>
              </div>
              <Ticket style={{ width: '1.5rem', height: '1.5rem', color: '#E5A96E' }} />
            </div>

            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.78rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', paddingBottom: '0.85rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div>
                  <span style={{ color: '#6B7280', textTransform: 'uppercase', fontWeight: 800, fontSize: '0.65rem' }}>Data</span>
                  <p style={{ margin: '2px 0 0 0', color: '#ffffff', fontWeight: 800, fontSize: '0.88rem' }}>
                    {selectedDate.split('-').reverse().join('/')}
                  </p>
                </div>
                <div>
                  <span style={{ color: '#6B7280', textTransform: 'uppercase', fontWeight: 800, fontSize: '0.65rem' }}>Horário</span>
                  <p style={{ margin: '2px 0 0 0', color: '#F59E0B', fontWeight: 800, fontSize: '0.88rem' }}>
                    {selectedHorario} ({duracaoTotalMinutos} min)
                  </p>
                </div>
                <div>
                  <span style={{ color: '#6B7280', textTransform: 'uppercase', fontWeight: 800, fontSize: '0.65rem' }}>Profissional</span>
                  <p style={{ margin: '2px 0 0 0', color: '#ffffff', fontWeight: 800 }}>
                    {barbeiroEfetivo ? barbeiroEfetivo.nome : 'Primeiro Livre'}
                  </p>
                </div>
                <div>
                  <span style={{ color: '#6B7280', textTransform: 'uppercase', fontWeight: 800, fontSize: '0.65rem' }}>Cliente</span>
                  <p style={{ margin: '2px 0 0 0', color: '#ffffff', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {clienteNome}
                  </p>
                </div>
              </div>

              <div>
                <span style={{ color: '#6B7280', textTransform: 'uppercase', fontWeight: 800, fontSize: '0.65rem', display: 'block', marginBottom: '0.45rem' }}>
                  Serviços Selecionados
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {servicosDetalhadosComVip.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#D1D5DB' }}>
                      <span>{s.nome}</span>
                      <span style={{ fontWeight: 800 }}>
                        {s.isCobertoVip ? (
                          <span style={{ color: '#34D399', fontWeight: 900 }}>Coberto (VIP)</span>
                        ) : (
                          `R$ ${s.preco.toFixed(2).replace('.', ',')}`
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ paddingTop: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ color: '#9CA3AF', fontWeight: 700 }}>Total a pagar no balcão:</span>
                  {descontoTotalVip > 0 && (
                    <span style={{ display: 'block', fontSize: '0.72rem', color: '#34D399', fontWeight: 700 }}>
                      Desconto VIP: -R$ {descontoTotalVip.toFixed(2).replace('.', ',')}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#ffffff' }}>
                  R$ {valorFinal.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          </div>

          {/* Barra Fixa Inferior Etapa 5 */}
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#0B0F19]/95 backdrop-blur-md border-t border-white/10 booking-bottom-bar"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 60,
              backgroundColor: 'rgba(11, 15, 25, 0.96)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))',
              boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div className="p-3.5 sm:p-4 pb-5 sm:pb-4 max-w-md mx-auto flex items-center justify-between gap-3 booking-bottom-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <button
                onClick={() => setCurrentStep(4)}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '9999px',
                  backgroundColor: '#1E293B',
                  color: '#D1D5DB',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                Voltar
              </button>

              <button
                disabled={submitting}
                onClick={handleConfirmarAgendamento}
                className="whitespace-nowrap px-4 py-3 text-xs sm:text-sm font-bold"
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '0.75rem 0.85rem',
                  borderRadius: '9999px',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  border: 'none',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                  opacity: submitting ? 0.7 : 1,
                  whiteSpace: 'nowrap'
                }}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="animate-spin" style={{ width: '0.95rem', height: '0.95rem', color: '#ffffff', flexShrink: 0 }} />
                    <span className="btn-label-desktop">Confirmando Agendamento...</span>
                    <span className="btn-label-mobile">Confirmando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 style={{ width: '1rem', height: '1rem', color: '#ffffff', flexShrink: 0 }} />
                    <span className="btn-label-desktop">Confirmar Agendamento</span>
                    <span className="btn-label-mobile">Confirmar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ETAPA 6: SUCESSO / TICKET FINALIZADO */}
      {currentStep === 6 && (
        <main style={{ flex: 1, width: '100%', maxWidth: '540px', margin: '0 auto', padding: '2.25rem 1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            filter: 'drop-shadow(0 0 28px rgba(0, 201, 133, 0.35))',
          }}>
            <SuccessLottieAnimation size={140} />
          </div>

          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#ffffff' }}>
              Agendamento Confirmado!
            </h2>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.84rem', color: '#9CA3AF', maxWidth: '380px', lineHeight: 1.5 }}>
              Seu horário na <strong style={{ color: '#ffffff' }}>{barbearia.nome}</strong> foi garantido com sucesso. Enviamos os detalhes de confirmação para o seu WhatsApp.
            </p>
          </div>

          <div style={{
            backgroundColor: '#111827',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '1.25rem',
            padding: '1.25rem',
            width: '100%',
            maxWidth: '380px',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            fontSize: '0.78rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#6B7280' }}>Data e Hora:</span>
              <span style={{ fontWeight: 800, color: '#ffffff' }}>{selectedDate.split('-').reverse().join('/')} às {selectedHorario}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#6B7280' }}>Barbeiro:</span>
              <span style={{ fontWeight: 800, color: '#ffffff' }}>{barbeiroEfetivo?.nome || 'Profissional'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
              <span style={{ color: '#6B7280' }}>Valor:</span>
              <span style={{ fontWeight: 900, color: '#34D399' }}>
                {valorFinal === 0 ? 'R$ 0,00 (Clube VIP)' : `R$ ${valorFinal.toFixed(2).replace('.', ',')}`}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#6B7280' }}>Cliente:</span>
              <span style={{ fontWeight: 800, color: '#ffffff' }}>{clienteNome}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '340px' }}>
            {whatsAppUrl && (
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '0.85rem',
                  borderRadius: '9999px',
                  backgroundColor: '#10B981',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  textDecoration: 'none',
                  boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)'
                }}
              >
                <MessageCircle style={{ width: '1rem', height: '1rem', fill: 'currentColor' }} />
                <span>Falar com a Barbearia no Zap</span>
              </a>
            )}

            <button
              onClick={() => {
                setSelectedServiceIds([]);
                setSelectedHorario('');
                setClienteNome('');
                setClienteTelefone('');
                setObservacoes('');
                setAssinaturaVipAtiva(null);
                setClienteVip(null);
                setPlanoVip(null);
                setVipResult(null);
                setCurrentStep(1);
              }}
              style={{
                padding: '0.85rem',
                borderRadius: '9999px',
                backgroundColor: '#1E293B',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.82rem',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer'
              }}
            >
              Fazer Outro Agendamento
            </button>
          </div>
        </main>
      )}

      {/* GAVETA LATERAL / MODAL VIP: CLUBE DE ASSINATURAS & ÁREA DE MEMBROS */}
      {isClubeModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          onClick={() => setIsClubeModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-slate-900/95 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]"
            style={{
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(245, 158, 11, 0.18)',
              backdropFilter: 'blur(20px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Modal VIP */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm shadow-amber-500/20">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 m-0 leading-tight">
                    Área VIP • Clube de Assinaturas
                  </h2>
                  <p className="text-[10px] text-slate-400 m-0">
                    {barbearia?.nome ? `${barbearia.nome} • Benefícios Exclusivos` : 'Área de Membros'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClubeModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Fechar Modal VIP"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* CONTEÚDO: SE NÃO AUTENTICADO */}
            {!membroClube ? (
              <div className="overflow-y-auto pt-3 space-y-3">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-200/90 leading-relaxed m-0">
                    Identifique-se como assinante do clube para liberar descontos em produtos, cortes inclusos e agendamento com profissionais VIP.
                  </p>
                </div>

                <form onSubmit={handleAcessarClube} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Nome do Assinante
                    </label>
                    <input
                      type="text"
                      value={clubeNomeInput}
                      onChange={(e) => setClubeNomeInput(e.target.value)}
                      placeholder="Ex: Carlos Silva"
                      className="w-full py-1.5 px-2.5 text-xs bg-slate-950/80 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Telefone / WhatsApp (Chave do Assinante) <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={clubeTelefoneInput}
                      onChange={(e) => setClubeTelefoneInput(formatTelefone(e.target.value))}
                      placeholder="(19) 99999-0001"
                      className="w-full py-1.5 px-2.5 text-xs bg-slate-950/80 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Digite o número cadastrado no momento da adesão ao plano.
                    </span>
                  </div>

                  {clubeError && (
                    <div className="bg-red-500/15 border border-red-500/40 text-red-300 p-2.5 rounded-lg text-xs flex items-start gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <span className="font-semibold leading-snug">{clubeError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={clubeLoading}
                    className="w-full px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {clubeLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Crown className="w-3.5 h-3.5" />
                    )}
                    <span>{clubeLoading ? 'Consultando Assinatura...' : 'Acessar Clube'}</span>
                  </button>

                  <div className="pt-2 text-center border-t border-white/5">
                    <p className="text-[10px] text-slate-400 m-0">
                      Quer assinar o clube? Solicite a adesão presencialmente na recepção da barbearia.
                    </p>
                  </div>
                </form>
              </div>
            ) : (
              /* CONTEÚDO: SE AUTENTICADO COMO MEMBRO ATIVO */
              <div className="overflow-y-auto pt-3 space-y-4 pr-1">
                {/* 1. CARTÃO DIGITAL DO ASSINANTE */}
                <div
                  className="relative rounded-xl p-4 overflow-hidden border border-amber-500/40 text-white shadow-xl"
                  style={{
                    background: 'linear-gradient(135deg, #18181b 0%, #1e1910 50%, #291c09 100%)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.6), inset 0 1px 0 rgba(245, 158, 11, 0.3)'
                  }}
                >
                  <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                  {/* Header do Cartão */}
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className="flex items-center gap-1.5 text-amber-400">
                      <Crown className="w-4 h-4" />
                      <span className="text-[11px] font-black uppercase tracking-wider">
                        Cartão do Assinante VIP
                      </span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Assinatura Ativa
                    </div>
                  </div>

                  {/* Nome do Plano (Ex: Membro Black) */}
                  <div className="relative z-10 mb-3.5">
                    <div className="text-[10px] text-amber-400/80 uppercase font-semibold">
                      Plano Exclusivo
                    </div>
                    <div className="text-base sm:text-lg font-black text-amber-300 tracking-wide uppercase">
                      {membroClube.expand?.plano?.nome
                        ? `Membro ${membroClube.expand.plano.nome.replace('Plano ', '')}`
                        : 'Membro Black'}
                    </div>
                  </div>

                  {/* Dados do Titular e Validade */}
                  <div className="relative z-10 flex items-end justify-between pt-2.5 border-t border-white/10 text-xs">
                    <div>
                      <div className="text-[9px] text-slate-400 uppercase font-semibold">Titular</div>
                      <div className="font-bold text-slate-100 tracking-wide">
                        {membroClube.nome.toUpperCase()}
                      </div>
                      <div className="text-[10px] text-slate-400">{membroClube.telefone}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] text-slate-400 uppercase font-semibold">Validade</div>
                      <div className="text-[11px] font-semibold text-amber-200">
                        {membroClube.validade
                          ? new Date(membroClube.validade).toLocaleDateString('pt-BR')
                          : 'Renovação Contínua'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. SEÇÃO: MEUS BENEFÍCIOS */}
                <div className="bg-slate-950/70 border border-white/10 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Meus Benefícios</span>
                  </div>

                  {/* Desconto Exclusivo em Produtos */}
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          Desconto na Vitrine & Balcão
                        </div>
                        <div className="text-[10px] text-slate-300">
                          Pomadas, óleos, tônicos e cosméticos
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-black text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40">
                      {membroClube.expand?.plano?.desconto_produtos_pct ?? 15}% OFF
                    </span>
                  </div>

                  {/* Cortes Inclusos no Mês */}
                  <div className="bg-slate-900/80 border border-white/5 rounded-lg p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
                        <Scissors className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          Cota de Cortes
                        </div>
                        <div className="text-[10px] text-slate-300">
                          {membroClube.expand?.plano?.permite_corte_ilimitado
                            ? 'Cortes Ilimitados no Mês'
                            : `${membroClube.expand?.plano?.limite_cortes_mes || 4} cortes por mês inclusos`}
                        </div>
                      </div>
                    </div>
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>

                {/* 3. SEÇÃO: AGENDAMENTO VIP */}
                <div className="bg-slate-950/70 border border-white/10 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                      <Crown className="w-3.5 h-3.5" />
                      <span>Agendamento VIP</span>
                    </div>
                    <span className="text-[10px] text-amber-300/80 font-medium">
                      Barbeiros Elegíveis
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed m-0">
                    Como assinante VIP, você agenda diretamente com mestres de bancada exclusiva ou atendimento híbrido:
                  </p>

                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {barbeirosElegiveis.length === 0 ? (
                      <div className="text-xs text-slate-400 text-center py-2">
                        Nenhum profissional VIP ativo cadastrado no momento.
                      </div>
                    ) : (
                      barbeirosElegiveis.map((prof) => (
                        <div
                          key={prof.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 border border-white/5 hover:border-amber-500/30 transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full overflow-hidden border border-amber-500/40 flex-shrink-0">
                              <img
                                src={prof.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                                alt={prof.nome}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5 leading-tight">
                                <span>{prof.apelido || prof.nome}</span>
                                {prof.tipo_atendimento === 'exclusivo_clube' && (
                                  <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 py-0.2 rounded font-bold">
                                    Exclusivo
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {prof.tipo_atendimento === 'exclusivo_clube' ? 'Bancada Exclusiva VIP' : 'Atendimento VIP & Geral'}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBarbeiroId(prof.id);
                              setAssignedBarbeiroId('');
                              setAgendamentoVipAtivo(true);
                              setIsClubeModalOpen(false);
                              const el = document.getElementById('sec-data-horario');
                              if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="px-2.5 py-1 text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded transition-all cursor-pointer"
                          >
                            Agendar
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAgendamentoVipAtivo(true);
                      setIsClubeModalOpen(false);
                      const el = document.getElementById('sec-barbeiros');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="w-full px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>Continuar Agendamento no Modo VIP</span>
                  </button>
                </div>

                {/* Ações de Rodapé */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={handleSairClube}
                    className="text-slate-400 hover:text-red-400 transition-colors text-[11px] underline cursor-pointer"
                  >
                    Sair da Área VIP / Trocar Assinante
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsClubeModalOpen(false)}
                    className="text-amber-400 hover:text-amber-300 font-medium text-[11px] cursor-pointer"
                  >
                    Fechar Modal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
