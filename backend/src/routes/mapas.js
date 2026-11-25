import { Router } from 'express';
import { db } from '../db.js';
import { ehMestre, soMestre } from '../permissoes.js';

/*
 * Mapas da campanha (aba Mapas). "dados" é o JSON leve (pinos, tokens, rotas, opções); "imagem" é a
 * imagem do mapa e "nevoa" a máscara da névoa, ambas em data URL. A lista não traz as duas:
 * elas só vêm ao abrir o mapa.
 * Jogador: só os mapas revelados, sem pinos, cômodos e post-its ocultos; não edita nada.
 */
const router = Router();

const buscar = (id) => db.get('SELECT * FROM mapas WHERE id = ?', Number(id));
const campanhaExiste = (id) => db.get('SELECT id FROM campanhas WHERE id = ?', Number(id));

// Como o jogador vê o mapa (null = oculto): tira de cada lista (pinos, regiões, notas…) o que é oculto
function paraJogador(mapa) {
  let d;
  try {
    d = JSON.parse(mapa.dados || '{}');
  } catch {
    return null;
  }
  if (d.oculto) return null;
  const limpo = Object.fromEntries(Object.entries(d).map(([chave, valor]) => [
    chave,
    Array.isArray(valor) ? valor.filter((v) => !(v && typeof v === 'object' && (v.oculto || v.oculta))) : valor,
  ]));
  return { ...mapa, dados: JSON.stringify(limpo) };
}

router.get('/campanhas/:campanhaId/mapas', async (req, res) => {
  const campanhaId = Number(req.params.campanhaId);
  if (!(await campanhaExiste(campanhaId))) return res.status(404).json({ erro: 'Campanha não encontrada' });
  const lista = await db.all('SELECT id, campanha_id, nome, dados, criado_em FROM mapas WHERE campanha_id = ? ORDER BY id', campanhaId);
  res.json(ehMestre(req) ? lista : lista.map(paraJogador).filter(Boolean));
});

router.post('/campanhas/:campanhaId/mapas', soMestre, async (req, res) => {
  const campanhaId = Number(req.params.campanhaId);
  if (!(await campanhaExiste(campanhaId))) return res.status(404).json({ erro: 'Campanha não encontrada' });
  const { nome, dados = '{}', imagem = '' } = req.body ?? {};
  if (!nome) return res.status(400).json({ erro: 'O campo "nome" é obrigatório' });

  const { lastInsertRowid } = await db.run(
    'INSERT INTO mapas (campanha_id, nome, dados, imagem) VALUES (?, ?, ?, ?)',
    campanhaId, nome, dados, imagem,
  );
  res.status(201).json(await buscar(lastInsertRowid));
});

router.get('/mapas/:id', async (req, res) => {
  const encontrado = await buscar(req.params.id);
  const mapa = encontrado && (ehMestre(req) ? encontrado : paraJogador(encontrado));
  if (!mapa) return res.status(404).json({ erro: 'Mapa não encontrado' });
  res.json(mapa);
});

// Só o que vier no corpo muda: mexer num pino manda só "dados", sem reenviar a imagem
router.put('/mapas/:id', soMestre, async (req, res) => {
  const atual = await buscar(req.params.id);
  if (!atual) return res.status(404).json({ erro: 'Mapa não encontrado' });
  const {
    nome = atual.nome, dados = atual.dados, imagem = atual.imagem, nevoa = atual.nevoa,
  } = req.body ?? {};

  await db.run('UPDATE mapas SET nome = ?, dados = ?, imagem = ?, nevoa = ? WHERE id = ?', nome, dados, imagem, nevoa, atual.id);
  // Devolve sem imagem e névoa (quem mandou já tem; evita trafegar MBs a cada pino)
  const { imagem: _imagem, nevoa: _nevoa, ...resto } = await buscar(atual.id);
  res.json(resto);
});

router.delete('/mapas/:id', soMestre, async (req, res) => {
  const { changes } = await db.run('DELETE FROM mapas WHERE id = ?', Number(req.params.id));
  if (changes === 0) return res.status(404).json({ erro: 'Mapa não encontrado' });
  res.status(204).end();
});

export default router;
