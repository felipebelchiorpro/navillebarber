import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  Scissors,
  DollarSign,
  Crown,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X
} from 'lucide-react';
import { Barbearia, Cliente, clientesService, agendamentosService } from '../services/pocketbase';

interface BaseClientesViewProps {
  barbearia: Barbearia;
}

export const BaseClientesView: React.FC<BaseClientesViewProps> = ({ barbearia }) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);

  // Form states
  const [formNome, setFormNome] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formObservacoes, setFormObservacoes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await clientesService.list(barbearia.id, '', 'todos');
      setClientes(res);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    } finally {
      setLoading(false);
    }
  }, [barbearia.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredClientes = useMemo(() => {
    if (!searchTerm.trim()) return clientes;
    const q = searchTerm.toLowerCase();
    const qDigits = searchTerm.replace(/\D/g, '');
    return clientes.filter((c) => {
      const matchNome = (c.nome || '').toLowerCase().includes(q);
      const matchEmail = (c.email || '').toLowerCase().includes(q);
      const cDigits = (c.telefone || '').replace(/\D/g, '');
      const matchTel = qDigits ? cDigits.includes(qDigits) : false;
      return matchNome || matchEmail || matchTel;
    });
  }, [clientes, searchTerm]);

  const handleOpenModal = (cliente?: Cliente) => {
    if (cliente) {
      setEditingCliente(cliente);
      setFormNome(cliente.nome);
      setFormTelefone(cliente.telefone || '');
      setFormEmail(cliente.email || '');
      setFormObservacoes(cliente.observacoes || '');
    } else {
      setEditingCliente(null);
      setFormNome('');
      setFormTelefone('');
      setFormEmail('');
      setFormObservacoes('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      alert('Nome do cliente é obrigatório.');
      return;
    }
    setSaving(true);
    try {
      if (editingCliente) {
        await clientesService.update(editingCliente.id, {
          nome: formNome.trim(),
          telefone: formTelefone.trim(),
          email: formEmail.trim(),
          observacoes: formObservacoes.trim()
        });
      } else {
        await clientesService.create({
          barbearia_id: barbearia.id,
          nome: formNome.trim(),
          telefone: formTelefone.trim(),
          email: formEmail.trim(),
          observacoes: formObservacoes.trim(),
          status_assinatura: 'sem_plano',
          total_visitas: 0,
          total_gasto: 0,
          cortes_utilizados_mes: 0
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
      alert('Falha ao salvar cliente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!window.confirm(`Deseja realmente remover o cliente "${nome}"?`)) return;
    try {
      await clientesService.delete(id);
      loadData();
    } catch (err) {
      console.error('Erro ao deletar cliente:', err);
      alert('Erro ao excluir cliente.');
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Users className="text-orange-500" size={26} /> Base de Clientes
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Gestão completa da carteira de clientes, histórico de visitas e informações de contato.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Atualizar lista"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(234,88,12,0.3)] transition-all cursor-pointer"
          >
            <Plus size={16} /> Novo Cliente
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <Users size={22} />
          </div>
          <div>
            <p className="text-xs text-zinc-400 uppercase font-semibold">Total de Clientes</p>
            <p className="text-2xl font-bold text-white mt-0.5">{clientes.length}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Scissors size={22} />
          </div>
          <div>
            <p className="text-xs text-zinc-400 uppercase font-semibold">Visitas Realizadas</p>
            <p className="text-2xl font-bold text-white mt-0.5">
              {clientes.reduce((acc, c) => acc + (c.total_visitas || 0), 0)}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Crown size={22} />
          </div>
          <div>
            <p className="text-xs text-zinc-400 uppercase font-semibold">Membros Clube VIP</p>
            <p className="text-2xl font-bold text-white mt-0.5">
              {clientes.filter((c) => c.status_assinatura === 'ativo').length}
            </p>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome, telefone ou email..."
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50 transition-colors"
        />
      </div>

      {/* Table / List */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-zinc-500 text-sm flex flex-col items-center gap-2">
            <RefreshCw className="animate-spin text-orange-500" size={24} />
            Carregando base de clientes...
          </div>
        ) : filteredClientes.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-sm">
            Nenhum cliente encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.02] border-b border-white/[0.06] text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Contato</th>
                  <th className="py-3.5 px-4">Clube VIP</th>
                  <th className="py-3.5 px-4">Histórico</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredClientes.map((c) => {
                  const isVip = c.status_assinatura === 'ativo';
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center font-bold text-white text-xs">
                            {c.nome ? c.nome.substring(0, 2).toUpperCase() : 'CL'}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{c.nome}</p>
                            {c.observacoes && (
                              <p className="text-xs text-zinc-500 truncate max-w-xs">{c.observacoes}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 text-xs">
                          {c.telefone && (
                            <span className="flex items-center gap-1.5 text-zinc-300">
                              <Phone size={12} className="text-zinc-500" /> {c.telefone}
                            </span>
                          )}
                          {c.email && (
                            <span className="flex items-center gap-1.5 text-zinc-400">
                              <Mail size={12} className="text-zinc-500" /> {c.email}
                            </span>
                          )}
                          {!c.telefone && !c.email && (
                            <span className="text-zinc-600">Sem contato cadastrado</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isVip ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Crown size={11} /> Assinante Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-zinc-500 bg-white/[0.02] border border-white/[0.04]">
                            Avulso
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col text-xs text-zinc-400">
                          <span>{c.total_visitas || 0} cortes realizados</span>
                          <span className="text-zinc-500">
                            Total: R$ {(c.total_gasto || 0).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenModal(c)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id, c.nome)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Remover"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Cadastro / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e1422] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users size={18} className="text-orange-500" />
                {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white p-1">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">WhatsApp / Telefone</label>
                <input
                  type="text"
                  placeholder="(11) 99999-8888"
                  value={formTelefone}
                  onChange={(e) => setFormTelefone(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">E-mail (opcional)</label>
                <input
                  type="email"
                  placeholder="cliente@email.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Observações / Preferências</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Prefere corte na tesoura, finalização fosca."
                  value={formObservacoes}
                  onChange={(e) => setFormObservacoes(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default BaseClientesView;

