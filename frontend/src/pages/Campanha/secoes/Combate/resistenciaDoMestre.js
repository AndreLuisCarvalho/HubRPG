/*
 * Resistência de ameaça pedida pelo jogador: quando um jogador usa um ritual ou item que pede teste de
 * resistência de uma ameaça, quem rola é o mestre (o teste dela é segredo). O pedido fica no combate:
 *   dados.pedidoResistencia = { id, criado, autor, nome, fonte: 'ritual' | 'item', pericia, dt, efeito,
 *                               alvos: [ids], respostas: { [id]: { total, passou } } }
 * O mestre responde alvo a alvo; quando todos têm resposta, a tela do jogador segue (e apaga o pedido).
 */
import { useEffect, useRef, useState } from 'react';
import { novoId } from './regrasCombate';

export const nomeDaPericia = (id) => (id ? id.charAt(0).toUpperCase() + id.slice(1) : '');

/** Esta tela precisa do mestre para a resistência deste alvo? (jogador contra ameaça) */
export const resistePeloMestre = (alvo, mestre) => !mestre && alvo?.lado === 'ameacas';

/** O mudarDados que tira o pedido (só se ainda for o mesmo) */
export const semPedido = (id) => (d) => {
  if (d.pedidoResistencia?.id !== id) return d;
  const { pedidoResistencia: _p, ...resto } = d;
  return resto;
};

/**
 * Lado do jogador. pedir(dados do pedido) devolve o mudarDados que o põe no combate; quando o mestre
 * responder todos, onPronto(respostas, id) é chamado uma vez. cancelar() desiste da espera.
 */
export function useResistenciaDoMestre(pedidoNoCombate, onPronto) {
  const [id, setId] = useState(null);
  const avisado = useRef(null);
  const meu = id && pedidoNoCombate?.id === id ? pedidoNoCombate : null;
  const pronto = Boolean(meu && meu.alvos.every((a) => meu.respostas?.[a]));

  // O mestre descartou o pedido (ele estava no combate e sumiu sem resposta): para de esperar
  const visto = useRef(null);
  useEffect(() => {
    if (meu) visto.current = id;
    else if (id && visto.current === id) setId(null);
  }, [meu, id]);

  useEffect(() => {
    if (!pronto || avisado.current === id) return;
    avisado.current = id;
    onPronto(meu.respostas, id);
    setId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só quando o mestre termina
  }, [pronto, id]);

  function pedir(campos) {
    const novo = { id: novoId(), criado: Date.now(), respostas: {}, ...campos };
    setId(novo.id);
    return { id: novo.id, mudarDados: (d) => ({ ...d, pedidoResistencia: novo }) };
  }

  function cancelar() {
    const atual = id;
    setId(null);
    return semPedido(atual);
  }

  return { esperando: Boolean(id), pedido: meu, pedir, cancelar };
}
