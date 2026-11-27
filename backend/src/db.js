import { createClient } from '@libsql/client';
import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
 
// Onde fica o banco:
// - Na Vercel: no Turso (variáveis TURSO_DATABASE_URL e TURSO_AUTH_TOKEN)
// - No seu PC: no arquivo backend/data/hubrpg.sqlite (o mesmo de antes, fora do Git)
function enderecoDoBanco() {
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  const pastaDados = path.join(import.meta.dirname, '..', 'data');
  mkdirSync(pastaDados, { recursive: true });
  return `file:${path.join(pastaDados, 'hubrpg.sqlite')}`;
}
 
const cliente = createClient({
  url: enderecoDoBanco(),
  authToken: process.env.TURSO_AUTH_TOKEN,
});
 
// O Turso devolve linhas "especiais"; aqui viram objetos comuns { coluna: valor }
const paraObjetos = (resultado) =>
  resultado.rows.map((linha) => Object.fromEntries(resultado.columns.map((coluna, i) => [coluna, linha[i]])));
 
// Atalhos no mesmo formato de antes (get, all, run), só que agora com await
export const db = {
  async get(sql, ...args) {
    return paraObjetos(await cliente.execute({ sql, args }))[0];
  },
  async all(sql, ...args) {
    return paraObjetos(await cliente.execute({ sql, args }));
  },
  async run(sql, ...args) {
    const resultado = await cliente.execute({ sql, args });
    return { changes: resultado.rowsAffected, lastInsertRowid: Number(resultado.lastInsertRowid) };
  },
  // Vários comandos de uma vez, numa transação (se um falhar, nenhum vale)
  async lote(comandos) {
    return cliente.batch(comandos.map(([sql, ...args]) => ({ sql, args })), 'write');
  },
};
 
/* ---------- Código da campanha ("K7Q-2MX") ---------- */
// Sem letras que se confundem (0/O, 1/I/L)
const LETRAS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function gerarCodigo() {
  const s = [...randomBytes(6)].map((b) => LETRAS[b % LETRAS.length]).join('');
  return `${s.slice(0, 3)}-${s.slice(3)}`;
}

/** Um código que nenhuma campanha usa */
export async function codigoLivre() {
  for (;;) {
    const codigo = gerarCodigo();
    if (!(await db.get('SELECT id FROM campanhas WHERE codigo = ?', codigo))) return codigo;
  }
}

