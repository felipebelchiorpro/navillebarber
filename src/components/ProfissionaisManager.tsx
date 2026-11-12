import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Phone,
  Percent,
  CheckCircle2,
  XCircle,
  Search,
  Sparkles,
  Scissors,
  AlertCircle,
  X,
  Award,
  Calendar,
  Clock,
  ShieldAlert,
  Lock,
  Upload,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { pb, Barbearia, Profissional, Servico, profissionaisService, servicosService } from '../services/pocketbase';

interface ProfissionaisManagerProps {
  barbearia: Barbearia;
  servicesList?: Servico[];
}

const TIPO_ATENDIMENTO_CONFIG: Record<
  Profissional['tipo_atendimento'],
  { label: string; badgeClass: string; desc: string }
> = {
  agendamento_geral: { label: 'Agendamento Geral', badgeClass: 'badge-blue', desc: 'Atende o público geral agendado' },
  hibrido_clube_geral: { label: 'Híbrido (Clube & Geral)', badgeClass: 'badge-purple', desc: 'Atende tanto assinantes do Clube quanto agendamentos gerais' },
  exclusivo_clube: { label: 'Exclusivo Clube VIP', badgeClass: 'badge-amber', desc: 'Disponível apenas para membros do Clube de Assinaturas' },
  agenda: { label: 'Apenas Agendamento', badgeClass: 'badge-blue', desc: 'Atende horários marcados previamente' },
  ordem_chegada: { label: 'Ordem de Chegada', badgeClass: 'badge-amber', desc: 'Atende fila de espera presencial' },
  ambos: { label: 'Agenda & Chegada', badgeClass: 'badge-purple', desc: 'Combina marcações prévias e fila presencial' },
};

