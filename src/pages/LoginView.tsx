import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Lock, Mail, Smartphone, KeyRound, ShieldAlert, Scissors, ArrowRight } from 'lucide-react';
import { pb } from '../lib/pocketbase';

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
  const [erro, setErro] = useState<string | null>(null);

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
      {/* Luz ambiente de fundo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-sm rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-xl shadow-2xl p-6 flex flex-col gap-5 z-10">
        
        {/* Cabeçalho */}
        <div className="text-center">
          <h1 className="text-lg font-bold text-white tracking-wider flex items-center justify-center gap-1.5">
            NAVILLE <span className="text-emerald-400">ACCESS</span>
          </h1>
          <p className="text-[11px] text-zinc-500 mt-1">
            {slug ? `Portal de Acesso • /b/${slug}` : 'Torre de Controle & Gestão SaaS'}
          </p>
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
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Senha</label>
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

