/**
 * Utilitários para cálculos de alta precisão
 * Todos os cálculos internos são realizados com 7 casas decimais
 * A exibição para o usuário é feita com 2 casas decimais
 */

export const PrecisionCalc = {
  // Arredonda para 7 casas decimais para cálculos internos
  round7(value: number): number {
    return Math.round(value * 10000000) / 10000000;
  },

  // Arredonda para 2 casas decimais para exibição
  round2(value: number): number {
    return Math.round(value * 100) / 100;
  },

  // Soma com alta precisão
  add(...values: number[]): number {
    const sum = values.reduce((acc, val) => acc + val, 0);
    return this.round7(sum);
  },

  // Subtração com alta precisão
  subtract(a: number, b: number): number {
    return this.round7(a - b);
  },

  // Multiplicação com alta precisão
  multiply(a: number, b: number): number {
    return this.round7(a * b);
  },

  // Divisão com alta precisão
  divide(a: number, b: number): number {
    if (b === 0) return 0;
    return this.round7(a / b);
  },

  // Calcula porcentagem com alta precisão
  percentage(value: number, total: number): number {
    if (total === 0) return 0;
    return this.round7((value / total) * 100);
  },

  // Formata moeda para exibição (sempre 2 casas decimais)
  formatCurrency(value: number, currency: 'BRL' | 'USD' = 'BRL'): string {
    const symbol = currency === 'USD' ? '$' : 'R$';
    const formatted = Math.abs(value).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${symbol} ${value < 0 ? '-' : ''}${formatted}`;
  },

  // Formata número para exibição com casas decimais customizadas
  formatNumber(value: number, decimals: number = 2): string {
    if (value === 0 || value === null || value === undefined || isNaN(value)) {
      return decimals === 0 ? '0' : '0,' + '0'.repeat(decimals);
    }
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }
};

export default PrecisionCalc;