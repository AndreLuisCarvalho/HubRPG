import { Router } from 'express';
import { db } from '../db.js';
 
const router = Router();
 
const buscarCampanha = (id) => db.get('SELECT * FROM campanhas WHERE id = ?', Number(id));
 
// Listar todas, com um resumo de sessões e personagens
router.get('/', async (req, res) => {
  const campanhas = await db.all(`
    SELECT c.*,
      (SELECT MAX(numero) FROM sessoes WHERE campanha_id = c.id) AS ultima_sessao,
      (SELECT COUNT(*) FROM fichas WHERE campanha_id = c.id AND tipo = 'jogador') AS total_personagens
    FROM campanhas c
    ORDER BY c.id
  `);
  res.json(campanhas);
});
 
router.get('/:id', async (req, res) => {
  const campanha = await buscarCampanha(req.params.id);
  if (!campanha) return res.status(404).json({ erro: 'Campanha não encontrada' });
  res.json(campanha);
});
 
// sistema    = nome exibido na tela ("Ordem Paranormal")
// sistema_id = identificador usado pelo código ("ordem-paranormal")
router.post('/', async (req, res) => {
  const {
    nome, sistema = '', sistema_id = '', descricao = '', imagem = '', mapa = '',
    cor = '#8b5cf6', tema = 'padrao',
  } = req.body ?? {};
  if (!nome) return res.status(400).json({ erro: 'O nome é obrigatório' });
 
  const resultado = await db.run(
    `INSERT INTO campanhas (nome, sistema, sistema_id, descricao, imagem, mapa, cor, tema)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    nome, sistema, sistema_id, descricao, imagem, mapa, cor, tema,
  );
 
  res.status(201).json(await buscarCampanha(resultado.lastInsertRowid));
});
 
router.put('/:id', async (req, res) => {
  const atual = await buscarCampanha(req.params.id);
  if (!atual) return res.status(404).json({ erro: 'Campanha não encontrada' });
 
  const c = { ...atual, ...(req.body ?? {}) };
  await db.run(
    `UPDATE campanhas
     SET nome = ?, sistema = ?, sistema_id = ?, descricao = ?, imagem = ?, mapa = ?, cor = ?, status = ?, tema = ?
     WHERE id = ?`,
    c.nome, c.sistema, c.sistema_id, c.descricao, c.imagem, c.mapa, c.cor, c.status, c.tema, atual.id,
  );
 
  res.json(await buscarCampanha(atual.id));
});
 
// Apaga a campanha e tudo dela numa transação.
// (Não dá para confiar no "ON DELETE CASCADE": no Turso as chaves estrangeiras vêm desligadas)
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!(await buscarCampanha(id))) return res.status(404).json({ erro: 'Campanha não encontrada' });
 
  await db.lote([
    ...['sessoes', 'personagens', 'notas', 'fichas'].map((tabela) => [`DELETE FROM ${tabela} WHERE campanha_id = ?`, id]),
    ['DELETE FROM campanhas WHERE id = ?', id],
  ]);
  res.status(204).end();
});
 
export default router;
 