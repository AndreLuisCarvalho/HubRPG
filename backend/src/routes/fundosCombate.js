import { Router } from 'express';
import { db } from '../db.js';

/*
 * Imagem ou GIF de fundo de um combate (data URL), guardada à parte: o combate só leva
 * { tipo: 'imagem', versao, enquadre } em "dados", e cada tela busca a imagem quando a versão muda.
 * Os cenários desenhados no site não passam por aqui.
 */
const router = Router();

router.get('/combates/:id/fundo', async (req, res) => {
  const linha = await db.get('SELECT imagem FROM fundos_combate WHERE combate_id = ?', Number(req.params.id));
  res.json({ imagem: linha?.imagem ?? '' });
});

router.put('/combates/:id/fundo', async (req, res) => {
  if (req.papel !== 'mestre') return res.status(403).json({ erro: 'Só o mestre escolhe o fundo' });
  const id = Number(req.params.id);
  const imagem = String(req.body?.imagem ?? '');
  if (imagem && !imagem.startsWith('data:image/')) return res.status(400).json({ erro: 'Envie uma imagem' });
  if (!imagem) {
    await db.run('DELETE FROM fundos_combate WHERE combate_id = ?', id);
  } else {
    await db.run(
      'INSERT INTO fundos_combate (combate_id, imagem) VALUES (?, ?) ON CONFLICT(combate_id) DO UPDATE SET imagem = excluded.imagem',
      id, imagem,
    );
  }
  res.status(204).end();
});

// Apagar o combate leva o fundo junto (segue para a rota de apagar do combate)
router.delete('/combates/:id', async (req, res, next) => {
  if (req.papel === 'mestre') await db.run('DELETE FROM fundos_combate WHERE combate_id = ?', Number(req.params.id));
  next();
});

export default router;
