import { descreverPedido } from './formula';
import styles from './BotaoRolar.module.scss';

export function IconeD20() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 21 7v10l-9 5-9-5V7Z M12 2 7 10h10Z M7 10l5 12 5-12" />
    </svg>
  );
}

/** Botãozinho com o d20 que abre a mesa de dados. Sem "pedido" (nada para rolar) fica apagado. */
export default function BotaoRolar({ pedido, rolar, rotulo, className = '', tipo = 'teste' }) {
  return (
    <button
      type="button"
      className={`${styles.rolar} ${tipo === 'dano' ? styles.dano : ''} ${className}`}
      onClick={() => pedido && rolar(pedido)}
      disabled={!pedido}
      title={pedido ? `${rotulo ?? pedido.titulo}: ${descreverPedido(pedido)}` : 'Escreva a fórmula para rolar (ex.: 2d20+5)'}
      aria-label={rotulo ?? (pedido ? `Rolar ${pedido.titulo}` : 'Rolar')}
    >
      <IconeD20 />
    </button>
  );
}
