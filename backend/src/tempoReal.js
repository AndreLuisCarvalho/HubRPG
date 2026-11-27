import { Router } from 'express';
import { createHttpClient } from '@ably/pubsub-server';
import { db } from './db.js';

/*
 * Tempo real com o Ably (ably.com).
 * - Cada campanha tem um canal ("campanha-12"). Depois de toda mudança que deu certo (POST, PUT, DELETE),
 *   o servidor publica nele só o AVISO do que mudou: { tabela, id, acao } — nunca o conteúdo.
 *   Cada tela que recebe o aviso busca de novo pela API, que já filtra o que aquela conta pode ver.
 * - O site entra no canal com um token curto (só "ouvir", só a campanha dele) pedido em
 *   GET /campanhas/:id/tempo-real. Sem ABLY_KEY, nada disso liga e o site funciona como antes.
 * - "origem" (cabeçalho X-Origem) identifica a aba que fez a mudança, para ela não reagir ao próprio aviso.
 * - "liberou": quando o mestre libera um arquivo/item ou revela um mapa, vai o nome junto (para o aviso
 *   na tela do jogador; é o que ele vai ver de qualquer jeito).
 */

const chave = () => process.env.ABLY_KEY?.trim() || null;
const nomeDoCanal = (campanhaId) => `campanha-${campanhaId}`;

// Cliente do Ably para servidor (sem conexão aberta: cada aviso é um pedido HTTP)
let cliente = null;
function ably() {
  if (!cliente) cliente = createHttpClient({ key: chave() });
  return cliente;
}

async function publicar(campanhaId, evento) {
  if (!chave()) return;
  try {
    await Promise.race([
      ably().channels.get(nomeDoCanal(campanhaId)).publish('mudou', evento),
      new Promise((_, falhar) => setTimeout(() => falhar(new Error('demorou demais')), 2000)),
    ]);
  } catch (erro) {
    // O aviso é um extra: se o Ably falhar, a mudança já está salva
    console.warn('Ably: não foi possível avisar', erro.message);
  }
}

/* ---------- O que mudou ---------- */
// Tabelas cujas mudanças viram aviso, e a "chave de liberar" de cada uma
// missoes: só o aviso (sem conteúdo); o quadro de investigação dos jogadores recarrega com ele
const TABELAS = ['fichas', 'sessoes', 'itens', 'combates', 'arquivos', 'mapas', 'parentes', 'membros', 'campanhas', 'missoes'];
const LIBERAVEIS = {
  itens: { tipo: 'item', liberado: (d) => Boolean(d.liberado) },
  arquivos: { tipo: 'arquivo', liberado: (d) => Boolean(d.liberado) },
  mapas: { tipo: 'mapa', liberado: (d) => !d.oculto },
};

function lerDados(texto) {
  try { return JSON.parse(texto || '{}'); } catch { return {}; }
}

// "/campanhas/3/itens" → criar item; "/itens/9" → mudar/apagar; "/campanhas/3" → a campanha
function oQueMudou(req) {
  const [a, b, c, d] = req.path.split('/').filter(Boolean);
  if (a === 'campanhas' && /^\d+$/.test(b ?? '')) {
    if (!c) return { tabela: 'campanhas', id: Number(b) };
    if (c === 'membros') return { tabela: 'membros', id: Number(d) || null };
    if (!d && TABELAS.includes(c)) return { tabela: c, id: null };
    return null;
  }
  if (TABELAS.includes(a) && /^\d+$/.test(b ?? '') && !c) return { tabela: a, id: Number(b) };
  return null;   // /arquivos/9/destrancar, /campanhas/entrar, /auth…
}

const ACOES = { POST: 'criou', PUT: 'mudou', DELETE: 'apagou' };

/** Middleware: depois de uma mudança que deu certo, avisa a campanha (antes de a resposta sair) */
export async function avisarMudancas(req, res, next) {
  const acao = ACOES[req.method];
  const alvo = acao && chave() && oQueMudou(req);
  if (!alvo || !req.campanhaId) return next();

  // Para saber se o mestre acabou de liberar: como estava antes
  const liberavel = LIBERAVEIS[alvo.tabela];
  let antes = null;
  if (liberavel && alvo.id) {
    const linha = await db.get(`SELECT dados FROM ${alvo.tabela} WHERE id = ?`, alvo.id);
    antes = linha ? liberavel.liberado(lerDados(linha.dados)) : null;
  }

  const json = res.json.bind(res);
  res.json = (corpo) => {
    res.locals.corpo = corpo;
    return json(corpo);
  };

  const terminar = res.end.bind(res);
  let avisado = false;
  res.end = (...args) => {
    if (avisado || res.statusCode >= 400) return terminar(...args);
    avisado = true;
    const corpo = res.locals.corpo;
    const evento = {
      tabela: alvo.tabela,
      id: alvo.id ?? corpo?.id ?? null,
      acao,
      origem: req.get('x-origem') ?? null,
    };
    if (liberavel && corpo?.dados !== undefined && acao !== 'apagou') {
      const agora = liberavel.liberado(typeof corpo.dados === 'string' ? lerDados(corpo.dados) : corpo.dados);
      if (agora && antes !== true) {
        evento.liberou = { tipo: liberavel.tipo, nome: corpo.titulo ?? corpo.nome ?? '' };
      }
    }
    publicar(req.campanhaId, evento).finally(() => terminar(...args));
    return res;
  };
  next();
}

/* ---------- Token para o site ouvir o canal ---------- */
export const rotasTempoReal = Router();

/*
 * Onde o mestre está no mapa: ao trocar de mapa ou entrar/sair de um cômodo, a tela dos jogadores
 * vai junto. Fica salvo na campanha, para quem abrir os Mapas depois cair no mesmo lugar.
 * "como" é a animação: { tipo: 'entrar' } ou { tipo: 'sair', foco: pontos do cômodo }.
 */
rotasTempoReal.get('/campanhas/:campanhaId/foco-mapa', async (req, res) => {
  const c = await db.get('SELECT foco_mapa FROM campanhas WHERE id = ?', req.campanhaId);
  res.json({ mapaId: c?.foco_mapa ?? null });
});

rotasTempoReal.put('/campanhas/:campanhaId/foco-mapa', async (req, res) => {
  if (req.papel !== 'mestre') return res.status(403).json({ erro: 'Só o mestre conduz o mapa' });
  const mapaId = Number(req.body?.mapaId) || null;
  await db.run('UPDATE campanhas SET foco_mapa = ? WHERE id = ?', mapaId, req.campanhaId);
  const como = req.body?.como ?? null;
  await publicar(req.campanhaId, { tabela: 'foco-mapa', id: mapaId, acao: 'foco', como, origem: req.get('x-origem') ?? null });
  res.status(204).end();
});

rotasTempoReal.get('/campanhas/:campanhaId/tempo-real', async (req, res) => {
  if (!chave()) return res.json({ ligado: false });
  try {
    // Token de 1 hora, com o id da conta (o Ably exige), que só ouve o canal desta campanha
    const token = await ably().auth.requestToken({
      clientId: String(req.usuario.id),
      capability: { [nomeDoCanal(req.campanhaId)]: ['subscribe'] },
      ttl: 60 * 60 * 1000,
    });
    res.json({ ligado: true, canal: nomeDoCanal(req.campanhaId), token });
  } catch (erro) {
    console.warn('Ably: não foi possível criar o token', erro.message);
    res.status(502).json({ erro: 'Não foi possível ligar o tempo real' });
  }
});
