const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Necessário para Node < 18
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(cors()); // Permite que o frontend (porta 5173) fale com o backend
app.use(express.json());

const PORT = 3001;

// Validação de entrada no servidor (Segurança da Informação):
// o frontend já valida, mas o backend NUNCA deve confiar no cliente —
// qualquer um pode chamar a API diretamente (curl, Postman etc.).
const MAX_MESSAGE_LENGTH = 1000;

function validarMensagem(message) {
  if (typeof message !== 'string') {
    return 'O campo "message" é obrigatório e deve ser um texto.';
  }
  const texto = message.trim();
  if (texto.length === 0) {
    return 'A mensagem não pode estar vazia.';
  }
  if (texto.length > MAX_MESSAGE_LENGTH) {
    return `A mensagem deve ter no máximo ${MAX_MESSAGE_LENGTH} caracteres.`;
  }
  return null;
}

function sanitizarMensagem(message) {
  return message
    .replace(/<[^>]*>/g, '') // remove tags HTML (mitiga XSS refletido)
    .replace(/[\u0000-\u001F\u007F]/g, ' ') // remove caracteres de controle
    .trim();
}

// -----------------------------------------------------------------
// Autenticação (Segurança da Informação)
// Senhas NUNCA ficam em texto puro: apenas o hash bcrypt é armazenado.
// Em produção, os usuários viriam da tabela USUARIO do banco
// (com colunas senha_hash e perfil) e o login seria via gov.br OAuth.
// -----------------------------------------------------------------
const USUARIOS = [
  {
    cpf: '52998224725',
    senhaHash: '$2b$10$JmfP2k87GCY5vigEAgAjIOlqFmrx0sDgxsQ3t70CNOqpetX96I0hW', // Cidadao@123
    nome: 'Maria da Silva',
    perfil: 'cidadao',
  },
  {
    cpf: '15350946056',
    senhaHash: '$2b$10$buuLHd..XZ15GMW1H90YCelfqyEszYfZhzs7muHgKZyedAOLvLwo6', // Atendente@123
    nome: 'João Santos',
    perfil: 'atendente',
  },
];

// Hash falso comparado quando o CPF não existe: o tempo de resposta
// fica igual ao de um usuário real, evitando enumeração por timing.
const HASH_FALSO = '$2b$10$fuAhxm9OixnUD5I76RlDtOLL3Cfb54xcUHiSDLz3QqRXd0OhNZ5Om';

function validarCpfServidor(cpf) {
  const digits = String(cpf).replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const calcDigito = (slice, peso) => {
    const soma = slice.split('').reduce((acc, n, i) => acc + Number(n) * (peso - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return (
    calcDigito(digits.slice(0, 9), 10) === Number(digits[9]) &&
    calcDigito(digits.slice(0, 10), 11) === Number(digits[10])
  );
}

app.post('/api/login', async (req, res) => {
  const { cpf, senha } = req.body ?? {};

  if (typeof cpf !== 'string' || typeof senha !== 'string') {
    return res.status(400).json({ error: 'CPF e senha são obrigatórios.' });
  }

  const cpfDigits = cpf.replace(/\D/g, '');

  // Mensagem genérica de propósito: não revelar se o CPF existe
  // (evita enumeração de usuários).
  if (!validarCpfServidor(cpfDigits) || senha.length < 8 || senha.length > 64) {
    return res.status(401).json({ error: 'CPF ou senha incorretos.' });
  }

  const usuario = USUARIOS.find((u) => u.cpf === cpfDigits);
  const senhaConfere = await bcrypt.compare(senha, usuario ? usuario.senhaHash : HASH_FALSO);

  if (!usuario || !senhaConfere) {
    return res.status(401).json({ error: 'CPF ou senha incorretos.' });
  }

  // Em produção seria um JWT assinado; aqui um token de sessão aleatório.
  const token = crypto.randomBytes(32).toString('hex');

  res.json({
    success: true,
    token,
    user: { nome: usuario.nome, cpf: usuario.cpf, perfil: usuario.perfil },
  });
});

// Rota onde o chatbot React enviará as mensagens
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  const erroValidacao = validarMensagem(message);
  if (erroValidacao) {
    return res.status(400).json({ reply: erroValidacao });
  }

  if (!process.env.IA_API_KEY) {
    return res.status(500).json({ reply: "Erro: API Key não configurada no backend (.env)." });
  }

  try {
    // EXEMPLO COM GEMINI API (GOOGLE)
    // Para trocar para OpenAI, mude a URL e o corpo da requisição conforme a documentação deles.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.IA_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Aja como o assistente virtual do projeto HackGov VidaReal (educação financeira e transparência em Taubaté). Responda: ${sanitizarMensagem(message)}` }] }]
      })
    });

    const data = await response.json();
    
    // Tratamento básico de erro da API
    if (data.error) throw new Error(data.error.message);

    const botReply = data.candidates[0].content.parts[0].text;
    res.json({ reply: botReply });

  } catch (error) {
    console.error("Erro no backend:", error);
    res.status(500).json({ reply: "Desculpe, estou com problemas técnicos agora. Tente novamente mais tarde." });
  }
});

app.listen(PORT, () => {
  console.log(`Backend HackGov rodando na porta ${PORT}`);
});