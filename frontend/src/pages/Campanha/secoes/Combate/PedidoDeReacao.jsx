import { useRef } from 'react';
import IconeArma from './IconeArma';
import { SEGUNDOS_DE_REACAO, useContagem } from './reacao';
import styles from './PedidoDeReacao.module.scss';

/**
 * Na tela do jogador: uma ameaça atacou o agente dele. Três cartas (Esquivar, Bloquear, Tomar) e
 * o tempo correndo; sem resposta, ele toma o golpe. atacante/alvo: os nomes como esta tela os vê.
 */
export default function PedidoDeReacao({ pedido, atacante, alvo, onResponder }) {
  const faltam = useContagem(pedido.id);
  const respondeu = useRef(false);

  function responder(tipo) {
    if (respondeu.current) return;
    respondeu.current = true;
    onResponder(tipo);
  }

  // Acabou o tempo: a caixa some (quem atacou rola sem reação; esta tela não grava nada,
  // para não passar por cima do ataque que já foi salvo)
  if (faltam === 0) return null;

  const opcoes = [
    pedido.esquiva != null && { id: 'esquiva', tom: 'esquiva', icone: '↯', nome: 'Esquivar', detalhe: `+${pedido.esquiva} na Defesa` },
    pedido.bloqueio != null && { id: 'bloqueio', tom: 'bloqueio', icone: '⛨', nome: 'Bloquear', detalhe: `RD ${pedido.bloqueio} no dano` },
    { id: 'nenhuma', tom: 'tomar', icone: '✕', nome: 'Tomar', detalhe: 'guardar a reação' },
  ].filter(Boolean);

  return (
    <div className={styles.fundo} role="alertdialog" aria-modal="true" aria-labelledby="titulo-reacao">
      <div className={styles.caixa}>
        <header className={styles.topo}>
          <span className={styles.arma} aria-hidden="true">
            {pedido.arma ? <IconeArma id={pedido.arma} className={styles.desenho} /> : '⚔'}
          </span>
          <div>
            <small>Reação de {alvo}</small>
            <b id="titulo-reacao">{atacante} ataca com {pedido.ataque}!</b>
          </div>
          <strong className={styles.tempo} data-pouco={faltam <= 5 || undefined}>{faltam}</strong>
        </header>
        <i className={styles.barra} style={{ '--total': `${SEGUNDOS_DE_REACAO}s` }} />

        <div className={styles.cartas}>
          {opcoes.map((o) => (
            <button key={o.id} type="button" className={styles.carta} data-tom={o.tom} onClick={() => responder(o.id)}>
              <span className={styles.icone} aria-hidden="true">{o.icone}</span>
              <b>{o.nome}</b>
              <small>{o.detalhe}</small>
            </button>
          ))}
        </div>
        <p className={styles.nota}>Sem resposta em {SEGUNDOS_DE_REACAO} segundos, {alvo} toma o golpe.</p>
      </div>
    </div>
  );
}