// Migrações: adicionam colunas novas em bancos que já existiam
async function adicionarColuna(tabela, coluna, definicao) {
  const existentes = (await db.all(`PRAGMA table_info(${tabela})`)).map((c) => c.name);
  if (!existentes.includes(coluna)) {
    await db.run(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${definicao}`);
  }
}
 
async function iniciar() {
  await cliente.executeMultiple(`
    CREATE TABLE IF NOT EXISTS campanhas (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      nome      TEXT NOT NULL,
      sistema   TEXT DEFAULT '',
      descricao TEXT DEFAULT '',
      imagem    TEXT DEFAULT '',
      cor       TEXT DEFAULT '#8b5cf6',
      status    TEXT DEFAULT 'ativa',
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );
 
    CREATE TABLE IF NOT EXISTS sessoes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      campanha_id INTEGER NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
      numero      INTEGER,
      titulo      TEXT DEFAULT '',
      data        TEXT DEFAULT '',
      resumo      TEXT DEFAULT ''
    );
 
    CREATE TABLE IF NOT EXISTS personagens (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      campanha_id INTEGER NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
      nome        TEXT NOT NULL,
      tipo        TEXT DEFAULT 'npc',
      descricao   TEXT DEFAULT '',
      imagem      TEXT DEFAULT ''
    );
 
    CREATE TABLE IF NOT EXISTS notas (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      campanha_id INTEGER NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
      titulo      TEXT DEFAULT '',
      conteudo    TEXT DEFAULT '',
      criado_em   TEXT DEFAULT CURRENT_TIMESTAMP
    );
 
    CREATE TABLE IF NOT EXISTS fichas (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      campanha_id   INTEGER NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
      tipo          TEXT NOT NULL DEFAULT 'jogador',
      nome          TEXT NOT NULL,
      imagem        TEXT DEFAULT '',
      dados         TEXT NOT NULL DEFAULT '{}',
      criado_em     TEXT DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Catálogo de itens da campanha (aba Itens); "dados" é o item inteiro em JSON
    CREATE TABLE IF NOT EXISTS itens (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      campanha_id INTEGER NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
      nome        TEXT NOT NULL,
      dados       TEXT NOT NULL DEFAULT '{}',
      criado_em   TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Arquivos da campanha (aba Arquivos): "dados" é o resumo em JSON, "conteudo" o texto/imagem/PDF
    CREATE TABLE IF NOT EXISTS arquivos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      campanha_id INTEGER NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
      titulo      TEXT NOT NULL,
      dados       TEXT NOT NULL DEFAULT '{}',
      conteudo    TEXT NOT NULL DEFAULT '',
      criado_em   TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Mapas da campanha (aba Mapas): "dados" tem os pinos e opções em JSON, "imagem" a imagem
    CREATE TABLE IF NOT EXISTS mapas (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      campanha_id INTEGER NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
      nome        TEXT NOT NULL,
      dados       TEXT NOT NULL DEFAULT '{}',
      imagem      TEXT NOT NULL DEFAULT '',
      criado_em   TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Combates (aba Combate): "dados" tem participantes, iniciativa, rodada e de quem é a vez em JSON
    CREATE TABLE IF NOT EXISTS combates (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      campanha_id INTEGER NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
      nome        TEXT NOT NULL,
      sessao_id   INTEGER,
      dados       TEXT NOT NULL DEFAULT '{}',
      criado_em   TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Contas (login com o Google; "teste" = conta de teste criada no PC)
    CREATE TABLE IF NOT EXISTS usuarios (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      google_sub TEXT NOT NULL UNIQUE,
      email      TEXT DEFAULT '',
      nome       TEXT DEFAULT '',
      foto       TEXT DEFAULT '',
      teste      INTEGER NOT NULL DEFAULT 0,
      criado_em  TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Parentes de um agente (ficha de jogador): ficha simples; "dados" em JSON
    -- (foto, relacao, situacao, idade, mora, aparencia, historia, notaMestre)
    CREATE TABLE IF NOT EXISTS parentes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      campanha_id INTEGER NOT NULL,
      ficha_id    INTEGER NOT NULL,
      nome        TEXT NOT NULL,
      dados       TEXT NOT NULL DEFAULT '{}',
      criado_em   TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Quem participa de cada campanha: papel 'mestre' ou 'jogador'
    CREATE TABLE IF NOT EXISTS membros (
      campanha_id INTEGER NOT NULL,
      usuario_id  INTEGER NOT NULL,
      papel       TEXT NOT NULL DEFAULT 'jogador',
      criado_em   TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (campanha_id, usuario_id)
    );
  `);
 
  await adicionarColuna('campanhas', 'mapa', "TEXT DEFAULT ''");
  await adicionarColuna('campanhas', 'tema', "TEXT DEFAULT 'padrao'");
  await adicionarColuna('campanhas', 'sistema_id', "TEXT DEFAULT ''");
  // Anotações da sessão que não aparecem na Visão geral (vista pelos jogadores)
  await adicionarColuna('sessoes', 'notas_mestre', "TEXT DEFAULT ''");
  // Névoa do mapa: máscara em PNG (data URL), separada para os pinos continuarem leves
  await adicionarColuna('mapas', 'nevoa', "TEXT DEFAULT ''");
  // Código para entrar na campanha como jogador ("K7Q-2MX")
  await adicionarColuna('campanhas', 'codigo', 'TEXT');
  await db.run('CREATE UNIQUE INDEX IF NOT EXISTS campanhas_codigo ON campanhas (codigo)');
  // Conta do jogador que usa o agente (null = do mestre)
  await adicionarColuna('fichas', 'dono_id', 'INTEGER');
  // Tela de Contas: conta bloqueada pelo dono do site (não entra e não ocupa vaga) e último acesso
  await adicionarColuna('usuarios', 'bloqueado', 'INTEGER NOT NULL DEFAULT 0');
  await adicionarColuna('usuarios', 'ultimo_acesso', 'TEXT');
  // Mapa (ou cômodo) onde o mestre está: a tela dos jogadores vai junto
  await adicionarColuna('campanhas', 'foco_mapa', 'INTEGER');
  // Enquadramento do banner e do fundo do menu: JSON { banner: { x, y, z }, fundo: { x, y, z } }
  await adicionarColuna('campanhas', 'enquadre', "TEXT DEFAULT ''");
  // Imagem/GIF de fundo de um combate: fora de "dados", que vai e volta a cada ação da luta
  await db.run(`CREATE TABLE IF NOT EXISTS fundos_combate (
    combate_id INTEGER PRIMARY KEY,
    imagem     TEXT NOT NULL DEFAULT ''
  )`);
  // Roteiro do mestre: as missões (gancho, cenas, pistas, NPCs, confronto, clímax) em "dados" (JSON)
  await db.run(`CREATE TABLE IF NOT EXISTS missoes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    campanha_id INTEGER NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
    nome        TEXT DEFAULT '',
    dados       TEXT DEFAULT '{}',
    criado_em   TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  // Roteiro da campanha (o quadro geral do mestre): um por campanha
  await db.run(`CREATE TABLE IF NOT EXISTS roteiros_campanha (
    campanha_id INTEGER PRIMARY KEY,
    dados       TEXT NOT NULL DEFAULT '{}'
  )`);
  // Imagens próprias para os dados de uma ficha (fundo das faces): fora de "dados", que é lido o tempo todo
  await db.run(`CREATE TABLE IF NOT EXISTS imagens_dado (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    ficha_id  INTEGER NOT NULL,
    imagem    TEXT NOT NULL,
    criado_em TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Dados iniciais, só se o banco estiver vazio
  const { total } = await db.get('SELECT COUNT(*) AS total FROM campanhas');
  if (total === 0) {
    const inserir = 'INSERT INTO campanhas (nome, sistema, sistema_id, descricao, cor) VALUES (?, ?, ?, ?, ?)';
    await db.lote([
      [inserir, 'A Cidade Sem Sol', 'Ordem Paranormal', 'ordem-paranormal', 'Investigação em uma cidade onde o sol nunca nasce.', '#a347ff'],
      [inserir, 'Ruínas de Valkaria', 'Tormenta20', 'tormenta20', 'Exploração das ruínas da antiga capital.', '#c68f3f'],
    ]);
  }

  // Campanhas antigas ganham um código
  for (const { id } of await db.all('SELECT id FROM campanhas WHERE codigo IS NULL')) {
    await db.run('UPDATE campanhas SET codigo = ? WHERE id = ?', await codigoLivre(), id);
  }
}
 
// Promessa que termina quando o banco está pronto (o server.js espera por ela)
export const bancoPronto = iniciar();
 