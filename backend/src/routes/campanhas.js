import { Router } from 'express';
import { codigoLivre, db } from '../db.js';
import { exigirMestre, normalizarCodigo } from '../auth.js';

const router = Router();

/*
 * Campanhas da conta logada. O acesso a /campanhas/:id/… já passou pelo exigirCampanha (server.js):
 * aqui req.papel é 'mestre' ou 'jogador'. O código de entrada só vai para o mestre.
 */
// Enquadramento: no banco em texto (JSON); na API como objeto { banner?: { x, y, z }, fundo?: { x, y, z } }
function lerEnquadre(texto) {
  try {
    const e = JSON.parse(texto || '{}');
    return e && typeof e === 'object' ? e : {};
  } catch {
    return {};
  }
}

// Só guarda x, y (0–100, em %) e z (zoom, 1–4) do banner e do fundo
function limparEnquadre(e) {
  const limitar = (v, min, max, padrao) => (Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Number(v))) : padrao);
  const um = (q) => q && typeof q === 'object' && {
    x: limitar(q.x, 0, 100, 50), y: limitar(q.y, 0, 100, 50), z: limitar(q.z, 1, 4, 1),
  };
  const limpo = {};
  for (const chave of ['banner', 'fundo']) if (um(e?.[chave])) limpo[chave] = um(e[chave]);
  return JSON.stringify(limpo);
}

async function buscarCampanha(id, papel) {
  const campanha = await db.get('SELECT * FROM campanhas WHERE id = ?', Number(id));
  if (!campanha) return null;
  // O fundo do menu (mapa) pode ser um GIF de MBs: fica só na lista do menu e em /fundo
  const { codigo, mapa, ...resto } = campanha;
  return {
    ...resto,
    enquadre: lerEnquadre(campanha.enquadre),
    tem_fundo: Boolean(mapa),
    papel,
    ...(papel === 'mestre' && { codigo }),
  };
}

// Listar as campanhas em que a conta participa, com o papel e um resumo
router.get('/', async (req, res) => {
  const campanhas = await db.all(`
    SELECT c.*, m.papel,
      (SELECT MAX(numero) FROM sessoes WHERE campanha_id = c.id) AS ultima_sessao,
      (SELECT COUNT(*) FROM fichas WHERE campanha_id = c.id AND tipo = 'jogador') AS total_personagens
    FROM campanhas c
    JOIN membros m ON m.campanha_id = c.id AND m.usuario_id = ?
    ORDER BY c.id
  `, req.usuario.id);
  res.json(campanhas.map(({ codigo, ...c }) => ({
    ...c,
    enquadre: lerEnquadre(c.enquadre),
    ...(c.papel === 'mestre' && { codigo }),
  })));
});

// Entrar numa campanha como jogador, pelo código
router.post('/entrar', async (req, res) => {
  const codigo = normalizarCodigo(req.body?.codigo);
  if (!codigo) return res.status(400).json({ erro: 'O código tem 6 letras/números, como K7Q-2MX' });
  const campanha = await db.get('SELECT id FROM campanhas WHERE codigo = ?', codigo);
  if (!campanha) return res.status(404).json({ erro: 'Nenhuma campanha com esse código' });
  await db.run(
    "INSERT OR IGNORE INTO membros (campanha_id, usuario_id, papel) VALUES (?, ?, 'jogador')",
    campanha.id, req.usuario.id,
  );
  const membro = await db.get('SELECT papel FROM membros WHERE campanha_id = ? AND usuario_id = ?', campanha.id, req.usuario.id);
  res.json(await buscarCampanha(campanha.id, membro.papel));
});

router.get('/:id', async (req, res) => {
  const campanha = await buscarCampanha(req.params.id, req.papel);
  if (!campanha) return res.status(404).json({ erro: 'Campanha não encontrada' });
  res.json(campanha);
});

// Fundo da campanha no menu (imagem ou GIF em data URL; '' = sem fundo)
router.get('/:id/fundo', async (req, res) => {
  const linha = await db.get('SELECT mapa FROM campanhas WHERE id = ?', Number(req.params.id));
  if (!linha) return res.status(404).json({ erro: 'Campanha não encontrada' });
  res.json({ fundo: linha.mapa ?? '' });
});

