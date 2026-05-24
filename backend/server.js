const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Necessário para Node < 18
require('dotenv').config();

const app = express();
app.use(cors()); // Permite que o frontend (porta 5173) fale com o backend
app.use(express.json());

const PORT = 3001;

// Rota onde o chatbot React enviará as mensagens
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

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
        contents: [{ parts: [{ text: `Aja como o assistente virtual do projeto HackGov VidaReal (educação financeira e transparência em Taubaté). Responda: ${message}` }] }]
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