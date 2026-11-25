import { createHmac, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { db } from './db.js';

/*
 * Contas e acesso.
 * - Login com o Google: o site recebe um "ID token" do botão do Google e manda para cá; conferimos
 *   no próprio Google (tokeninfo) se é válido e se foi emitido para o nosso GOOGLE_CLIENT_ID.
 * - Depois disso o servidor devolve o NOSSO token (assinado com SESSAO_SEGREDO), que o site manda
 *   em cada pedido no cabeçalho "Authorization: Bearer …" (funciona mesmo com site e API em
 *   endereços diferentes na Vercel, sem depender de cookie).
 * - Login de teste (só no PC, nunca na Vercel): entra com um nome, para testar mestre e jogador.
 */

const NA_NUVEM = Boolean(process.env.VERCEL);
const DURACAO = 30 * 24 * 60 * 60 * 1000;   // 30 dias
// Quantas contas Google o site aceita no total (contas de teste do PC não contam)
const LIMITE_CONTAS = Number(process.env.LIMITE_CONTAS) || 10;

function segredo() {
  if (process.env.SESSAO_SEGREDO) return process.env.SESSAO_SEGREDO;
  if (NA_NUVEM) throw new Error('SESSAO_SEGREDO não configurado na Vercel');
  return 'hubrpg-segredo-so-para-o-pc';
}

const base64url = (texto) => Buffer.from(texto).toString('base64url');
const assinar = (corpo) => createHmac('sha256', segredo()).update(corpo).digest('base64url');

export function criarToken(usuarioId) {
  const corpo = base64url(JSON.stringify({ u: usuarioId, exp: Date.now() + DURACAO }));
  return `${corpo}.${assinar(corpo)}`;
}

function lerToken(token) {
  const [corpo, assinatura] = String(token ?? '').split('.');
  if (!corpo || !assinatura) return null;
  const esperada = Buffer.from(assinar(corpo));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return null;
  try {
    const dados = JSON.parse(Buffer.from(corpo, 'base64url').toString());
    return dados.exp > Date.now() ? dados : null;
  } catch {
    return null;
  }
}

/**
 * O dono do site: a conta Google com o e-mail DONO_EMAIL (só ela abre a tela de Contas).
 * No PC, a conta de teste chamada "Dono" também vale, para testar a tela sem o Google.
 */
export function ehDono(usuario) {
  if (!usuario) return false;
  if (usuario.teste) return !NA_NUVEM && usuario.nome === 'Dono';
  const dono = process.env.DONO_EMAIL?.trim().toLowerCase();
  return Boolean(dono) && usuario.email?.toLowerCase() === dono;
}

const CAMPOS_DA_CONTA = 'id, email, nome, foto, teste, bloqueado';
// O que o site recebe da conta (sem "bloqueado"; com "dono" para mostrar o botão Contas)
const paraOSite = ({ bloqueado: _b, ...u }) => ({ ...u, dono: ehDono(u) });

/** Middleware: lê o token (se houver) e põe req.usuario. Conta bloqueada fica sem login. */
export async function identificar(req, res, next) {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  const dados = token ? lerToken(token) : null;
  const conta = dados && await db.get(`SELECT ${CAMPOS_DA_CONTA} FROM usuarios WHERE id = ?`, dados.u);
  if (conta && !conta.bloqueado) req.usuario = paraOSite(conta);
  next();
}

/** Middleware: só o dono do site */
export function exigirDono(req, res, next) {
  if (!req.usuario?.dono) return res.status(403).json({ erro: 'Só o dono do site abre as contas' });
  next();
}

export const marcarAcesso = (id) => db.run('UPDATE usuarios SET ultimo_acesso = CURRENT_TIMESTAMP WHERE id = ?', id);

/** Middleware: sem login, 401 */
export function exigirLogin(req, res, next) {
  if (!req.usuario) return res.status(401).json({ erro: 'Entre com a sua conta', login: true });
  next();
}

/* ---------- Código da campanha ---------- */
// "k7q2mx", "K7Q 2MX" → "K7Q-2MX"
export function normalizarCodigo(texto) {
  const s = String(texto ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length === 6 ? `${s.slice(0, 3)}-${s.slice(3)}` : null;
}

/* ---------- Usuários ---------- */
/**
 * Cria (ou atualiza) a conta. A PRIMEIRA conta Google criada vira mestre de todas as campanhas
 * que ainda não têm mestre (as que já existiam antes do login). Contas de teste nunca pegam essas.
 */
export async function entrarComo({ googleSub, email, nome, foto, teste = false }) {
  const existente = await db.get('SELECT id, bloqueado FROM usuarios WHERE google_sub = ?', googleSub);
  if (existente) {
    if (existente.bloqueado) {
      const erro = new Error('Esta conta foi bloqueada. Fale com o dono do site.');
      erro.status = 403;
      throw erro;
    }
    await db.run('UPDATE usuarios SET email = ?, nome = ?, foto = ? WHERE id = ?', email, nome, foto, existente.id);
    return existente.id;
  }
  // "total" conta todas as contas Google já criadas (decide quem é a primeira); as vagas, só as não bloqueadas
  const { total } = await db.get('SELECT COUNT(*) AS total FROM usuarios WHERE teste = 0');
  // O site é só para o grupo: depois de LIMITE_CONTAS contas Google, ninguém novo entra
  if (!teste && await vagasUsadas() >= LIMITE_CONTAS) {
    const erro = new Error('O HubRPG está com todas as vagas ocupadas. Fale com o dono do site.');
    erro.status = 403;
    throw erro;
  }
  const { lastInsertRowid: id } = await db.run(
    'INSERT INTO usuarios (google_sub, email, nome, foto, teste) VALUES (?, ?, ?, ?, ?)',
    googleSub, email, nome, foto, teste ? 1 : 0,
  );
  if (!teste && total === 0) {
    await db.run(
      `INSERT INTO membros (campanha_id, usuario_id, papel)
       SELECT id, ?, 'mestre' FROM campanhas
       WHERE id NOT IN (SELECT campanha_id FROM membros WHERE papel = 'mestre')`,
      id,
    );
  }
  return id;
}

export const LIMITE = LIMITE_CONTAS;
export async function vagasUsadas() {
  const { usadas } = await db.get('SELECT COUNT(*) AS usadas FROM usuarios WHERE teste = 0 AND bloqueado = 0');
  return usadas;
}

async function resposta(id) {
  await marcarAcesso(id);
  const usuario = paraOSite(await db.get(`SELECT ${CAMPOS_DA_CONTA} FROM usuarios WHERE id = ?`, id));
  return { token: criarToken(id), usuario };
}

export const rotasDeLogin = Router();

// O que o site precisa saber para mostrar a tela de login
rotasDeLogin.get('/auth/config', (req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID ?? null, loginDeTeste: !NA_NUVEM });
});

