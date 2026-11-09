import { Agendamento, BloqueioHorario, Servico } from './pocketbase';

export interface TimeSlot {
  horario: string; // "08:00", "08:30", etc.
  minutosDesdeMeiaNoite: number;
  disponivel: boolean;
  motivoIndisponibilidade?: string;
  agendamento?: Agendamento;
  bloqueio?: BloqueioHorario;
  pertenceAoAgendamentoId?: string;
  tipo?: 'livre' | 'agendado' | 'bloqueado' | string;
  motivo?: string;
  clienteNome?: string;
}

export interface SlotValidationResult {
  valido: boolean;
  motivo?: string;
  horarioFim?: string;
}

/**
 * Converte "HH:mm" em minutos desde as 00:00 (Ex: "08:30" -> 510)
 */
export function timeToMinutes(time: string): number {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Converte minutos desde as 00:00 em "HH:mm" (Ex: 510 -> "08:30")
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Verifica se dois intervalos [startA, endA) e [startB, endB) se sobrepõem
 */
export function hasTimeOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return Math.max(startA, startB) < Math.min(endA, endB);
}

/**
 * Configurações padrão da grade horária
 */
export const DEFAULT_OPENING_TIME = '08:00';
export const DEFAULT_CLOSING_TIME = '19:00';
export const DEFAULT_SLOT_INTERVAL_MINUTES = 30;

/**
 * Gera a lista de slots base para um dia (ex: 08:00 às 19:00 em passos de 30 min)
 */
export function generateDayTimeSlots(
  openingTime: string = DEFAULT_OPENING_TIME,
  closingTime: string = DEFAULT_CLOSING_TIME,
  intervalMinutes: number = DEFAULT_SLOT_INTERVAL_MINUTES
): string[] {
  const startMinutes = timeToMinutes(openingTime);
  const endMinutes = timeToMinutes(closingTime);
  const slots: string[] = [];

  for (let m = startMinutes; m < endMinutes; m += intervalMinutes) {
    slots.push(minutesToTime(m));
  }

  return slots;
}

/**
 * Valida se um horário e duração específicos possuem slots contíguos livres
 * sem colisões com agendamentos, bloqueios e sem ultrapassar o fechamento.
 */
export function validateContiguousSlots({
  horarioInicio,
  duracaoTotalMinutos,
  barbeiroId,
  agendamentos,
  bloqueios,
  closingTime = DEFAULT_CLOSING_TIME,
  ignoreAgendamentoId,
}: {
  horarioInicio: string;
  duracaoTotalMinutos: number;
  barbeiroId: string;
  agendamentos: Agendamento[];
  bloqueios: BloqueioHorario[];
  closingTime?: string;
  ignoreAgendamentoId?: string;
}): SlotValidationResult {
  const startMinutes = timeToMinutes(horarioInicio);
  const endMinutes = startMinutes + duracaoTotalMinutos;
  const closingMinutes = timeToMinutes(closingTime);

  // 1. Validação de encerramento da barbearia
  if (endMinutes > closingMinutes) {
    return {
      valido: false,
      motivo: `A duração (${duracaoTotalMinutos} min) ultrapassa o horário de fechamento (${closingTime}). Término previsto: ${minutesToTime(endMinutes)}.`,
      horarioFim: minutesToTime(endMinutes),
    };
  }

  // 2. Validação contra agendamentos existentes do barbeiro
  for (const ag of agendamentos) {
    if (ag.status === 'cancelado') continue;
    if (ignoreAgendamentoId && ag.id === ignoreAgendamentoId) continue;
    if (ag.barbeiro_id !== barbeiroId) continue;

    const agStart = timeToMinutes(ag.horario);
    const agEnd = agStart + ag.duracao_total_minutos;

    if (hasTimeOverlap(startMinutes, endMinutes, agStart, agEnd)) {
      return {
        valido: false,
        motivo: `Conflito de horário com agendamento existente de ${ag.cliente_nome} (${ag.horario} às ${minutesToTime(agEnd)}).`,
        horarioFim: minutesToTime(endMinutes),
      };
    }
  }

  // 3. Validação contra bloqueios de horário (específicos do barbeiro ou 'todos')
  for (const bl of bloqueios) {
    if (bl.barbeiro_id !== barbeiroId && bl.barbeiro_id !== 'todos') continue;

    const blStart = timeToMinutes(bl.horario_inicio);
    const blEnd = timeToMinutes(bl.horario_fim);

    if (hasTimeOverlap(startMinutes, endMinutes, blStart, blEnd)) {
      return {
        valido: false,
        motivo: `Horário bloqueado (${bl.motivo}: ${bl.horario_inicio} às ${bl.horario_fim}).`,
        horarioFim: minutesToTime(endMinutes),
      };
    }
  }

  return {
    valido: true,
    horarioFim: minutesToTime(endMinutes),
  };
}

