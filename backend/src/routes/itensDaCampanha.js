import { Router } from 'express';
import { db } from '../db.js';
 
/**
 * Cria as rotas de um tipo de item que pertence a uma campanha.
 * tabela:      nome da tabela no banco
 * campos:      campos aceitos e seus valores padrão
 * obrigatorio: campo que não pode ficar vazio (opcional)
 * ordem:       ordenação da listagem
 * preparar:    ajuste dos dados antes de criar (opcional, pode ser async)
 */
export function criarRotasDeItens({ tabela, campos, obrigatorio, ordem = 'id', preparar }) {
  const router = Router();
  const nomesCampos = Object.keys(campos);
 
  const buscarItem = (id) => db.get(`SELECT * FROM ${tabela} WHERE id = ?`, Number(id));
  const campanhaExiste = (id) => db.get('SELECT id FROM campanhas WHERE id = ?', Number(id));
 
  // Listar itens de uma campanha
  router.get(`/campanhas/:campanhaId/${tabela}`, async (req, res) => {
    const campanhaId = Number(req.params.campanhaId);
    if (!(await campanhaExiste(campanhaId))) return res.status(404).json({ erro: 'Campanha não encontrada' });
 
    res.json(await db.all(`SELECT * FROM ${tabela} WHERE campanha_id = ? ORDER BY ${ordem}`, campanhaId));
  });
 
  // Criar item numa campanha
  router.post(`/campanhas/:campanhaId/${tabela}`, async (req, res) => {
    const campanhaId = Number(req.params.campanhaId);
    if (!(await campanhaExiste(campanhaId))) return res.status(404).json({ erro: 'Campanha não encontrada' });
 
    let dados = req.body ?? {};
    if (obrigatorio && !dados[obrigatorio]) {
      return res.status(400).json({ erro: `O campo "${obrigatorio}" é obrigatório` });
    }
    if (preparar) dados = await preparar(dados, campanhaId);
 
    const valores = nomesCampos.map((campo) => dados[campo] ?? campos[campo]);
    const marcadores = nomesCampos.map(() => '?').join(', ');
 
    const resultado = await db.run(
      `INSERT INTO ${tabela} (campanha_id, ${nomesCampos.join(', ')}) VALUES (?, ${marcadores})`,
      campanhaId, ...valores,
    );
 
    res.status(201).json(await buscarItem(resultado.lastInsertRowid));
  });
 
  // Editar item
  router.put(`/${tabela}/:id`, async (req, res) => {
    const atual = await buscarItem(req.params.id);
    if (!atual) return res.status(404).json({ erro: 'Item não encontrado' });
 
    const item = { ...atual, ...(req.body ?? {}) };
    const atribuicoes = nomesCampos.map((campo) => `${campo} = ?`).join(', ');
 
    await db.run(
      `UPDATE ${tabela} SET ${atribuicoes} WHERE id = ?`,
      ...nomesCampos.map((campo) => item[campo] ?? campos[campo]), atual.id,
    );
 
    res.json(await buscarItem(atual.id));
  });
 
  // Excluir item
  router.delete(`/${tabela}/:id`, async (req, res) => {
    const resultado = await db.run(`DELETE FROM ${tabela} WHERE id = ?`, Number(req.params.id));
    if (resultado.changes === 0) return res.status(404).json({ erro: 'Item não encontrado' });
    res.status(204).end();
  });
 
  return router;
}
 