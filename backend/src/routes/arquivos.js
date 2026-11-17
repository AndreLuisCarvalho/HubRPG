import { Router } from 'express';
import { db } from '../db.js';

/*
 * Arquivos da campanha (aba Arquivos): documentos que os jogadores acham.
 * "dados" é o resumo em JSON (tipo, caso, senha, se está liberado…); "conteudo" é o pesado
 * (texto, imagem ou PDF em data URL). A lista não traz o conteúdo: ele só vem ao abrir o arquivo.
 */
const router = Router();

const buscar = (id) => db.get('SELECT * FROM arquivos WHERE id = ?', Number(id));
const campanhaExiste = (id) => db.get('SELECT id FROM campanhas WHERE id = ?', Number(id));

router.get('/campanhas/:campanhaId/arquivos', async (req, res) => {
  const campanhaId = Number(req.params.campanhaId);
  if (!(await campanhaExiste(campanhaId))) return res.status(404).json({ erro: 'Campanha não encontrada' });
  res.json(await db.all(
    'SELECT id, campanha_id, titulo, dados, criado_em, LENGTH(conteudo) AS tamanho FROM arquivos WHERE campanha_id = ? ORDER BY id',
    campanhaId,
  ));
});

router.post('/campanhas/:campanhaId/arquivos', async (req, res) => {
  const campanhaId = Number(req.params.campanhaId);
  if (!(await campanhaExiste(campanhaId))) return res.status(404).json({ erro: 'Campanha não encontrada' });
  const { titulo, dados = '{}', conteudo = '' } = req.body ?? {};
  if (!titulo) return res.status(400).json({ erro: 'O campo "titulo" é obrigatório' });

  const { lastInsertRowid } = await db.run(
    'INSERT INTO arquivos (campanha_id, titulo, dados, conteudo) VALUES (?, ?, ?, ?)',
    campanhaId, titulo, dados, conteudo,
  );
  res.status(201).json(await buscar(lastInsertRowid));
});

router.get('/arquivos/:id', async (req, res) => {
  const arquivo = await buscar(req.params.id);
  if (!arquivo) return res.status(404).json({ erro: 'Arquivo não encontrado' });
  res.json(arquivo);
});

// Só o que vier no corpo muda (liberar/destrancar mandam só "dados", sem reenviar o PDF)
router.put('/arquivos/:id', async (req, res) => {
  const atual = await buscar(req.params.id);
  if (!atual) return res.status(404).json({ erro: 'Arquivo não encontrado' });
  const { titulo = atual.titulo, dados = atual.dados, conteudo = atual.conteudo } = req.body ?? {};

  await db.run('UPDATE arquivos SET titulo = ?, dados = ?, conteudo = ? WHERE id = ?', titulo, dados, conteudo, atual.id);
  res.json(await buscar(atual.id));
});

router.delete('/arquivos/:id', async (req, res) => {
  const { changes } = await db.run('DELETE FROM arquivos WHERE id = ?', Number(req.params.id));
  if (changes === 0) return res.status(404).json({ erro: 'Arquivo não encontrado' });
  res.status(204).end();
});

export default router;
