// Endereço da API:
// - No PC fica vazio: o Vite redireciona /api para o back (vite.config.js)
// - Na Vercel vem da variável VITE_API_URL (ex.: https://hubrpg-api.vercel.app)
const BASE = import.meta.env.VITE_API_URL ?? '';
 
/* ---------- Chave de acesso (até existir login) ---------- */
const CHAVE_ACESSO = 'hubrpg:chave-acesso';
 
function lerChave() {
  try {
    return localStorage.getItem(CHAVE_ACESSO) ?? '';
  } catch {
    return '';
  }
}
 
function salvarChave(chave) {
  try {
    localStorage.setItem(CHAVE_ACESSO, chave);
  } catch {
    // sem armazenamento (aba anônima): vai pedir de novo na próxima vez
  }
}
 
// Várias requisições podem receber 401 ao mesmo tempo: todas esperam a MESMA pergunta
let pedindoChave = null;
function pedirChave() {
  pedindoChave ??= Promise.resolve().then(() => {
    const chave = window.prompt('Chave de acesso do HubRPG:')?.trim();
    if (chave) salvarChave(chave);
    pedindoChave = null;
    return Boolean(chave);
  });
  return pedindoChave;
}
 
/* ---------- Requisição ---------- */
async function requisicao(caminho, opcoes = {}, jaPediuChave = false) {
  const chaveUsada = lerChave();
  const resposta = await fetch(`${BASE}/api${caminho}`, {
    ...opcoes,
    headers: { 'Content-Type': 'application/json', 'x-chave-acesso': chaveUsada },
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
  });
 
  if (resposta.status === 401 && !jaPediuChave) {
    // Outra requisição já trocou a chave enquanto esta estava a caminho: só tenta de novo
    if (lerChave() !== chaveUsada) return requisicao(caminho, opcoes, true);
    // Sem chave (ou chave errada): pergunta e tenta de novo
    if (await pedirChave()) return requisicao(caminho, opcoes, true);
  }
 
  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro.erro ?? `Erro ${resposta.status}`);
  }
  return resposta.status === 204 ? null : resposta.json();
}
 
export const api = {
  // Campanhas
  listarCampanhas: () => requisicao('/campanhas'),
  buscarCampanha: (id) => requisicao(`/campanhas/${id}`),
  atualizarCampanha: (id, dados) => requisicao(`/campanhas/${id}`, { method: 'PUT', body: dados }),
 
  // Fichas
  listarFichas: (campanhaId, tipo) =>
    requisicao(`/campanhas/${campanhaId}/fichas${tipo ? `?tipo=${tipo}` : ''}`),
  buscarFicha: (id) => requisicao(`/fichas/${id}`),
  criarFicha: (campanhaId, ficha) =>
    requisicao(`/campanhas/${campanhaId}/fichas`, { method: 'POST', body: ficha }),
  atualizarFicha: (id, alteracoes) => requisicao(`/fichas/${id}`, { method: 'PUT', body: alteracoes }),
  excluirFicha: (id) => requisicao(`/fichas/${id}`, { method: 'DELETE' }),

  // Sessões (o número é automático: a próxima da campanha)
  listarSessoes: (campanhaId) => requisicao(`/campanhas/${campanhaId}/sessoes`),
  criarSessao: (campanhaId, sessao) =>
    requisicao(`/campanhas/${campanhaId}/sessoes`, { method: 'POST', body: sessao }),
  atualizarSessao: (id, alteracoes) => requisicao(`/sessoes/${id}`, { method: 'PUT', body: alteracoes }),
  excluirSessao: (id) => requisicao(`/sessoes/${id}`, { method: 'DELETE' }),
};
 