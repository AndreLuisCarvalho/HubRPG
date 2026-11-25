import express from 'express';
import cors from 'cors';
import { bancoPronto, db } from './db.js';
import { exigirCampanha, exigirLogin, identificar, rotasDeLogin } from './auth.js';
import campanhasRouter from './routes/campanhas.js';
import { criarRotasDeItens } from './routes/itensDaCampanha.js';
import fichasRouter from './routes/fichas.js';
import arquivosRouter from './routes/arquivos.js';
import mapasRouter from './routes/mapas.js';
import contasRouter from './routes/contas.js';
import { avisarMudancas, rotasTempoReal } from './tempoReal.js';
import parentesRouter from './routes/parentes.js';

const app = express();
 
// Na Vercel, ORIGEM_SITE é o endereço do site (ex.: https://hubrpg.vercel.app). No PC, libera tudo.
app.use(cors({ origin: process.env.ORIGEM_SITE ?? true }));
// 4 MB: a ficha leva a foto (~30 KB) e um arquivo pode levar um PDF pequeno (até 2 MB, ~2,7 MB em texto).
// A Vercel aceita até 4,5 MB por requisição.
app.use(express.json({ limit: '4mb' }));
 
// Espera o banco ficar pronto (tabelas e migrações) antes de qualquer rota
app.use(async (req, res, next) => {
  await bancoPronto;
  next();
});

// Login: quem é (token no cabeçalho), as rotas de entrar, e daqui para baixo só com conta
// e só nas campanhas de que a conta participa (req.papel = 'mestre' | 'jogador')
app.use('/api', identificar);
app.use('/api', rotasDeLogin);
app.use('/api', exigirLogin, exigirCampanha);
// Tempo real: avisa a campanha a cada mudança, e dá ao site o token para ouvir
app.use('/api', avisarMudancas);
app.use('/api', rotasTempoReal);

app.use('/api', contasRouter);
app.use('/api/campanhas', campanhasRouter);
app.use('/api', fichasRouter);
app.use('/api', arquivosRouter);
app.use('/api', mapasRouter);
app.use('/api', parentesRouter);
 
app.use('/api', criarRotasDeItens({
  tabela: 'sessoes',
  campos: { numero: null, titulo: '', data: '', resumo: '', notas_mestre: '' },
  ordem: 'numero, id',
  // Se não informar o número, vira a próxima sessão da campanha
  preparar: async (dados, campanhaId) => {
    if (dados.numero) return dados;
    const { ultimo } = await db.get('SELECT MAX(numero) AS ultimo FROM sessoes WHERE campanha_id = ?', campanhaId);
    return { ...dados, numero: (ultimo ?? 0) + 1 };
  },
  // Jogadores leem as sessões, sem as anotações do mestre
  jogador: { ler: async (sessoes) => sessoes.map(({ notas_mestre: _notas, ...s }) => s) },
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

// Itens da campanha: o front manda "dados" já em texto JSON (imagem, dano, dono…)
// Jogadores veem só os liberados pelo mestre e os que estão com o próprio agente
app.use('/api', criarRotasDeItens({
  tabela: 'itens',
  campos: { nome: '', dados: '{}' },
  obrigatorio: 'nome',
  ordem: 'id DESC',
  jogador: {
    ler: async (itens, req) => {
      const meus = new Set((await db.all(
        'SELECT id FROM fichas WHERE campanha_id = ? AND dono_id = ?', req.campanhaId, req.usuario.id,
      )).map((f) => f.id));
      return itens.flatMap((i) => {
        try {
          const { notaMestre: _nota, ...d } = JSON.parse(i.dados || '{}');
          return d.liberado || meus.has(Number(d.dono?.fichaId)) ? [{ ...i, dados: JSON.stringify(d) }] : [];
        } catch {
          return [];
        }
      });
    },
  },
}));

// Combates: "dados" também vem em texto JSON (participantes, rodada, vez); sessao_id liga à sessão do dia
// Jogadores veem e agem na luta (salvam o combate), mas não criam nem apagam
app.use('/api', criarRotasDeItens({
  tabela: 'combates',
  campos: { nome: '', sessao_id: null, dados: '{}' },
  obrigatorio: 'nome',
  ordem: 'id DESC',
  jogador: { ler: true, editar: true },
}));

// Erros inesperados viram uma resposta JSON (em vez de derrubar a função na Vercel)
app.use((erro, req, res, next) => {
  console.error(erro);
  res.status(500).json({ erro: 'Erro interno no servidor' });
});
 
// No PC sobe na porta 4000. Na Vercel, quem chama o app é a própria plataforma.
if (!process.env.VERCEL) {
  app.listen(4000, () => console.log('API rodando em http://localhost:4000'));
}
 
export default app;
 