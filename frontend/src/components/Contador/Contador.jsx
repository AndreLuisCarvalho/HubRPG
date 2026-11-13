import styles from './Contador.module.scss';

/**
 * Campo de número próprio do HubRPG: [−] valor [+].
 * Aceita digitar também; fica sempre entre "min" e "max". "passo": quanto cada clique soma (ex.: VD de 5 em 5).
 * O campo do meio cresce com o número (PV 1200 cabe sem cortar).
 */
export default function Contador({ valor, onMudar, min = 0, max = 99, passo = 1, rotulo, className = '' }) {
  const limitar = (n) => Math.min(max, Math.max(min, n));

  return (
    <div className={`${styles.contador} ${className}`} role="group" aria-label={rotulo}>
      <button type="button" onClick={() => onMudar(limitar(valor - passo))} disabled={valor <= min} aria-label={`Menos ${rotulo ?? ''}`}>
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        style={{ width: `${Math.max(2, String(valor).length) + 2}ch` }}
        value={valor}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/\D/g, ''));
          onMudar(limitar(Number.isFinite(n) ? n : min));
        }}
        onFocus={(e) => e.target.select()}
        aria-label={rotulo}
      />
      <button type="button" onClick={() => onMudar(limitar(valor + passo))} disabled={valor >= max} aria-label={`Mais ${rotulo ?? ''}`}>
        +
      </button>
    </div>
  );
}
