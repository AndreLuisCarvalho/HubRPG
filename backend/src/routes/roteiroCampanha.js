import { Router } from 'express';
import { db } from '../db.js';
import { ehMestre } from '../permissoes.js';

/*
 * Roteiro da campanha (o quadro geral que o mestre monta: premissa, verdade oculta, ameaça, relógio
 * do vilão, facções, arco das missões e desfechos). Um por campanha, em "dados" (JSON). Só o mestre.
 */
const router = Router();

router.get('/campanhas/:id/roteiro', async (req, res) => {
  if (!ehMestre(req)) return res.status(403).json({ erro: 'Só o mestre vê o roteiro' });
  const linha = await db.get('SELECT dados FROM roteiros_campanha WHERE campanha_id = ?', Number(req.params.id));
  let dados = {};
  try { dados = JSON.parse(linha?.dados || '{}'); } catch { dados = {}; }
  res.json({ dados });
});

router.put('/campanhas/:id/roteiro', async (req, res) => {
  if (!ehMestre(req)) return res.status(403).json({ erro: 'Só o mestre mexe no roteiro' });
  const dados = req.body?.dados;
  if (!dados || typeof dados !== 'object') return res.status(400).json({ erro: 'Envie os dados do roteiro' });
  await db.run(
    `INSERT INTO roteiros_campanha (campanha_id, dados) VALUES (?, ?)
     ON CONFLICT(campanha_id) DO UPDATE SET dados = excluded.dados`,
    Number(req.params.id), JSON.stringify(dados),
  );
  res.status(204).end();
});

export default router;
