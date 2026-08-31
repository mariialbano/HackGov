// Ponto de entrada do backend HackGov VidaReal.
// A configuração da aplicação fica em src/app.js — aqui só subimos o servidor.

require('dotenv').config();

const app = require('./src/app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend HackGov rodando na porta ${PORT}`);
  console.log(`API disponível em http://localhost:${PORT}/api/v1`);
});
