import { ATRIBUTOS, GRAUS, PERICIAS } from '../../../modelo';
import { dadosDoTeste } from '../../../regras';
import styles from './Pericias.module.scss';

const siglaDoAtributo = (id) => ATRIBUTOS.find((a) => a.id === id)?.sigla;

export default function Pericias({ dados, onAlterar }) {
  const pericias = dados.pericias ?? {};

  function alterarGrau(id, grau) {
    const novas = { ...pericias };
    if (grau === 'destreinado') delete novas[id];   // não guarda o que é padrão
    else novas[id] = grau;
    onAlterar(novas);
  }

  return (
    <section className={styles.pericias}>
      <h2 className={styles.titulo}>Perícias</h2>

      <ul className={styles.lista}>
        {PERICIAS.map((p) => {
          const grau = pericias[p.id] ?? 'destreinado';
          return (
            <li key={p.id} className={`${styles.pericia} ${grau !== 'destreinado' ? styles.treinada : ''}`}>
              <span className={styles.nome}>{p.nome}</span>
              <span className={styles.atributo}>{siglaDoAtributo(p.atributo)}</span>
              <span className={styles.teste}>{dadosDoTeste(dados, p.id)}</span>
              <select value={grau} onChange={(e) => alterarGrau(p.id, e.target.value)} aria-label={`Grau de ${p.nome}`}>
                {Object.entries(GRAUS).map(([id, g]) => (
                  <option key={id} value={id}>{g.nome}</option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
    </section>
  );
}