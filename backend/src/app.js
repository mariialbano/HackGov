// -----------------------------------------------------------------
// Configuração da aplicação Express
//
// A ordem dos middlewares importa:
//   1. CORS e parser de JSON
//   2. log das requisições
//   3. rotas da API
//   4. 404 para rotas inexistentes
//   5. tratador central de erros (sempre por último)
// -----------------------------------------------------------------

const express = require('express');
const cors = require('cors');

const rotas = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/errors');

const app = express();

// Em produção, ORIGENS_PERMITIDAS restringe quem pode chamar a API.
const origensPermitidas = process.env.ORIGENS_PERMITIDAS
  ? process.env.ORIGENS_PERMITIDAS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({ origin: origensPermitidas }));

// Limite no tamanho do corpo: evita que uma requisição gigante
// consuma memória do servidor (negação de serviço).
app.use(express.json({ limit: '100kb' }));

// Log técnico: método, rota, status e duração de cada requisição.
// Responde "a aplicação está saudável?" — diferente da trilha de
// auditoria, que responde "quem fez isso e quando?".
app.use((req, res, next) => {
  const inicio = Date.now();
  res.on('finish', () => {
    console.log(
      `${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - inicio}ms)`
    );
  });
  next();
});

app.use('/api/v1', rotas);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
