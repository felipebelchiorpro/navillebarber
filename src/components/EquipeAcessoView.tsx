import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Users,
  Copy,
  Check,
  Lock,
  Unlock,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  Phone,
  UserCheck,
  Calendar,
  Search
} from 'lucide-react';
import { Barbearia, Profissional, pb } from '../services/pocketbase';

interface EquipeAcessoViewProps {
  barbearia: Barbearia;
  profissionaisList: Profissional[];
  onBarbeariaUpdated?: (b: Barbearia) => void;
  onProfissionaisReload?: () => void;
}

export const EquipeAcessoView: React.FC<EquipeAcessoViewProps> = ({
  barbearia,
  profissionaisList: initialList,
  onProfissionaisReload
}) => {
  const [profissionais, setProfissionais] = useState<Profissional[]>(initialList);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal Definir Senha
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProf, setSelectedProf] = useState<Profissional | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const appBarberUrl = `${window.location.origin}/b/${barbearia.slug}/barbeiro`;

  useEffect(() => {
    setProfissionais(initialList);
  }, [initialList]);

  const carregarProfissionais = async () => {
    try {
      setLoading(true);
      const res = await pb.collection('profissionais').getFullList<Profissional>({
        filter: `barbearia_id = "${barbearia.id}"`,
        sort: 'nome'
      });
      setProfissionais(res);
      if (onProfissionaisReload) onProfissionaisReload();
    } catch (e) {
      console.warn('Erro ao atualizar profissionais:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (p: Profissional) => {
    setSelectedProf(p);
    setNovaSenha('');
    setShowPassword(false);
    setFeedback(null);
    setModalOpen(true);
  };

  const handleGerarSenhaAutomatica = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let rand = '';
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNovaSenha(rand);
    setShowPassword(true);
  };

  const handleSalvarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProf) return;

    const pass = novaSenha.trim();
    if (pass.length < 4) {
      setFeedback({ tipo: 'erro', texto: 'A senha deve ter pelo menos 4 caracteres.' });
      return;
    }

    try {
      setSavingPassword(true);
      setFeedback(null);

      // Tenta via endpoint avançado do hook se disponível
      try {
        await pb.send('/api/barbeiro/definir-acesso', {
          method: 'POST',
          body: {
            profissional_id: selectedProf.id,
            senha: pass,
            acesso_ativo: true
          }
        });
      } catch (_) {
        // Fallback nativo PocketBase
      }

      // Salva no registro do profissional para compatibilidade total
      const updated = await pb.collection('profissionais').update<Profissional>(selectedProf.id, {
        pin: pass,
        pin_acesso: pass,
        senha_definida: true,
        acesso_ativo: true,
        senha_atualizada_em: new Date().toISOString()
      });

      setProfissionais(prev => prev.map(p => p.id === updated.id ? updated : p));
      setFeedback({ tipo: 'sucesso', texto: `Senha do barbeiro ${selectedProf.nome} definida com sucesso!` });
      setTimeout(() => {
        setModalOpen(false);
        setFeedback(null);
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao salvar senha:', err);
      setFeedback({ tipo: 'erro', texto: 'Não foi possível salvar a senha. Verifique a conexão.' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleToggleAcesso = async (p: Profissional) => {
    const novoStatus = p.acesso_ativo === false ? true : false;
    try {
      const updated = await pb.collection('profissionais').update<Profissional>(p.id, {
        acesso_ativo: novoStatus
      });
      setProfissionais(prev => prev.map(item => item.id === p.id ? { ...item, acesso_ativo: novoStatus } : item));
    } catch (e) {
      alert('Erro ao alterar status de acesso do barbeiro.');
    }
  };

  const handleCopiarMensagemAcesso = (p: Profissional) => {
    const telefone = p.telefone ? p.telefone.replace(/\D/g, '') : '';
    const senhaAtual = p.pin_acesso || p.pin || 'Definida pelo administrador';
    const msg = `✂️ *Acesso ao App do Barbeiro - ${barbearia.nome}*\n\n` +
      `Olá *${p.nome}*, você pode acessar sua agenda e comissões pelo link:\n` +
      `🔗 ${appBarberUrl}\n\n` +
      `📱 *Seu Telefone/Login:* ${p.telefone || '(Seu WhatsApp)'}\n` +
      `🔑 *Sua Senha:* ${senhaAtual}\n\n` +
      `_No seu primeiro acesso, você também poderá alterar sua senha nas configurações do seu perfil._`;

    navigator.clipboard.writeText(msg);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const handleEnviarWhatsApp = (p: Profissional) => {
    const rawTel = (p.telefone || '').replace(/\D/g, '');
    const senhaAtual = p.pin_acesso || p.pin || 'Definida pelo administrador';
    const msg = encodeURIComponent(
      `✂️ *Acesso ao App do Barbeiro - ${barbearia.nome}*\n\n` +
      `Olá *${p.nome}*, seu acesso ao app está pronto:\n` +
      `🔗 ${appBarberUrl}\n\n` +
      `📱 *Login:* ${p.telefone || 'Seu WhatsApp'}\n` +
      `🔑 *Senha:* ${senhaAtual}\n\n` +
      `Bom trabalho!`
    );

    const fullPhone = rawTel.length <= 11 ? `55${rawTel}` : rawTel;
    window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
  };

  const filteredProfs = profissionais.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.apelido && p.apelido.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.telefone && p.telefone.includes(searchTerm))
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full max-w-5xl mx-auto pb-12">
      {/* HEADER DA SEÇÃO */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <KeyRound className="text-orange-500" size={26} /> Acesso &amp; Login dos Barbeiros
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Crie e gerencie as senhas de acesso para os barbeiros entrarem no aplicativo operacional da barbearia.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(appBarberUrl);
              setCopiedId('geral');
              setTimeout(() => setCopiedId(null), 3000);
            }}
            className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-zinc-300 flex items-center gap-2 transition-all cursor-pointer"
            title="Copiar link que os barbeiros usam para logar"
          >
            {copiedId === 'geral' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copiedId === 'geral' ? 'Link Copiado!' : 'Copiar Link do App'}</span>
          </button>

          <a
            href={appBarberUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-xs font-bold text-orange-400 flex items-center gap-1.5 transition-all"
          >
            <ExternalLink size={14} />
            <span>Abrir App Barbeiro</span>
          </a>
        </div>
      </header>

      {/* CARD DE INFORMAÇÃO & LINK DO APP */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Como funciona o acesso do barbeiro?</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              O barbeiro acessa o link do app, escolhe seu nome (ou digita o telefone) e informa a senha que você definir aqui. Lá dentro, ele pode ver a fila, iniciar atendimentos e trocar a própria senha.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={carregarProfissionais}
          disabled={loading}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
          title="Recarregar lista"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin text-orange-400' : ''} />
        </button>
      </div>

      {/* BARRA DE BUSCA */}
      <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.08] px-3 py-2 rounded-xl focus-within:border-orange-500/50 transition-colors">
        <Search size={15} className="text-zinc-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar barbeiro por nome ou telefone..."
          className="w-full bg-transparent text-xs text-white outline-none placeholder:text-zinc-600"
        />
      </div>

      {/* LISTA DE BARBEIROS & SENHAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProfs.length === 0 ? (
          <div className="col-span-full py-12 text-center text-zinc-500 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
            Nenhum barbeiro encontrado.
          </div>
        ) : (
          filteredProfs.map((p) => {
            const temSenha = Boolean(p.senha_definida || p.pin_acesso || p.pin);
            const acessoLiberado = p.acesso_ativo !== false && p.ativo;

            return (
              <div
                key={p.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 backdrop-blur-md ${
                  acessoLiberado
                    ? 'bg-white/[0.02] border-white/[0.06] hover:border-white/15'
                    : 'bg-red-500/[0.02] border-red-500/20 opacity-80'
                }`}
              >
                {/* TOPO DO CARD: FOTO + DADOS */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {p.avatar_url ? (
                        <img
                          src={p.avatar_url}
                          alt={p.nome}
                          className="w-11 h-11 rounded-full object-cover border border-white/10"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-600 to-amber-700 text-white font-bold text-xs flex items-center justify-center border border-white/10">
                          {p.nome.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#090d16] ${
                          acessoLiberado ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                        title={acessoLiberado ? 'Acesso Ativo' : 'Acesso Bloqueado'}
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        {p.nome}
                        {p.apelido && <span className="text-xs text-orange-400 font-normal">({p.apelido})</span>}
                      </h3>
                      <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Phone size={11} className="text-zinc-500" />
                        <span>{p.telefone || 'Sem telefone cadastrado'}</span>
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                      acessoLiberado
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}
                  >
                    {acessoLiberado ? 'Ativo' : 'Bloqueado'}
                  </span>
                </div>

                {/* DETALHES DE SENHA */}
                <div className="bg-black/30 p-3 rounded-xl border border-white/[0.04] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      temSenha ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      <KeyRound size={14} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-zinc-300">
                        {temSenha ? 'Senha de Acesso Configurada' : 'Senha Padrão (1234)'}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {p.senha_atualizada_em
                          ? `Atualizada em ${new Date(p.senha_atualizada_em).toLocaleDateString('pt-BR')}`
                          : temSenha
                          ? 'Pronta para uso no App'
                          : 'Recomendado definir uma senha exclusiva'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenModal(p)}
                    className="px-2.5 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-400 text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                  >
                    {temSenha ? 'Redefinir Senha' : 'Criar Senha'}
                  </button>
                </div>

                {/* AÇÕES DE ENVIO E BLOQUEIO */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.04]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopiarMensagemAcesso(p)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 text-xs font-medium flex items-center gap-1.5 border border-white/5 transition-colors cursor-pointer"
                      title="Copiar dados de acesso prontos para envio"
                    >
                      {copiedId === p.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedId === p.id ? 'Copiado!' : 'Copiar Acesso'}</span>
                    </button>

                    {p.telefone && (
                      <button
                        type="button"
                        onClick={() => handleEnviarWhatsApp(p)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/20 transition-colors cursor-pointer"
                        title="Enviar dados de acesso diretamente pelo WhatsApp do barbeiro"
                      >
                        <MessageSquare size={12} />
                        <span>WhatsApp</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleAcesso(p)}
                    className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                      acessoLiberado
                        ? 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10'
                        : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                    }`}
                    title={acessoLiberado ? 'Bloquear acesso deste barbeiro' : 'Liberar acesso'}
                  >
                    {acessoLiberado ? <Lock size={13} /> : <Unlock size={13} />}
                    <span>{acessoLiberado ? 'Bloquear' : 'Desbloquear'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL DEFINIR / REDEFINIR SENHA */}
      {modalOpen && selectedProf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0e131f] border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col gap-5 relative">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Definir Senha do Barbeiro
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Profissional: <strong className="text-white">{selectedProf.nome}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {feedback && (
              <div className={`p-3 rounded-xl text-xs font-medium border ${
                feedback.tipo === 'sucesso'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {feedback.texto}
              </div>
            )}

            <form onSubmit={handleSalvarSenha} className="flex flex-col gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    Nova Senha de Acesso *
                  </label>
                  <button
                    type="button"
                    onClick={handleGerarSenhaAutomatica}
                    className="text-[11px] text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={12} />
                    <span>Gerar Senha Rápida</span>
                  </button>
                </div>

                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Mínimo 4 dígitos ou caracteres"
                    required
                    minLength={4}
                    autoFocus
                    className="w-full bg-[#151c2d] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white pr-10 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  O barbeiro usará esta senha para entrar no app. Ele também poderá trocá-la depois no próprio perfil.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={savingPassword}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPassword || !novaSenha.trim()}
                  className="btn-gold"
                >
                  {savingPassword ? 'Salvando...' : 'Salvar Nova Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