/**
 * Constrói a grade completa do dia para um barbeiro com status de cada slot
 */
export function buildBarberDailyTimeline({
  barbeiroId,
  agendamentos,
  bloqueios,
  openingTime = DEFAULT_OPENING_TIME,
  closingTime = DEFAULT_CLOSING_TIME,
  slotInterval = DEFAULT_SLOT_INTERVAL_MINUTES,
}: {
  barbeiroId: string;
  agendamentos: Agendamento[];
  bloqueios: BloqueioHorario[];
  openingTime?: string;
  closingTime?: string;
  slotInterval?: number;
}): TimeSlot[] {
  const baseSlots = generateDayTimeSlots(openingTime, closingTime, slotInterval);

  return baseSlots.map((slotStr) => {
    const slotStart = timeToMinutes(slotStr);
    const slotEnd = slotStart + slotInterval;

    // Checa bloqueio
    const matchedBloqueio = bloqueios.find((bl) => {
      if (bl.barbeiro_id !== barbeiroId && bl.barbeiro_id !== 'todos') return false;
      const blStart = timeToMinutes(bl.horario_inicio);
      const blEnd = timeToMinutes(bl.horario_fim);
      return hasTimeOverlap(slotStart, slotEnd, blStart, blEnd);
    });

    if (matchedBloqueio) {
      return {
        horario: slotStr,
        minutosDesdeMeiaNoite: slotStart,
        disponivel: false,
        motivoIndisponibilidade: matchedBloqueio.motivo,
        bloqueio: matchedBloqueio,
      };
    }

    // Checa agendamento
    const matchedAgendamento = agendamentos.find((ag) => {
      if (ag.status === 'cancelado') return false;
      if (ag.barbeiro_id !== barbeiroId) return false;
      const agStart = timeToMinutes(ag.horario);
      const agEnd = agStart + ag.duracao_total_minutos;
      return hasTimeOverlap(slotStart, slotEnd, agStart, agEnd);
    });

    if (matchedAgendamento) {
      const isStartSlot = matchedAgendamento.horario === slotStr;
      return {
        horario: slotStr,
        minutosDesdeMeiaNoite: slotStart,
        disponivel: false,
        motivoIndisponibilidade: `Agendado: ${matchedAgendamento.cliente_nome}`,
        agendamento: isStartSlot ? matchedAgendamento : undefined,
        pertenceAoAgendamentoId: matchedAgendamento.id,
      };
    }

    return {
      horario: slotStr,
      minutosDesdeMeiaNoite: slotStart,
      disponivel: true,
    };
  });
}

/**
 * Calcula duração total e preço total a partir de uma lista de IDs e catálogo de serviços
 */
export function calculateServicesTotals(
  selectedIds: string[],
  servicesCatalog: Servico[]
): { duracaoTotalMinutos: number; valorTotal: number; servicosNomes: string[] } {
  const servicesMap = new Map<string, Servico>();
  servicesCatalog.forEach((s) => servicesMap.set(s.id, s));

  let duracaoTotalMinutos = 0;
  let valorTotal = 0;
  const servicosNomes: string[] = [];

  for (const id of selectedIds) {
    const serv = servicesMap.get(id);
    if (serv) {
      duracaoTotalMinutos += serv.duracao_minutos;
      valorTotal += serv.preco;
      servicosNomes.push(serv.nome);
    }
  }

  return { duracaoTotalMinutos, valorTotal, servicosNomes };
}
