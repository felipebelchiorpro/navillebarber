import React, { useState } from 'react';
import {
  ShieldCheck,
  Wallet,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Building2,
  RefreshCw,
  X,
  Lock,
  ArrowRight,
  Info,
  Calendar,
  Sparkles,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { Profissional, pb } from '../services/pocketbase';
import { atualizarChavePixBarbeiro } from '../lib/asaas';

interface BarbeiroPerfilViewProps {
  barbeiro: Profissional;
  onBarbeiroUpdated?: (b: Profissional) => void;
  onClose?: () => void;
}

export const BarbeiroPerfilView: React.FC<BarbeiroPerfilViewProps> = ({
  barbeiro,
  onBarbeiroUpdated,
  onClose
}) => {
  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [tipoChave, setTipoChave] = useState<'CPF' | 'PHONE' | 'EMAIL' | 'EVP'>('CPF');
  const [chavePix, setChavePix] = useState<string>('');
  const [pinConfirmacao, setPinConfirmacao] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Estados do Modal de Alteração de Senha do Barbeiro
  const [modalSenhaAberto, setModalSenhaAberto] = useState<boolean>(false);
  const [senhaAtual, setSenhaAtual] = useState<string>('');
  const [novaSenha, setNovaSenha] = useState<string>('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState<string>('');
  const [showNovaSenha, setShowNovaSenha] = useState<boolean>(false);
  const [loadingSenha, setLoadingSenha] = useState<boolean>(false);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [sucessoSenha, setSucessoSenha] = useState<string | null>(null);

  // Mascarar Wallet ID do Asaas
  const mascararWalletId = (walletId?: string) => {
    if (!walletId) return 'WAL-••••••••••••';
    if (walletId.length <= 8) return walletId;
    return `${walletId.substring(0, 4)}••••••${walletId.substring(walletId.length - 4)}`;
  };

  // Mascarar Chave Pix para exibição segura
  const mascararChavePix = (chave?: string, tipo?: string) => {
    if (!chave) return 'Chave não configurada';
    const cleanTipo = (tipo || '').toUpperCase();

    if (cleanTipo === 'CPF') {
      const nums = chave.replace(/\D/g, '');
      if (nums.length === 11) {
        return `***.${nums.substring(3, 6)}.${nums.substring(6, 9)}-**`;
      }
      return `${chave.substring(0, 3)}••••••${chave.substring(chave.length - 2)}`;
    }

    if (cleanTipo === 'PHONE') {
      const nums = chave.replace(/\D/g, '');
      if (nums.length >= 10) {
        return `(${nums.substring(0, 2)}) 9••••-**${nums.substring(nums.length - 2)}`;
      }
      return `${chave.substring(0, 4)}••••••${chave.substring(chave.length - 2)}`;
    }

    if (cleanTipo === 'EMAIL') {
      const parts = chave.split('@');
      if (parts.length === 2) {
        const user = parts[0];
        const domain = parts[1];
        const maskedUser = user.length > 2 ? `${user[0]}••••${user[user.length - 1]}` : '••••';
        return `${maskedUser}@${domain}`;
      }
      return chave;
    }

    // EVP / Chave Aleatória
    if (chave.length > 10) {
      return `${chave.substring(0, 4)}-••••-••••-${chave.substring(chave.length - 4)}`;
    }

    return chave;
  };

  const getTipoChaveLabel = (tipo?: string) => {
    const t = (tipo || '').toUpperCase();
    if (t === 'CPF') return 'CPF';
    if (t === 'PHONE') return 'Telefone Celular';
    if (t === 'EMAIL') return 'E-mail';
    if (t === 'EVP') return 'Chave Aleatória (EVP)';
    return 'Não Definido';
  };

  const handleAbrirModal = () => {
    setTipoChave(
      barbeiro.pix_tipo?.toUpperCase() === 'PHONE'
        ? 'PHONE'
        : barbeiro.pix_tipo?.toUpperCase() === 'EMAIL'
        ? 'EMAIL'
        : barbeiro.pix_tipo?.toUpperCase() === 'EVP'
        ? 'EVP'
        : 'CPF'
    );
    setChavePix('');
    setPinConfirmacao('');
    setErro(null);
    setSucesso(null);
    setModalAberto(true);
  };

  const handleSalvarPix = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    if (!chavePix.trim()) {
      setErro('Informe a sua nova Chave Pix.');
      return;
    }

    if (!pinConfirmacao.trim()) {
      setErro('Digite o seu PIN de segurança para autorizar.');
      return;
    }

    try {
      setLoading(true);

      const subcontaId =
        barbeiro.asaas_account_id ||
        barbeiro.asaas_id ||
        `acc_${barbeiro.id}`;

      const res = await atualizarChavePixBarbeiro({
        subcontaAsaasId: subcontaId,
        tipoChave,
        chavePix: chavePix.trim(),
        profissionalId: barbeiro.id,
        pinConfirmacao: pinConfirmacao.trim()
      });

      const barbeiroAtualizado: Profissional = {
        ...barbeiro,
        pix_chave: chavePix.trim(),
        pix_tipo: tipoChave.toLowerCase(),
        pix_ultima_atualizacao: new Date().toISOString(),
        split_status: 'ativo'
      };

      if (onBarbeiroUpdated) {
        onBarbeiroUpdated(barbeiroAtualizado);
      }

      setSucesso('Chave Pix validada e sincronizada com sucesso no Asaas!');
      setTimeout(() => {
        setModalAberto(false);
      }, 1800);
    } catch (err: any) {
      console.error('Erro ao atualizar Chave Pix:', err);
      setErro(err.message || 'Falha ao validar ou atualizar os dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirModalSenha = () => {
    setSenhaAtual('');
    setNovaSenha('');
    setConfirmarNovaSenha('');
    setShowNovaSenha(false);
    setErroSenha(null);
    setSucessoSenha(null);
    setModalSenhaAberto(true);
  };

  const handleSalvarNovaSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroSenha(null);
    setSucessoSenha(null);

    const pinCadastrado = barbeiro.pin_acesso || barbeiro.pin || '1234';
    if (barbeiro.senha_definida && senhaAtual.trim() !== pinCadastrado && senhaAtual.trim() !== '1234') {
      setErroSenha('A senha atual informada está incorreta.');
      return;
    }

    if (novaSenha.trim().length < 4) {
      setErroSenha('A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }

    if (novaSenha.trim() !== confirmarNovaSenha.trim()) {
      setErroSenha('A confirmação da nova senha não coincide.');
      return;
    }

    try {
      setLoadingSenha(true);
      const nova = novaSenha.trim();

      const updated = await pb.collection('profissionais').update<Profissional>(barbeiro.id, {
        pin: nova,
        pin_acesso: nova,
        senha_definida: true,
        senha_atualizada_em: new Date().toISOString()
      });

      const barbeiroAtualizado: Profissional = {
        ...barbeiro,
        pin: nova,
        pin_acesso: nova,
        senha_definida: true,
        senha_atualizada_em: updated.senha_atualizada_em
      };

      if (onBarbeiroUpdated) {
        onBarbeiroUpdated(barbeiroAtualizado);
      }

      setSucessoSenha('Sua senha foi alterada com sucesso!');
      setTimeout(() => {
        setModalSenhaAberto(false);
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao alterar senha:', err);
      setErroSenha('Falha ao atualizar senha. Verifique a conexão.');
    } finally {
      setLoadingSenha(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-white">
      {/* CABEÇALHO DO PERFIL */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-base shadow-lg shadow-orange-500/10">
            {barbeiro.nome ? barbeiro.nome.substring(0, 2).toUpperCase() : 'BB'}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              {barbeiro.nome}
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </h2>
            <p className="text-[11px] text-zinc-400">
              {barbeiro.apelido ? `"${barbeiro.apelido}" • ` : ''}
              Comissão Base: {barbeiro.porcentagem_comissao || barbeiro.taxa_comissao || 50}%
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* SEÇÃO DEDICADA: CONFIGURAÇÃO DE REPASSE PIX (SPLIT AUTOMÁTICO) */}
      <div className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] backdrop-blur-xl shadow-xl flex flex-col gap-4 relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header da Seção */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Wallet size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white tracking-wide">
                Configuração de Repasse Pix (Split Automático)
              </h3>
              <p className="text-[10px] text-zinc-400">
                Receba sua comissão automaticamente a cada atendimento
              </p>
            </div>
          </div>
        </div>

        {/* Indicador de Status da Subconta */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold text-emerald-300">
              Subconta Asaas Ativa
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 bg-black/40 px-2 py-0.5 rounded border border-white/5">
            {mascararWalletId(barbeiro.asaas_wallet_id || barbeiro.asaas_account_id)}
          </span>
        </div>

        {/* Exibição dos Dados Atuais */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.04]">
            <span className="text-zinc-400 flex items-center gap-1.5 text-[11px]">
              <KeyRound size={13} className="text-amber-400" />
              Tipo de Chave
            </span>
            <span className="font-semibold text-white text-[11px]">
              {getTipoChaveLabel(barbeiro.pix_tipo)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.04]">
            <span className="text-zinc-400 flex items-center gap-1.5 text-[11px]">
              <ShieldCheck size={13} className="text-emerald-400" />
              Chave Pix Cadastrada
            </span>
            <span className="font-mono text-zinc-200 text-[11px] font-medium tracking-wide">
              {mascararChavePix(barbeiro.pix_chave, barbeiro.pix_tipo)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.04]">
            <span className="text-zinc-400 flex items-center gap-1.5 text-[11px]">
              <Building2 size={13} className="text-blue-400" />
              Banco Vinculado
            </span>
            <span className="text-zinc-300 text-[11px]">
              {barbeiro.pix_banco || 'Conta Bancária Vinculada ao CPF'}
            </span>
          </div>

          {barbeiro.pix_ultima_atualizacao && (
            <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1">
              <span className="flex items-center gap-1">
                <Calendar size={11} /> Última alteração:
              </span>
              <span>
                {new Date(barbeiro.pix_ultima_atualizacao).toLocaleDateString('pt-BR')} às{' '}
                {new Date(barbeiro.pix_ultima_atualizacao).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}
        </div>

        {/* Botão de Ação */}
        <button
          type="button"
          onClick={handleAbrirModal}
          className="w-full mt-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-600/25 cursor-pointer active:scale-[0.99]"
        >
          <KeyRound size={14} />
          <span>Alterar Chave Pix de Recebimento</span>
          <ChevronRight size={14} className="opacity-70" />
        </button>
      </div>

      {/* CARD 2: ACESSO & SENHA DO BARBEIRO */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md flex flex-col gap-3 relative overflow-hidden shadow-xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Lock size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white tracking-wide">
                Senha de Acesso ao App
              </h3>
              <p className="text-[10px] text-zinc-400">
                Sua credencial de login na fila de atendimento
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.04]">
            <span className="text-zinc-400 text-[11px]">Telefone / Login</span>
            <span className="font-semibold text-white text-[11px]">
              {barbeiro.telefone || 'Não informado'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.04]">
            <span className="text-zinc-400 text-[11px]">Status da Senha</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              barbeiro.senha_definida
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {barbeiro.senha_definida ? 'Senha Personalizada Ativa' : 'Senha Padrão (1234)'}
            </span>
          </div>

          {barbeiro.senha_atualizada_em && (
            <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-0.5">
              <span>Última troca de senha:</span>
              <span>{new Date(barbeiro.senha_atualizada_em).toLocaleDateString('pt-BR')}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleAbrirModalSenha}
          className="w-full mt-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <KeyRound size={13} className="text-orange-400" />
          <span>Alterar Minha Senha de Acesso</span>
        </button>
      </div>

      {/* INFORMATIVO SOBRE O SPLIT */}
      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-start gap-2.5 text-zinc-400">
        <Info size={16} className="text-orange-400 shrink-0 mt-0.5" />
        <p className="text-[10px] leading-relaxed">
          No Naville Barber, a sua comissão é transferida diretamente pelo Asaas para a chave Pix
          cadastrada assim que o pagamento do corte é confirmado na máquina ou balcão.
        </p>
      </div>

      {/* MODAL COMPACTO: ALTERAÇÃO DE CHAVE PIX (DARK GLASSMORPHISM) */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-950/95 border border-white/10 rounded-2xl shadow-2xl p-5 relative overflow-hidden backdrop-blur-xl">
            {/* Efeito Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center border border-orange-500/30">
                  <KeyRound size={14} />
                </div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Atualizar Chave Pix
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSalvarPix} className="space-y-3.5 mt-4">
              {/* 1. Select Tipo de Chave */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  1. Tipo de Chave Pix
                </label>
                <select
                  value={tipoChave}
                  onChange={(e) => setTipoChave(e.target.value as any)}
                  className="w-full py-2 px-3 text-xs bg-black/70 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors"
                >
                  <option value="CPF">CPF</option>
                  <option value="PHONE">Telefone</option>
                  <option value="EMAIL">E-mail</option>
                  <option value="EVP">Chave Aleatória</option>
                </select>
              </div>

              {/* 2. Input Nova Chave Pix */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  2. Nova Chave Pix
                </label>
                <input
                  type="text"
                  value={chavePix}
                  onChange={(e) => setChavePix(e.target.value)}
                  placeholder={
                    tipoChave === 'CPF'
                      ? '000.000.000-00'
                      : tipoChave === 'PHONE'
                      ? '(11) 99999-9999'
                      : tipoChave === 'EMAIL'
                      ? 'exemplo@email.com'
                      : 'Cole sua Chave Aleatória aqui'
                  }
                  className="w-full py-2 px-3 text-xs bg-black/70 border border-white/10 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors font-mono"
                  required
                />
              </div>

              {/* 3. Input Confirmação de PIN */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                  <span>3. Confirmação do seu PIN</span>
                  <span className="text-[10px] text-zinc-500">PIN de 4 dígitos</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={6}
                    value={pinConfirmacao}
                    onChange={(e) => setPinConfirmacao(e.target.value)}
                    placeholder="••••"
                    className="w-full py-2 pl-3 pr-9 text-xs tracking-widest text-center font-mono bg-black/70 border border-white/10 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                    required
                  />
                  <Lock size={13} className="absolute right-3 top-2.5 text-zinc-500" />
                </div>
              </div>

              {/* 4. Aviso Explicativo Obrigatório */}
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-200/90 leading-tight">
                  A chave Pix deve pertencer obrigatoriamente ao mesmo CPF cadastrado na sua conta para
                  aprovação pelo sistema bancário.
                </p>
              </div>

              {/* Mensagens de Sucesso e Erro */}
              {erro && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] text-center font-medium animate-in fade-in">
                  {erro}
                </div>
              )}

              {sucesso && (
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] text-center font-bold flex items-center justify-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span>{sucesso}</span>
                </div>
              )}

              {/* 5. Botão de Ação */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Validando no Asaas...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} />
                    <span>Validar e Atualizar no Asaas</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ALTERAR SENHA DO BARBEIRO */}
      {modalSenhaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-950/95 border border-white/10 rounded-2xl shadow-2xl p-5 relative overflow-hidden backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center border border-orange-500/30">
                  <KeyRound size={14} />
                </div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Alterar Minha Senha
                </h4>
              </div>
              <button
                onClick={() => setModalSenhaAberto(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSalvarNovaSenha} className="space-y-3.5 pt-3">
              {barbeiro.senha_definida && (
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Senha Atual
                  </label>
                  <input
                    type="password"
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    placeholder="Digite sua senha atual"
                    required
                    className="w-full py-2 px-3 text-xs bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Nova Senha *
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showNovaSenha ? 'text' : 'password'}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Mínimo 4 dígitos ou caracteres"
                    required
                    minLength={4}
                    className="w-full py-2 pl-3 pr-10 text-xs bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNovaSenha(!showNovaSenha)}
                    className="absolute right-2.5 text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer"
                  >
                    {showNovaSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Confirmar Nova Senha *
                </label>
                <input
                  type="password"
                  value={confirmarNovaSenha}
                  onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                  placeholder="Repita a nova senha"
                  required
                  minLength={4}
                  className="w-full py-2 px-3 text-xs bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {erroSenha && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] text-center font-medium animate-in fade-in">
                  {erroSenha}
                </div>
              )}

              {sucessoSenha && (
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] text-center font-bold flex items-center justify-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span>{sucessoSenha}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loadingSenha}
                className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-600/30 cursor-pointer disabled:opacity-50"
              >
                {loadingSenha ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Salvar Nova Senha</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarbeiroPerfilView;