rotasDeLogin.post('/auth/google', async (req, res) => {
  const clienteId = process.env.GOOGLE_CLIENT_ID;
  if (!clienteId) return res.status(500).json({ erro: 'GOOGLE_CLIENT_ID não configurado' });
  const credencial = req.body?.credencial;
  if (!credencial) return res.status(400).json({ erro: 'Faltou a credencial do Google' });

  const conferido = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credencial)}`);
  const info = conferido.ok ? await conferido.json() : null;
  const valido = info
    && info.aud === clienteId
    && ['accounts.google.com', 'https://accounts.google.com'].includes(info.iss)
    && Number(info.exp) * 1000 > Date.now()
    && (info.email_verified === true || info.email_verified === 'true');
  if (!valido) return res.status(401).json({ erro: 'Não foi possível confirmar o login com o Google' });

  try {
    const id = await entrarComo({ googleSub: info.sub, email: info.email, nome: info.name ?? info.email, foto: info.picture ?? '' });
    res.json(await resposta(id));
  } catch (erro) {
    if (erro.status) return res.status(erro.status).json({ erro: erro.message });
    throw erro;
  }
});

// Login de teste: só no PC
rotasDeLogin.post('/auth/teste', async (req, res) => {
  if (NA_NUVEM) return res.status(404).end();
  const nome = String(req.body?.nome ?? '').trim().slice(0, 40);
  if (!nome) return res.status(400).json({ erro: 'Digite um nome' });
  try {
    const id = await entrarComo({ googleSub: `teste:${nome.toLowerCase()}`, email: '', nome, foto: '', teste: true });
    res.json(await resposta(id));
  } catch (erro) {
    if (erro.status) return res.status(erro.status).json({ erro: erro.message });
    throw erro;
  }
});

// O site chama ao abrir: conta também como acesso
rotasDeLogin.get('/auth/eu', exigirLogin, async (req, res) => {
  await marcarAcesso(req.usuario.id);
  res.json({ usuario: req.usuario });
});

/* ---------- Acesso às campanhas ---------- */
// Tabelas cujos itens são acessados direto por id (/fichas/12): de qual campanha é o item
const TABELAS = ['fichas', 'sessoes', 'personagens', 'notas', 'itens', 'combates', 'arquivos', 'mapas'];

/** Papel do usuário na campanha: 'mestre', 'jogador' ou null */
export async function papelNa(campanhaId, usuarioId) {
  const m = await db.get('SELECT papel FROM membros WHERE campanha_id = ? AND usuario_id = ?', Number(campanhaId), usuarioId);
  return m?.papel ?? null;
}

/**
 * Middleware: descobre de qual campanha é o pedido (/campanhas/:id/… ou /<tabela>/:id) e só deixa
 * passar quem participa dela. Põe req.campanhaId e req.papel.
 */
export async function exigirCampanha(req, res, next) {
  const partes = req.path.split('/').filter(Boolean);
  let campanhaId = null;
  if (partes[0] === 'campanhas' && /^\d+$/.test(partes[1] ?? '')) {
    campanhaId = Number(partes[1]);
  } else if (TABELAS.includes(partes[0]) && /^\d+$/.test(partes[1] ?? '')) {
    const item = await db.get(`SELECT campanha_id FROM ${partes[0]} WHERE id = ?`, Number(partes[1]));
    if (!item) return res.status(404).json({ erro: 'Não encontrado' });
    campanhaId = item.campanha_id;
  }
  if (campanhaId == null) return next();   // /campanhas (lista, criar, entrar) e /auth
  const papel = await papelNa(campanhaId, req.usuario.id);
  if (!papel) return res.status(403).json({ erro: 'Você não participa desta campanha' });
  req.campanhaId = campanhaId;
  req.papel = papel;
  next();
}

export function exigirMestre(req, res, next) {
  if (req.papel !== 'mestre') return res.status(403).json({ erro: 'Só o mestre da campanha pode fazer isso' });
  next();
}
