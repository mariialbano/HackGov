// Validação e sanitização de entradas (Segurança da Informação)
// Prática: nunca confiar em dados vindos do usuário — validar formato,
// tamanho e conteúdo antes de processar ou enviar ao backend.

export function sanitizeText(value, maxLength = 500) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, '') // remove tags HTML (mitiga XSS)
    // eslint-disable-next-line no-control-regex -- remover caracteres de controle e justamente o objetivo aqui
    .replace(/[\u0000-\u001F\u007F]/g, '') // remove caracteres de controle
    .trim()
    .slice(0, maxLength);
}

export function formatarCpf(value) {
  const digits = String(value).replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

// Validação completa de CPF com dígitos verificadores
export function validarCpf(cpf) {
  const digits = String(cpf).replace(/\D/g, '');

  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false; // rejeita 111.111.111-11 etc.

  const calcDigito = (slice, peso) => {
    const soma = slice
      .split('')
      .reduce((acc, num, i) => acc + Number(num) * (peso - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const d1 = calcDigito(digits.slice(0, 9), 10);
  const d2 = calcDigito(digits.slice(0, 10), 11);

  return d1 === Number(digits[9]) && d2 === Number(digits[10]);
}

// Política de senha forte: cada requisito tem um teste próprio,
// usado tanto na validação quanto na checklist visual do formulário.
export const REQUISITOS_SENHA = [
  { id: 'maiuscula', label: 'Pelo menos 1 letra maiúscula', test: (s) => /[A-Z]/.test(s) },
  { id: 'minuscula', label: 'Pelo menos 1 letra minúscula', test: (s) => /[a-z]/.test(s) },
  { id: 'numero', label: 'Pelo menos 1 número', test: (s) => /\d/.test(s) },
  { id: 'especial', label: 'Pelo menos 1 caractere especial (!@#$%...)', test: (s) => /[^a-zA-Z0-9]/.test(s) },
  { id: 'tamanho', label: 'Mínimo de 8 caracteres', test: (s) => s.length >= 8 },
];

export function validarSenha(senha) {
  if (typeof senha !== 'string' || senha.length === 0) {
    return 'Informe sua senha.';
  }
  const atendeTodos = REQUISITOS_SENHA.every((req) => req.test(senha));
  if (!atendeTodos) {
    return 'A senha não atende a todos os requisitos.';
  }
  return null;
}
