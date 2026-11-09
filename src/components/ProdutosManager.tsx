import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  DollarSign,
  Edit2,
  Trash2,
  Barcode,
  ShoppingBag,
  Sparkles,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  MinusCircle,
  Receipt
} from 'lucide-react';
import { Barbearia, Produto, produtosService, Servico, Profissional } from '../services/pocketbase';
import { FechamentoComandaModal } from './FechamentoComandaModal';

interface ProdutosManagerProps {
  barbearia: Barbearia;
  servicesList: Servico[];
  profissionaisList: Profissional[];
  onProductsChanged?: (produtos: Produto[]) => void;
}

type CategoriaType = 'todas' | 'cabelo' | 'barba' | 'bebidas' | 'cuidados' | 'acessorios';

export const ProdutosManager: React.FC<ProdutosManagerProps> = ({
  barbearia,
  servicesList,
  profissionaisList,
  onProductsChanged,
}) => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategoria, setSelectedCategoria] = useState<CategoriaType>('todas');

  // Modais
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
  const [isPdvModalOpen, setIsPdvModalOpen] = useState<boolean>(false);

  // Formulário de Produto
  const [formNome, setFormNome] = useState<string>('');
  const [formCategoria, setFormCategoria] = useState<Produto['categoria']>('cabelo');
  const [formPrecoVenda, setFormPrecoVenda] = useState<string>('');
  const [formPrecoCusto, setFormPrecoCusto] = useState<string>('');
  const [formEstoqueAtual, setFormEstoqueAtual] = useState<string>('10');
  const [formEstoqueMinimo, setFormEstoqueMinimo] = useState<string>('5');
  const [formCodigoBarras, setFormCodigoBarras] = useState<string>('');
  const [formDescricao, setFormDescricao] = useState<string>('');
  const [formAtivo, setFormAtivo] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Carrega produtos do PocketBase
  const loadProdutos = async () => {
    try {
      setLoading(true);
      const list = await produtosService.list(barbearia.id);
      setProdutos(list);
      onProductsChanged?.(list);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (barbearia?.id) {
      loadProdutos();
    }
  }, [barbearia?.id]);

  // Métricas do Estoque
  const metrics = useMemo(() => {
    const totalItens = produtos.length;
    let estoqueBaixo = 0;
    let esgotados = 0;
    let valorTotalEstoque = 0;
    let custoTotalEstoque = 0;

    produtos.forEach((p) => {
      const qtd = Number(p.estoque_atual) || 0;
      const min = Number(p.estoque_minimo) || 0;
      if (qtd === 0) esgotados++;
      else if (qtd <= min) estoqueBaixo++;

      valorTotalEstoque += qtd * (Number(p.preco_venda) || 0);
      custoTotalEstoque += qtd * (Number(p.preco_custo) || 0);
    });

    const lucroPotencial = valorTotalEstoque - custoTotalEstoque;

    return { totalItens, estoqueBaixo, esgotados, valorTotalEstoque, lucroPotencial };
  }, [produtos]);

  // Produtos filtrados
  const filteredProdutos = useMemo(() => {
    return produtos.filter((p) => {
      const matchCat = selectedCategoria === 'todas' || p.categoria === selectedCategoria;
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        p.nome.toLowerCase().includes(term) ||
        (p.codigo_barras && p.codigo_barras.toLowerCase().includes(term)) ||
        (p.descricao && p.descricao.toLowerCase().includes(term));
      return matchCat && matchSearch;
    });
  }, [produtos, selectedCategoria, searchTerm]);

  // Abertura do modal de criação
  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormNome('');
    setFormCategoria('cabelo');
    setFormPrecoVenda('');
    setFormPrecoCusto('');
    setFormEstoqueAtual('10');
    setFormEstoqueMinimo('5');
    setFormCodigoBarras('');
    setFormDescricao('');
    setFormAtivo(true);
    setIsProductModalOpen(true);
  };

  // Abertura do modal de edição
  const handleOpenEditModal = (prod: Produto) => {
    setEditingProduct(prod);
    setFormNome(prod.nome);
    setFormCategoria(prod.categoria);
    setFormPrecoVenda(String(prod.preco_venda));
    setFormPrecoCusto(prod.preco_custo ? String(prod.preco_custo) : '');
    setFormEstoqueAtual(String(prod.estoque_atual));
    setFormEstoqueMinimo(String(prod.estoque_minimo || 5));
    setFormCodigoBarras(prod.codigo_barras || '');
    setFormDescricao(prod.descricao || '');
    setFormAtivo(prod.ativo !== false);
    setIsProductModalOpen(true);
  };

  // Salvar Produto (Novo ou Edição)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      alert('Informe o nome do produto.');
      return;
    }
    const precoVendaNum = parseFloat(formPrecoVenda);
    if (isNaN(precoVendaNum) || precoVendaNum < 0) {
      alert('Informe um preço de venda válido.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        barbearia_id: barbearia.id,
        nome: formNome.trim(),
        categoria: formCategoria,
        preco_venda: precoVendaNum,
        preco_custo: parseFloat(formPrecoCusto) || 0,
        estoque_atual: parseInt(formEstoqueAtual, 10) || 0,
        estoque_minimo: parseInt(formEstoqueMinimo, 10) || 5,
        codigo_barras: formCodigoBarras.trim() || undefined,
        descricao: formDescricao.trim() || undefined,
        ativo: formAtivo,
      };

      if (editingProduct) {
        await produtosService.update(editingProduct.id, payload);
      } else {
        await produtosService.create(payload);
      }

      setIsProductModalOpen(false);
      await loadProdutos();
    } catch (err: any) {
      console.error('Erro ao salvar produto:', err);
      alert('Erro ao salvar produto no PocketBase.');
    } finally {
      setSaving(false);
    }
  };

  // Ajuste rápido de estoque (+1 / -1)
  const handleQuickAdjustStock = async (prodId: string, delta: number) => {
    try {
      await produtosService.adjustStock(prodId, delta);
      await loadProdutos();
    } catch (err) {
      console.error('Erro ao ajustar estoque:', err);
    }
  };

  // Excluir produto
  const handleDeleteProduct = async (prod: Produto) => {
    if (!window.confirm(`Tem certeza que deseja remover o produto "${prod.nome}"?`)) return;
    try {
      await produtosService.delete(prod.id);
      await loadProdutos();
    } catch (err) {
      console.error('Erro ao excluir produto:', err);
      alert('Não foi possível excluir o produto.');
    }
  };

  // Cálculo de Margem em tempo real no formulário
  const formMargem = useMemo(() => {
    const v = parseFloat(formPrecoVenda) || 0;
    const c = parseFloat(formPrecoCusto) || 0;
    if (v <= 0) return null;
    const lucro = v - c;
    const margemPerc = (lucro / v) * 100;
    return { lucro, margemPerc };
  }, [formPrecoVenda, formPrecoCusto]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* 1. Indicadores de Estoque & Valor Total */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
        <div className="glass-panel" style={{ padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <Package style={{ width: '1.15rem', height: '1.15rem' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Produtos Cadastrados
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{metrics.totalItens} itens</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>
            <AlertTriangle style={{ width: '1.15rem', height: '1.15rem' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Estoque Baixo
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: metrics.estoqueBaixo > 0 ? '#fbbf24' : 'var(--text-main)' }}>
              {metrics.estoqueBaixo} produtos
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            <XCircle style={{ width: '1.15rem', height: '1.15rem' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Itens Esgotados
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: metrics.esgotados > 0 ? '#f87171' : 'var(--text-muted)' }}>
              {metrics.esgotados} sem estoque
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <DollarSign style={{ width: '1.15rem', height: '1.15rem' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Valor Total em Estoque
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399' }}>
              R$ {metrics.valorTotalEstoque.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Barra de Controle & Ações */}
      <div className="glass-panel" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        
        {/* Pesquisa e Filtro */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '0.85rem', height: '0.85rem', color: 'var(--text-dim)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por produto ou código..."
              className="form-input"
              style={{ paddingLeft: '2rem', fontSize: '0.75rem' }}
            />
          </div>

          {/* Categorias Pills */}
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {[
              { id: 'todas', label: 'Todos' },
              { id: 'cabelo', label: 'Cabelo' },
              { id: 'barba', label: 'Barba' },
              { id: 'bebidas', label: 'Bebidas' },
              { id: 'cuidados', label: 'Cuidados' },
              { id: 'acessorios', label: 'Acessórios' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoria(cat.id as CategoriaType)}
                style={{
                  background: selectedCategoria === cat.id ? 'rgba(217, 119, 6, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${selectedCategoria === cat.id ? '#fbbf24' : 'var(--border-subtle)'}`,
                  color: selectedCategoria === cat.id ? '#fbbf24' : 'var(--text-muted)',
                  borderRadius: '999px',
                  padding: '0.28rem 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: selectedCategoria === cat.id ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Botões de Ação */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setIsPdvModalOpen(true)}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', padding: '0.38rem 0.85rem' }}
          >
            <Receipt style={{ width: '0.85rem', height: '0.85rem', color: '#fbbf24' }} />
            PDV Balcão Avulso
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', padding: '0.38rem 0.85rem' }}
          >
            <Plus style={{ width: '0.85rem', height: '0.85rem' }} />
            Novo Produto
          </button>
        </div>
      </div>

      {/* 3. Tabela de Produtos */}
      <div className="glass-panel" style={{ overflowX: 'auto', padding: 0 }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
            Carregando catálogo de produtos...
          </div>
        ) : filteredProdutos.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Nenhum produto encontrado com os filtros atuais.
            </p>
            <button type="button" onClick={handleOpenCreateModal} className="btn-secondary">
              Cadastrar Primeiro Produto
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255, 255, 255, 0.02)' }}>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--text-dim)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Produto / Categoria
                </th>
                <th style={{ padding: '1rem', color: 'var(--text-dim)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Preço Venda
                </th>
                <th style={{ padding: '1rem', color: 'var(--text-dim)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Preço Custo / Margem
                </th>
                <th style={{ padding: '1rem', color: 'var(--text-dim)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>
                  Controle de Estoque
                </th>
                <th style={{ padding: '1rem', color: 'var(--text-dim)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>
                  Status
                </th>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--text-dim)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProdutos.map((prod) => {
                const esgotado = prod.estoque_atual <= 0;
                const baixo = prod.estoque_atual <= prod.estoque_minimo && !esgotado;
                const margemR$ = (prod.preco_venda || 0) - (prod.preco_custo || 0);
                const margemPct = prod.preco_venda > 0 ? ((margemR$ / prod.preco_venda) * 100).toFixed(0) : '0';

                return (
                  <tr
                    key={prod.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Produto / Categoria */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {prod.nome}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '0.35rem',
                            background: 'rgba(255, 255, 255, 0.06)',
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                          }}
                        >
                          {prod.categoria}
                        </span>
                        {prod.codigo_barras && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Barcode style={{ width: '0.75rem', height: '0.75rem' }} />
                            {prod.codigo_barras}
                          </span>
                        )}
                      </div>
                      {prod.descricao && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem', maxWidth: '300px' }}>
                          {prod.descricao}
                        </div>
                      )}
                    </td>

                    {/* Preço de Venda */}
                    <td style={{ padding: '1rem', fontWeight: 800, fontSize: '1rem', color: '#38bdf8' }}>
                      R$ {prod.preco_venda.toFixed(2)}
                    </td>

                    {/* Preço Custo & Margem */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                        Custo: R$ {(prod.preco_custo || 0).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600, marginTop: '0.15rem' }}>
                        +R$ {margemR$.toFixed(2)} ({margemPct}%)
                      </div>
                    </td>

                    {/* Controle de Estoque com Botões Inline */}
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0, 0, 0, 0.25)', padding: '0.25rem 0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                        <button
                          type="button"
                          onClick={() => handleQuickAdjustStock(prod.id, -1)}
                          disabled={prod.estoque_atual <= 0}
                          title="Diminuir estoque (-1)"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: prod.estoque_atual <= 0 ? 'var(--text-dim)' : 'var(--text-muted)',
                            cursor: prod.estoque_atual <= 0 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                          }}
                        >
                          <MinusCircle style={{ width: '1rem', height: '1rem' }} />
                        </button>

                        <span
                          style={{
                            minWidth: '2.5rem',
                            fontWeight: 800,
                            fontSize: '0.95rem',
                            color: esgotado ? '#f87171' : baixo ? '#fbbf24' : 'var(--text-main)',
                          }}
                        >
                          {prod.estoque_atual}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleQuickAdjustStock(prod.id, 1)}
                          title="Aumentar estoque (+1)"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                          }}
                        >
                          <PlusCircle style={{ width: '1rem', height: '1rem' }} />
                        </button>
                      </div>

                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                        Mínimo: {prod.estoque_minimo || 5} un
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {esgotado ? (
                        <span style={{ fontSize: '0.72rem', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.25rem 0.6rem', borderRadius: '999px', fontWeight: 700 }}>
                          Esgotado
                        </span>
                      ) : baixo ? (
                        <span style={{ fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.25rem 0.6rem', borderRadius: '999px', fontWeight: 700 }}>
                          Estoque Baixo
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.25rem 0.6rem', borderRadius: '999px', fontWeight: 700 }}>
                          Normal
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.45rem' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(prod)}
                          title="Editar Produto"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-muted)',
                            padding: '0.4rem',
                            borderRadius: '0.4rem',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit2 style={{ width: '0.85rem', height: '0.85rem' }} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(prod)}
                          title="Excluir Produto"
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#f87171',
                            padding: '0.4rem',
                            borderRadius: '0.4rem',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 style={{ width: '0.85rem', height: '0.85rem' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Cadastro / Edição de Produto */}
      {isProductModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(6px)',
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
              padding: '1.75rem',
              borderRadius: '1rem',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package style={{ width: '1.25rem', height: '1.25rem', color: '#fbbf24' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Pomada Modeladora Matte 150g"
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Categoria *
                  </label>
                  <select
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value as any)}
                    className="form-input"
                  >
                    <option value="cabelo">Cabelo</option>
                    <option value="barba">Barba</option>
                    <option value="bebidas">Bebidas</option>
                    <option value="cuidados">Cuidados</option>
                    <option value="acessorios">Acessórios</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Código de Barras (opcional)
                  </label>
                  <input
                    type="text"
                    value={formCodigoBarras}
                    onChange={(e) => setFormCodigoBarras(e.target.value)}
                    placeholder="7891000101"
                    className="form-input"
                  />
                </div>
              </div>

              {/* Preços e Margem */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Preço de Venda (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    required
                    value={formPrecoVenda}
                    onChange={(e) => setFormPrecoVenda(e.target.value)}
                    placeholder="45.00"
                    className="form-input"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Preço de Custo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    value={formPrecoCusto}
                    onChange={(e) => setFormPrecoCusto(e.target.value)}
                    placeholder="20.00"
                    className="form-input"
                  />
                </div>
              </div>

              {/* Margem Projetada */}
              {formMargem && (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.82rem',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>Margem de Lucro Estimada:</span>
                  <strong style={{ color: '#34d399' }}>
                    R$ {formMargem.lucro.toFixed(2)} ({formMargem.margemPerc.toFixed(1)}%)
                  </strong>
                </div>
              )}

              {/* Estoque */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Estoque Atual (unidades) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formEstoqueAtual}
                    onChange={(e) => setFormEstoqueAtual(e.target.value)}
                    placeholder="10"
                    className="form-input"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Estoque Mínimo (Alerta)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formEstoqueMinimo}
                    onChange={(e) => setFormEstoqueMinimo(e.target.value)}
                    placeholder="5"
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Descrição Curta (opcional)
                </label>
                <textarea
                  rows={2}
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Detalhes sobre a fragrância, fixação ou tipo de cerveja..."
                  className="form-input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  id="prod-ativo"
                  checked={formAtivo}
                  onChange={(e) => setFormAtivo(e.target.checked)}
                />
                <label htmlFor="prod-ativo" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                  Produto ativo no catálogo de vendas
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="btn-secondary"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : editingProduct ? 'Atualizar Produto' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de PDV Balcão Avulso */}
      {isPdvModalOpen && (
        <FechamentoComandaModal
          isOpen={isPdvModalOpen}
          onClose={() => setIsPdvModalOpen(false)}
          onSuccess={() => {
            loadProdutos();
          }}
          barbeariaId={barbearia.id}
          agendamento={null}
          servicesList={servicesList}
          profissionaisList={profissionaisList}
          produtosList={produtos}
        />
      )}
    </div>
  );
};
