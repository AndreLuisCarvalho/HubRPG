import { Router } from 'express';
import { db } from '../db.js';

/**
 * Cria as rotas de um tipo de item que pertence a uma campanha.
 * tabela:      nome da tabela no banco
 * campos:      campos aceitos e seus valores padrão
 * obrigatorio: campo que não pode ficar vazio (opcional)
 * ordem:       ordenação da listagem
 * preparar:    ajuste dos dados antes de criar (opcional)
 */
export function criarRotasDeItens({ tabela, campos, obrigatorio, ordem = 'id', preparar }) {
  const router = Router();
  const nomesCampos = Object.keys(campos);

  const buscarItem = (id) =>
    db.prepare(`SELECT * FROM ${tabela} WHERE id = ?`).get(Number(id));
  const campanhaExiste = (id) =>
    db.prepare('SELECT id FROM campanhas WHERE id = ?').get(Number(id));

  // Listar itens de uma campanha
  router.get(`/campanhas/:campanhaId/${tabela}`, (req, res) => {
    const campanhaId = Number(req.params.campanhaId);
    if (!campanhaExiste(campanhaId)) return res.status(404).json({ erro: 'Campanha não encontrada' });

    const itens = db
      .prepare(`SELECT * FROM ${tabela} WHERE campanha_id = ? ORDER BY ${ordem}`)
      .all(campanhaId);
    res.json(itens);
  });

  // Criar item numa campanha
  router.post(`/campanhas/:campanhaId/${tabela}`, (req, res) => {
    const campanhaId = Number(req.params.campanhaId);
    if (!campanhaExiste(campanhaId)) return res.status(404).json({ erro: 'Campanha não encontrada' });

    let dados = req.body ?? {};
    if (obrigatorio && !dados[obrigatorio]) {
      return res.status(400).json({ erro: `O campo "${obrigatorio}" é obrigatório` });
    }
    if (preparar) dados = preparar(dados, campanhaId);

    const valores = nomesCampos.map((campo) => dados[campo] ?? campos[campo]);
    const marcadores = nomesCampos.map(() => '?').join(', ');

    const resultado = db
      .prepare(`INSERT INTO ${tabela} (campanha_id, ${nomesCampos.join(', ')}) VALUES (?, ${marcadores})`)
      .run(campanhaId, ...valores);

    res.status(201).json(buscarItem(resultado.lastInsertRowid));
  });

  // Editar item
  router.put(`/${tabela}/:id`, (req, res) => {
    const atual = buscarItem(req.params.id);
    if (!atual) return res.status(404).json({ erro: 'Item não encontrado' });

    const item = { ...atual, ...(req.body ?? {}) };
    const atribuicoes = nomesCampos.map((campo) => `${campo} = ?`).join(', ');

    db.prepare(`UPDATE ${tabela} SET ${atribuicoes} WHERE id = ?`)
      .run(...nomesCampos.map((campo) => item[campo] ?? campos[campo]), atual.id);

    res.json(buscarItem(atual.id));
  });

  // Excluir item
  router.delete(`/${tabela}/:id`, (req, res) => {
    const resultado = db.prepare(`DELETE FROM ${tabela} WHERE id = ?`).run(Number(req.params.id));
    if (resultado.changes === 0) return res.status(404).json({ erro: 'Item não encontrado' });
    res.status(204).end();
  });

  return router;
}