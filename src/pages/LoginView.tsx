import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Lock, Mail, Smartphone, KeyRound, ShieldAlert, Scissors, ArrowRight, CheckCircle2, AlertCircle, X, RefreshCw } from 'lucide-react';
import { pb } from '../lib/pocketbase';
import { NavilleLogo } from '../components/NavilleLogo';

export default function LoginView() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();

  // Tipo de login selecionado: 'admin' (SuperAdmin ou Dono via email/senha) ou 'barbeiro' (PIN rápido)
  const [tipoLogin, setTipoLogin] = useState<'admin' | 'barbeiro'>('admin');
  
  // Campos de formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefone, setTelefone] = useState('');
  const [pin, setPin] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Toast de feedback visual
  const [toast, setToast] = useState<{ tipo: 'sucesso' | 'erro'; mensagem: string } | null>(null);

  const toastHelper = {
    success: (msg: string) => {
      setToast({ tipo: 'sucesso', mensagem: msg });
      setTimeout(() => setToast(null), 4000);
    },
    error: (msg: string) => {
      setToast({ tipo: 'erro', mensagem: msg });
      setTimeout(() => setToast(null), 4000);
    }
  };

  // Função no frontend para disparar o reset de senha
  async function handleEsqueciSenha(alvoEmail?: string) {
    const emailFinal = (alvoEmail || email).trim();
    if (!emailFinal || !emailFinal.includes('@')) {
      toastHelper.error('Informe um e-mail válido para recuperar a senha.');
      return;
    }

    try {
      setLoadingReset(true);
      // Dispara o e-mail nativo com token seguro do PocketBase
      await pb.collection('users').requestPasswordReset(emailFinal);
      toastHelper.success('Enviamos um link de redefinição para o seu e-mail!');
    } catch (err: any) {
      console.error('Erro ao solicitar reset:', err);
      toastHelper.error('Não foi possível enviar o e-mail de recuperação.');
    } finally {
      setLoadingReset(false);
    }
  }

  // 1. LOGIN ADMINISTRATIVO (Super Admin ou Dono da Barbearia)
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro(null);

    try {
      const authData = await pb.collection('users').authWithPassword(email, password);
      const role = authData.record.role || (authData.record.papel === 'superadmin' ? 'superadmin' : 'proprietario');

      if (role === 'superadmin') {
        navigate('/admin');
      } else if (role === 'proprietario' || authData.record.papel === 'dono') {
        // Busca a barbearia do dono se não veio pelo slug
        const barbeariaId = authData.record.barbearia || authData.record.barbearia_id;
        if (slug) {
          navigate(`/b/${slug}/admin`);
        } else if (barbeariaId) {
          const tenant = await pb.collection('barbearias').getOne<any>(barbeariaId);
          navigate(`/b/${tenant.slug}/admin`);
        } else {
          throw new Error('Nenhuma barbearia vinculada a esta conta.');
        }
      } else {
        throw new Error('Perfil de usuário sem permissão administrativa.');
      }
    } catch (err: any) {
      setErro(err.message || 'Credenciais inválidas. Verifique seu e-mail e senha.');
    } finally {
      setLoading(false);
    }
  };

  // 2. LOGIN DO BARBEIRO (Mobile / PIN rápido)
  const handleBarbeiroLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro(null);

    try {
      const cleanPhone = telefone.replace(/\D/g, '');
      const filterPhone = cleanPhone ? `(telefone = "${telefone}" || telefone = "${cleanPhone}" || telefone ~ "${cleanPhone}")` : `telefone = "${telefone}"`;
      const filterPin = `(pin = "${pin}" || pin_acesso = "${pin}")`;
      
      // Busca profissional pelo telefone e pin dentro da barbearia atual
      const records = await pb.collection('profissionais').getFullList<any>({
        filter: `${filterPhone} && ${filterPin} && ativo = true`,
        expand: 'barbearia,barbearia_id',
      });

      if (records.length === 0) {
        throw new Error('Telefone ou PIN incorreto, ou cadastro inativo.');
      }

      const profissional = records[0];
      const barbExpand = profissional.expand?.barbearia || profissional.expand?.barbearia_id;
      let targetSlug = slug || barbExpand?.slug;

      if (!targetSlug) {
        const barbId = profissional.barbearia || profissional.barbearia_id;
        if (barbId) {
          try {
            const b = await pb.collection('barbearias').getOne<any>(barbId);
            targetSlug = b.slug;
          } catch {}
        }
      }

      targetSlug = targetSlug || 'belchior';

      const sessionData = {
        id: profissional.id,
        nome: profissional.nome,
        barbeariaId: profissional.barbearia || profissional.barbearia_id,
        slug: targetSlug,
        porcentagem_comissao: profissional.porcentagem_comissao || profissional.taxa_comissao || 50
      };

      // Armazena sessão do barbeiro no localStorage
      localStorage.setItem('naville_barbeiro_session', JSON.stringify(sessionData));
      localStorage.setItem(`naville_barbeiro_sessao_${targetSlug}`, JSON.stringify(sessionData));

      navigate(`/b/${targetSlug}/barbeiro`);
    } catch (err: any) {
      setErro(err.message || 'Falha na autenticação do barbeiro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Toast Flutuante de Feedback */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-300">
          <div
            className={`p-3.5 rounded-xl border backdrop-blur-xl shadow-2xl flex items-start gap-2.5 ${
              toast.tipo === 'sucesso'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-emerald-500/10'
                : 'bg-rose-950/90 border-rose-500/40 text-rose-200 shadow-rose-500/10'
            }`}
          >
            {toast.tipo === 'sucesso' ? (
              <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={16} />
            ) : (
              <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={16} />
            )}
            <div className="flex-1 text-xs">
              <p className="leading-relaxed font-medium">{toast.mensagem}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-zinc-400 hover:text-white p-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Luz ambiente de fundo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-sm rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-xl shadow-2xl p-6 flex flex-col gap-5 z-10">
        
        {/* Cabeçalho Oficial Naville Barber */}
        <div className="flex flex-col items-center text-center gap-2.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-black to-emerald-950/40 border border-emerald-500/30 flex items-center justify-center p-2.5 shadow-[0_0_25px_rgba(16,185,129,0.25)] relative group">
            <div className="absolute inset-0 rounded-2xl bg-emerald-500/10 blur-sm pointer-events-none"></div>
            <NavilleLogo className="w-full h-full text-emerald-400 relative z-10 transition-transform group-hover:scale-105" />
          </div>

          <div>
            <h1 className="text-base font-black text-white tracking-widest uppercase flex items-center justify-center gap-1.5">
              NAVILLE BARBER
            </h1>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 mt-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
              Central de Acesso
            </div>
            <p className="text-[11px] text-zinc-500 mt-1 font-mono">
              {slug ? `Portal de Acesso • /b/${slug}` : 'Torre de Controle & Gestão SaaS'}
            </p>
          </div>
        </div>

        {/* Abas de seleção de perfil */}
        <div className="grid grid-cols-2 gap-1 bg-white/[0.03] p-1 rounded-lg border border-white/[0.05]">
          <button
            type="button"
            onClick={() => { setTipoLogin('admin'); setErro(null); }}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${tipoLogin === 'admin' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Gestão / Dono
          </button>
          <button
            type="button"
            onClick={() => { setTipoLogin('barbeiro'); setErro(null); }}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${tipoLogin === 'barbeiro' ? 'bg-orange-600/30 text-orange-400 border border-orange-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Barbeiro (App)
          </button>
        </div>

        {/* Mensagem de Erro */}
        {erro && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <ShieldAlert className="shrink-0" size={14} />
            <span className="leading-tight">{erro}</span>
          </div>
        )}

        {/* Formulário Admin / Dono */}
        {tipoLogin === 'admin' ? (
          <form onSubmit={handleAdminLogin} className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">E-mail</label>
              <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 transition-colors">
                <Mail className="text-zinc-500 mr-2" size={14} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@naville.com"
                  className="w-full bg-transparent text-xs text-white outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Senha</label>
                <button
                  type="button"
                  disabled={loadingReset}
                  onClick={() => handleEsqueciSenha(email)}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loadingReset ? 'Enviando link...' : 'Esqueceu a senha?'}
                </button>
              </div>
              <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500 transition-colors">
                <Lock className="text-zinc-500 mr-2" size={14} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-xs text-white outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Autenticando...' : 'Entrar no Painel'}
              {!loading && <ArrowRight size={14} />}
            </button>
          </form>
        ) : (
          /* Formulário do Barbeiro */
          <form onSubmit={handleBarbeiroLogin} className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Telefone Celular</label>
              <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 focus-within:border-orange-500 transition-colors">
                <Smartphone className="text-zinc-500 mr-2" size={14} />
                <input
                  type="text"
                  required
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(19) 99999-9999"
                  className="w-full bg-transparent text-xs text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">PIN de Acesso (4 dígitos)</label>
              <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 focus-within:border-orange-500 transition-colors">
                <KeyRound className="text-zinc-500 mr-2" size={14} />
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="1234"
                  className="w-full bg-transparent text-xs text-white tracking-widest outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(249,115,22,0.3)] flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Acessando Fila...' : 'Acessar App Barbeiro'}
              {!loading && <Scissors size={14} />}
            </button>
          </form>
        )}

        <div className="pt-2 border-t border-white/[0.05] text-center">
          <Link className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors" to="/">
            ← Voltar para a página inicial
          </Link>
        </div>

      </div>
    </div>
  );
}

