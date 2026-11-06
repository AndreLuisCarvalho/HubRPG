import { BarraRecurso } from '../../../../../components';
import { NEX } from '../../../modelo';
import {
  calcularBloqueio, calcularDefesa, calcularEsquiva,
  deslocamento, limitePePorTurno, recursos,
} from '../../../regras';
import CampoLinha from '../CampoLinha/CampoLinha';
import styles from './Status.module.scss';

export default function Status({ dados, onAlterarDados }) {
  const listaRecursos = recursos(dados);
  const { metros, quadrados } = deslocamento(dados);
  const defesa = dados.defesa ?? {};

  function alterarRecurso(recurso, valor) {
    const atuais = Object.fromEntries(listaRecursos.map((r) => [r.id, r.atual]));
    atuais[recurso.id] = Math.min(Math.max(valor, 0), recurso.maximo);
    onAlterarDados({ atuais });
  }

  function salvarDeslocamento(e) {
    const novo = Number(e.target.value) || 0;
    if (novo !== metros) onAlterarDados({ deslocamento: novo });
  }

  return (
    <section className={styles.status}>
      <div className={styles.topo}>
        <label className={styles.caixa}>
          <select value={dados.nex ?? 5} onChange={(e) => onAlterarDados({ nex: Number(e.target.value) })}>
            {NEX.map((n) => <option key={n} value={n}>{n}%</option>)}
          </select>
          <span>NEX</span>
        </label>

        <div className={styles.caixa}>
          <strong>{limitePePorTurno(dados)}</strong>
          <span>PE / turno</span>
        </div>

        <label className={`${styles.caixa} ${styles.largo}`}>
          <div className={styles.deslocamento}>
            <input type="number" min="0" step="1.5" defaultValue={metros} onBlur={salvarDeslocamento} />
            m / <strong>{quadrados}</strong> q
          </div>
          <span>Deslocamento</span>
        </label>
      </div>

      <div className={styles.barras}>
        {listaRecursos.map((r) => (
          <BarraRecurso
            key={r.id}
            rotulo={r.sigla}
            nome={r.nome}
            cor={r.cor}
            atual={r.atual}
            maximo={r.maximo}
            onAlterar={(valor) => alterarRecurso(r, valor)}
          />
        ))}
      </div>

      <div className={styles.defesas}>
        <div className={styles.defesa}>
          <div className={styles.escudo}>
            <svg viewBox="0 0 40 46" aria-hidden="true">
              <path d="M20 2 L37 8 V22 C37 33 29 41 20 44 C11 41 3 33 3 22 V8 Z" />
            </svg>
            <strong>{calcularDefesa(dados)}</strong>
          </div>

          <div className={styles.formula}>
            <span className={styles.rotulo}>Defesa</span>
            <div className={styles.parcelas}>
              <span>= 10 + AGI +</span>
              <CampoLinha
                tipo="number" layout="embaixo" rotulo="Equip."
                valor={defesa.equipamento}
                onSalvar={(v) => onAlterarDados({ defesa: { ...defesa, equipamento: v } })}
              />
              <span>+</span>
              <CampoLinha
                tipo="number" layout="embaixo" rotulo="Outros"
                valor={defesa.outros}
                onSalvar={(v) => onAlterarDados({ defesa: { ...defesa, outros: v } })}
              />
            </div>
          </div>
        </div>

        <div className={styles.derivado}>
          <span className={styles.rotulo}>Bloqueio</span>
          <strong>{calcularBloqueio(dados)}</strong>
        </div>
        <div className={styles.derivado}>
          <span className={styles.rotulo}>Esquiva</span>
          <strong>{calcularEsquiva(dados)}</strong>
        </div>
      </div>

      <div className={styles.textos}>
        <CampoLinha rotulo="Proteção" valor={dados.protecao} onSalvar={(protecao) => onAlterarDados({ protecao })} />
        <CampoLinha rotulo="Resistências" valor={dados.resistencias} onSalvar={(resistencias) => onAlterarDados({ resistencias })} />
        <CampoLinha rotulo="Proficiências" valor={dados.proficiencias} onSalvar={(proficiencias) => onAlterarDados({ proficiencias })} />
      </div>
    </section>
  );
}