// Criar: quem cria vira o mestre, e a campanha já nasce com o código
// sistema    = nome exibido na tela ("Ordem Paranormal")
// sistema_id = identificador usado pelo código ("ordem-paranormal")
router.post('/', async (req, res) => {
  const {
    nome, sistema = '', sistema_id = '', descricao = '', imagem = '', mapa = '',
    cor = '#8b5cf6', tema = 'padrao', enquadre = {},
  } = req.body ?? {};
  if (!nome?.trim()) return res.status(400).json({ erro: 'O nome é obrigatório' });

  const resultado = await db.run(
    `INSERT INTO campanhas (nome, sistema, sistema_id, descricao, imagem, mapa, cor, tema, enquadre, codigo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    nome.trim(), sistema, sistema_id, descricao, imagem, mapa, cor, tema, limparEnquadre(enquadre), await codigoLivre(),
  );
  const id = resultado.lastInsertRowid;
  await db.run("INSERT INTO membros (campanha_id, usuario_id, papel) VALUES (?, ?, 'mestre')", id, req.usuario.id);
  res.status(201).json(await buscarCampanha(id, 'mestre'));
});

router.put('/:id', exigirMestre, async (req, res) => {
  const atual = await db.get('SELECT * FROM campanhas WHERE id = ?', Number(req.params.id));
  if (!atual) return res.status(404).json({ erro: 'Campanha não encontrada' });

  const c = { ...atual, ...(req.body ?? {}) };
  const enquadre = req.body?.enquadre !== undefined ? limparEnquadre(req.body.enquadre) : atual.enquadre;
  await db.run(
    `UPDATE campanhas
     SET nome = ?, sistema = ?, sistema_id = ?, descricao = ?, imagem = ?, mapa = ?, cor = ?, status = ?, tema = ?, enquadre = ?
     WHERE id = ?`,
    c.nome, c.sistema, c.sistema_id, c.descricao, c.imagem, c.mapa, c.cor, c.status, c.tema, enquadre, atual.id,
  );

  res.json(await buscarCampanha(atual.id, 'mestre'));
});

// Gerar outro código (o antigo para de funcionar; quem já entrou continua)
router.post('/:id/codigo', exigirMestre, async (req, res) => {
  await db.run('UPDATE campanhas SET codigo = ? WHERE id = ?', await codigoLivre(), Number(req.params.id));
  res.json(await buscarCampanha(req.params.id, 'mestre'));
});

// Quem participa da campanha
router.get('/:id/membros', async (req, res) => {
  res.json(await db.all(`
    SELECT u.id, u.nome, u.foto, m.papel, m.criado_em
    FROM membros m JOIN usuarios u ON u.id = m.usuario_id
    WHERE m.campanha_id = ?
    ORDER BY m.papel = 'jogador', u.nome
  `, Number(req.params.id)));
});

// Tirar um jogador (o mestre tira qualquer jogador; o jogador pode sair sozinho)
router.delete('/:id/membros/:usuarioId', async (req, res) => {
  const usuarioId = Number(req.params.usuarioId);
  const proprio = usuarioId === req.usuario.id;
  if (!proprio && req.papel !== 'mestre') return res.status(403).json({ erro: 'Só o mestre pode tirar jogadores' });
  const alvo = await db.get('SELECT papel FROM membros WHERE campanha_id = ? AND usuario_id = ?', Number(req.params.id), usuarioId);
  if (!alvo) return res.status(404).json({ erro: 'Não participa da campanha' });
  if (alvo.papel === 'mestre') return res.status(400).json({ erro: 'O mestre não pode sair da própria campanha' });
  await db.run('DELETE FROM membros WHERE campanha_id = ? AND usuario_id = ?', Number(req.params.id), usuarioId);
  res.status(204).end();
});

// Apaga a campanha e tudo dela numa transação.
// (Não dá para confiar no "ON DELETE CASCADE": no Turso as chaves estrangeiras vêm desligadas)
router.delete('/:id', exigirMestre, async (req, res) => {
  const id = Number(req.params.id);
  await db.lote([
    ...['sessoes', 'personagens', 'notas', 'fichas', 'itens', 'arquivos', 'mapas', 'combates', 'parentes', 'membros']
      .map((tabela) => [`DELETE FROM ${tabela} WHERE campanha_id = ?`, id]),
    ['DELETE FROM campanhas WHERE id = ?', id],
  ]);
  res.status(204).end();
});

export default router;
