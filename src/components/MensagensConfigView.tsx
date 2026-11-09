import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Check,
  Send,
  Zap,
  Tag,
  Eye,
  Info,
  Calendar,
  DollarSign,
  HeartHandshake,
  UserCheck,
  Smartphone
} from 'lucide-react';
import { pb, Barbearia } from '../services/pocketbase';

export interface MensagensConfigViewProps {
  barbearia: Barbearia;
  onBarbeariaUpdated?: (b: Barbearia) => void;
  onClose?: () => void;
}

export interface GatilhoConfig {
  id: string;
  titulo: string;
  subtitulo: string;
  badge: string;
  corBadge: string;
  icone: any;
  textoPadrao: string;
}

export const TEMPLATES_PADRAO: Record<string, GatilhoConfig> = {
  confirmacao_agendamento: {
    id: 'confirmacao_agendamento',
    titulo: '1. Confirmação Imediata de Agendamento',
    subtitulo: 'Disparado assim que o cliente agenda pelo link ou balcão.',
    badge: 'Imediato',
    corBadge: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    icone: CheckCircle2,
    textoPadrao: `Fala, {cliente}! ✂️

Seu horário com o barbeiro {barbeiro} na {barbearia} tá confirmado!

📅 Data: {data}
⏰ Horário: {hora}
💈 Serviço: {servico}

Qualquer imprevisto, avise a gente por aqui com antecedência. Te esperamos! 👊`
  },
  lembrete_2h: {
    id: 'lembrete_2h',
    titulo: '2. Lembrete Antecipado (2 horas antes)',
    subtitulo: 'Redução direta de no-show (falta de clientes).',
    badge: '2h Antes',
    corBadge: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    icone: Clock,
    textoPadrao: `Opa, {cliente}, tudo bem? Passando só para lembrar do seu horário hoje! ⏱️

⏰ Horário: {hora} com {barbeiro}
📍 Local: {barbearia}

Se puder chegar 5 minutinhos antes, a cadeira já tá pronta te esperando. Até já! 💈`
  },
  pagamento_pix_confirmado: {
    id: 'pagamento_pix_confirmado',
    titulo: '3. Pagamento Pix / Entrada Confirmada',
    subtitulo: 'Para agendamentos com pagamento prévio ou sinal via Asaas.',
    badge: 'Compensado',
    corBadge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    icone: DollarSign,
    textoPadrao: `Olá, {cliente}! Recebemos o seu pagamento referente ao agendamento na {barbearia} com sucesso. ✅

💈 Serviço: {servico}
⏰ Horário: {data} às {hora}

Seu atendimento com {barbeiro} está 100% garantido!`
  },
  cobranca_sinal_pix: {
    id: 'cobranca_sinal_pix',
    titulo: '4. Cobrança de Sinal / Chave Pix Pendente',
    subtitulo: 'Quando a barbearia exige reserva de cadeira antecipada.',
    badge: 'Reserva',
    corBadge: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    icone: Zap,
    textoPadrao: `Fala, {cliente}! Para garantir sua vaga na cadeira do {barbeiro} no dia {data} às {hora}, finalize o pagamento do sinal pelo Pix abaixo:

🔑 Pix Copia e Cola:
{chave_pix}

Assim que compensar, o seu horário é travado automaticamente na nossa agenda! ✂️`
  },
  pos_atendimento_avaliacao: {
    id: 'pos_atendimento_avaliacao',
    titulo: '5. Pós-Atendimento e Avaliação (Feedback)',
    subtitulo: 'Disparado 1 hora após a conclusão do serviço para coletar reviews.',
    badge: 'Avaliação',
    corBadge: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    icone: HeartHandshake,
    textoPadrao: `E aí, {cliente}, curtiram o visual novo? 🔥

Valeu demais pela moral e pela preferência hoje aqui na {barbearia} com o {barbeiro}!

Se puder avaliar o nosso atendimento em 5 estrelas no Google, ajuda demais a gente:
🔗 {link_agendamento}

Tmj e até a próxima! 👊`
  },
  reengajamento_sumido: {
    id: 'reengajamento_sumido',
    titulo: '6. Reengajamento (Cliente Sumido)',
    subtitulo: 'Disparado automaticamente para clientes ausentes há mais de 30 dias.',
    badge: 'Fidelização',
    corBadge: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    icone: UserCheck,
    textoPadrao: `Fala, {cliente}! Sumiu, pô! 💈

Já faz um tempo desde o seu último corte aqui na {barbearia} com o {barbeiro}.

A cadeira já tá com saudade de você! Bora dar aquele talento no visual essa semana?

Agende seu horário direto pelo link:
🔗 {link_agendamento}

Te esperamos! 👊`
  }
};

