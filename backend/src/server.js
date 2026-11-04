import express from 'express';
import cors from 'cors';
import { db } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const buscarCampanha = (id) =>
  db.prepare('SELECT * FROM campanhas WHERE id = ?').get(Number(id));

// Listar todas
app.get('/api/campanhas', (req, res) => {
  res.json(db.prepare('SELECT * FROM campanhas ORDER BY id').all());
});

// Buscar uma
app.get('/api/campanhas/:id', (req, res) => {
  const campanha = buscarCampanha(req.params.id);
  if (!campanha) return res.status(404).json({ erro: 'Campanha não encontrada' });
  res.json(campanha);
});

// Criar
app.post('/api/campanhas', (req, res) => {
  const { nome, sistema = '', descricao = '', imagem = '', cor = '#8b5cf6' } = req.body ?? {};
  if (!nome) return res.status(400).json({ erro: 'O nome é obrigatório' });

  const resultado = db
    .prepare('INSERT INTO campanhas (nome, sistema, descricao, imagem, cor) VALUES (?, ?, ?, ?, ?)')
    .run(nome, sistema, descricao, imagem, cor);

  res.status(201).json(buscarCampanha(resultado.lastInsertRowid));
});

// Editar
app.put('/api/campanhas/:id', (req, res) => {
  const atual = buscarCampanha(req.params.id);
  if (!atual) return res.status(404).json({ erro: 'Campanha não encontrada' });

  const c = { ...atual, ...(req.body ?? {}) };
  db.prepare(
    'UPDATE campanhas SET nome = ?, sistema = ?, descricao = ?, imagem = ?, cor = ?, status = ? WHERE id = ?'
  ).run(c.nome, c.sistema, c.descricao, c.imagem, c.cor, c.status, atual.id);

  res.json(buscarCampanha(atual.id));
});

// Excluir (apaga junto sessões, personagens e notas dela)
app.delete('/api/campanhas/:id', (req, res) => {
  const resultado = db.prepare('DELETE FROM campanhas WHERE id = ?').run(Number(req.params.id));
  if (resultado.changes === 0) return res.status(404).json({ erro: 'Campanha não encontrada' });
  res.status(204).end();
});

app.listen(4000, () => console.log('API rodando em http://localhost:4000'));