import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

// O banco fica em backend/data/hubrpg.sqlite (fora do Git, pelo .gitignore)
const pastaDados = path.join(import.meta.dirname, '..', 'data');
mkdirSync(pastaDados, { recursive: true });

export const db = new DatabaseSync(path.join(pastaDados, 'hubrpg.sqlite'));

db.exec(`
  PRAGMA foreign_keys = ON;

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

// Dados iniciais, só se o banco estiver vazio
const { total } = db.prepare('SELECT COUNT(*) AS total FROM campanhas').get();
if (total === 0) {
  const inserir = db.prepare(
    'INSERT INTO campanhas (nome, sistema, descricao, cor) VALUES (?, ?, ?, ?)'
  );
  inserir.run('A Cidade Sem Sol', 'Ordem Paranormal', 'Investigação em uma cidade onde o sol nunca nasce.', '#a347ff');
  inserir.run('Ruínas de Valkaria', 'Tormenta20', 'Exploração das ruínas da antiga capital.', '#c68f3f');
}

// Migrações: adicionam colunas novas em bancos que já existiam
function adicionarColuna(tabela, coluna, definicao) {
  const existentes = db.prepare(`PRAGMA table_info(${tabela})`).all().map((c) => c.name);
  if (!existentes.includes(coluna)) {
    db.exec(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${definicao}`);
  }
}

adicionarColuna('campanhas', 'mapa', "TEXT DEFAULT ''");
adicionarColuna('campanhas', 'tema', "TEXT DEFAULT 'padrao'");
adicionarColuna('campanhas', 'sistema_id', "TEXT DEFAULT ''");