import React, { useState, useEffect, useMemo } from 'react';
import {
  Scissors,
  Plus,
  Pencil,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Sparkles,
  Tag,
  AlertCircle,
  X,
  Layers,
  Coins,
  Star,
  Image as ImageIcon,
  FolderPlus
} from 'lucide-react';
import { Barbearia, Servico, servicosService, CategoriaServico, categoriasService } from '../services/pocketbase';

interface ServicosManagerProps {
  barbearia: Barbearia;
  onServicesChanged?: (services: Servico[]) => void;
}

const CATEGORIAS_PADRAO: Record<
  string,
  { label: string; badgeClass: string; desc: string }
> = {
  cabelo: { label: 'Cabelo', badgeClass: 'badge-blue', desc: 'Cortes, penteados e finalizações' },
  barba: { label: 'Barba', badgeClass: 'badge-amber', desc: 'Barboterapia e alinhamento' },
  combos: { label: 'Combos', badgeClass: 'badge-purple', desc: 'Pacotes combinados cabelo + barba' },
  promocao: { label: 'Promoção', badgeClass: 'gold-badge', desc: 'Promoções especiais e cortes promocionais' },
  tratamento: { label: 'Tratamento', badgeClass: 'badge-green', desc: 'Hidratação, selagem e química' },
  clube: { label: 'Clube VIP', badgeClass: 'gold-badge', desc: 'Serviços exclusivos para membros VIP' },
};

