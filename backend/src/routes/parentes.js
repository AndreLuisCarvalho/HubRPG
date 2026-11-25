import { Router } from 'express';
import { db } from '../db.js';
import { ehMestre } from '../permissoes.js';

/*
 * Parentes dos agentes: só o dono do agente e o mestre veem, criam, editam e apagam.
 * A "notaMestre" fica só com o mestre: o jogador não recebe e, ao editar, não apaga.
 */
const router = Router();

const CAMPOS = ['foto', 'relacao', 'situacao', 'idade', 'mora', 'aparencia', 'historia', 'notaMestre'];

function lerDados(texto) {
  try { return JSON.parse(texto || '{}'); } catch { return {}; }
}

// Só os campos conhecidos, em texto (a foto vem em data URL, já reduzida no site)
function limpar(dados) {
  const d = typeof dados === 'string' ? lerDados(dados) : dados ?? {};
  return Object.fromEntries(CAMPOS.filter((c) => d[c] != null).map((c) => [c, String(d[c])]));
}

function paraQuemVe(parente, mestre) {
  const { notaMestre: _nota, ...dados } = lerDados(parente.dados);
  return { ...parente, dados: JSON.stringify(mestre ? lerDados(parente.dados) : dados) };
}

// O agente pode ter parentes? (ficha de jogador desta campanha) e quem pode mexer neles
async function agenteDe(fichaId, req) {
  const ficha = await db.get('SELECT id, campanha_id, tipo, dono_id FROM fichas WHERE id = ?', Number(fichaId));
  if (!ficha || ficha.campanha_id !== req.campanhaId || ficha.tipo !== 'jogador') return null;
  return { ...ficha, podeMexer: ehMestre(req) || ficha.dono_id === req.usuario.id };
}

const proibido = (res) => res.status(403).json({ erro: 'Só o dono do agente e o mestre mexem nos parentes' });

router.get('/campanhas/:campanhaId/parentes', async (req, res) => {
  const mestre = ehMestre(req);
  const parentes = await db.all(`
    SELECT p.* FROM parentes p JOIN fichas f ON f.id = p.ficha_id
    WHERE p.campanha_id = ? ${mestre ? '' : 'AND f.dono_id = ?'}
    ORDER BY p.id
  `, req.campanhaId, ...(mestre ? [] : [req.usuario.id]));
  res.json(parentes.map((p) => paraQuemVe(p, mestre)));
});

router.post('/campanhas/:campanhaId/parentes', async (req, res) => {
  const { ficha_id, nome, dados } = req.body ?? {};
  const agente = await agenteDe(ficha_id, req);
  if (!agente) return res.status(400).json({ erro: 'Escolha o agente do parente' });
  if (!agente.podeMexer) return proibido(res);
  if (!String(nome ?? '').trim()) return res.status(400).json({ erro: 'Dê um nome ao parente' });

  const limpos = limpar(dados);
  if (!ehMestre(req)) delete limpos.notaMestre;
  const { lastInsertRowid: id } = await db.run(
    'INSERT INTO parentes (campanha_id, ficha_id, nome, dados) VALUES (?, ?, ?, ?)',
    req.campanhaId, agente.id, String(nome).trim().slice(0, 80), JSON.stringify(limpos),
  );
  res.status(201).json(paraQuemVe(await db.get('SELECT * FROM parentes WHERE id = ?', id), ehMestre(req)));
});

router.put('/parentes/:id', async (req, res) => {
  const atual = await db.get('SELECT * FROM parentes WHERE id = ?', Number(req.params.id));
  const agente = await agenteDe(atual.ficha_id, req);
  if (!agente?.podeMexer) return proibido(res);

  const mestre = ehMestre(req);
  const antes = lerDados(atual.dados);
  const novos = req.body?.dados !== undefined ? limpar(req.body.dados) : antes;
  // O jogador não vê a nota do mestre: mantém a que estava
  if (!mestre) novos.notaMestre = antes.notaMestre;
  if (novos.notaMestre == null) delete novos.notaMestre;
  const nome = String(req.body?.nome ?? atual.nome).trim().slice(0, 80) || atual.nome;

  await db.run('UPDATE parentes SET nome = ?, dados = ? WHERE id = ?', nome, JSON.stringify(novos), atual.id);
  res.json(paraQuemVe(await db.get('SELECT * FROM parentes WHERE id = ?', atual.id), mestre));
});

router.delete('/parentes/:id', async (req, res) => {
  const atual = await db.get('SELECT * FROM parentes WHERE id = ?', Number(req.params.id));
  const agente = await agenteDe(atual.ficha_id, req);
  if (!agente?.podeMexer) return proibido(res);
  await db.run('DELETE FROM parentes WHERE id = ?', atual.id);
  res.status(204).end();
});

export default router;
