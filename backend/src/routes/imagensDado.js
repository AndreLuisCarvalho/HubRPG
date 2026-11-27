import { Router } from 'express';
import { db } from '../db.js';
import { ehMestre } from '../permissoes.js';

/*
 * Imagens próprias dos dados de uma ficha (viram o fundo das faces). Ficam à parte da ficha: o kit
 * só guarda { imagem: id } na peça, e cada tela busca a imagem pelo id (uma vez, depois fica em cache).
 * Quem participa da campanha vê (os dados aparecem para todos na mesa); envia e apaga o dono da
 * ficha ou o mestre. Até 3 por ficha: uma por kit (o site deixa cada kit usar uma só).
 */
const router = Router();
const LIMITE = 3;   // uma imagem por kit (cada ficha tem 3 kits)
const TAMANHO_MAXIMO = 700_000;   // caracteres do data URL (o site já manda reduzida, ~50 KB)

async function fichaDoPedido(req, res) {
  const ficha = await db.get('SELECT id, dono_id FROM fichas WHERE id = ?', Number(req.params.id));
  if (!ficha) {
    res.status(404).json({ erro: 'Ficha não encontrada' });
    return null;
  }
  return ficha;
}

const podeMexer = (req, ficha) => ehMestre(req) || ficha.dono_id === req.usuario.id;

// As imagens da ficha (só os ids; a imagem vem em outra chamada)
router.get('/fichas/:id/imagens-dado', async (req, res) => {
  const ficha = await fichaDoPedido(req, res);
  if (!ficha) return;
  const linhas = await db.all('SELECT id FROM imagens_dado WHERE ficha_id = ? ORDER BY id', ficha.id);
  res.json(linhas.map((l) => l.id));
});

router.get('/fichas/:id/imagens-dado/:imagem', async (req, res) => {
  const linha = await db.get(
    'SELECT imagem FROM imagens_dado WHERE id = ? AND ficha_id = ?', Number(req.params.imagem), Number(req.params.id),
  );
  if (!linha) return res.status(404).json({ erro: 'Imagem não encontrada' });
  res.set('Cache-Control', 'private, max-age=86400');   // nunca muda (uma imagem nova ganha outro id)
  res.json({ imagem: linha.imagem });
});

router.post('/fichas/:id/imagens-dado', async (req, res) => {
  const ficha = await fichaDoPedido(req, res);
  if (!ficha) return;
  if (!podeMexer(req, ficha)) return res.status(403).json({ erro: 'Só o dono da ficha ou o mestre envia imagens' });
  const imagem = String(req.body?.imagem ?? '');
  if (!imagem.startsWith('data:image/')) return res.status(400).json({ erro: 'Envie uma imagem' });
  if (imagem.length > TAMANHO_MAXIMO) return res.status(400).json({ erro: 'Imagem grande demais' });
  const { total } = await db.get('SELECT COUNT(*) AS total FROM imagens_dado WHERE ficha_id = ?', ficha.id);
  if (total >= LIMITE) return res.status(400).json({ erro: `Cada ficha guarda até ${LIMITE} imagens (uma por kit). Apague uma antes.` });
  const resultado = await db.run('INSERT INTO imagens_dado (ficha_id, imagem) VALUES (?, ?)', ficha.id, imagem);
  res.status(201).json({ id: Number(resultado.lastInsertRowid) });
});

router.delete('/fichas/:id/imagens-dado/:imagem', async (req, res) => {
  const ficha = await fichaDoPedido(req, res);
  if (!ficha) return;
  if (!podeMexer(req, ficha)) return res.status(403).json({ erro: 'Só o dono da ficha ou o mestre apaga imagens' });
  await db.run('DELETE FROM imagens_dado WHERE id = ? AND ficha_id = ?', Number(req.params.imagem), ficha.id);
  res.status(204).end();
});

// Apagar a ficha leva as imagens junto (segue para a rota de apagar a ficha)
router.delete('/fichas/:id', async (req, res, next) => {
  if (ehMestre(req)) await db.run('DELETE FROM imagens_dado WHERE ficha_id = ?', Number(req.params.id));
  next();
});

export default router;
