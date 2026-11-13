import styles from './Contador.module.scss';

/**
 * Campo de número próprio do HubRPG: [−] valor [+].
 * Aceita digitar também; fica sempre entre "min" e "max".
 */
export default function Contador({ valor, onMudar, min = 0, max = 99, rotulo, className = '' }) {
  const limitar = (n) => Math.min(max, Math.max(min, n));

  return (
    <div className={`${styles.contador} ${className}`} role="group" aria-label={rotulo}>
      <button type="button" onClick={() => onMudar(limitar(valor - 1))} disabled={valor <= min} aria-label={`Menos ${rotulo ?? ''}`}>
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={valor}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/\D/g, ''));
          onMudar(limitar(Number.isFinite(n) ? n : min));
        }}
        onFocus={(e) => e.target.select()}
        aria-label={rotulo}
      />
      <button type="button" onClick={() => onMudar(limitar(valor + 1))} disabled={valor >= max} aria-label={`Mais ${rotulo ?? ''}`}>
        +
      </button>
    </div>
  );
}
