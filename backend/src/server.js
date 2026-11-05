import express from 'express';
import cors from 'cors';
import { db } from './db.js';
import campanhasRouter from './routes/campanhas.js';
import { criarRotasDeItens } from './routes/itensDaCampanha.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/campanhas', campanhasRouter);

app.use('/api', criarRotasDeItens({
  tabela: 'sessoes',
  campos: { numero: null, titulo: '', data: '', resumo: '' },
  ordem: 'numero, id',
  // Se não informar o número, vira a próxima sessão da campanha
  preparar: (dados, campanhaId) => {
    if (dados.numero) return dados;
    const { ultimo } = db
      .prepare('SELECT MAX(numero) AS ultimo FROM sessoes WHERE campanha_id = ?')
      .get(campanhaId);
    return { ...dados, numero: (ultimo ?? 0) + 1 };
  },
}));

app.use('/api', criarRotasDeItens({
  tabela: 'personagens',
  campos: { nome: '', tipo: 'npc', descricao: '', imagem: '' },
  obrigatorio: 'nome',
  ordem: 'tipo, nome',
}));

app.use('/api', criarRotasDeItens({
  tabela: 'notas',
  campos: { titulo: '', conteudo: '' },
  ordem: 'criado_em DESC',
}));

app.listen(4000, () => console.log('API rodando em http://localhost:4000'));