export const VARIAVEIS_DISPONIVEIS = [
  { tag: '{cliente}', label: 'Nome Cliente', desc: 'Primeiro nome do cliente' },
  { tag: '{barbeiro}', label: 'Barbeiro', desc: 'Nome do profissional' },
  { tag: '{servico}', label: 'Serviço', desc: 'Nome do serviço agendado' },
  { tag: '{data}', label: 'Data', desc: 'Ex: 12/11' },
  { tag: '{hora}', label: 'Horário', desc: 'Ex: 15:30' },
  { tag: '{barbearia}', label: 'Barbearia', desc: 'Nome do estabelecimento' },
  { tag: '{chave_pix}', label: 'Chave Pix', desc: 'Chave Pix ou Copia e Cola' },
  { tag: '{link_agendamento}', label: 'Link Agendamento', desc: 'Link direto para vitrine' },
];

export const MensagensConfigView: React.FC<MensagensConfigViewProps> = ({
  barbearia,
  onBarbeariaUpdated,
  onClose
}) => {
  // Estado de Acordeão (quais cards estão expandidos)
  const [abertos, setAbertos] = useState<Record<string, boolean>>({
    confirmacao_agendamento: true,
    lembrete_2h: false,
    pagamento_pix_confirmado: false,
    cobranca_sinal_pix: false,
    pos_atendimento_avaliacao: false,
    reengajamento_sumido: false
  });

  // Estado dos Textos e Status Ativo dos Templates
  const [textos, setTextos] = useState<Record<string, string>>({});
  const [ativos, setAtivos] = useState<Record<string, boolean>>({});
  const [previewAberto, setPreviewAberto] = useState<Record<string, boolean>>({});

  // Feedback de salvamento
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [salvandoTodos, setSalvandoTodos] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'err'; msg: string } | null>(null);

  // Refs de Textarea para inserir tags na posição exata do cursor
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Carrega dados iniciais da barbearia ou fallback dos templates padrão
  useEffect(() => {
    const salvos = barbearia.templates_whatsapp || {};
    const initialTextos: Record<string, string> = {};
    const initialAtivos: Record<string, boolean> = {};

    Object.keys(TEMPLATES_PADRAO).forEach((key) => {
      const salvo = salvos[key];
      initialTextos[key] = (typeof salvo === 'object' && salvo?.texto) ? salvo.texto : (typeof salvo === 'string' ? salvo : TEMPLATES_PADRAO[key].textoPadrao);
      initialAtivos[key] = (typeof salvo === 'object' && salvo?.ativo !== undefined) ? salvo.ativo : true;
    });

    setTextos(initialTextos);
    setAtivos(initialAtivos);
  }, [barbearia.id, barbearia.templates_whatsapp]);

  const toggleAcordeao = (key: string) => {
    setAbertos((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAtivo = (key: string) => {
    setAtivos((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTextoChange = (key: string, valor: string) => {
    setTextos((prev) => ({ ...prev, [key]: valor }));
  };

  // Inserção cirúrgica de tag na posição do cursor no textarea
  const inserirTag = (tag: string, key: string) => {
    const textarea = textareaRefs.current[key];
    const valorAtual = textos[key] || '';

    if (!textarea) {
      setTextos((prev) => ({ ...prev, [key]: valorAtual + tag }));
      return;
    }

    const start = textarea.selectionStart ?? valorAtual.length;
    const end = textarea.selectionEnd ?? valorAtual.length;
    const novoValor = valorAtual.substring(0, start) + tag + valorAtual.substring(end);

    setTextos((prev) => ({ ...prev, [key]: novoValor }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 20);
  };

  const restaurarPadrao = (key: string) => {
    const padrao = TEMPLATES_PADRAO[key]?.textoPadrao || '';
    setTextos((prev) => ({ ...prev, [key]: padrao }));
    setFeedback({ tipo: 'ok', msg: `Template "${TEMPLATES_PADRAO[key]?.titulo}" restaurado para o texto oficial.` });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Salvar um template individual
  const salvarTemplate = async (key: string) => {
    if (!barbearia?.id) return;
    setSalvandoId(key);
    setFeedback(null);

    try {
      const templatesAtuais = { ...(barbearia.templates_whatsapp || {}) };
      templatesAtuais[key] = {
        ativo: ativos[key] ?? true,
        texto: textos[key] || TEMPLATES_PADRAO[key].textoPadrao,
        atualizado_em: new Date().toISOString()
      };

      const updated = await pb.collection('barbearias').update<Barbearia>(barbearia.id, {
        templates_whatsapp: templatesAtuais
      });

      if (onBarbeariaUpdated) {
        onBarbeariaUpdated(updated);
      }

      setFeedback({ tipo: 'ok', msg: `Template "${TEMPLATES_PADRAO[key]?.titulo}" salvo com sucesso!` });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      console.error('Erro ao salvar template:', err);
      setFeedback({ tipo: 'err', msg: err?.message || 'Falha ao salvar template no PocketBase.' });
    } finally {
      setSalvandoId(null);
    }
  };

  // Salvar todos os templates simultaneamente
  const salvarTodosTemplates = async () => {
    if (!barbearia?.id) return;
    setSalvandoTodos(true);
    setFeedback(null);

    try {
      const mapaFinal: Record<string, any> = {};

      Object.keys(TEMPLATES_PADRAO).forEach((key) => {
        mapaFinal[key] = {
          ativo: ativos[key] ?? true,
          texto: textos[key] || TEMPLATES_PADRAO[key].textoPadrao,
          atualizado_em: new Date().toISOString()
        };
      });

      const updated = await pb.collection('barbearias').update<Barbearia>(barbearia.id, {
        templates_whatsapp: mapaFinal
      });

      if (onBarbeariaUpdated) {
        onBarbeariaUpdated(updated);
      }

      setFeedback({ tipo: 'ok', msg: 'Todos os 6 templates de notificações foram salvos com sucesso!' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error('Erro ao salvar todos os templates:', err);
      setFeedback({ tipo: 'err', msg: err?.message || 'Falha ao sincronizar templates.' });
    } finally {
      setSalvandoTodos(false);
    }
  };

  // Gera prévia do texto substituindo as variáveis por dados ilustrativos
  const gerarPreview = (texto?: string) => {
    if (!texto) return '';
    return texto
      .replace(/{cliente}/g, 'Matheus Ribeiro')
      .replace(/{barbeiro}/g, 'Felipe Barbeiro')
      .replace(/{servico}/g, 'Corte Degradê + Barba')
      .replace(/{data}/g, '12/11')
      .replace(/{hora}/g, '15:30')
      .replace(/{barbearia}/g, barbearia.nome || 'Naville Barber')
      .replace(/{chave_pix}/g, '00020126580014br.gov.bcb.pix0136naville-pix-exemplo5204000053039865802BR5925Naville6009SAOPAULO62070503***6304ABCD')
      .replace(/{link_agendamento}/g, `https://navillebarber.pro/b/${barbearia.slug || 'sua-loja'}`);
  };

  return (
    <div className="flex flex-col gap-5 text-white max-w-5xl mx-auto w-full font-sans animate-in fade-in duration-300">
      
      {/* 1. CABEÇALHO DA SEÇÃO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-white/[0.02] to-sky-500/10 border border-white/[0.08] backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <MessageSquare size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-wide text-white uppercase">
                Templates de Notificações Automáticas
              </h2>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                WhatsApp Nativo
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Personalize o texto dos 6 gatilhos automáticos disparados para os clientes da sua barbearia.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={salvarTodosTemplates}
            disabled={salvandoTodos}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
          >
            {salvandoTodos ? (
              <Sparkles size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            <span>Salvar Todos os Templates</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK FLUTUANTE / INLINE */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in duration-200 ${
            feedback.tipo === 'ok'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-emerald-500/10'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300 shadow-rose-500/10'
          }`}
        >
          {feedback.tipo === 'ok' ? (
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-rose-400 shrink-0" />
          )}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* GUIA DAS VARIÁVEIS DISPONÍVEIS */}
      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md flex flex-col gap-2">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Tag size={12} className="text-amber-400" />
          Tags Dinâmicas (Clique em qualquer pílula dentro do card para inserir no cursor):
        </span>
        <div className="flex flex-wrap gap-1.5">
          {VARIAVEIS_DISPONIVEIS.map((v) => (
            <span
              key={v.tag}
              title={v.desc}
              className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-zinc-300 flex items-center gap-1 cursor-default select-all"
            >
              <strong className="text-amber-300">{v.tag}</strong>
              <span className="text-zinc-500 text-[9px]">• {v.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* 2. LISTA DE CARDS COM ACORDEÃO PARA OS 6 GATILHOS */}
      <div className="flex flex-col gap-3">
        {Object.entries(TEMPLATES_PADRAO).map(([key, config]) => {
          const Icone = config.icone;
          const estaAberto = !!abertos[key];
          const estaAtivo = ativos[key] ?? true;
          const textoAtual = textos[key] || config.textoPadrao;
          const previewVisivel = !!previewAberto[key];
          const estaSalvando = salvandoId === key;

          return (
            <div
              key={key}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden backdrop-blur-xl ${
                estaAberto
                  ? 'bg-gradient-to-b from-white/[0.035] to-white/[0.015] border-white/15 shadow-xl'
                  : 'bg-white/[0.015] border-white/[0.06] hover:border-white/10'
              }`}
            >
              {/* Header do Acordeão */}
              <div className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none" onClick={() => toggleAcordeao(key)}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${config.corBadge}`}>
                    <Icone size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold text-white tracking-wide">
                        {config.titulo}
                      </h3>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full border ${config.corBadge}`}>
                        {config.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {config.subtitulo}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  {/* Switch: Ativar Envio Automático */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-zinc-400 hidden sm:inline">
                      {estaAtivo ? 'Envio Ativo' : 'Pausado'}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleAtivo(key)}
                      className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer focus:outline-none ${
                        estaAtivo ? 'bg-emerald-500' : 'bg-zinc-700'
                      }`}
                      title={estaAtivo ? 'Clique para desativar' : 'Clique para ativar'}
                    >
                      <span
                        className={`inline-block w-4.5 h-4.5 rounded-full bg-white transform transition-transform ${
                          estaAtivo ? 'translate-x-5' : 'translate-x-0.5'
                        } top-0.5 absolute left-0`}
                      />
                    </button>
                  </div>

                  {/* Botão de Toggle do Acordeão */}
                  <button
                    type="button"
                    onClick={() => toggleAcordeao(key)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    {estaAberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Corpo do Acordeão Expansível */}
              {estaAberto && (
                <div className="px-4 pb-4 pt-1 border-t border-white/[0.05] flex flex-col gap-3.5 animate-in fade-in duration-200">
                  
                  {/* Pílulas de Inserção de Tags */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Inserir Variáveis no Texto:
                      </label>
                      <span className="text-[9px] text-zinc-500">
                        Clique na tag para adicionar na posição do cursor
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {VARIAVEIS_DISPONIVEIS.map((v) => (
                        <button
                          key={v.tag}
                          type="button"
                          onClick={() => inserirTag(v.tag, key)}
                          className="px-2 py-1 rounded-lg bg-white/[0.03] hover:bg-white/10 border border-white/10 hover:border-amber-400/40 text-[10px] font-mono text-zinc-300 hover:text-amber-300 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                          title={`Inserir ${v.tag} (${v.desc})`}
                        >
                          <span className="text-amber-400 font-bold">+</span>
                          <span>{v.tag}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Textarea do Template */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Mensagem WhatsApp
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500">
                        {textoAtual.length} caracteres
                      </span>
                    </div>

                    <textarea
                      ref={(el) => (textareaRefs.current[key] = el)}
                      rows={6}
                      value={textoAtual}
                      onChange={(e) => handleTextoChange(key, e.target.value)}
                      placeholder="Digite o texto da mensagem automática..."
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white leading-relaxed outline-none focus:border-emerald-500 transition-colors custom-scrollbar font-sans resize-y min-h-[140px]"
                    />
                  </div>

                  {/* Botão de Toggle da Prévia WhatsApp */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setPreviewAberto((prev) => ({ ...prev, [key]: !prev[key] }))}
                      className="text-[11px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1.5 cursor-pointer py-1"
                    >
                      <Eye size={13} />
                      <span>{previewVisivel ? 'Ocultar Prévia ao Vivo' : 'Ver Prévia no WhatsApp Real'}</span>
                    </button>

                    {previewVisivel && (
                      <div className="mt-2 p-3.5 rounded-xl bg-[#0b141a] border border-[#202c33] shadow-inner flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 pb-1.5 border-b border-[#202c33]">
                          <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                            <Smartphone size={13} /> Visualização da Notificação
                          </span>
                          <span className="font-mono text-zinc-500">Hoje às 15:30</span>
                        </div>
                        <div className="bg-[#005c4b] text-white p-3 rounded-lg text-xs leading-relaxed whitespace-pre-wrap max-w-md shadow-md rounded-tr-none ml-auto">
                          {gerarPreview(textoAtual)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Barra de Ações: Restaurar Padrão e Salvar */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                    <button
                      type="button"
                      onClick={() => restaurarPadrao(key)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw size={12} />
                      <span>Restaurar Padrão</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => salvarTemplate(key)}
                      disabled={estaSalvando}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                    >
                      {estaSalvando ? (
                        <Sparkles size={13} className="animate-spin" />
                      ) : (
                        <Save size={13} />
                      )}
                      <span>{estaSalvando ? 'Salvando...' : 'Salvar Template'}</span>
                    </button>
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default MensagensConfigView;
