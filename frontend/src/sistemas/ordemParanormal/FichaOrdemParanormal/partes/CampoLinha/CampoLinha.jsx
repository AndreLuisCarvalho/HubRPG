import styles from './CampoLinha.module.scss';

/**
 * Campo sublinhado. Salva ao sair do campo ou apertar Enter.
 * layout: "lado" (rótulo à esquerda), "acima" (rótulo em cima) ou "centro" (tudo centralizado)
 * Campos numéricos nunca aceitam valor negativo.
 */
export default function CampoLinha({ rotulo, valor, onSalvar, tipo = 'text', layout = 'lado', ...resto }) {
  const numerico = tipo === 'number';
  const atual = valor ?? (numerico ? 0 : '');

  function salvar(e) {
    const novo = numerico
      ? Math.max(0, Number(e.target.value) || 0)
      : e.target.value.trim();
    e.target.value = novo;   // se digitou negativo, o campo já mostra o valor corrigido
    if (novo !== atual) onSalvar(novo);
  }

  return (
    <label className={`${styles.campo} ${styles[layout]}`}>
      <span className={styles.rotulo}>{rotulo}</span>
      <input
        type={tipo}
        min={numerico ? 0 : undefined}
        defaultValue={numerico ? Math.max(0, atual) : atual}
        onBlur={salvar}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        {...resto}
      />
    </label>
  );
}