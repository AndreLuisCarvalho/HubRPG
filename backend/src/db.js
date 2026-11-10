import { createClient } from '@libsql/client';
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
  `);
 
  await adicionarColuna('campanhas', 'mapa', "TEXT DEFAULT ''");
  await adicionarColuna('campanhas', 'tema', "TEXT DEFAULT 'padrao'");
  await adicionarColuna('campanhas', 'sistema_id', "TEXT DEFAULT ''");
 
  // Dados iniciais, só se o banco estiver vazio
  const { total } = await db.get('SELECT COUNT(*) AS total FROM campanhas');
  if (total === 0) {
    const inserir = 'INSERT INTO campanhas (nome, sistema, sistema_id, descricao, cor) VALUES (?, ?, ?, ?, ?)';
    await db.lote([
      [inserir, 'A Cidade Sem Sol', 'Ordem Paranormal', 'ordem-paranormal', 'Investigação em uma cidade onde o sol nunca nasce.', '#a347ff'],
      [inserir, 'Ruínas de Valkaria', 'Tormenta20', 'tormenta20', 'Exploração das ruínas da antiga capital.', '#c68f3f'],
    ]);
  }
}
 
// Promessa que termina quando o banco está pronto (o server.js espera por ela)
export const bancoPronto = iniciar();
 