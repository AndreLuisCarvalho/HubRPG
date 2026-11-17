import { useState } from 'react';
import Seletor from '../../../../components/Seletor/Seletor';
import styles from './Mapas.module.scss';

const UNIDADES = [{ valor: 'm', rotulo: 'metros' }, { valor: 'km', rotulo: 'quilômetros' }];

/** Depois de marcar dois pontos: "esta linha mede X unidades" */
export default function FormEscala({ px, atual, onSalvar, onCancelar }) {
  const [valor, setValor] = useState(atual?.valor ? String(atual.valor) : '100');
  const [unidade, setUnidade] = useState(atual?.unidade ?? 'm');
  const numero = Number(valor.replace(',', '.'));

  function enviar(e) {
    e.preventDefault();
    if (!(numero > 0)) return;
    onSalvar({ px, valor: numero, unidade });
  }

  return (
    <form className={styles.formPino} onSubmit={enviar}>
      <p className={styles.ajuda}>A linha que você marcou no mapa mede quanto, de verdade?</p>
      <div className={styles.linha}>
        <label className={styles.campo}>
          <span>Distância</span>
          <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" autoFocus />
        </label>
        <div className={styles.campo}>
          <span>Unidade</span>
          <Seletor rotulo="Unidade" valor={unidade} opcoes={UNIDADES} onMudar={setUnidade} />
        </div>
      </div>
      <div className={styles.botoes}>
        <button type="button" className={styles.secundario} onClick={onCancelar}>Cancelar</button>
        <button type="submit" className={styles.primario} disabled={!(numero > 0)}>Salvar escala</button>
      </div>
    </form>
  );
}
