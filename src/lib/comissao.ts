/**
 * Motor de Cálculo de Comissão Flexível (Regra Padrão do Barbeiro + Override por Serviço)
 * Naville Barber - Conforme Lei Salão-Parceiro
 */

export interface CalculoComissaoParams {
  valorServico: number;
  taxaNavilleRetida: number;
  profissionalComissaoPadrao: number; // ex: 50%
  servico: {
    comissao_personalizada_ativa?: boolean;
    comissao_tipo?: 'padrao_barbeiro' | 'porcentagem_fixa' | 'valor_fixo';
    comissao_valor?: number;
  };
}

export interface ResultadoDivisaoCorte {
  taxaNaville: number;
  valorBarbeiro: number;
  valorBarbearia: number;
  tipoComissaoAplicado: 'personalizada_porcentagem' | 'personalizada_valor_fixo' | 'padrao_barbeiro';
  regraDescricao: string;
}

export function calcularDivisaoCorte({
  valorServico,
  taxaNavilleRetida,
  profissionalComissaoPadrao,
  servico
}: CalculoComissaoParams): ResultadoDivisaoCorte {
  const baseCalculo = Math.max(0, valorServico - taxaNavilleRetida);
  let valorBarbeiro = 0;
  let tipoComissaoAplicado: ResultadoDivisaoCorte['tipoComissaoAplicado'] = 'padrao_barbeiro';
  let regraDescricao = `Comissão padrão do barbeiro (${profissionalComissaoPadrao}%)`;

  if (servico.comissao_personalizada_ativa && servico.comissao_valor !== undefined && servico.comissao_tipo !== 'padrao_barbeiro') {
    if (servico.comissao_tipo === 'porcentagem_fixa') {
      valorBarbeiro = baseCalculo * (servico.comissao_valor / 100);
      tipoComissaoAplicado = 'personalizada_porcentagem';
      regraDescricao = `Comissão personalizada do serviço (${servico.comissao_valor}%)`;
    } else if (servico.comissao_tipo === 'valor_fixo') {
      valorBarbeiro = Math.min(baseCalculo, servico.comissao_valor);
      tipoComissaoAplicado = 'personalizada_valor_fixo';
      regraDescricao = `Comissão personalizada fixa (R$ ${servico.comissao_valor.toFixed(2)})`;
    }
  } else {
    // Fallback: comissão base cadastrada no barbeiro
    valorBarbeiro = baseCalculo * (profissionalComissaoPadrao / 100);
  }

  const valorBarbearia = Math.max(0, baseCalculo - valorBarbeiro);

  return {
    taxaNaville: taxaNavilleRetida,
    valorBarbeiro: Number(valorBarbeiro.toFixed(2)),
    valorBarbearia: Number(valorBarbearia.toFixed(2)),
    tipoComissaoAplicado,
    regraDescricao
  };
}

