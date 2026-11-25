import { useState } from 'react';

/*
 * Visão "mestre" ou "jogadores", a mesma para as abas Arquivos, Mapas, Sessões e Combate (é a
 * tela da mesa: trocou numa, vale na outra). Fica lembrada por campanha neste navegador.
 * Quem é JOGADOR na campanha fica sempre na visão "jogadores" (não tem a chave para trocar).
 */
const chave = (id) => `hubrpg:visao:${id}`;

// Papel da conta em cada campanha aberta ('mestre' | 'jogador'), anotado pela página da campanha
const papeis = new Map();
export const definirPapel = (campanhaId, papel) => papeis.set(String(campanhaId), papel);
export const ehJogador = (campanhaId) => papeis.get(String(campanhaId)) === 'jogador';

export function lerVisao(id) {
  if (ehJogador(id)) return 'jogadores';
  try {
    return localStorage.getItem(chave(id)) ?? localStorage.getItem(`hubrpg:arquivos:visao:${id}`) ?? 'mestre';
  } catch {
    return 'mestre';
  }
}

/** [visao, trocar, podeTrocar]: o jogador não troca (podeTrocar = false) */
export function useVisao(campanhaId) {
  const [visao, setVisao] = useState(() => lerVisao(campanhaId));
  const podeTrocar = !ehJogador(campanhaId);

  function trocar(nova) {
    if (!podeTrocar) return;
    setVisao(nova);
    try { localStorage.setItem(chave(campanhaId), nova); } catch { /* sem armazenamento: só não lembra */ }
  }

  return [podeTrocar ? visao : 'jogadores', trocar, podeTrocar];
}

/** "?abrir=7" no endereço (link de um pino do mapa): devolve 7 e limpa o endereço */
export function pedidoDeAbrir() {
  const id = Number(new URLSearchParams(window.location.search).get('abrir')) || null;
  if (id) window.history.replaceState(window.history.state, '', window.location.pathname);
  return id;
}
