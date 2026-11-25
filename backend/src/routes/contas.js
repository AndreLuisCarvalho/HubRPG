import { Router } from 'express';
import { db } from '../db.js';
import { ehDono, exigirDono, LIMITE, vagasUsadas } from '../auth.js';

/*
 * Tela de Contas (só o dono do site): quem tem conta, em quais campanhas está, bloquear e
 * desbloquear (bloqueada não entra e libera a vaga) e tirar alguém de uma campanha.
 */
const router = Router();
router.use('/contas', exigirDono);

router.get('/contas', async (req, res) => {
  const contas = await db.all(`
    SELECT id, nome, email, foto, teste, bloqueado, criado_em, ultimo_acesso
    FROM usuarios
    ORDER BY teste, bloqueado, nome
  `);
  const participacoes = await db.all(`
    SELECT m.usuario_id, m.papel, c.id, c.nome
    FROM membros m JOIN campanhas c ON c.id = m.campanha_id
    ORDER BY m.papel = 'jogador', c.nome
  `);
  res.json({
    limite: LIMITE,
    usadas: await vagasUsadas(),
    contas: contas.map((u) => ({
      ...u,
      dono: ehDono(u),
      campanhas: participacoes
        .filter((p) => p.usuario_id === u.id)
        .map(({ id, nome, papel }) => ({ id, nome, papel })),
    })),
  });
});

async function buscarConta(req, res) {
  const conta = await db.get('SELECT id, nome, email, teste, bloqueado FROM usuarios WHERE id = ?', Number(req.params.id));
  if (!conta) res.status(404).json({ erro: 'Conta não encontrada' });
  return conta;
}

// Bloquear: sai de todas as campanhas e os agentes dela são apagados
router.post('/contas/:id/bloquear', async (req, res) => {
  const conta = await buscarConta(req, res);
  if (!conta) return;
  if (conta.id === req.usuario.id || ehDono(conta)) return res.status(400).json({ erro: 'Você não pode bloquear a própria conta' });
  const mestreDe = await db.all(`
    SELECT c.nome FROM membros m JOIN campanhas c ON c.id = m.campanha_id
    WHERE m.usuario_id = ? AND m.papel = 'mestre'
  `, conta.id);
  if (mestreDe.length) {
    return res.status(400).json({
      erro: `${conta.nome} é mestre de ${mestreDe.map((c) => c.nome).join(', ')}. Apague essas campanhas antes de bloquear.`,
    });
  }
  await db.lote([
    ['DELETE FROM fichas WHERE dono_id = ?', conta.id],
    ['DELETE FROM membros WHERE usuario_id = ?', conta.id],
    ['UPDATE usuarios SET bloqueado = 1 WHERE id = ?', conta.id],
  ]);
  res.status(204).end();
});

router.post('/contas/:id/desbloquear', async (req, res) => {
  const conta = await buscarConta(req, res);
  if (!conta) return;
  if (!conta.bloqueado) return res.status(204).end();
  if (!conta.teste && await vagasUsadas() >= LIMITE) {
    return res.status(400).json({ erro: `As ${LIMITE} vagas estão ocupadas. Bloqueie outra conta antes.` });
  }
  await db.run('UPDATE usuarios SET bloqueado = 0 WHERE id = ?', conta.id);
  res.status(204).end();
});

// Tirar de uma campanha (só jogador; o agente fica na campanha, com o mestre)
router.delete('/contas/:id/campanhas/:campanhaId', async (req, res) => {
  const conta = await buscarConta(req, res);
  if (!conta) return;
  const campanhaId = Number(req.params.campanhaId);
  const membro = await db.get('SELECT papel FROM membros WHERE campanha_id = ? AND usuario_id = ?', campanhaId, conta.id);
  if (!membro) return res.status(404).json({ erro: 'Não participa desta campanha' });
  if (membro.papel === 'mestre') return res.status(400).json({ erro: 'O mestre não sai da própria campanha' });
  await db.run('DELETE FROM membros WHERE campanha_id = ? AND usuario_id = ?', campanhaId, conta.id);
  res.status(204).end();
});

export default router;
