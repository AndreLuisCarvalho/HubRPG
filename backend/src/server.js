import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Dados de teste (na próxima etapa trocamos pelo banco SQLite)
const campanhas = [
  { id: 1, nome: 'A Cidade Sem Sol', sistema: 'Ordem Paranormal' },
  { id: 2, nome: 'Ruínas de Valkaria', sistema: 'Tormenta20' },
];

app.get('/api/campanhas', (req, res) => res.json(campanhas));

app.listen(4000, () => console.log('API rodando em http://localhost:4000'));