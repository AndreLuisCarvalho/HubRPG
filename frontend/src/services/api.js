// Endereço da API:
// - No PC fica vazio: o Vite redireciona /api para o back (vite.config.js)
// - Na Vercel vem da variável VITE_API_URL (ex.: https://hubrpg-api.vercel.app)
const BASE = import.meta.env.VITE_API_URL ?? '';
 
/* ---------- Login: o token da conta fica no navegador ---------- */
const CHAVE_TOKEN = 'hubrpg:token';
export const EVENTO_SAIU = 'hubrpg:saiu';   // o servidor recusou o token: a tela volta para o login

export function lerToken() {
  try {
    return localStorage.getItem(CHAVE_TOKEN) ?? '';
  } catch {
    return '';
  }
}

export function guardarToken(token) {
  try {
    if (token) localStorage.setItem(CHAVE_TOKEN, token);
    else localStorage.removeItem(CHAVE_TOKEN);
  } catch {
    // sem armazenamento (aba anônima): vale só enquanto a página estiver aberta
  }
}

/* ---------- Requisição ---------- */
async function requisicao(caminho, opcoes = {}) {
  const token = lerToken();
  const resposta = await fetch(`${BASE}/api${caminho}`, {
    ...opcoes,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
  });

  // Login vencido ou inválido: esquece o token e avisa a tela
  if (resposta.status === 401 && token && !caminho.startsWith('/auth/')) {
    guardarToken('');
    window.dispatchEvent(new Event(EVENTO_SAIU));
  }

  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro.erro ?? `Erro ${resposta.status}`);
  }
  return resposta.status === 204 ? null : resposta.json();
}
 
