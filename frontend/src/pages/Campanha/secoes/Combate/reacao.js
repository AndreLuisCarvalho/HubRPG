/*
 * Reação na hora: quando uma ameaça ataca um agente que pode reagir, o ataque espera o jogador
 * escolher (Esquivar, Bloquear ou Tomar) na tela dele. O pedido fica no combate:
 *   dados.pedidoReacao = { id, criado, autor, alvo, ataque, arma, esquiva: bônus|null, bloqueio: RD|null, escolha }
 * Quem atacou rola quando a escolha chega (ou quando o tempo acaba: sem reação).
 */
import { useEffect, useState } from 'react';

export const SEGUNDOS_DE_REACAO = 15;
// Quem atacou espera um pouco mais que isso (o pedido leva um tempo para chegar ao jogador)
export const FOLGA_DA_REACAO = 5;

// Pedido velho (a tela abriu depois, ou quem atacou fechou a aba) não aparece mais
const VALIDADE = (SEGUNDOS_DE_REACAO + 15) * 1000;
export const pedidoVivo = (pedido) => Boolean(pedido && !pedido.escolha && Date.now() - (pedido.criado ?? 0) < VALIDADE);

/** Segundos que faltam, contando a partir de quando esta tela viu o pedido (chave) */
export function useContagem(chave, segundos = SEGUNDOS_DE_REACAO) {
  const [faltam, setFaltam] = useState(segundos);
  useEffect(() => {
    if (!chave) return undefined;
    const inicio = Date.now();
    setFaltam(segundos);
    const relogio = setInterval(() => {
      const resta = Math.max(0, segundos - Math.floor((Date.now() - inicio) / 1000));
      setFaltam(resta);
      if (!resta) clearInterval(relogio);
    }, 250);
    return () => clearInterval(relogio);
  }, [chave, segundos]);
  return faltam;
}
