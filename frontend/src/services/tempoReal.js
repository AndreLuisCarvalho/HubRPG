import { useEffect, useRef } from 'react';
import { api, ORIGEM } from './api';

/*
 * Tempo real (Ably): cada campanha aberta ouve o canal dela. O servidor manda só o aviso do que mudou
 * ({ tabela, id, acao, origem, liberou? }) e cada tela busca de novo o que precisa pela API.
 * Uma conexão por campanha, dividida entre todas as telas que estão ouvindo.
 * Se o servidor não tiver o Ably configurado, nada liga e o site segue sem tempo real.
 */

const campanhas = new Map();   // campanhaId → { ouvintes: Set, fechar }

async function conectar(campanhaId, registro) {
  const primeiro = await api.tokenTempoReal(campanhaId).catch(() => null);
  if (!primeiro?.ligado || registro.fechado) return;

  // O pacote do Ably (versão para navegador) só é baixado quando o tempo real está ligado
  const { createClient } = await import('@ably/pubsub-device');
  if (registro.fechado) return;

  let tokenInicial = primeiro.token;
  const cliente = createClient({
    authCallback: (_params, responder) => {
      if (tokenInicial) {
        const t = tokenInicial;
        tokenInicial = null;
        return responder(null, t);
      }
      api.tokenTempoReal(campanhaId)
        .then((r) => responder(null, r.token))
        .catch((e) => responder(e.message, null));
    },
  });
  registro.fechar = () => cliente.close();

  const canal = cliente.channels.get(primeiro.canal);
  canal.subscribe('mudou', (mensagem) => {
    const evento = mensagem.data;
    if (!evento || evento.origem === ORIGEM) return;
    registro.ouvintes.forEach((ouvir) => ouvir(evento));
  });

  // Voltou depois de cair: pode ter perdido avisos, então todas as telas recarregam
  let caiu = false;
  cliente.connection.on((mudanca) => {
    if (['disconnected', 'suspended'].includes(mudanca.current)) caiu = true;
    if (mudanca.current === 'connected' && caiu) {
      caiu = false;
      registro.ouvintes.forEach((ouvir) => ouvir({ tabela: '*', acao: 'reconectou' }));
    }
  });
}

/** Ouve os avisos da campanha. Devolve a função de parar. */
export function ouvirCampanha(campanhaId, ouvinte) {
  let registro = campanhas.get(campanhaId);
  if (!registro) {
    registro = { ouvintes: new Set(), fechar: null, fechado: false };
    campanhas.set(campanhaId, registro);
    conectar(campanhaId, registro);
  }
  registro.ouvintes.add(ouvinte);
  return () => {
    registro.ouvintes.delete(ouvinte);
    if (registro.ouvintes.size) return;
    // Ninguém mais ouvindo (saiu da campanha): fecha depois de um tempinho, caso outra tela já vá abrir
    setTimeout(() => {
      if (registro.ouvintes.size) return;
      registro.fechado = true;
      registro.fechar?.();
      campanhas.delete(campanhaId);
    }, 1500);
  };
}

// Alguém está no meio de uma edição? (campo com foco ou uma janela aberta)
function editando() {
  const el = document.activeElement;
  const campo = el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
  return Boolean(campo || document.querySelector('dialog[open]'));
}

/**
 * Chama aoMudar quando chegar um aviso de uma das tabelas.
 * esperar: true = se a pessoa estiver editando, espera ela terminar (sem apagar o que está digitando).
 * Vários avisos seguidos viram uma recarga só.
 */
export function useAoMudar(campanhaId, tabelas, aoMudar, { esperar = true } = {}) {
  const ref = useRef(aoMudar);
  useEffect(() => { ref.current = aoMudar; });
  const chave = tabelas.join(',');

  useEffect(() => {
    if (!campanhaId) return undefined;
    const lista = chave.split(',');
    let pendentes = [];
    let relogio = null;

    function rodar() {
      relogio = null;
      if (esperar && editando()) {
        relogio = setTimeout(rodar, 800);
        return;
      }
      const eventos = pendentes;
      pendentes = [];
      ref.current(eventos);
    }

    const parar = ouvirCampanha(campanhaId, (evento) => {
      if (evento.tabela !== '*' && !lista.includes(evento.tabela)) return;
      pendentes.push(evento);
      if (!relogio) relogio = setTimeout(rodar, 120);
    });
    return () => {
      parar();
      clearTimeout(relogio);
    };
  }, [campanhaId, chave, esperar]);
}
