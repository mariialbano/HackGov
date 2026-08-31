// -----------------------------------------------------------------
// Validação e sanitização de entradas (reutilizada por todas as rotas)
//
// Regra de ouro: o backend nunca confia no cliente. Qualquer um pode
// chamar a API por curl/Postman ignorando as validações do React.
// -----------------------------------------------------------------

const { ApiError } = require('./middlewares/errors');

function sanitizarTexto(valor, tamanhoMax = 500) {
  if (typeof valor !== 'string') return '';
  return valor
    .replace(/<[^>]*>/g, '') // remove tags HTML (mitiga XSS armazenado)
    .replace(/[\u0000-\u001F\u007F]/g, ' ') // remove caracteres de controle
    .trim()
    .slice(0, tamanhoMax);
}

function validarCpf(cpf) {
  const digitos = String(cpf).replace(/\D/g, '');
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;

  const calcularDigito = (fatia, peso) => {
    const soma = fatia
      .split('')
      .reduce((acc, n, i) => acc + Number(n) * (peso - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return (
    calcularDigito(digitos.slice(0, 9), 10) === Number(digitos[9]) &&
    calcularDigito(digitos.slice(0, 10), 11) === Number(digitos[10])
  );
}

// Acumula os erros de todos os campos e lança um único 400 com a lista,
// em vez de reclamar de um campo por vez.
class Validador {
  constructor() {
    this.erros = [];
  }

  campo(nome, condicao, mensagem) {
    if (!condicao) this.erros.push({ campo: nome, mensagem });
    return this;
  }

  finalizar(mensagem = 'Dados inválidos na requisição.') {
    if (this.erros.length > 0) {
      throw ApiError.badRequest(mensagem, this.erros);
    }
  }
}

function paginacao(query, { limitePadrao = 20, limiteMax = 100 } = {}) {
  const pagina = Math.max(1, Number.parseInt(query.pagina, 10) || 1);
  const limiteBruto = Number.parseInt(query.limite, 10) || limitePadrao;
  const limite = Math.min(Math.max(1, limiteBruto), limiteMax);
  return { pagina, limite };
}

module.exports = { sanitizarTexto, validarCpf, Validador, paginacao };
