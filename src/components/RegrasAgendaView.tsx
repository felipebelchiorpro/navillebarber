import React, { useState, useEffect } from 'react';
import {
  Settings,
  Calendar,
  Clock,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Save,
  Info,
  CalendarDays,
  Sparkles
} from 'lucide-react';
import { Barbearia, pb } from '../services/pocketbase';

interface RegrasAgendaViewProps {
  barbearia: Barbearia;
  onBarbeariaUpdated?: (barbearia: Barbearia) => void;
}

export const RegrasAgendaView: React.FC<RegrasAgendaViewProps> = ({
  barbearia,
  onBarbeariaUpdated
}) => {
  const [limitarSemana, setLimitarSemana] = useState<boolean>(
    Boolean((barbearia as any).limitar_agendamento_semana)
  );
  const [diasMaxAgendamento, setDiasMaxAgendamento] = useState<number>(
    (barbearia as any).dias_max_agendamento || 7
  );
  const [diaLiberacao, setDiaLiberacao] = useState<string>(
    (barbearia as any).dia_liberacao_agenda || 'domingo'
  );

  const [horarioAbertura, setHorarioAbertura] = useState<string>(
    barbearia.horario_abertura || '09:00'
  );
  const [horarioFechamento, setHorarioFechamento] = useState<string>(
    barbearia.horario_fechamento || '20:00'
  );

  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (barbearia) {
      setLimitarSemana(Boolean((barbearia as any).limitar_agendamento_semana));
      setDiasMaxAgendamento((barbearia as any).dias_max_agendamento || 7);
      setDiaLiberacao((barbearia as any).dia_liberacao_agenda || 'domingo');
      setHorarioAbertura(barbearia.horario_abertura || '09:00');
      setHorarioFechamento(barbearia.horario_fechamento || '20:00');
    }
  }, [barbearia]);

  const handleSalvarRegras = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const patch = {
        limitar_agendamento_semana: limitarSemana,
        dias_max_agendamento: Number(diasMaxAgendamento) || 7,
        dia_liberacao_agenda: diaLiberacao,
        horario_abertura: horarioAbertura,
        horario_fechamento: horarioFechamento
      };

      const updated = await pb.collection('barbearias').update<Barbearia>(barbearia.id, patch);
      if (onBarbeariaUpdated) {
        onBarbeariaUpdated(updated);
      }
      setFeedback('Regras da agenda atualizadas com sucesso!');
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error('Erro ao salvar regras da agenda:', err);
      setFeedback('Falha ao salvar as regras. Verifique a conexão.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full max-w-4xl mx-auto pb-12">
      <header className="border-b border-white/[0.06] pb-5">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <Settings className="text-orange-500" size={26} /> Regras da Agenda & Bloqueios
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Configure a antecedência de abertura da agenda para clientes, horários de funcionamento e controle semanal.
        </p>
      </header>

      {feedback && (
        <div className={`p-4 rounded-xl flex items-center gap-2.5 text-xs font-semibold ${
          feedback.includes('sucesso')
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {feedback.includes('sucesso') ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback}</span>
        </div>
      )}

      <form onSubmit={handleSalvarRegras} className="flex flex-col gap-6">
        {/* CARD 1: CONTROLE DE ANTECEDÊNCIA SEMANAL */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] shadow-xl flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarDays className="text-orange-400" size={18} /> Abertura Semanal da Agenda
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Controle para os clientes não marcarem horários muito lá na frente.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setLimitarSemana(!limitarSemana)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                limitarSemana ? 'bg-orange-500' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  limitarSemana ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="pt-3 border-t border-white/[0.05] flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                limitarSemana
                  ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {limitarSemana ? 'Agenda Controlada (Semana Atual)' : 'Agenda Livre (Qualquer Data Futura)'}
              </span>
            </div>

            {limitarSemana ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1 bg-white/[0.01] p-4 rounded-xl border border-white/[0.04]">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Momento de Liberação da Semana
                  </label>
                  <select
                    value={diaLiberacao}
                    onChange={(e) => setDiaLiberacao(e.target.value)}
                    className="w-full bg-[#121827] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50"
                  >
                    <option value="domingo">Todo Domingo à noite (Libera a semana atual)</option>
                    <option value="segunda">Toda Segunda-feira de manhã</option>
                    <option value="livre">Deslizante (Ex: até 7 dias corridos)</option>
                  </select>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Ideal para barbearias que planejam a escala aos domingos.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Máximo de dias permitidos para frente
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={diasMaxAgendamento}
                    onChange={(e) => setDiasMaxAgendamento(Number(e.target.value))}
                    className="w-full bg-[#121827] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Dias além do limite aparecerão desabilitados na vitrine pública.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">
                Com a opção "Agenda Livre", os clientes podem agendar para qualquer dia ou mês futuro que esteja com horário vago.
              </p>
            )}
          </div>
        </div>

        {/* CARD 2: HORÁRIO OPERACIONAL DA GRADE */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] shadow-xl flex flex-col gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="text-orange-400" size={18} /> Horário de Funcionamento Geral
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Determina o primeiro e o último horário exibidos na grade e na vitrine pública.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Horário de Abertura (Início da Grade)
              </label>
              <input
                type="time"
                value={horarioAbertura}
                onChange={(e) => setHorarioAbertura(e.target.value)}
                className="w-full bg-[#121827] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Horário de Fechamento (Fim da Grade)
              </label>
              <input
                type="time"
                value={horarioFechamento}
                onChange={(e) => setHorarioFechamento(e.target.value)}
                className="w-full bg-[#121827] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all cursor-pointer disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar Regras da Agenda'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegrasAgendaView;

