// Copia as campanhas e fichas do banco do seu PC para o site no ar, usando a API.
// Uso (dentro da pasta backend):
//   node scripts/copiarParaNuvem.js https://hubrpg-api.vercel.app SUA_CHAVE
//
// - Campanha com o MESMO NOME já existente no ar: atualiza (tema, mapa, cor, imagem…)
// - Campanha que não existe no ar: cria
// - Fichas, sessões, personagens e notas: cria as que ainda não existem lá (compara pelo nome/título)
//   → pode rodar de novo sem duplicar
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
 
const [endereco, chave] = process.argv.slice(2);
if (!endereco || !chave) {
  console.log('Uso: node scripts/copiarParaNuvem.js https://hubrpg-api.vercel.app SUA_CHAVE');
  process.exit(1);
}
 
const local = new DatabaseSync(path.join(import.meta.dirname, '..', 'data', 'hubrpg.sqlite'), { readOnly: true });
 
async function api(caminho, metodo = 'GET', corpo) {
  const resposta = await fetch(`${endereco.replace(/\/$/, '')}/api${caminho}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', 'x-chave-acesso': chave },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (!resposta.ok) throw new Error(`${metodo} ${caminho} → ${resposta.status} ${await resposta.text()}`);
  return resposta.status === 204 ? null : resposta.json();
}
 
const CAMPOS_CAMPANHA = ['nome', 'sistema', 'sistema_id', 'descricao', 'imagem', 'mapa', 'cor', 'status', 'tema'];
const ITENS = [
  { tabela: 'sessoes', chave: 'titulo', campos: ['numero', 'titulo', 'data', 'resumo'] },
  { tabela: 'personagens', chave: 'nome', campos: ['nome', 'tipo', 'descricao', 'imagem'] },
  { tabela: 'notas', chave: 'titulo', campos: ['titulo', 'conteudo'] },
];
const escolher = (obj, campos) => Object.fromEntries(campos.filter((c) => obj[c] !== undefined).map((c) => [c, obj[c]]));
 
const remotas = await api('/campanhas');
 
for (const campanha of local.prepare('SELECT * FROM campanhas ORDER BY id').all()) {
  const dados = escolher(campanha, CAMPOS_CAMPANHA);
  const existente = remotas.find((r) => r.nome === campanha.nome);
  const destino = existente
    ? await api(`/campanhas/${existente.id}`, 'PUT', dados)
    : await api('/campanhas', 'POST', dados);
  console.log(`${existente ? 'Atualizada' : 'Criada'}: ${campanha.nome}`);
 
  // Fichas (dados vão como objeto)
  const fichasNoAr = await api(`/campanhas/${destino.id}/fichas`);
  for (const ficha of local.prepare('SELECT * FROM fichas WHERE campanha_id = ?').all(campanha.id)) {
    if (fichasNoAr.some((f) => f.nome === ficha.nome && f.tipo === ficha.tipo)) {
      console.log(`  · ficha já existe: ${ficha.nome}`);
      continue;
    }
    await api(`/campanhas/${destino.id}/fichas`, 'POST', {
      nome: ficha.nome, tipo: ficha.tipo, imagem: ficha.imagem, dados: JSON.parse(ficha.dados || '{}'),
    });
    console.log(`  + ficha: ${ficha.nome}`);
  }
 
  // Sessões, personagens e notas
  for (const { tabela, chave: campoChave, campos } of ITENS) {
    const noAr = await api(`/campanhas/${destino.id}/${tabela}`);
    for (const item of local.prepare(`SELECT * FROM ${tabela} WHERE campanha_id = ?`).all(campanha.id)) {
      if (noAr.some((r) => r[campoChave] === item[campoChave])) continue;
      await api(`/campanhas/${destino.id}/${tabela}`, 'POST', escolher(item, campos));
      console.log(`  + ${tabela}: ${item[campoChave] || '(sem título)'}`);
    }
  }
}
 
console.log('\nPronto! Recarregue o site.');
 