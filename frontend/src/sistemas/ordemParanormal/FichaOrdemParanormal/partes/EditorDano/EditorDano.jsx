import Seletor from '../../../../../components/Seletor/Seletor';
import { novaParte, TIPOS_DANO } from '../../../danos';
import styles from './EditorDano.module.scss';

const OPCOES = [{ valor: '', rotulo: 'sem tipo' }, ...TIPOS_DANO.map((t) => ({ valor: t.id, rotulo: t.nome, detalhe: t.skin ? 'elemento' : '' }))];

/**
 * Dano em partes, uma linha por parte: fórmula (10, 1d4, 2d6+3) + tipo.
 * Ex.: "10 corte" e "1d4 Morte" — na mesa cada parte aparece com o seu subtotal.
 * A fórmula salva ao sair do campo; o tipo, ao escolher.
 */
export default function EditorDano({ danos = [], onMudar, compacto = false }) {
  const trocar = (uid, parcial) => onMudar(danos.map((d) => (d.uid === uid ? { ...d, ...parcial } : d)));

  return (
    <div className={`${styles.editor} ${compacto ? styles.compacto : ''}`}>
      {danos.map((d) => (
        <div key={d.uid} className={styles.parte}>
          <input
            defaultValue={d.formula}
            placeholder="1d6+2"
            aria-label="Fórmula do dano"
            onBlur={(e) => {
              const formula = e.target.value.trim();
              if (formula !== d.formula) trocar(d.uid, { formula });
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), e.currentTarget.blur())}
          />
          <Seletor
            className={styles.tipo}
            rotulo="Tipo do dano"
            valor={d.tipo ?? ''}
            opcoes={OPCOES}
            onMudar={(tipo) => trocar(d.uid, { tipo })}
          />
          <button
            type="button"
            className={styles.remover}
            onClick={() => onMudar(danos.filter((x) => x.uid !== d.uid))}
            aria-label="Remover parte do dano"
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className={styles.mais} onClick={() => onMudar([...danos, novaParte()])}>
        + {danos.length ? 'parte do dano' : 'dano'}
      </button>
    </div>
  );
}
