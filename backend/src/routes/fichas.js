import { Router } from 'express';
import { db } from '../db.js';

const router = Router();
const TIPOS = ['jogador', 'npc', 'monstro'];

// O banco guarda "dados" como texto JSON; a API entrega como objeto
function formatar(ficha) {
  return ficha && { ...ficha, dados: JSON.parse(ficha.dados || '{}') };
}

const buscarFicha = (id) =>
  formatar(db.prepare('SELECT * FROM fichas WHERE id = ?').get(Number(id)));

const campanhaExiste = (id) =>
  db.prepare('SELECT id FROM campanhas WHERE id = ?').get(Number(id));

// Listar fichas da campanha (opcional: ?tipo=npc)
router.get('/campanhas/:campanhaId/fichas', (req, res) => {
  const campanhaId = Number(req.params.campanhaId);
  if (!campanhaExiste(campanhaId)) return res.status(404).json({ erro: 'Campanha não encontrada' });

  const { tipo } = req.query;
  if (tipo && !TIPOS.includes(tipo)) {
    return res.status(400).json({ erro: `Tipo inválido. Use: ${TIPOS.join(', ')}` });
  }

  const fichas = tipo
    ? db.prepare('SELECT * FROM fichas WHERE campanha_id = ? AND tipo = ? ORDER BY nome').all(campanhaId, tipo)
    : db.prepare('SELECT * FROM fichas WHERE campanha_id = ? ORDER BY tipo, nome').all(campanhaId);

  res.json(fichas.map(formatar));
});

// Buscar uma ficha
router.get('/fichas/:id', (req, res) => {
  const ficha = buscarFicha(req.params.id);
  if (!ficha) return res.status(404).json({ erro: 'Ficha não encontrada' });
  res.json(ficha);
});

// Criar ficha
router.post('/campanhas/:campanhaId/fichas', (req, res) => {
  const campanhaId = Number(req.params.campanhaId);
  if (!campanhaExiste(campanhaId)) return res.status(404).json({ erro: 'Campanha não encontrada' });

  const { nome, tipo = 'jogador', imagem = '', dados = {} } = req.body ?? {};
  if (!nome) return res.status(400).json({ erro: 'O nome é obrigatório' });
  if (!TIPOS.includes(tipo)) return res.status(400).json({ erro: `Tipo inválido. Use: ${TIPOS.join(', ')}` });

  const resultado = db
    .prepare('INSERT INTO fichas (campanha_id, tipo, nome, imagem, dados) VALUES (?, ?, ?, ?, ?)')
    .run(campanhaId, tipo, nome, imagem, JSON.stringify(dados));

  res.status(201).json(buscarFicha(resultado.lastInsertRowid));
});

// Editar ficha: "dados" é mesclado, então dá para mandar só o que mudou
// (ex.: { "dados": { "atuais": { "pv": 12, "pe": 9, "san": 20 } } })
router.put('/fichas/:id', (req, res) => {
  const atual = buscarFicha(req.params.id);
  if (!atual) return res.status(404).json({ erro: 'Ficha não encontrada' });

  const corpo = req.body ?? {};
  const ficha = {
    ...atual,
    ...corpo,
    dados: { ...atual.dados, ...(corpo.dados ?? {}) },
  };
  if (!TIPOS.includes(ficha.tipo)) return res.status(400).json({ erro: `Tipo inválido. Use: ${TIPOS.join(', ')}` });

  db.prepare(`
    UPDATE fichas
    SET tipo = ?, nome = ?, imagem = ?, dados = ?, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(ficha.tipo, ficha.nome, ficha.imagem, JSON.stringify(ficha.dados), atual.id);

  res.json(buscarFicha(atual.id));
});

// Excluir ficha
router.delete('/fichas/:id', (req, res) => {
  const resultado = db.prepare('DELETE FROM fichas WHERE id = ?').run(Number(req.params.id));
  if (resultado.changes === 0) return res.status(404).json({ erro: 'Ficha não encontrada' });
  res.status(204).end();
});

export default router;