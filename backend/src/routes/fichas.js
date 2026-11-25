import { Router } from 'express';
import { db } from '../db.js';
import { ehMestre, fichaBasica, fichasEmCombate, soDadosDeCombate } from '../permissoes.js';

const router = Router();
const TIPOS = ['jogador', 'npc', 'monstro'];

/*
 * Fichas. dono_id = a conta do jogador que usa o agente (o mestre liga; o jogador que cria o
 * próprio agente já vira o dono).
 * O jogador vê: o próprio agente inteiro, os agentes dos outros só no básico (nome, foto, resumo)
 * e, durante um combate em andamento, as fichas de quem está na luta. Edita só o próprio agente
 * (e, na luta, só os recursos de quem está no combate). Cria um agente só.
 */

// O banco guarda "dados" como texto JSON; a API entrega como objeto
function formatar(ficha) {
  return ficha && { ...ficha, dados: JSON.parse(ficha.dados || '{}') };
}

const buscarFicha = async (id) => formatar(await db.get('SELECT * FROM fichas WHERE id = ?', Number(id)));

/** O que esta conta pode ver da ficha: 'tudo', 'basico' ou null (nada) */
function acesso(req, ficha, emCombate) {
  if (ehMestre(req) || ficha.dono_id === req.usuario.id || emCombate.has(ficha.id)) return 'tudo';
  if (ficha.tipo === 'jogador') return 'basico';
  return null;
}

// Listar fichas da campanha (opcional: ?tipo=npc)
router.get('/campanhas/:campanhaId/fichas', async (req, res) => {
  const campanhaId = req.campanhaId;
  const { tipo } = req.query;
  if (tipo && !TIPOS.includes(tipo)) {
    return res.status(400).json({ erro: `Tipo inválido. Use: ${TIPOS.join(', ')}` });
  }

  const fichas = (tipo
    ? await db.all('SELECT * FROM fichas WHERE campanha_id = ? AND tipo = ? ORDER BY nome', campanhaId, tipo)
    : await db.all('SELECT * FROM fichas WHERE campanha_id = ? ORDER BY tipo, nome', campanhaId)
  ).map(formatar);

  if (ehMestre(req)) return res.json(fichas);
  const emCombate = await fichasEmCombate(campanhaId);
  res.json(fichas.flatMap((f) => {
    const a = acesso(req, f, emCombate);
    if (a === 'tudo') return [f];
    if (a === 'basico') return [fichaBasica(f)];
    return [];
  }));
});

// Buscar uma ficha
router.get('/fichas/:id', async (req, res) => {
  const ficha = await buscarFicha(req.params.id);
  if (!ficha) return res.status(404).json({ erro: 'Ficha não encontrada' });
  const a = acesso(req, ficha, ehMestre(req) ? new Set() : await fichasEmCombate(ficha.campanha_id));
  if (!a) return res.status(403).json({ erro: 'Você não pode ver esta ficha' });
  res.json(a === 'tudo' ? ficha : fichaBasica(ficha));
});

// Criar ficha (o jogador: só o próprio agente, um por campanha)
router.post('/campanhas/:campanhaId/fichas', async (req, res) => {
  const campanhaId = req.campanhaId;
  const { nome, tipo = 'jogador', imagem = '', dados = {} } = req.body ?? {};
  if (!nome) return res.status(400).json({ erro: 'O nome é obrigatório' });
  if (!TIPOS.includes(tipo)) return res.status(400).json({ erro: `Tipo inválido. Use: ${TIPOS.join(', ')}` });

  let donoId = null;
  if (ehMestre(req)) {
    donoId = req.body?.dono_id ?? null;
  } else {
    if (tipo !== 'jogador') return res.status(403).json({ erro: 'O jogador só cria o próprio agente' });
    const ja = await db.get("SELECT id FROM fichas WHERE campanha_id = ? AND tipo = 'jogador' AND dono_id = ?", campanhaId, req.usuario.id);
    if (ja) return res.status(403).json({ erro: 'Você já tem um agente nesta campanha' });
    donoId = req.usuario.id;
  }

  const resultado = await db.run(
    'INSERT INTO fichas (campanha_id, tipo, nome, imagem, dados, dono_id) VALUES (?, ?, ?, ?, ?, ?)',
    campanhaId, tipo, nome, imagem, JSON.stringify(dados), donoId,
  );

  res.status(201).json(await buscarFicha(resultado.lastInsertRowid));
});

// Editar ficha: "dados" é mesclado, então dá para mandar só o que mudou
// (ex.: { "dados": { "atuais": { "pv": 12, "pe": 9, "san": 20 } } })
router.put('/fichas/:id', async (req, res) => {
  const atual = await buscarFicha(req.params.id);
  if (!atual) return res.status(404).json({ erro: 'Ficha não encontrada' });

  let corpo = req.body ?? {};
  if (!ehMestre(req)) {
    const proprio = atual.dono_id === req.usuario.id;
    const naLuta = !proprio && (await fichasEmCombate(atual.campanha_id)).has(atual.id) && soDadosDeCombate(corpo);
    if (!proprio && !naLuta) return res.status(403).json({ erro: 'Você só pode editar o seu agente' });
    // O jogador não troca o tipo nem o dono
    const { tipo: _tipo, dono_id: _dono, ...resto } = corpo;
    corpo = resto;
  }

  const ficha = {
    ...atual,
    ...corpo,
    dados: { ...atual.dados, ...(corpo.dados ?? {}) },
  };
  if (!TIPOS.includes(ficha.tipo)) return res.status(400).json({ erro: `Tipo inválido. Use: ${TIPOS.join(', ')}` });

  await db.run(
    `UPDATE fichas
     SET tipo = ?, nome = ?, imagem = ?, dados = ?, dono_id = ?, atualizado_em = CURRENT_TIMESTAMP
     WHERE id = ?`,
    ficha.tipo, ficha.nome, ficha.imagem, JSON.stringify(ficha.dados), ficha.dono_id ?? null, atual.id,
  );

  res.json(await buscarFicha(atual.id));
});

// Excluir ficha (só o mestre)
router.delete('/fichas/:id', async (req, res) => {
  if (!ehMestre(req)) return res.status(403).json({ erro: 'Só o mestre apaga fichas' });
  const resultado = await db.run('DELETE FROM fichas WHERE id = ?', Number(req.params.id));
  if (resultado.changes === 0) return res.status(404).json({ erro: 'Ficha não encontrada' });
  res.status(204).end();
});

export default router;
