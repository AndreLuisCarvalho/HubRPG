import { Router } from 'express';
import { db } from '../db.js';
 
const router = Router();
const TIPOS = ['jogador', 'npc', 'monstro'];
 
// O banco guarda "dados" como texto JSON; a API entrega como objeto
function formatar(ficha) {
  return ficha && { ...ficha, dados: JSON.parse(ficha.dados || '{}') };
}
 
const buscarFicha = async (id) => formatar(await db.get('SELECT * FROM fichas WHERE id = ?', Number(id)));
 
const campanhaExiste = (id) => db.get('SELECT id FROM campanhas WHERE id = ?', Number(id));
 
// Listar fichas da campanha (opcional: ?tipo=npc)
router.get('/campanhas/:campanhaId/fichas', async (req, res) => {
  const campanhaId = Number(req.params.campanhaId);
  if (!(await campanhaExiste(campanhaId))) return res.status(404).json({ erro: 'Campanha não encontrada' });
 
  const { tipo } = req.query;
  if (tipo && !TIPOS.includes(tipo)) {
    return res.status(400).json({ erro: `Tipo inválido. Use: ${TIPOS.join(', ')}` });
  }
 
  const fichas = tipo
    ? await db.all('SELECT * FROM fichas WHERE campanha_id = ? AND tipo = ? ORDER BY nome', campanhaId, tipo)
    : await db.all('SELECT * FROM fichas WHERE campanha_id = ? ORDER BY tipo, nome', campanhaId);
 
  res.json(fichas.map(formatar));
});
 
// Buscar uma ficha
router.get('/fichas/:id', async (req, res) => {
  const ficha = await buscarFicha(req.params.id);
  if (!ficha) return res.status(404).json({ erro: 'Ficha não encontrada' });
  res.json(ficha);
});
 
// Criar ficha
router.post('/campanhas/:campanhaId/fichas', async (req, res) => {
  const campanhaId = Number(req.params.campanhaId);
  if (!(await campanhaExiste(campanhaId))) return res.status(404).json({ erro: 'Campanha não encontrada' });
 
  const { nome, tipo = 'jogador', imagem = '', dados = {} } = req.body ?? {};
  if (!nome) return res.status(400).json({ erro: 'O nome é obrigatório' });
  if (!TIPOS.includes(tipo)) return res.status(400).json({ erro: `Tipo inválido. Use: ${TIPOS.join(', ')}` });
 
  const resultado = await db.run(
    'INSERT INTO fichas (campanha_id, tipo, nome, imagem, dados) VALUES (?, ?, ?, ?, ?)',
    campanhaId, tipo, nome, imagem, JSON.stringify(dados),
  );
 
  res.status(201).json(await buscarFicha(resultado.lastInsertRowid));
});
 
// Editar ficha: "dados" é mesclado, então dá para mandar só o que mudou
// (ex.: { "dados": { "atuais": { "pv": 12, "pe": 9, "san": 20 } } })
router.put('/fichas/:id', async (req, res) => {
  const atual = await buscarFicha(req.params.id);
  if (!atual) return res.status(404).json({ erro: 'Ficha não encontrada' });
 
  const corpo = req.body ?? {};
  const ficha = {
    ...atual,
    ...corpo,
    dados: { ...atual.dados, ...(corpo.dados ?? {}) },
  };
  if (!TIPOS.includes(ficha.tipo)) return res.status(400).json({ erro: `Tipo inválido. Use: ${TIPOS.join(', ')}` });
 
  await db.run(
    `UPDATE fichas
     SET tipo = ?, nome = ?, imagem = ?, dados = ?, atualizado_em = CURRENT_TIMESTAMP
     WHERE id = ?`,
    ficha.tipo, ficha.nome, ficha.imagem, JSON.stringify(ficha.dados), atual.id,
  );
 
  res.json(await buscarFicha(atual.id));
});
 
// Excluir ficha
router.delete('/fichas/:id', async (req, res) => {
  const resultado = await db.run('DELETE FROM fichas WHERE id = ?', Number(req.params.id));
  if (resultado.changes === 0) return res.status(404).json({ erro: 'Ficha não encontrada' });
  res.status(204).end();
});
 
export default router;
 