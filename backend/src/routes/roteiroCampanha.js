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

/*
 * Quadro de investigação (todos da campanha): só as pistas que o mestre marcou como encontradas no
 * modo mesa, com o texto e a cena onde foram achadas — nada de perícia, DT, revelação ou notas.
 * [{ missaoId, nome, pistas: [{ id, texto, cena }] }], só as missões com alguma pista encontrada.
 */
router.get('/campanhas/:id/investigacao', async (req, res) => {
  const linhas = await db.all('SELECT id, nome, dados FROM missoes WHERE campanha_id = ? ORDER BY id', Number(req.params.id));
  const quadro = linhas.flatMap((m) => {
    let d = {};
    try { d = JSON.parse(m.dados || '{}'); } catch { d = {}; }
    const encontradas = new Set(d.mesa?.encontradas ?? []);
    const cenas = Object.fromEntries((d.cenas ?? []).map((c) => [c.id, c.nome]));
    const pistas = (d.pistas ?? [])
      .filter((p) => encontradas.has(p.id) && String(p.texto ?? '').trim())
      .map((p) => ({ id: p.id, texto: p.texto, cena: cenas[p.cenaId] || '' }));
    return pistas.length ? [{ missaoId: m.id, nome: m.nome, pistas }] : [];
  });
  res.json(quadro);
});

export default router;
