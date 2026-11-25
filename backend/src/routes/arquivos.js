import { Router } from 'express';
import { db } from '../db.js';
import { ehMestre, soMestre } from '../permissoes.js';

/*
 * Arquivos da campanha (aba Arquivos): documentos que os jogadores acham.
 * "dados" é o resumo em JSON (tipo, caso, senha, se está liberado…); "conteudo" é o pesado
 * (texto, imagem ou PDF em data URL). A lista não traz o conteúdo: ele só vem ao abrir o arquivo.
 * Jogador: só vê os liberados, nunca a senha nem a nota do mestre; o trancado vem sem conteúdo
 * até ele acertar a senha (conferida aqui no servidor, em /destrancar).
 */
const router = Router();

const buscar = (id) => db.get('SELECT * FROM arquivos WHERE id = ?', Number(id));
const campanhaExiste = (id) => db.get('SELECT id FROM campanhas WHERE id = ?', Number(id));

const lerDados = (a) => {
  try {
    return JSON.parse(a.dados || '{}');
  } catch {
    return {};
  }
};
const trancado = (d) => Boolean(d.senha) && !d.destrancado;

// Como o jogador vê o arquivo (null = não vê)
function paraJogador(arquivo) {
  const d = lerDados(arquivo);
  if (!d.liberado) return null;
  const { senha, notaMestre: _nota, ...resto } = d;
  const fechado = Boolean(senha) && !d.destrancado;
  const visto = { ...arquivo, dados: JSON.stringify({ ...resto, senha: fechado ? '•' : '' }) };
  if (fechado && 'conteudo' in visto) visto.conteudo = '';
  return visto;
}

// "Hospital  São Lucas" = "hospital sao lucas"
const normalizar = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

router.get('/campanhas/:campanhaId/arquivos', async (req, res) => {
  const campanhaId = Number(req.params.campanhaId);
  if (!(await campanhaExiste(campanhaId))) return res.status(404).json({ erro: 'Campanha não encontrada' });
  const lista = await db.all(
    'SELECT id, campanha_id, titulo, dados, criado_em, LENGTH(conteudo) AS tamanho FROM arquivos WHERE campanha_id = ? ORDER BY id',
    campanhaId,
  );
  res.json(ehMestre(req) ? lista : lista.map(paraJogador).filter(Boolean));
});

router.post('/campanhas/:campanhaId/arquivos', soMestre, async (req, res) => {
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
  const visto = arquivo && (ehMestre(req) ? arquivo : paraJogador(arquivo));
  if (!visto) return res.status(404).json({ erro: 'Arquivo não encontrado' });
  res.json(visto);
});

// Jogador tenta a senha no terminal: se acertar, o arquivo fica destrancado para todos
router.post('/arquivos/:id/destrancar', async (req, res) => {
  const arquivo = await buscar(req.params.id);
  const d = arquivo && lerDados(arquivo);
  if (!arquivo || (!ehMestre(req) && !d.liberado)) return res.status(404).json({ erro: 'Arquivo não encontrado' });
  if (trancado(d)) {
    if (normalizar(req.body?.senha) !== normalizar(d.senha)) return res.json({ certo: false });
    await db.run('UPDATE arquivos SET dados = ? WHERE id = ?', JSON.stringify({ ...d, destrancado: true }), arquivo.id);
  }
  const atual = await buscar(arquivo.id);
  res.json({ certo: true, arquivo: ehMestre(req) ? atual : paraJogador(atual) });
});

// Só o que vier no corpo muda (liberar/destrancar mandam só "dados", sem reenviar o PDF)
router.put('/arquivos/:id', soMestre, async (req, res) => {
  const atual = await buscar(req.params.id);
  if (!atual) return res.status(404).json({ erro: 'Arquivo não encontrado' });
  const { titulo = atual.titulo, dados = atual.dados, conteudo = atual.conteudo } = req.body ?? {};

  await db.run('UPDATE arquivos SET titulo = ?, dados = ?, conteudo = ? WHERE id = ?', titulo, dados, conteudo, atual.id);
  res.json(await buscar(atual.id));
});

router.delete('/arquivos/:id', soMestre, async (req, res) => {
  const { changes } = await db.run('DELETE FROM arquivos WHERE id = ?', Number(req.params.id));
  if (changes === 0) return res.status(404).json({ erro: 'Arquivo não encontrado' });
  res.status(204).end();
});

export default router;
