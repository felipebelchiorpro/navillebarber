import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  QrCode,
  SmartphoneNfc,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Radio,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Sparkles,
  Lock
} from 'lucide-react';
import { pb, TerminalPagamento, Barbearia } from '../services/pocketbase';

export default function TerminalMaquininhaPWAView() {
  const { codigo: paramCodigo } = useParams<{ codigo?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialCodigo = paramCodigo || searchParams.get('codigo') || '';

  const [codigoInput, setCodigoInput] = useState(initialCodigo);
  const [terminal, setTerminal] = useState<TerminalPagamento | null>(null);
  const [barbearia, setBarbearia] = useState<Barbearia | null>(null);
  const [cobrancaAtiva, setCobrancaAtiva] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pareado, setPareado] = useState(false);

  // Estados da Operação no Terminal
  const [etapaPagamento, setEtapaPagamento] = useState<'aguardando' | 'processando' | 'sucesso'>('aguardando');
  const [metodoSelecionado, setMetodoSelecionado] = useState<'aproximacao' | 'chip' | 'pix'>('aproximacao');

  // Buscar terminal pelo código de 6 dígitos
  const conectarTerminal = async (cod: string) => {
    const codLimpo = cod.trim();
    if (!codLimpo || codLimpo.length < 4) {
      setErro('Digite o código de pareamento de 6 dígitos gerado no painel.');
      return;
    }

    setLoading(true);
    setErro(null);

    try {
      const records = await pb.collection('terminais_pagamento').getFullList<TerminalPagamento>({
        filter: `codigo_pareamento = "${codLimpo}"`,
        expand: 'barbearia,cobranca_ativa',
      });

      if (!records || records.length === 0) {
        setErro('Nenhum terminal encontrado com este código de pareamento.');
        setLoading(false);
        return;
      }

      const term = records[0];
      setTerminal(term);
      setPareado(true);

      // Marca o terminal como 'online' ao conectar
      await pb.collection('terminais_pagamento').update(term.id, {
        status: term.status === 'aguardando_pagamento' ? 'aguardando_pagamento' : 'online',
      });

      if (term.expand?.barbearia) {
        setBarbearia(term.expand.barbearia as Barbearia);
      } else if (term.barbearia) {
        const b = await pb.collection('barbearias').getOne<Barbearia>(term.barbearia);
        setBarbearia(b);
      }

      if (term.expand?.cobranca_ativa) {
        setCobrancaAtiva(term.expand.cobranca_ativa);
      }
    } catch (err: any) {
      console.error('Erro ao conectar terminal:', err);
      setErro(err.message || 'Falha ao autenticar terminal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCodigo) {
      conectarTerminal(initialCodigo);
    }
  }, [initialCodigo]);

  // Escuta em Realtime atualizações no terminal conectado
  useEffect(() => {
    if (!terminal?.id) return;

    let unsub: (() => void) | undefined;

    const sub = async () => {
      try {
        unsub = await pb.collection('terminais_pagamento').subscribe(terminal.id, async (e) => {
          if (e.action === 'update' && e.record) {
            const updated = e.record as unknown as TerminalPagamento;
            setTerminal(updated);

            if (updated.cobranca_ativa) {
              try {
                const ag = await pb.collection('agendamentos').getOne(updated.cobranca_ativa, {
                  expand: 'profissional,servicos',
                });
                setCobrancaAtiva(ag);
              } catch {
                setCobrancaAtiva({ valor_total: 45.0, cliente_nome: 'Cliente Balcão' });
              }
            } else {
              setCobrancaAtiva(null);
              setEtapaPagamento('aguardando');
            }
          }
        });
      } catch (err) {
        console.warn('Realtime subscribe warning:', err);
      }
    };

    sub();

    return () => {
      if (unsub) unsub();
      else pb.collection('terminais_pagamento').unsubscribe(terminal.id).catch(() => {});
    };
  }, [terminal?.id]);

  // Simular aprovação na maquininha
  const handleAprovarPagamento = async () => {
    if (!terminal) return;
    setEtapaPagamento('processando');

    setTimeout(async () => {
      setEtapaPagamento('sucesso');

      try {
        // Se houver agendamento vinculado, marca como pago
        if (terminal.cobranca_ativa) {
          await pb.collection('agendamentos').update(terminal.cobranca_ativa, {
            status: 'concluido',
            status_pagamento: 'pago',
            metodo_pagamento: metodoSelecionado === 'pix' ? 'pix' : 'cartao_maquininha',
          }).catch(() => {});
        }

        // Libera o terminal
        await pb.collection('terminais_pagamento').update(terminal.id, {
          status: 'online',
          cobranca_ativa: null,
        });
      } catch (err) {
        console.error('Erro ao aprovar cobrança:', err);
      }

      // Após 3 segundos volta para o modo pronto
      setTimeout(() => {
        setEtapaPagamento('aguardando');
        setCobrancaAtiva(null);
      }, 3000);
    }, 1800);
  };

  // Se não estiver pareado ainda, mostra a tela de código de pareamento
  if (!pareado) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4 font-sans select-none">
        <div className="w-full max-w-sm p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-2xl flex flex-col gap-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <Radio size={28} className="animate-pulse" />
          </div>

          <div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              TEF Web & Smart Link
            </span>
            <h1 className="text-xl font-black text-white mt-2">Parear Maquininha</h1>
            <p className="text-xs text-zinc-400 mt-1">
              Abra esta página no navegador Android da maquininha ou tablet e digite o código de 6 dígitos.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              conectarTerminal(codigoInput);
            }}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center justify-center bg-black/60 border border-zinc-700 rounded-xl px-4 py-3 focus-within:border-emerald-500 transition-colors">
              <input
                type="text"
                maxLength={6}
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full text-center text-3xl font-mono font-bold tracking-[0.4em] bg-transparent text-white outline-none placeholder:text-zinc-700"
                autoFocus
              />
            </div>

            {erro && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-1.5 justify-center">
                <AlertCircle size={14} />
                <span>{erro}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || codigoInput.length < 4}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
              <span>{loading ? 'Sincronizando...' : 'Conectar Terminal'}</span>
            </button>
          </form>

          <div className="text-[11px] text-zinc-500 flex items-center justify-center gap-1 pt-2 border-t border-zinc-800">
            <Lock size={12} />
            <span>Naville Barber POS Autônomo • Criptografia D+0</span>
          </div>
        </div>
      </div>
    );
  }

  // TELA DO TERMINAL CONECTADO (DISPLAY DA MAQUININHA)
  const isAguardandoPagamento = terminal?.status === 'aguardando_pagamento' || !!cobrancaAtiva;
  const valorTotal = cobrancaAtiva?.valor_total || cobrancaAtiva?.valor || 45.00;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between p-4 font-sans select-none">
      
      {/* Barra de Status Superior do Terminal */}
      <header className="flex items-center justify-between pb-3 border-b border-zinc-800/80 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold tracking-wide text-zinc-200">
            {terminal?.identificador || 'Terminal PWA'}
          </span>
          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded font-mono">
            #{terminal?.codigo_pareamento}
          </span>
        </div>

        <div className="flex items-center gap-3 text-zinc-400 text-xs">
          <span className="text-[11px] font-semibold text-zinc-300">
            {barbearia?.nome || 'Naville Barber'}
          </span>
          <div className="flex items-center gap-1 text-emerald-400">
            <Wifi size={14} />
            <span className="text-[10px] font-mono">4G / Wi-Fi</span>
          </div>
        </div>
      </header>

      {/* ÁREA CENTRAL PRINCIPAL */}
      <main className="flex-1 flex flex-col items-center justify-center my-4">
        {etapaPagamento === 'sucesso' ? (
          <div className="w-full max-w-sm p-6 rounded-3xl bg-zinc-900 border border-emerald-500/40 text-center flex flex-col items-center gap-4 animate-in zoom-in duration-300 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">PAGAMENTO APROVADO</h2>
              <p className="text-sm text-emerald-400 font-mono font-bold mt-1">
                R$ {Number(valorTotal).toFixed(2)}
              </p>
              <p className="text-xs text-zinc-400 mt-2">
                Rateio D+0 efetuado conforme Lei Salão-Parceiro.
              </p>
            </div>
            <div className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest pt-3 border-t border-zinc-800 w-full">
              Imprimindo via cliente • Retornando...
            </div>
          </div>
        ) : etapaPagamento === 'processando' ? (
          <div className="w-full max-w-sm p-8 rounded-3xl bg-zinc-900 border border-zinc-800 text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
            <h2 className="text-lg font-bold text-white">PROCESSANDO TRANSAÇÃO</h2>
            <p className="text-xs text-zinc-400">Não remova o cartão...</p>
          </div>
        ) : isAguardandoPagamento ? (
          /* DISPLAY DE COBRANÇA EM ANDAMENTO (DISPARADA PELO PC) */
          <div className="w-full max-w-sm p-5 rounded-3xl bg-zinc-900/90 border border-zinc-800 flex flex-col gap-4 shadow-2xl">
            <div className="text-center pb-3 border-b border-zinc-800">
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-wider">
                Cobrança Remota Balcão
              </span>
              <h3 className="text-xs text-zinc-400 mt-2">Valor da Operação:</h3>
              <div className="text-3xl font-black text-white font-mono mt-0.5">
                R$ {Number(valorTotal).toFixed(2)}
              </div>
              {cobrancaAtiva?.cliente_nome && (
                <p className="text-xs text-zinc-300 mt-1 font-medium">
                  Cliente: {cobrancaAtiva.cliente_nome}
                </p>
              )}
            </div>

            {/* Formas de Captura */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMetodoSelecionado('aproximacao')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  metodoSelecionado === 'aproximacao'
                    ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                    : 'bg-zinc-800/50 border-zinc-700/60 text-zinc-400'
                }`}
              >
                <SmartphoneNfc size={18} />
                <span className="text-[10px] font-bold">Aproximação</span>
              </button>

              <button
                type="button"
                onClick={() => setMetodoSelecionado('chip')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  metodoSelecionado === 'chip'
                    ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-sm'
                    : 'bg-zinc-800/50 border-zinc-700/60 text-zinc-400'
                }`}
              >
                <CreditCard size={18} />
                <span className="text-[10px] font-bold">Chip / Tarja</span>
              </button>

              <button
                type="button"
                onClick={() => setMetodoSelecionado('pix')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  metodoSelecionado === 'pix'
                    ? 'bg-amber-600/20 border-amber-500/50 text-amber-300 shadow-sm'
                    : 'bg-zinc-800/50 border-zinc-700/60 text-zinc-400'
                }`}
              >
                <QrCode size={18} />
                <span className="text-[10px] font-bold">Pix Dinâmico</span>
              </button>
            </div>

            {/* Instrução visual no display */}
            <div className="p-3 rounded-xl bg-black/60 border border-zinc-800 text-center flex flex-col items-center gap-2">
              {metodoSelecionado === 'aproximacao' && (
                <>
                  <SmartphoneNfc size={28} className="text-emerald-400 animate-bounce mt-1" />
                  <span className="text-xs font-semibold text-zinc-300">
                    Aproxime o cartão ou celular no topo da máquina
                  </span>
                </>
              )}

              {metodoSelecionado === 'chip' && (
                <>
                  <CreditCard size={28} className="text-blue-400 animate-pulse mt-1" />
                  <span className="text-xs font-semibold text-zinc-300">
                    Insira o cartão com chip virado para cima
                  </span>
                </>
              )}

              {metodoSelecionado === 'pix' && (
                <>
                  <div className="p-2 bg-white rounded-lg">
                    <QrCode size={90} className="text-black" />
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-300">
                    Escaneie com o app do seu banco
                  </span>
                </>
              )}
            </div>

            {/* Botão de Confirmação na Maquininha */}
            <button
              type="button"
              onClick={handleAprovarPagamento}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 size={18} />
              <span>CONFIRMAR PAGAMENTO</span>
            </button>
          </div>
        ) : (
          /* MODO EM ESPERA (STANDBY PRONTO) */
          <div className="text-center flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.15)]">
              <Zap size={36} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">TERMINAL PRONTO</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Aguardando envio de cobrança pelo balcão ou seleção no app.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full text-[11px] text-zinc-400 font-mono">
              <span>Smart Link Ativo</span>
              <span className="text-emerald-400">• Online D+0</span>
            </div>
          </div>
        )}
      </main>

      {/* Rodapé com Informações Técnicas */}
      <footer className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
        <div className="flex items-center gap-1">
          <ShieldCheck size={12} className="text-emerald-500" />
          <span>Naville Pay • Smart POS PWA</span>
        </div>
        <button
          onClick={() => {
            setPareado(false);
            setTerminal(null);
          }}
          className="text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
        >
          Desconectar
        </button>
      </footer>

    </div>
  );
}