export const ProfissionaisManager: React.FC<ProfissionaisManagerProps> = ({
  barbearia,
  servicesList,
}) => {
  const [barbeiros, setBarbeiros] = useState<Profissional[]>([]);
  const profissionais = barbeiros;
  const setProfissionais = setBarbeiros;

  const [currentBarb, setCurrentBarb] = useState<Barbearia>(barbearia);
  const [allServicos, setAllServicos] = useState<Servico[]>(servicesList || []);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');

  // Sincroniza barbearia vinda das props
  useEffect(() => {
    if (barbearia) setCurrentBarb(barbearia);
  }, [barbearia]);

  // Busca dados mais recentes diretamente do PocketBase para garantir sincronização das cadeiras e plano
  const carregarBarbeariaDoBanco = async () => {
    try {
      const id = barbearia?.id && barbearia.id !== 'dev_barb' ? barbearia.id : 'ca42u8j6x8o514w';
      const fresh = await pb.collection('barbearias').getOne<Barbearia>(id);
      if (fresh) {
        setCurrentBarb(fresh);
      }
    } catch (err) {
      console.warn('Aviso ao sincronizar barbearia em ProfissionaisManager:', err);
    }
  };

  useEffect(() => {
    if (barbearia) {
      setCurrentBarb(barbearia);
    }
    carregarBarbeariaDoBanco();
  }, [barbearia]);

  // Limite e Plano puxados diretamente do banco de dados (PocketBase)
  const limitePlano = Math.max(
    1,
    currentBarb.max_barbeiros !== undefined && currentBarb.max_barbeiros !== null
      ? Number(currentBarb.max_barbeiros)
      : currentBarb.limite_profissionais !== undefined && currentBarb.limite_profissionais !== null
      ? Number(currentBarb.limite_profissionais)
      : 1
  );

  const nomePlano = (currentBarb.plano || currentBarb.plano_saas || 'PRO').toUpperCase();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfissional, setEditingProfissional] = useState<Profissional | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [nome, setNome] = useState('');
  const [apelido, setApelido] = useState('');
  const [telefone, setTelefone] = useState('');
  const [temComissao, setTemComissao] = useState(true);
  const [taxaComissaoPorcentagem, setTaxaComissaoPorcentagem] = useState('50');
  const [ativo, setAtivo] = useState(true);
  const [tipoAtendimento, setTipoAtendimento] = useState<Profissional['tipo_atendimento']>('ambos');
  const [aceitaClube, setAceitaClube] = useState(true);
  const [selectedServicosIds, setSelectedServicosIds] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Delete Confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const carregarDados = async () => {
    setLoading(true);
    try {
      await carregarBarbeariaDoBanco();
      const targetId = currentBarb.id || barbearia.id || 'ca42u8j6x8o514w';
      let data: Profissional[] = [];
      try {
        data = await pb.collection('profissionais').getFullList<Profissional>({
          filter: `barbearia_id = '${targetId}'`,
          sort: 'nome',
        });
      } catch {
        try {
          data = await pb.collection('barbeiros').getFullList<Profissional>({
            filter: `barbearia_id = '${targetId}'`,
            sort: 'nome',
          });
        } catch {
          data = await profissionaisService.list(targetId);
        }
      }

      const servs =
        servicesList && servicesList.length > 0
          ? servicesList
          : await servicosService.list(targetId);

      setBarbeiros(data);
      setAllServicos(servs);
    } catch (err) {
      console.error('Erro ao carregar profissionais/barbeiros do PocketBase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [barbearia.id]);

  useEffect(() => {
    if (servicesList && servicesList.length > 0) {
      setAllServicos(servicesList);
    }
  }, [servicesList]);

  const handleImageFileSelect = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 8MB.');
      return;
    }
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const dataUrl = loadEvent.target?.result as string;
      if (!dataUrl) {
        setUploadingImage(false);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const maxSide = 400;
        let width = img.width;
        let height = img.height;
        if (width > maxSide || height > maxSide) {
          if (width > height) {
            height = Math.round((height * maxSide) / width);
            width = maxSide;
          } else {
            width = Math.round((width * maxSide) / height);
            height = maxSide;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setAvatarUrl(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          setAvatarUrl(dataUrl);
        }
        setUploadingImage(false);
      };
      img.onerror = () => {
        setAvatarUrl(dataUrl);
        setUploadingImage(false);
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      alert('Erro ao carregar imagem.');
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const abrirModalNovo = () => {
    const barbeirosAtuais = barbeiros.length;
    if (barbeirosAtuais >= limitePlano) {
      alert("Erro: Limite de cadeiras do seu plano foi atingido. Faça upgrade para adicionar mais profissionais.");
      return;
    }

    setEditingProfissional(null);
    setNome('');
    setApelido('');
    setTelefone('');
    setAvatarUrl('');
    setTemComissao(true);
    setTaxaComissaoPorcentagem('50');
    setAtivo(true);
    setTipoAtendimento('ambos');
    setAceitaClube(true);
    // Preenche com todos os serviços ativos por padrão
    setSelectedServicosIds(allServicos.filter((s) => s.ativo).map((s) => s.id));
    setFormError(null);
    setIsModalOpen(true);
  };

  const abrirModalEditar = (prof: Profissional) => {
    setEditingProfissional(prof);
    setNome(prof.nome);
    setApelido(prof.apelido || '');
    setTelefone(prof.telefone || '');
    setAvatarUrl(prof.avatar_url || (prof as any).avatar || '');
    const isSemComissao = prof.taxa_comissao === 0 || (prof as any).tem_comissao === false;
    setTemComissao(!isSemComissao);
    setTaxaComissaoPorcentagem(isSemComissao ? '0' : Math.round((prof.taxa_comissao || 0.5) * 100).toString());
    setAtivo(prof.ativo);
    setTipoAtendimento(prof.tipo_atendimento || 'ambos');
    setAceitaClube(prof.aceita_clube !== false);
    setSelectedServicosIds(Array.isArray(prof.servicos_ids) ? prof.servicos_ids : []);
    setFormError(null);
    setIsModalOpen(true);
  };

  const fecharModal = () => {
    setIsModalOpen(false);
    setEditingProfissional(null);
    setAvatarUrl('');
    setFormError(null);
  };

  const toggleServicoSelection = (servicoId: string) => {
    setSelectedServicosIds((prev) =>
      prev.includes(servicoId) ? prev.filter((id) => id !== servicoId) : [...prev, servicoId]
    );
  };

  const selectAllServices = () => {
    setSelectedServicosIds(allServicos.map((s) => s.id));
  };

  const clearAllServices = () => {
    setSelectedServicosIds([]);
  };

  const handleCreate = async () => {
    const barbeirosAtuais = barbeiros.length;
    if (barbeirosAtuais >= limitePlano) {
      // Dispare um toast de erro ou alerta
      alert("Erro: Limite de cadeiras do seu plano foi atingido. Faça upgrade para adicionar mais profissionais.");
      return; // Impede a continuação do código
    }

    const taxaComissaoDecimal = temComissao ? (parseFloat(taxaComissaoPorcentagem) / 100 || 0) : 0;
    const payload = {
      barbearia_id: barbearia.id,
      nome: nome.trim(),
      apelido: apelido.trim() || undefined,
      telefone: telefone.trim() || undefined,
      taxa_comissao: taxaComissaoDecimal,
      tem_comissao: temComissao,
      ativo,
      tipo_atendimento: tipoAtendimento,
      aceita_clube: aceitaClube,
      servicos_ids: selectedServicosIds,
      avatar_url: avatarUrl.trim() || undefined,
    };

    try {
      await pb.collection('profissionais').create<Profissional>(payload);
    } catch {
      try {
        await pb.collection('barbeiros').create<Profissional>(payload);
      } catch {
        await profissionaisService.create(payload);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const barbeirosAtuais = barbeiros.length;
    if (!editingProfissional && barbeirosAtuais >= limitePlano) {
      alert("Erro: Limite de cadeiras do seu plano foi atingido. Faça upgrade para adicionar mais profissionais.");
      return;
    }

    const comissaoNum = temComissao ? parseFloat(taxaComissaoPorcentagem) : 0;

    if (!nome.trim()) {
      setFormError('O nome completo do profissional é obrigatório.');
      return;
    }

    if (temComissao && (isNaN(comissaoNum) || comissaoNum < 0 || comissaoNum > 100)) {
      setFormError('Informe uma comissão válida entre 0% e 100%.');
      return;
    }

    const taxaComissaoDecimal = temComissao ? comissaoNum / 100 : 0;

    setSubmitting(true);
    try {
      if (editingProfissional) {
        await profissionaisService.update(editingProfissional.id, {
          nome: nome.trim(),
          apelido: apelido.trim() || undefined,
          telefone: telefone.trim() || undefined,
          taxa_comissao: taxaComissaoDecimal,
          tem_comissao: temComissao,
          ativo,
          tipo_atendimento: tipoAtendimento,
          aceita_clube: aceitaClube,
          servicos_ids: selectedServicosIds,
          avatar_url: avatarUrl.trim() || undefined,
        });
      } else {
        await handleCreate();
      }

      fecharModal();
      await carregarDados();
    } catch (err: any) {
      console.error('Erro ao salvar profissional:', err);
      setFormError(err.message || 'Erro ao comunicar com o PocketBase.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAtivo = async (prof: Profissional) => {
    try {
      await profissionaisService.update(prof.id, { ativo: !prof.ativo });
      await carregarDados();
    } catch (err) {
      console.error('Erro ao alterar status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await profissionaisService.delete(id);
      setDeleteId(null);
      await carregarDados();
    } catch (err) {
      console.error('Erro ao excluir profissional:', err);
    }
  };

  // Filtragem
  const profissionaisFiltrados = useMemo(() => {
    return profissionais.filter((p) => {
      const matchTipo = filterTipo === 'todos' || p.tipo_atendimento === filterTipo;
      const matchSearch =
        p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.apelido && p.apelido.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.telefone && p.telefone.includes(searchTerm));
      return matchTipo && matchSearch;
    });
  }, [profissionais, filterTipo, searchTerm]);

  // Estatísticas & Capacidade SaaS
  const totalProfissionais = barbeiros.length;
  const profissionaisAtivos = barbeiros.filter((p) => p.ativo).length;
  const maxBarbeiros = limitePlano;
  const capacidadeOcupada = Math.round((barbeiros.length / limitePlano) * 100);
  const atingiuLimite = barbeiros.length >= limitePlano;
  const cadeirasDisponiveis = Math.max(0, limitePlano - barbeiros.length);

  const mediaComissao =
    totalProfissionais > 0
      ? Math.round(
          (profissionais.reduce((acc, curr) => acc + (curr.taxa_comissao || 0.5), 0) /
            totalProfissionais) *
            100
        )
      : 50;

  const totalAtendeClube = profissionais.filter((p) => p.aceita_clube).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Top Bar with Metrics & New Barber Button */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.65rem' }}>
        <div className="glass-panel" style={{ padding: '0.6rem 0.85rem' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Equipe Cadastrada
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '0.1rem', color: '#f8fafc' }}>
            {totalProfissionais} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-dim)' }}>barbeiros</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#34d399', marginTop: '0.1rem' }}>
            {profissionaisAtivos} ativos em atendimento
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '0.6rem 0.85rem' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Limite do Plano ({nomePlano})
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '0.1rem', color: atingiuLimite ? '#f87171' : '#38bdf8' }}>
            {barbeiros.length} / {limitePlano} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>cadeiras</span>
          </div>
          <div style={{ width: '100%', height: '3px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', marginTop: '0.25rem', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(capacidadeOcupada, 100)}%`,
                height: '100%',
                background: atingiuLimite ? '#ef4444' : 'linear-gradient(90deg, #38bdf8, #818cf8)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem', fontSize: '0.68rem' }}>
            <span style={{ color: atingiuLimite ? '#f87171' : '#34d399', fontWeight: 600 }}>
              {cadeirasDisponiveis === 0 ? '0 cadeiras disponíveis' : `${cadeirasDisponiveis} cadeira${cadeirasDisponiveis > 1 ? 's' : ''} disponível${cadeirasDisponiveis > 1 ? 'is' : ''}`}
            </span>
            <span style={{ color: 'var(--text-dim)' }}>
              {capacidadeOcupada}% ocupado
            </span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '0.6rem 0.85rem' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Comissão Média
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '0.1rem', color: '#fbbf24' }}>
            {mediaComissao}%
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>
            Taxa média repassada aos barbeiros
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '0.6rem 0.85rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          {barbeiros.length < limitePlano ? (
            <button
              onClick={abrirModalNovo}
              className="btn-primary"
              style={{ width: '100%', padding: '0.35rem 0.75rem', fontSize: '0.72rem', fontWeight: 600 }}
            >
              <Plus size={13} />
              + Novo Barbeiro
            </button>
          ) : (
            <button
              disabled
              className="bg-white/5 text-zinc-500 border border-white/10 px-3 py-1 rounded-lg text-xs font-semibold cursor-not-allowed flex items-center justify-center gap-1.5 w-full"
            >
              <Lock size={13} /> Limite Atingido
            </button>
          )}
        </div>
      </div>

      {/* Limit Warning (if applicable) */}
      {atingiuLimite && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '0.65rem',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          color: '#fca5a5',
          fontSize: '0.8rem'
        }}>
          <ShieldAlert style={{ width: '1.15rem', height: '1.15rem', flexShrink: 0, color: '#f87171' }} />
          <div>
            <strong>Aviso de Limite do Plano:</strong> A barbearia atingiu a capacidade máxima de {limitePlano} barbeiros do seu plano ({barbearia.plano_saas}). Cadastrar profissionais adicionais exigirá upgrade ou contratação de cadeiras extras (R$ {barbearia.valor_adicional_barbeiro.toFixed(2)}/mês cada).
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '0.75rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search
            style={{
              position: 'absolute',
              left: '0.9rem',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '1rem',
              height: '1rem',
              color: 'var(--text-dim)',
            }}
          />
          <input
            type="text"
            className="input-field"
            placeholder="Buscar barbeiro por nome, apelido ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterTipo('todos')}
            style={{
              padding: '0.3rem 0.65rem',
              borderRadius: '0.5rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: filterTipo === 'todos' ? '1px solid #fbbf24' : '1px solid var(--border-subtle)',
              background: filterTipo === 'todos' ? 'rgba(217, 119, 6, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              color: filterTipo === 'todos' ? '#fbbf24' : 'var(--text-muted)',
              transition: 'all 0.2s ease',
            }}
          >
            Todos ({totalProfissionais})
          </button>
          {(Object.keys(TIPO_ATENDIMENTO_CONFIG) as Array<Profissional['tipo_atendimento']>).map((tipo) => {
            const count = profissionais.filter((p) => p.tipo_atendimento === tipo).length;
            const isSelected = filterTipo === tipo;
            return (
              <button
                key={tipo}
                onClick={() => setFilterTipo(tipo)}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isSelected ? '1px solid #fbbf24' : '1px solid var(--border-subtle)',
                  background: isSelected ? 'rgba(217, 119, 6, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  color: isSelected ? '#fbbf24' : 'var(--text-muted)',
                  transition: 'all 0.2s ease',
                }}
              >
                {TIPO_ATENDIMENTO_CONFIG[tipo].label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Barbers Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
          Carregando equipe de profissionais...
        </div>
      ) : profissionaisFiltrados.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <Users style={{ width: '2.5rem', height: '2.5rem', color: 'var(--text-dim)', margin: '0 auto 1rem' }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.35rem' }}>
            Nenhum barbeiro encontrado
          </h4>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            {searchTerm || filterTipo !== 'todos'
              ? 'Nenhum profissional corresponde aos filtros de busca atuais.'
              : 'Comece adicionando os membros da sua equipe de barbeiros.'}
          </p>
          <button onClick={abrirModalNovo} className="btn-primary" style={{ fontSize: '0.88rem' }}>
            <Plus style={{ width: '1rem', height: '1rem' }} />
            Cadastrar Primeiro Barbeiro
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '0.75rem' }}>
          {profissionaisFiltrados.map((prof) => {
            const tipoInfo = TIPO_ATENDIMENTO_CONFIG[prof.tipo_atendimento] || {
              label: prof.tipo_atendimento,
              badgeClass: 'badge-gray',
            };
            const comissaoPercent = Math.round((prof.taxa_comissao || 0.5) * 100);
            const servicosRealizados = allServicos.filter((s) =>
              Array.isArray(prof.servicos_ids) && prof.servicos_ids.includes(s.id)
            );

            // Iniciais do barbeiro para avatar
            const initials = prof.nome
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <div
                key={prof.id}
                className="glass-panel animate-fade-in"
                style={{
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: prof.ativo
                    ? '1px solid var(--border-subtle)'
                    : '1px dashed rgba(255, 255, 255, 0.08)',
                  opacity: prof.ativo ? 1 : 0.65,
                  transition: 'all 0.2s ease',
                }}
              >
                <div>
                  {/* Top Bar: Attendance Type & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                    <span className={`badge ${tipoInfo.badgeClass}`} style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                      {tipoInfo.label}
                    </span>

                    <button
                      onClick={() => handleToggleAtivo(prof)}
                      title={prof.ativo ? 'Clique para desativar' : 'Clique para ativar'}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: prof.ativo ? '#34d399' : '#94a3b8',
                      }}
                    >
                      {prof.ativo ? (
                        <>
                          <CheckCircle2 style={{ width: '0.85rem', height: '0.85rem' }} />
                          Ativo
                        </>
                      ) : (
                        <>
                          <XCircle style={{ width: '0.85rem', height: '0.85rem' }} />
                          Inativo
                        </>
                      )}
                    </button>
                  </div>

                  {/* Profile Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
                    {prof.avatar_url ? (
                      <img
                        src={prof.avatar_url}
                        alt={prof.nome}
                        style={{
                          width: '2.5rem',
                          height: '2.5rem',
                          borderRadius: '0.65rem',
                          objectFit: 'cover',
                          border: '1px solid rgba(217, 119, 6, 0.4)',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '2.5rem',
                          height: '2.5rem',
                          borderRadius: '0.65rem',
                          background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </div>
                    )}

                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1.2 }}>
                        {prof.nome}
                      </h4>
                      {prof.apelido && (
                        <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600, marginTop: '0.1rem' }}>
                          "{prof.apelido}"
                        </div>
                      )}
                      {prof.telefone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                          <Phone style={{ width: '0.7rem', height: '0.7rem' }} />
                          {prof.telefone}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Highlights: Commission & VIP Club */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.85rem' }}>
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        borderRadius: '0.5rem',
                        padding: '0.5rem 0.7rem',
                      }}
                    >
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                        Comissão
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fbbf24' }}>
                        {comissaoPercent}%
                      </div>
                    </div>

                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        borderRadius: '0.5rem',
                        padding: '0.5rem 0.7rem',
                      }}
                    >
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                        Clube VIP
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: prof.aceita_clube ? '#34d399' : '#94a3b8', marginTop: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {prof.aceita_clube ? (
                          <>
                            <Sparkles style={{ width: '0.75rem', height: '0.75rem' }} />
                            Aceita VIP
                          </>
                        ) : (
                          'Não atende'
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Services Performed */}
                  <div style={{ marginBottom: '0.85rem' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Scissors style={{ width: '0.7rem', height: '0.7rem' }} />
                      Serviços que Realiza ({servicosRealizados.length}):
                    </div>
                    {servicosRealizados.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {servicosRealizados.map((serv) => (
                          <span
                            key={serv.id}
                            style={{
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '0.35rem',
                              padding: '0.15rem 0.45rem',
                              fontSize: '0.7rem',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {serv.nome}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        Nenhum serviço vinculado especificamente.
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.4rem', borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '0.75rem' }}>
                  <button
                    onClick={() => abrirModalEditar(prof)}
                    className="btn-secondary"
                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                  >
                    <Pencil size={13} />
                    Editar Barbeiro
                  </button>
                  <button
                    onClick={() => setDeleteId(prof.id)}
                    className="btn-danger"
                    title="Excluir barbeiro"
                    style={{ padding: '0.35rem 0.55rem' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create / Edit Barber */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content animate-fade-in">
            {/* Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(217, 119, 6, 0.15)', color: '#fbbf24' }}>
                  <Users style={{ width: '1.25rem', height: '1.25rem' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                    {editingProfissional ? 'Editar Barbeiro' : 'Cadastrar Novo Barbeiro'}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    Coleção: <code>profissionais</code> • Barbearia: {barbearia.nome}
                  </div>
                </div>
              </div>

              <button
                onClick={fecharModal}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {formError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  color: '#fca5a5',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <AlertCircle style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Foto do Barbeiro (Avatar) */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '0.75rem',
                padding: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                {/* Avatar Preview com clique para upload */}
                <label
                  style={{
                    position: 'relative',
                    cursor: 'pointer',
                    display: 'inline-block'
                  }}
                  title="Clique para escolher uma foto do dispositivo"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Prévia Foto"
                      style={{
                        width: '4rem',
                        height: '4rem',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #fbbf24',
                        boxShadow: '0 4px 12px rgba(217, 119, 6, 0.35)'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '4rem',
                      height: '4rem',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      border: '2px dashed rgba(255, 255, 255, 0.3)'
                    }}>
                      <Camera size={16} style={{ marginBottom: '2px' }} />
                      <span style={{ fontSize: '0.62rem' }}>FOTO</span>
                    </div>
                  )}

                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '1.35rem',
                    height: '1.35rem',
                    borderRadius: '50%',
                    background: '#fbbf24',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.4)'
                  }}>
                    <Camera size={11} />
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={uploadingImage}
                    onChange={(e) => {
                      handleImageFileSelect(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                </label>

                <div style={{ flex: 1, minWidth: '220px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.35rem' }}>
                    Foto de Perfil do Barbeiro
                  </label>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Link da imagem ou selecione pelo botão ao lado"
                      value={avatarUrl.startsWith('data:') ? '✅ [Foto do dispositivo selecionada]' : avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      style={{ fontSize: '0.8rem', padding: '0.45rem 0.65rem', flex: 1 }}
                    />

                    <label style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.85rem',
                      background: 'rgba(251, 191, 36, 0.16)',
                      border: '1px solid rgba(251, 191, 36, 0.45)',
                      borderRadius: '0.5rem',
                      color: '#fbbf24',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s'
                    }}>
                      <Upload size={13} />
                      <span>{uploadingImage ? 'Enviando...' : 'Fazer Upload'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        disabled={uploadingImage}
                        onChange={(e) => {
                          handleImageFileSelect(e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.4rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                      Clique na foto ou em "Fazer Upload" para enviar do dispositivo.
                    </span>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        style={{
                          background: 'transparent',
                          color: '#f87171',
                          border: 'none',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Remover Foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Informação sobre Grade & Bloqueio de Horários */}
              <div style={{
                background: 'rgba(56, 189, 248, 0.06)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '0.65rem',
                padding: '0.75rem 0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8' }}>
                    <Clock style={{ width: '0.85rem', height: '0.85rem' }} />
                    Grade & Horários deste Barbeiro
                  </div>
                  <a
                    href="/agendamentos"
                    style={{
                      fontSize: '0.72rem',
                      color: '#fbbf24',
                      textDecoration: 'none',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <Lock style={{ width: '0.75rem', height: '0.75rem' }} />
                    Bloquear Horários na Agenda ➔
                  </a>
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                  Os horários de atendimento seguem o padrão da barbearia ({currentBarb.horario_abertura || '09:00'} às {currentBarb.horario_fechamento || '20:00'}). Para agendar pausas, almoço ou folga deste barbeiro, basta usar o botão <strong>"Bloquear Horário"</strong> na aba <strong>Agendamentos</strong>.
                </p>
              </div>

              {/* Full Name & Nickname in 2 cols */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Nome Completo <span style={{ color: '#fbbf24' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ex: Carlos Eduardo Silva"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Apelido (Marcação Pública)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ex: Cadu Navalha"
                    value={apelido}
                    onChange={(e) => setApelido(e.target.value)}
                  />
                </div>
              </div>

              {/* Phone & Commission */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="(11) 98888-7777"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      Comissão {temComissao && <span style={{ color: '#fbbf24' }}>*</span>}
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.75rem', color: temComissao ? '#34d399' : 'var(--text-dim)' }}>
                      <input
                        type="checkbox"
                        checked={temComissao}
                        onChange={(e) => {
                          setTemComissao(e.target.checked);
                          if (!e.target.checked) setTaxaComissaoPorcentagem('0');
                          else if (taxaComissaoPorcentagem === '0') setTaxaComissaoPorcentagem('50');
                        }}
                        style={{ accentColor: '#fbbf24' }}
                      />
                      <span>{temComissao ? 'Com comissão' : 'Sem comissão (Dono)'}</span>
                    </label>
                  </div>

                  {temComissao ? (
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        className="input-field"
                        placeholder="50"
                        value={taxaComissaoPorcentagem}
                        onChange={(e) => setTaxaComissaoPorcentagem(e.target.value)}
                        required={temComissao}
                      />
                      <span style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                        %
                      </span>
                    </div>
                  ) : (
                    <div style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.75rem',
                      color: '#a1a1aa'
                    }}>
                      ⭐ 100% da receita fica na barbearia (Proprietário/Sem repasse).
                    </div>
                  )}
                </div>
              </div>

              {/* Attendance Type & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Tipo de Atendimento <span style={{ color: '#fbbf24' }}>*</span>
                  </label>
                  <select
                    className="input-field"
                    value={tipoAtendimento}
                    onChange={(e) => setTipoAtendimento(e.target.value as Profissional['tipo_atendimento'])}
                  >
                    <option value="hibrido_clube_geral">Híbrido (Clube VIP & Agendamento Geral)</option>
                    <option value="agendamento_geral">Agendamento Geral (Apenas Público Geral)</option>
                    <option value="exclusivo_clube">Exclusivo Clube VIP (Somente Assinantes)</option>
                    <option value="ambos">Legado: Ambos (Agenda & Fila)</option>
                    <option value="agenda">Legado: Apenas Agendamento</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Status do Profissional
                  </label>
                  <button
                    type="button"
                    onClick={() => setAtivo(!ativo)}
                    style={{
                      width: '100%',
                      padding: '0.72rem 1rem',
                      borderRadius: '0.65rem',
                      border: ativo ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: ativo ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                      color: ativo ? '#34d399' : 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    {ativo ? (
                      <>
                        <CheckCircle2 style={{ width: '1rem', height: '1rem' }} />
                        Barbeiro Ativo
                      </>
                    ) : (
                      <>
                        <XCircle style={{ width: '1rem', height: '1rem' }} />
                        Barbeiro Inativo
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* VIP Club Toggle */}
              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.65rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={aceitaClube}
                    onChange={(e) => setAceitaClube(e.target.checked)}
                    style={{ width: '1.1rem', height: '1.1rem', accentColor: '#fbbf24', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc' }}>
                      Atende Membros do Clube VIP
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Permite que assinantes de planos mensais realizem marcações com este profissional
                    </div>
                  </div>
                </label>
              </div>

              {/* Services Assignment */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Serviços que Realiza ({selectedServicosIds.length} selecionados)
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={selectAllServices}
                      style={{ background: 'transparent', border: 'none', color: '#60a5fa', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Todos
                    </button>
                    <span style={{ color: 'var(--text-dim)' }}>•</span>
                    <button
                      type="button"
                      onClick={clearAllServices}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Nenhum
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '0.5rem',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    padding: '0.5rem',
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderRadius: '0.65rem',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {allServicos.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', padding: '0.5rem' }}>
                      Nenhum serviço cadastrado ainda. Cadastre serviços na aba de Serviços.
                    </div>
                  ) : (
                    allServicos.map((serv) => {
                      const isChecked = selectedServicosIds.includes(serv.id);
                      return (
                        <div
                          key={serv.id}
                          onClick={() => toggleServicoSelection(serv.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 0.65rem',
                            borderRadius: '0.45rem',
                            background: isChecked ? 'rgba(217, 119, 6, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                            border: isChecked ? '1px solid rgba(217, 119, 6, 0.4)' : '1px solid transparent',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by parent onClick
                            style={{ accentColor: '#fbbf24', pointerEvents: 'none' }}
                          />
                          <div style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {serv.nome}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={fecharModal} className="btn-secondary" style={{ padding: '0.38rem 1rem', fontSize: '0.75rem', fontWeight: 700 }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={submitting} style={{ padding: '0.38rem 1rem', fontSize: '0.75rem', fontWeight: 700 }}>
                  {submitting ? 'Gravando no PocketBase...' : editingProfissional ? 'Salvar Alterações' : 'Criar Barbeiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteId && (
        <div className="modal-backdrop">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '400px', padding: '1.25rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.35rem', color: '#f87171' }}>
              Confirmar Exclusão
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              Tem certeza que deseja excluir este profissional da equipe? Esta ação removerá o barbeiro do catálogo público.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={() => setDeleteId(null)} className="btn-secondary" style={{ padding: '0.38rem 1rem', fontSize: '0.75rem', fontWeight: 700 }}>
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteId)} className="btn-danger" style={{ padding: '0.38rem 1rem', fontSize: '0.75rem', fontWeight: 700 }}>
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
