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
  listarCampanhas: () => requisicao('/campanhas'),
  buscarCampanha: (id) => requisicao(`/campanhas/${id}`),
};