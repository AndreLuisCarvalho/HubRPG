import { useState } from 'react';
import { CORES_NOTA } from './regrasMapa';
import styles from './Mapas.module.scss';

const NOMES = { '#f4e06d': 'amarelo', '#f3a6b8': 'rosa', '#9fd0ee': 'azul', '#b5e3a1': 'verde', '#f6b871': 'laranja', '#efe9dc': 'branco' };

/** Post-it: texto curto, cor do papel e se fica oculto */
export default function FormNota({ inicial, onSalvar, onCancelar, onExcluir }) {
  const [nota, setNota] = useState(inicial);
  const mudar = (campo, valor) => setNota((n) => ({ ...n, [campo]: valor }));

  function enviar(e) {
    e.preventDefault();
    if (!nota.texto.trim()) return;
    onSalvar({ ...nota, texto: nota.texto.trim() });
  }

  return (
    <form className={styles.formPino} onSubmit={enviar}>
      <div className={styles.formPostit}>
        {/* Prévia do bilhete */}
        <div className={styles.previaPostit} style={{ '--papel': nota.cor }} aria-hidden="true">
          <span className={styles.alfinetePrevia} />
          <p>{nota.texto || 'Escreva o recado…'}</p>
        </div>

        <div className={styles.campos}>
          <label className={styles.campo}>
            <span>Recado</span>
            <textarea
              value={nota.texto}
              onChange={(e) => mudar('texto', e.target.value)}
              rows={4}
              maxLength={160}
              placeholder="Ex.: Aqui o sinal some. Não confiem no zelador."
              autoFocus
            />
          </label>

          <div className={styles.campo}>
            <span>Cor do papel</span>
            <div className={styles.cores} role="radiogroup" aria-label="Cor do post-it">
              {CORES_NOTA.map((cor) => (
                <button key={cor} type="button" role="radio" aria-checked={nota.cor === cor} aria-label={NOMES[cor] ?? cor} style={{ '--r': cor }} onClick={() => mudar('cor', cor)} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <label className={styles.marcar}>
        <input type="checkbox" checked={nota.oculta} onChange={(e) => mudar('oculta', e.target.checked)} />
        Oculto (os jogadores não veem até você mostrar)
      </label>

      <div className={styles.botoes}>
        {onExcluir && <button type="button" className={styles.perigo} onClick={onExcluir}>Apagar</button>}
        <button type="button" className={styles.secundario} onClick={onCancelar}>Cancelar</button>
        <button type="submit" className={styles.primario} disabled={!nota.texto.trim()}>Salvar post-it</button>
      </div>
    </form>
  );
}