export const ServicosManager: React.FC<ServicosManagerProps> = ({
  barbearia,
  onServicesChanged,
}) => {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todas');
  
  // Categorias do banco
  const [categoriasBanco, setCategoriasBanco] = useState<CategoriaServico[]>([]);
  const [isCategoriasModalOpen, setIsCategoriasModalOpen] = useState(false);
  const [newCatNome, setNewCatNome] = useState('');
  const [savingCat, setSavingCat] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatNome, setEditingCatNome] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServico, setEditingServico] = useState<Servico | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [duracaoMinutos, setDuracaoMinutos] = useState('30');
  const [categoria, setCategoria] = useState<string>('cabelo');
  const [ativo, setAtivo] = useState(true);
  const [descricao, setDescricao] = useState('');
  const [destaque, setDestaque] = useState(false);
  const [fotoUrl, setFotoUrl] = useState('');

  // Comissão Flexível por Serviço
  const [comissaoPersonalizadaAtiva, setComissaoPersonalizadaAtiva] = useState(false);
  const [comissaoTipo, setComissaoTipo] = useState<'padrao_barbeiro' | 'porcentagem_fixa' | 'valor_fixo'>('padrao_barbeiro');
  const [comissaoValor, setComissaoValor] = useState('35');

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const carregarCategorias = async () => {
    try {
      const cats = await categoriasService.list(barbearia.id);
      setCategoriasBanco(cats);
    } catch (e) {
      console.warn('Aviso ao carregar categorias:', e);
    }
  };

  const carregarServicos = async () => {
    setLoading(true);
    try {
      const [data] = await Promise.all([
        servicosService.list(barbearia.id),
        carregarCategorias()
      ]);
      setServicos(data);
      if (onServicesChanged) {
        onServicesChanged(data);
      }
    } catch (err) {
      console.error('Erro ao buscar serviços:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarServicos();
  }, [barbearia.id]);

  const abrirModalNovo = () => {
    setEditingServico(null);
    setNome('');
    setPreco('');
    setDuracaoMinutos('30');
    setCategoria('cabelo');
    setAtivo(true);
    setDescricao('');
    setDestaque(false);
    setFotoUrl('');
    setComissaoPersonalizadaAtiva(false);
    setComissaoTipo('padrao_barbeiro');
    setComissaoValor('35');
    setFormError(null);
    setIsModalOpen(true);
  };

  const abrirModalEditar = (servico: Servico) => {
    setEditingServico(servico);
    setNome(servico.nome);
    setPreco(servico.preco.toString());
    setDuracaoMinutos(servico.duracao_minutos.toString());
    setCategoria(servico.categoria || 'cabelo');
    setAtivo(servico.ativo);
    setDescricao(servico.descricao || '');
    setDestaque(Boolean(servico.destaque));
    setFotoUrl(servico.foto_url || servico.foto || '');
    setComissaoPersonalizadaAtiva(Boolean(servico.comissao_personalizada_ativa));
    setComissaoTipo(servico.comissao_tipo || 'padrao_barbeiro');
    setComissaoValor((servico.comissao_valor ?? 35).toString());
    setFormError(null);
    setIsModalOpen(true);
  };

  const fecharModal = () => {
    setIsModalOpen(false);
    setEditingServico(null);
    setFormError(null);
  };

  // Lista unificada de categorias (padrão + cadastradas no PocketBase)
  const todasCategorias = useMemo(() => {
    const map = new Map<string, { label: string; badgeClass: string; desc: string; id?: string }>();
    
    // Categorias padrão
    Object.entries(CATEGORIAS_PADRAO).forEach(([key, val]) => {
      map.set(key.toLowerCase(), { ...val });
    });

    // Categorias cadastradas no PocketBase
    categoriasBanco.forEach((cat) => {
      const key = cat.nome.toLowerCase().trim();
      map.set(key, {
        label: cat.nome,
        badgeClass: 'badge-purple',
        desc: `Categoria ${cat.nome}`,
        id: cat.id
      });
    });

    return Array.from(map.entries()).map(([key, val]) => ({ key, ...val }));
  }, [categoriasBanco]);

  const handleCriarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatNome.trim()) return;
    setSavingCat(true);
    try {
      await categoriasService.create({
        barbearia: barbearia.id,
        nome: newCatNome.trim(),
        ordem: categoriasBanco.length + 1
      });
      setNewCatNome('');
      await carregarCategorias();
    } catch (err) {
      console.error('Erro ao criar categoria:', err);
      alert('Falha ao salvar nova categoria.');
    } finally {
      setSavingCat(false);
    }
  };

  const handleSalvarEdicaoCategoria = async (catId?: string, defaultLabel?: string) => {
    if (!editingCatNome.trim()) return;
    setSavingCat(true);
    try {
      if (catId) {
        // Categoria customizada existente no banco
        await categoriasService.update(catId, { nome: editingCatNome.trim() });
      } else if (defaultLabel) {
        // Categoria padrão que o usuário está personalizando para a barbearia dele
        await categoriasService.create({
          barbearia: barbearia.id,
          nome: editingCatNome.trim(),
          ordem: categoriasBanco.length + 1
        });
      }
      setEditingCatId(null);
      setEditingCatNome('');
      await carregarCategorias();
    } catch (err) {
      console.error('Erro ao atualizar categoria:', err);
      alert('Falha ao atualizar categoria.');
    } finally {
      setSavingCat(false);
    }
  };

  const handleExcluirCategoria = async (catId: string, nomeCat: string) => {
    if (!window.confirm(`Deseja remover a categoria "${nomeCat}"?`)) return;
    try {
      await categoriasService.delete(catId);
      await carregarCategorias();
    } catch (err) {
      console.error('Erro ao excluir categoria:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const precoNum = parseFloat(preco.replace(',', '.'));
    const duracaoNum = parseInt(duracaoMinutos, 10);

    if (!nome.trim()) {
      setFormError('O nome do serviço é obrigatório.');
      return;
    }

    if (isNaN(precoNum) || precoNum < 0) {
      setFormError('Informe um valor de preço válido (número positivo).');
      return;
    }

    if (isNaN(duracaoNum) || duracaoNum <= 0) {
      setFormError('Informe a duração estimada em minutos (maior que zero).');
      return;
    }

    setSubmitting(true);
    const comissaoNum = parseFloat(comissaoValor.replace(',', '.')) || 0;

    try {
      if (editingServico) {
        await servicosService.update(editingServico.id, {
          nome: nome.trim(),
          preco: precoNum,
          duracao_minutos: duracaoNum,
          categoria: categoria.trim().toLowerCase() as any,
          ativo,
          descricao: descricao.trim() || undefined,
          destaque,
          foto_url: fotoUrl.trim() || undefined,
          comissao_personalizada_ativa: comissaoPersonalizadaAtiva,
          comissao_tipo: comissaoPersonalizadaAtiva ? comissaoTipo : 'padrao_barbeiro',
          comissao_valor: comissaoPersonalizadaAtiva ? comissaoNum : 0,
        });
      } else {
        await servicosService.create({
          barbearia_id: barbearia.id,
          nome: nome.trim(),
          preco: precoNum,
          duracao_minutos: duracaoNum,
          categoria: categoria.trim().toLowerCase() as any,
          ativo,
          descricao: descricao.trim() || undefined,
          destaque,
          foto_url: fotoUrl.trim() || undefined,
          comissao_personalizada_ativa: comissaoPersonalizadaAtiva,
          comissao_tipo: comissaoPersonalizadaAtiva ? comissaoTipo : 'padrao_barbeiro',
          comissao_valor: comissaoPersonalizadaAtiva ? comissaoNum : 0,
        });
      }

      fecharModal();
      await carregarServicos();
    } catch (err: any) {
      console.error('Erro ao salvar serviço:', err);
      setFormError(err.message || 'Erro ao comunicar com o PocketBase.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAtivo = async (servico: Servico) => {
    try {
      await servicosService.update(servico.id, { ativo: !servico.ativo });
      await carregarServicos();
    } catch (err) {
      console.error('Erro ao alterar status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await servicosService.delete(id);
      setDeleteId(null);
      await carregarServicos();
    } catch (err) {
      console.error('Erro ao excluir serviço:', err);
    }
  };

  // Filtragem de serviços
  const servicosFiltrados = useMemo(() => {
    return servicos.filter((s) => {
      const matchCategoria =
        selectedCategoria === 'todas' || s.categoria === selectedCategoria;
      const matchSearch =
        s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.descricao && s.descricao.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCategoria && matchSearch;
    });
  }, [servicos, selectedCategoria, searchTerm]);

  // Estatísticas rápidas
  const totalServicos = servicos.length;
  const servicosAtivos = servicos.filter((s) => s.ativo).length;
  const precoMedio =
    totalServicos > 0
      ? (servicos.reduce((acc, curr) => acc + curr.preco, 0) / totalServicos).toFixed(2)
      : '0.00';
  const duracaoMedia =
    totalServicos > 0
      ? Math.round(servicos.reduce((acc, curr) => acc + curr.duracao_minutos, 0) / totalServicos)
      : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Top Bar with Metrics & New Service Button */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.65rem' }}>
        <div className="glass-panel" style={{ padding: '0.65rem 0.85rem' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total de Serviços
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.15rem', color: '#f8fafc' }}>
            {totalServicos}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#34d399', marginTop: '0.1rem' }}>
            {servicosAtivos} ativos no catálogo
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '0.65rem 0.85rem' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Preço Médio
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.15rem', color: '#fbbf24' }}>
            R$ {precoMedio.replace('.', ',')}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>
            Ticket médio dos cortes
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '0.65rem 0.85rem' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Tempo Médio por Corte
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.15rem', color: '#60a5fa' }}>
            {duracaoMedia} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>min</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>
            Tempo de cadeira estimado
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '0.65rem 0.85rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
          <button
            onClick={() => setIsCategoriasModalOpen(true)}
            className="btn-secondary"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            title="Gerenciar Categorias de Serviços"
          >
            <Layers size={13} />
            Categorias
          </button>
          <button
            onClick={abrirModalNovo}
            className="btn-primary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Plus size={13} />
            + Novo Serviço
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '0.75rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Search */}
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
            placeholder="Buscar serviço por nome ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        {/* Categories Tabs */}
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedCategoria('todas')}
            style={{
              padding: '0.3rem 0.65rem',
              borderRadius: '0.5rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: selectedCategoria === 'todas' ? '1px solid #fbbf24' : '1px solid var(--border-subtle)',
              background: selectedCategoria === 'todas' ? 'rgba(217, 119, 6, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              color: selectedCategoria === 'todas' ? '#fbbf24' : 'var(--text-muted)',
              transition: 'all 0.2s ease',
            }}
          >
            Todas ({totalServicos})
          </button>
          {todasCategorias.map((cat) => {
            const count = servicos.filter((s) => (s.categoria || '').toLowerCase() === cat.key).length;
            const isSelected = selectedCategoria === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategoria(cat.key)}
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
                  textTransform: 'capitalize',
                }}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
          Carregando catálogo de serviços...
        </div>
      ) : servicosFiltrados.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <Scissors style={{ width: '2.5rem', height: '2.5rem', color: 'var(--text-dim)', margin: '0 auto 1rem' }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.35rem' }}>
            Nenhum serviço encontrado
          </h4>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            {searchTerm || selectedCategoria !== 'todas'
              ? 'Tente ajustar os filtros de busca para encontrar o item desejado.'
              : 'Comece adicionando seu primeiro corte, barba ou combo ao catálogo.'}
          </p>
          <button onClick={abrirModalNovo} className="btn-primary" style={{ fontSize: '0.88rem' }}>
            <Plus style={{ width: '1rem', height: '1rem' }} />
            Cadastrar Primeiro Serviço
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {servicosFiltrados.map((servico) => {
            const catInfo = todasCategorias.find((c) => c.key === (servico.categoria || '').toLowerCase()) || {
              label: servico.categoria,
              badgeClass: 'badge-gray',
            };

            return (
              <div
                key={servico.id}
                className="glass-panel animate-fade-in"
                style={{
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: servico.destaque
                    ? '1px solid rgba(245, 158, 11, 0.45)'
                    : servico.ativo
                    ? '1px solid var(--border-subtle)'
                    : '1px dashed rgba(255, 255, 255, 0.08)',
                  background: servico.destaque
                    ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.06) 0%, rgba(13, 19, 34, 0.6) 100%)'
                    : undefined,
                  opacity: servico.ativo ? 1 : 0.65,
                  transition: 'all 0.2s ease',
                }}
              >
                <div>
                  {/* Category, Destaque & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <span className={`badge ${catInfo.badgeClass}`} style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                        <Tag style={{ width: '0.7rem', height: '0.7rem' }} />
                        {catInfo.label}
                      </span>
                      {servico.destaque && (
                        <span className="gold-badge" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Star style={{ width: '0.68rem', height: '0.68rem', fill: '#fbbf24' }} />
                          Destaque
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleToggleAtivo(servico)}
                      title={servico.ativo ? 'Clique para desativar' : 'Clique para ativar'}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: servico.ativo ? '#34d399' : '#94a3b8',
                      }}
                    >
                      {servico.ativo ? (
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

                  {/* Service Header with optional Image */}
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                    {(servico.foto_url || servico.foto) && (
                      <img
                        src={servico.foto_url || servico.foto}
                        alt={servico.nome}
                        style={{
                          width: '3.4rem',
                          height: '3.4rem',
                          borderRadius: '0.5rem',
                          objectFit: 'cover',
                          border: servico.destaque ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                          flexShrink: 0
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.25rem', color: '#f8fafc', lineHeight: 1.25 }}>
                        {servico.nome}
                      </h4>

                      {/* Description */}
                      {servico.descricao ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: '1.35', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {servico.descricao}
                        </p>
                      ) : (
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontStyle: 'italic', margin: 0 }}>
                          Sem descrição cadastrada.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  {/* Price and Duration */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '0.65rem',
                      padding: '0.65rem 0.85rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                        Preço
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fbbf24' }}>
                        R$ {servico.preco.toFixed(2).replace('.', ',')}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                        Duração
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#60a5fa', fontWeight: 700, fontSize: '0.85rem' }}>
                        <Clock style={{ width: '0.75rem', height: '0.75rem' }} />
                        {servico.duracao_minutos} min
                      </div>
                    </div>
                  </div>

                  {/* Badge de Comissão do Serviço */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.72rem' }}>
                    <span style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Coins size={12} style={{ color: '#fbbf24' }} />
                      Comissão:
                    </span>
                    {servico.comissao_personalizada_ativa ? (
                      <span style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#34d399',
                        padding: '0.1rem 0.45rem',
                        borderRadius: '0.35rem',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                      }}>
                        {servico.comissao_tipo === 'valor_fixo'
                          ? `Fixa R$ ${(servico.comissao_valor ?? 0).toFixed(2)}`
                          : `${servico.comissao_valor ?? 0}% (Override)`}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: '0.7rem' }}>
                        Padrão do Barbeiro
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      onClick={() => abrirModalEditar(servico)}
                      className="btn-secondary"
                      style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                    >
                      <Pencil size={13} />
                      Editar
                    </button>
                    <button
                      onClick={() => setDeleteId(servico.id)}
                      className="btn-danger"
                      title="Excluir serviço"
                      style={{ padding: '0.35rem 0.55rem' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create / Edit Service */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content animate-fade-in">
            {/* Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(217, 119, 6, 0.15)', color: '#fbbf24' }}>
                  <Scissors style={{ width: '1.25rem', height: '1.25rem' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                    {editingServico ? 'Editar Serviço' : 'Novo Serviço no Catálogo'}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    Coleção: <code>servicos</code> • Barbearia: {barbearia.nome}
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

              {/* Destaque da Semana / Promoção */}
              <div
                style={{
                  background: destaque ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  border: destaque ? '1px solid rgba(245, 158, 11, 0.45)' : '1px solid var(--border-subtle)',
                  borderRadius: '0.65rem',
                  padding: '0.75rem 0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => setDestaque(!destaque)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div
                    style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '0.45rem',
                      background: destaque ? '#f59e0b' : 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: destaque ? '#000000' : 'var(--text-dim)',
                    }}
                  >
                    <Star style={{ width: '1.1rem', height: '1.1rem', fill: destaque ? '#000000' : 'none' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: destaque ? '#fbbf24' : '#f8fafc' }}>
                      ⭐ Definir como Destaque da Semana
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Exibe este serviço em evidência no topo da Vitrine (ex: Corte + Cerveja, Promoção de Sexta)
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={destaque}
                  onChange={(e) => setDestaque(e.target.checked)}
                  style={{ width: '1.15rem', height: '1.15rem', accentColor: '#f59e0b', cursor: 'pointer' }}
                />
              </div>

              {/* Foto / Imagem Promocional do Serviço */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '0.65rem',
                  padding: '0.75rem 0.9rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc' }}>
                  <ImageIcon style={{ width: '0.9rem', height: '0.9rem', color: '#fbbf24' }} />
                  Foto / Imagem do Serviço
                </label>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {fotoUrl ? (
                    <img
                      src={fotoUrl}
                      alt="Prévia Serviço"
                      style={{
                        width: '3.5rem',
                        height: '3.5rem',
                        borderRadius: '0.5rem',
                        objectFit: 'cover',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '3.5rem',
                        height: '3.5rem',
                        borderRadius: '0.5rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px dashed var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-dim)',
                        flexShrink: 0,
                      }}
                    >
                      <Scissors style={{ width: '1.25rem', height: '1.25rem' }} />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <input
                      type="url"
                      className="input-field"
                      placeholder="URL da imagem (ex: foto de corte + cerveja, barba, etc.)"
                      value={fotoUrl}
                      onChange={(e) => setFotoUrl(e.target.value)}
                      style={{ fontSize: '0.8rem', padding: '0.45rem 0.65rem', width: '100%' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Sugestões rápidas:</span>
                      {[
                        { label: 'Corte + Cerveja', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80' },
                        { label: 'Cabelo & Barba', url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=400&q=80' },
                        { label: 'Barboterapia', url: 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=400&q=80' },
                        { label: 'Degradê', url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=400&q=80' },
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFotoUrl(preset.url)}
                          style={{
                            background: fotoUrl === preset.url ? '#d97706' : 'rgba(255, 255, 255, 0.05)',
                            color: fotoUrl === preset.url ? '#ffffff' : 'var(--text-muted)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '0.35rem',
                            padding: '0.12rem 0.45rem',
                            fontSize: '0.68rem',
                            cursor: 'pointer',
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                      {fotoUrl && (
                        <button
                          type="button"
                          onClick={() => setFotoUrl('')}
                          style={{ background: 'transparent', color: '#f87171', border: 'none', fontSize: '0.68rem', cursor: 'pointer', marginLeft: 'auto' }}
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Nome do Serviço <span style={{ color: '#fbbf24' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: Corte Degradê + Cerveja Artesanal, Barboterapia..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>

              {/* Category & Status in 2 columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      Categoria <span style={{ color: '#fbbf24' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCategoriasModalOpen(true)}
                      style={{ background: 'transparent', border: 'none', color: '#fbbf24', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      + Nova Categoria
                    </button>
                  </div>
                  <select
                    className="input-field"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                  >
                    {todasCategorias.map((cat) => (
                      <option key={cat.key} value={cat.key}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Status no Catálogo
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
                        Serviço Ativo
                      </>
                    ) : (
                      <>
                        <XCircle style={{ width: '1rem', height: '1rem' }} />
                        Serviço Inativo
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Price & Duration */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Preço (R$) <span style={{ color: '#fbbf24' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      className="input-field"
                      placeholder="45.00"
                      value={preco}
                      onChange={(e) => setPreco(e.target.value)}
                      style={{ paddingLeft: '2.5rem' }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Duração (Minutos) <span style={{ color: '#fbbf24' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="5"
                    min="5"
                    className="input-field"
                    placeholder="30"
                    value={duracaoMinutos}
                    onChange={(e) => setDuracaoMinutos(e.target.value)}
                    required
                  />
                  {/* Presets */}
                  <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem' }}>
                    {[20, 30, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDuracaoMinutos(mins.toString())}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '0.35rem',
                          padding: '0.15rem 0.45rem',
                          fontSize: '0.7rem',
                          color: duracaoMinutos === mins.toString() ? '#60a5fa' : 'var(--text-dim)',
                          cursor: 'pointer',
                        }}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* REGRA DE COMISSÃO DO SERVIÇO (OVERRIDE) */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: comissaoPersonalizadaAtiva ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)',
                  borderRadius: '0.75rem',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  transition: 'border 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ padding: '0.35rem', borderRadius: '0.4rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                      <Coins style={{ width: '1rem', height: '1rem' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', display: 'block' }}>
                        Regra de Comissão por Serviço
                      </label>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        Sobrescreve a taxa de comissão padrão cadastrada no profissional
                      </span>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={comissaoPersonalizadaAtiva}
                    onChange={(e) => setComissaoPersonalizadaAtiva(e.target.checked)}
                    style={{ width: '1.2rem', height: '1.2rem', accentColor: '#f59e0b', cursor: 'pointer' }}
                  />
                </div>

                {comissaoPersonalizadaAtiva && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setComissaoTipo('porcentagem_fixa')}
                        style={{
                          padding: '0.45rem 0.75rem',
                          borderRadius: '0.5rem',
                          border: comissaoTipo === 'porcentagem_fixa' ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
                          background: comissaoTipo === 'porcentagem_fixa' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                          color: comissaoTipo === 'porcentagem_fixa' ? '#fbbf24' : 'var(--text-muted)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Porcentagem Fixa (%)
                      </button>

                      <button
                        type="button"
                        onClick={() => setComissaoTipo('valor_fixo')}
                        style={{
                          padding: '0.45rem 0.75rem',
                          borderRadius: '0.5rem',
                          border: comissaoTipo === 'valor_fixo' ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
                          background: comissaoTipo === 'valor_fixo' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                          color: comissaoTipo === 'valor_fixo' ? '#fbbf24' : 'var(--text-muted)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Valor Fixo (R$)
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ position: 'relative', width: '130px' }}>
                        <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 700 }}>
                          {comissaoTipo === 'valor_fixo' ? 'R$' : '%'}
                        </span>
                        <input
                          type="number"
                          step={comissaoTipo === 'valor_fixo' ? '1.00' : '1'}
                          min="0"
                          value={comissaoValor}
                          onChange={(e) => setComissaoValor(e.target.value)}
                          className="input-field"
                          placeholder={comissaoTipo === 'valor_fixo' ? '25.00' : '35'}
                          style={{ paddingRight: '2.2rem', fontWeight: 700 }}
                        />
                      </div>

                      {/* Simulação em tempo real */}
                      {(() => {
                        const pNum = parseFloat(preco.replace(',', '.')) || 0;
                        const cVal = parseFloat(comissaoValor.replace(',', '.')) || 0;
                        const vProf = comissaoTipo === 'valor_fixo' ? Math.min(pNum, cVal) : pNum * (cVal / 100);
                        const vLoja = Math.max(0, pNum - vProf);

                        return (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                            Com corte a <strong style={{ color: '#f8fafc' }}>R$ {pNum.toFixed(2)}</strong>: Barbeiro recebe{' '}
                            <strong style={{ color: '#34d399' }}>R$ {vProf.toFixed(2)}</strong> e a Barbearia{' '}
                            <strong style={{ color: '#38bdf8' }}>R$ {vLoja.toFixed(2)}</strong>.
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Descrição / Detalhes (Opcional)
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Descreva o que está incluso no atendimento, técnicas aplicadas e produtos de finalização..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={fecharModal} className="btn-secondary" style={{ padding: '0.38rem 1rem', fontSize: '0.75rem', fontWeight: 700 }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={submitting} style={{ padding: '0.38rem 1rem', fontSize: '0.75rem', fontWeight: 700 }}>
                  {submitting ? 'Gravando no PocketBase...' : editingServico ? 'Salvar Alterações' : 'Criar Serviço'}
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
              Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.
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

      {/* Modal: Gerenciar Categorias */}
      {isCategoriasModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '480px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ padding: '0.45rem', borderRadius: '0.5rem', background: 'rgba(217, 119, 6, 0.15)', color: '#fbbf24' }}>
                  <Layers style={{ width: '1.25rem', height: '1.25rem' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                    Gerenciar Categorias
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    Organize os serviços da barbearia
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCategoriasModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* Form Nova Categoria */}
              <form onSubmit={handleCriarCategoria} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  required
                  placeholder="Nome da categoria (ex: Promoções, Bar & Bebidas, Infantil...)"
                  className="input-field"
                  value={newCatNome}
                  onChange={(e) => setNewCatNome(e.target.value)}
                  style={{ flex: 1, fontSize: '0.82rem' }}
                />
                <button
                  type="submit"
                  disabled={savingCat || !newCatNome.trim()}
                  className="btn-primary"
                  style={{ fontSize: '0.75rem', padding: '0.45rem 0.85rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Plus size={13} />
                  <span>{savingCat ? 'Salvando...' : 'Adicionar'}</span>
                </button>
              </form>

              {/* Lista de Categorias Atuais */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Categorias Disponíveis ({todasCategorias.length})
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '240px', overflowY: 'auto' }}>
                  {todasCategorias.map((cat) => (
                    <div
                      key={cat.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '0.5rem',
                        padding: '0.45rem 0.75rem',
                        gap: '0.5rem'
                      }}
                    >
                      {editingCatId === (cat.id || cat.key) ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%' }}>
                          <input
                            type="text"
                            value={editingCatNome}
                            onChange={(e) => setEditingCatNome(e.target.value)}
                            className="input-field"
                            style={{ flex: 1, fontSize: '0.78rem', padding: '0.3rem 0.5rem' }}
                            placeholder="Nome da categoria"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSalvarEdicaoCategoria(cat.id, cat.label)}
                            disabled={savingCat || !editingCatNome.trim()}
                            className="btn-primary"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingCatId(null); setEditingCatNome(''); }}
                            className="btn-secondary"
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.7rem' }}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className={`badge ${cat.badgeClass}`} style={{ fontSize: '0.65rem' }}>
                              <Tag size={10} />
                              {cat.label}
                            </span>
                            {cat.id ? (
                              <span style={{ fontSize: '0.7rem', color: '#34d399' }}>Personalizada</span>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Padrão</span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCatId(cat.id || cat.key);
                                setEditingCatNome(cat.label);
                              }}
                              className="btn-secondary"
                              title="Editar nome da categoria"
                              style={{ padding: '0.25rem 0.45rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center' }}
                            >
                              <Pencil size={11} />
                            </button>

                            {cat.id && (
                              <button
                                type="button"
                                onClick={() => handleExcluirCategoria(cat.id!, cat.label)}
                                className="btn-danger"
                                title="Remover categoria"
                                style={{ padding: '0.25rem 0.45rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center' }}
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCategoriasModalOpen(false)}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem' }}
                >
                  Concluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
