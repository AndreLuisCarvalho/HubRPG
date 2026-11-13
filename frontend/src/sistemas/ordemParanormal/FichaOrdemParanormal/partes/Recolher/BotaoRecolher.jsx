import styles from './BotaoRecolher.module.scss';

/**
 * Botãozinho de recolher/abrir um bloco no celular: um quadrado fino com uma seta.
 * A seta aponta para cima quando aberto (recolher) e para baixo quando recolhido (abrir).
 * No computador não aparece: lá os blocos ficam sempre inteiros.
 */
export default function BotaoRecolher({ recolhido, onClick, nome, controla, className = '' }) {
  return (
    <button
      type="button"
      className={`${styles.botao} ${recolhido ? styles.recolhido : ''} ${className}`}
      onClick={onClick}
      aria-expanded={!recolhido}
      aria-controls={controla}
      aria-label={`${recolhido ? 'Mostrar' : 'Ocultar'} ${nome}`}
      title={recolhido ? 'Mostrar' : 'Ocultar'}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <polyline points="4,10 8,6 12,10" />
      </svg>
    </button>
  );
}
