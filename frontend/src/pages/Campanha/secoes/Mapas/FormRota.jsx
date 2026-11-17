import { useState } from 'react';
import { CORES_ROTA } from './regrasMapa';
import styles from './Mapas.module.scss';

/** Nome, cor da tinta e se a rota fica oculta (a do culto, por exemplo) */
export default function FormRota({ inicial, onSalvar, onCancelar, onExcluir }) {
  const [rota, setRota] = useState(inicial);

  function enviar(e) {
    e.preventDefault();
    onSalvar({ ...rota, nome: rota.nome.trim() });
  }

  return (
    <form className={styles.formPino} onSubmit={enviar}>
      <label className={styles.campo}>
        <span>Nome da rota</span>
        <input value={rota.nome} onChange={(e) => setRota({ ...rota, nome: e.target.value })} placeholder="Ex.: Caminho do grupo" maxLength={50} autoFocus />
      </label>

      <div className={styles.campo}>
        <span>Cor da tinta</span>
        <div className={styles.cores} role="radiogroup" aria-label="Cor da rota">
          {CORES_ROTA.map((cor) => (
            <button
              key={cor}
              type="button"
              role="radio"
              aria-checked={rota.cor === cor}
              aria-label={cor}
              style={{ '--r': cor }}
              onClick={() => setRota({ ...rota, cor })}
            />
          ))}
        </div>
      </div>

      <label className={styles.marcar}>
        <input type="checkbox" checked={rota.oculta} onChange={(e) => setRota({ ...rota, oculta: e.target.checked })} />
        Oculta (os jogadores não veem até você mostrar)
      </label>

      <div className={styles.botoes}>
        {onExcluir && <button type="button" className={styles.perigo} onClick={onExcluir}>Apagar rota</button>}
        <button type="button" className={styles.secundario} onClick={onCancelar}>Cancelar</button>
        <button type="submit" className={styles.primario}>Salvar rota</button>
      </div>
    </form>
  );
}