export const api = {
  // Conta
  configDoLogin: () => requisicao('/auth/config'),
  entrarComGoogle: (credencial) => requisicao('/auth/google', { method: 'POST', body: { credencial } }),
  entrarParaTeste: (nome) => requisicao('/auth/teste', { method: 'POST', body: { nome } }),
  eu: () => requisicao('/auth/eu'),

  // Contas do site (só o dono): { limite, usadas, contas: [{ …, campanhas: [{ id, nome, papel }] }] }
  listarContas: () => requisicao('/contas'),
  bloquearConta: (id) => requisicao(`/contas/${id}/bloquear`, { method: 'POST' }),
  desbloquearConta: (id) => requisicao(`/contas/${id}/desbloquear`, { method: 'POST' }),
  tirarDaCampanha: (id, campanhaId) => requisicao(`/contas/${id}/campanhas/${campanhaId}`, { method: 'DELETE' }),

  // Campanhas (cada uma vem com "papel": 'mestre' | 'jogador'; o "codigo" só para o mestre)
  listarCampanhas: () => requisicao('/campanhas'),
  buscarCampanha: (id) => requisicao(`/campanhas/${id}`),
  criarCampanha: (dados) => requisicao('/campanhas', { method: 'POST', body: dados }),
  entrarNaCampanha: (codigo) => requisicao('/campanhas/entrar', { method: 'POST', body: { codigo } }),
  atualizarCampanha: (id, dados) => requisicao(`/campanhas/${id}`, { method: 'PUT', body: dados }),
  novoCodigo: (id) => requisicao(`/campanhas/${id}/codigo`, { method: 'POST' }),
  listarMembros: (id) => requisicao(`/campanhas/${id}/membros`),
  tirarMembro: (id, usuarioId) => requisicao(`/campanhas/${id}/membros/${usuarioId}`, { method: 'DELETE' }),
 
  // Fichas
  listarFichas: (campanhaId, tipo) =>
    requisicao(`/campanhas/${campanhaId}/fichas${tipo ? `?tipo=${tipo}` : ''}`),
  buscarFicha: (id) => requisicao(`/fichas/${id}`),
  criarFicha: (campanhaId, ficha) =>
    requisicao(`/campanhas/${campanhaId}/fichas`, { method: 'POST', body: ficha }),
  atualizarFicha: (id, alteracoes) => requisicao(`/fichas/${id}`, { method: 'PUT', body: alteracoes }),
  excluirFicha: (id) => requisicao(`/fichas/${id}`, { method: 'DELETE' }),

  // Parentes dos agentes (só o dono do agente e o mestre veem): "dados" entra e sai como objeto
  listarParentes: async (campanhaId) => (await requisicao(`/campanhas/${campanhaId}/parentes`)).map(lerItem),
  criarParente: async (campanhaId, parente) =>
    lerItem(await requisicao(`/campanhas/${campanhaId}/parentes`, { method: 'POST', body: parente })),
  atualizarParente: async (id, parente) => lerItem(await requisicao(`/parentes/${id}`, { method: 'PUT', body: parente })),
  excluirParente: (id) => requisicao(`/parentes/${id}`, { method: 'DELETE' }),

  // Sessões (o número é automático: a próxima da campanha)
  listarSessoes: (campanhaId) => requisicao(`/campanhas/${campanhaId}/sessoes`),
  criarSessao: (campanhaId, sessao) =>
    requisicao(`/campanhas/${campanhaId}/sessoes`, { method: 'POST', body: sessao }),
  atualizarSessao: (id, alteracoes) => requisicao(`/sessoes/${id}`, { method: 'PUT', body: alteracoes }),
  excluirSessao: (id) => requisicao(`/sessoes/${id}`, { method: 'DELETE' }),

  // Itens da campanha: o banco guarda "dados" em texto; aqui entra e sai como objeto
  listarItens: async (campanhaId) => (await requisicao(`/campanhas/${campanhaId}/itens`)).map(lerItem),
  criarItem: async (campanhaId, item) =>
    lerItem(await requisicao(`/campanhas/${campanhaId}/itens`, { method: 'POST', body: escreverItem(item) })),
  atualizarItem: async (id, item) =>
    lerItem(await requisicao(`/itens/${id}`, { method: 'PUT', body: escreverItem(item) })),
  excluirItem: (id) => requisicao(`/itens/${id}`, { method: 'DELETE' }),

  // Arquivos: a lista vem sem o conteúdo (pesado); buscarArquivo traz tudo
  listarArquivos: async (campanhaId) => (await requisicao(`/campanhas/${campanhaId}/arquivos`)).map(lerItem),
  buscarArquivo: async (id) => lerItem(await requisicao(`/arquivos/${id}`)),
  criarArquivo: async (campanhaId, arquivo) =>
    lerItem(await requisicao(`/campanhas/${campanhaId}/arquivos`, { method: 'POST', body: escreverArquivo(arquivo) })),
  // Manda só o que veio: { dados } para liberar/destrancar; com "conteudo" quando o arquivo mudou
  atualizarArquivo: async (id, arquivo) =>
    lerItem(await requisicao(`/arquivos/${id}`, { method: 'PUT', body: escreverArquivo(arquivo) })),
  excluirArquivo: (id) => requisicao(`/arquivos/${id}`, { method: 'DELETE' }),
  // Senha do terminal: { certo, arquivo } (o arquivo já destrancado, quando acerta)
  destrancarArquivo: async (id, senha) => {
    const r = await requisicao(`/arquivos/${id}/destrancar`, { method: 'POST', body: { senha } });
    return r.certo ? { certo: true, arquivo: lerItem(r.arquivo) } : { certo: false };
  },

  // Mapas: a lista vem sem a imagem; buscarMapa traz tudo. atualizarMapa devolve sem a imagem.
  listarMapas: async (campanhaId) => (await requisicao(`/campanhas/${campanhaId}/mapas`)).map(lerItem),
  buscarMapa: async (id) => lerItem(await requisicao(`/mapas/${id}`)),
  criarMapa: async (campanhaId, mapa) =>
    lerItem(await requisicao(`/campanhas/${campanhaId}/mapas`, { method: 'POST', body: escreverMapa(mapa) })),
  atualizarMapa: async (id, mapa) =>
    lerItem(await requisicao(`/mapas/${id}`, { method: 'PUT', body: escreverMapa(mapa) })),
  excluirMapa: (id) => requisicao(`/mapas/${id}`, { method: 'DELETE' }),

  // Combates: "dados" entra e sai como objeto
  listarCombates: async (campanhaId) => (await requisicao(`/campanhas/${campanhaId}/combates`)).map(lerItem),
  criarCombate: async (campanhaId, combate) =>
    lerItem(await requisicao(`/campanhas/${campanhaId}/combates`, { method: 'POST', body: escreverCombate(combate) })),
  atualizarCombate: async (id, combate) =>
    lerItem(await requisicao(`/combates/${id}`, { method: 'PUT', body: escreverCombate(combate) })),
  excluirCombate: (id) => requisicao(`/combates/${id}`, { method: 'DELETE' }),
};

const escreverCombate = ({ nome, sessao_id, dados }) => ({
  ...(nome !== undefined ? { nome } : {}),
  ...(sessao_id !== undefined ? { sessao_id } : {}),
  ...(dados ? { dados: JSON.stringify(dados) } : {}),
});

const escreverMapa = ({ nome, dados, imagem, nevoa }) => ({
  nome,
  ...(dados ? { dados: JSON.stringify(dados) } : {}),
  ...(imagem !== undefined ? { imagem } : {}),
  ...(nevoa !== undefined ? { nevoa } : {}),
});

const escreverArquivo = ({ titulo, dados, conteudo }) => ({
  titulo,
  ...(dados ? { dados: JSON.stringify(dados) } : {}),
  ...(conteudo !== undefined ? { conteudo } : {}),
});

function lerItem(linha) {
  try {
    return { ...linha, dados: JSON.parse(linha.dados || '{}') };
  } catch {
    return { ...linha, dados: {} };
  }
}

const escreverItem = ({ nome, dados }) => ({ nome, dados: JSON.stringify(dados ?? {}) });
 