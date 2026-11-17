import { useState } from 'react';

/*
 * Visão "mestre" ou "jogadores", a mesma para as abas Arquivos e Mapas (é a tela da mesa:
 * trocou numa, vale na outra). Fica lembrada por campanha neste navegador.
 */
const chave = (id) => `hubrpg:visao:${id}`;

export function lerVisao(id) {
  try {
    return localStorage.getItem(chave(id)) ?? localStorage.getItem(`hubrpg:arquivos:visao:${id}`) ?? 'mestre';
  } catch {
    return 'mestre';
  }
}

export function useVisao(campanhaId) {
  const [visao, setVisao] = useState(() => lerVisao(campanhaId));

  function trocar(nova) {
    setVisao(nova);
    try { localStorage.setItem(chave(campanhaId), nova); } catch { /* sem armazenamento: só não lembra */ }
  }

  return [visao, trocar];
}

/** "?abrir=7" no endereço (link de um pino do mapa): devolve 7 e limpa o endereço */
export function pedidoDeAbrir() {
  const id = Number(new URLSearchParams(window.location.search).get('abrir')) || null;
  if (id) window.history.replaceState(window.history.state, '', window.location.pathname);
  return id;
}
