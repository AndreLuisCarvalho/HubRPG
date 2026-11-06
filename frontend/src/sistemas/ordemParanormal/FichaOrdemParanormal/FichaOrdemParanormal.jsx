import { BarraRecurso } from '../../../components';
import { CLASSES, NEX } from '../modelo';
import { calcularDefesa, limitePePorTurno, recursos } from '../regras';
import Atributos from './partes/Atributos/Atributos';
import Pericias from './partes/Pericias/Pericias';
import styles from './FichaOrdemParanormal.module.scss';

export default function FichaOrdemParanormal({ ficha, onAlterarDados }) {
  const { dados } = ficha;
  const listaRecursos = recursos(dados);

  function alterarRecurso(recurso, valor) {
    const atuais = Object.fromEntries(listaRecursos.map((r) => [r.id, r.atual]));
    atuais[recurso.id] = Math.min(Math.max(valor, 0), recurso.maximo);
    onAlterarDados({ atuais });
  }

  return (
    <article className={styles.ficha}>
      <header className={styles.cabecalho}>
        <div className={styles.identidade}>
          <span className={styles.avatar}>{ficha.nome.charAt(0)}</span>
          <div>
            <h1 className={styles.nome}>{ficha.nome}</h1>
            <div className={styles.seletores}>
              <label>
                Classe
                <select value={dados.classe ?? ''} onChange={(e) => onAlterarDados({ classe: e.target.value })}>
                  {Object.entries(CLASSES).map(([id, classe]) => (
                    <option key={id} value={id}>{classe.nome}</option>
                  ))}
                </select>
              </label>
              <label>
                NEX
                <select value={dados.nex ?? 5} onChange={(e) => onAlterarDados({ nex: Number(e.target.value) })}>
                  {NEX.map((n) => <option key={n} value={n}>{n}%</option>)}
                </select>
              </label>
            </div>
          </div>
        </div>

        <dl className={styles.derivados}>
          <div><dt>Defesa</dt><dd>{calcularDefesa(dados)}</dd></div>
          <div><dt>PE / turno</dt><dd>{limitePePorTurno(dados)}</dd></div>
        </dl>
      </header>

      <section className={styles.recursos}>
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
      </section>

      <div className={styles.corpo}>
        <Atributos atributos={dados.atributos} onAlterar={(atributos) => onAlterarDados({ atributos })} />
        <Pericias dados={dados} onAlterar={(pericias) => onAlterarDados({ pericias })} />
      </div>
    </article>
  );
}