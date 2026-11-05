import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

const buscarCampanha = (id) =>
  db.prepare('SELECT * FROM campanhas WHERE id = ?').get(Number(id));

// Listar todas, com um resumo de sessões e personagens
router.get('/', (req, res) => {
  const campanhas = db.prepare(`
    SELECT c.*,
      (SELECT MAX(numero) FROM sessoes    WHERE campanha_id = c.id) AS ultima_sessao,
      (SELECT COUNT(*)    FROM personagens WHERE campanha_id = c.id) AS total_personagens
    FROM campanhas c
    ORDER BY c.id
  `).all();
  res.json(campanhas);
});

router.get('/:id', (req, res) => {
  const campanha = buscarCampanha(req.params.id);
  if (!campanha) return res.status(404).json({ erro: 'Campanha não encontrada' });
  res.json(campanha);
});

router.post('/', (req, res) => {
  const { nome, sistema = '', descricao = '', imagem = '', mapa = '', cor = '#8b5cf6' } = req.body ?? {};
  if (!nome) return res.status(400).json({ erro: 'O nome é obrigatório' });

  const resultado = db
    .prepare('INSERT INTO campanhas (nome, sistema, descricao, imagem, mapa, cor) VALUES (?, ?, ?, ?, ?, ?)')
    .run(nome, sistema, descricao, imagem, mapa, cor);

  res.status(201).json(buscarCampanha(resultado.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const atual = buscarCampanha(req.params.id);
  if (!atual) return res.status(404).json({ erro: 'Campanha não encontrada' });

  const c = { ...atual, ...(req.body ?? {}) };
  db.prepare(
    'UPDATE campanhas SET nome = ?, sistema = ?, descricao = ?, imagem = ?, mapa = ?, cor = ?, status = ? WHERE id = ?'
  ).run(c.nome, c.sistema, c.descricao, c.imagem, c.mapa, c.cor, c.status, atual.id);

  res.json(buscarCampanha(atual.id));
});

router.delete('/:id', (req, res) => {
  const resultado = db.prepare('DELETE FROM campanhas WHERE id = ?').run(Number(req.params.id));
  if (resultado.changes === 0) return res.status(404).json({ erro: 'Campanha não encontrada' });
  res.status(204).end();
});

export default router;