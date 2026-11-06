import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

const buscarCampanha = (id) =>
  db.prepare('SELECT * FROM campanhas WHERE id = ?').get(Number(id));

// Listar todas, com um resumo de sessões e personagens
router.get('/', (req, res) => {
  const campanhas = db.prepare(`
    SELECT c.*,
      (SELECT MAX(numero) FROM sessoes WHERE campanha_id = c.id) AS ultima_sessao,
      (SELECT COUNT(*) FROM fichas WHERE campanha_id = c.id AND tipo = 'jogador') AS total_personagens
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

// sistema    = nome exibido na tela ("Ordem Paranormal")
// sistema_id = identificador usado pelo código ("ordem-paranormal")
router.post('/', (req, res) => {
  const {
    nome, sistema = '', sistema_id = '', descricao = '', imagem = '', mapa = '',
    cor = '#8b5cf6', tema = 'padrao',
  } = req.body ?? {};
  if (!nome) return res.status(400).json({ erro: 'O nome é obrigatório' });

  const resultado = db
    .prepare(`INSERT INTO campanhas (nome, sistema, sistema_id, descricao, imagem, mapa, cor, tema)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(nome, sistema, sistema_id, descricao, imagem, mapa, cor, tema);

  res.status(201).json(buscarCampanha(resultado.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const atual = buscarCampanha(req.params.id);
  if (!atual) return res.status(404).json({ erro: 'Campanha não encontrada' });

  const c = { ...atual, ...(req.body ?? {}) };
  db.prepare(`
    UPDATE campanhas
    SET nome = ?, sistema = ?, sistema_id = ?, descricao = ?, imagem = ?, mapa = ?, cor = ?, status = ?, tema = ?
    WHERE id = ?
  `).run(c.nome, c.sistema, c.sistema_id, c.descricao, c.imagem, c.mapa, c.cor, c.status, c.tema, atual.id);

  res.json(buscarCampanha(atual.id));
});

router.delete('/:id', (req, res) => {
  const resultado = db.prepare('DELETE FROM campanhas WHERE id = ?').run(Number(req.params.id));
  if (resultado.changes === 0) return res.status(404).json({ erro: 'Campanha não encontrada' });
  res.status(204).end();
});

export default router;