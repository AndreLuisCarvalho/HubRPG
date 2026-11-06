async function requisicao(caminho, opcoes = {}) {
  const resposta = await fetch(`/api${caminho}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes,
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
  });

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
};