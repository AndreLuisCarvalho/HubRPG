import { ATRIBUTOS, GRAUS, PERICIAS } from '../../../modelo';
import { bonusPericia, dadosDoAtributo, dadosDoTeste, grauDaPericia } from '../../../regras';
import styles from './Pericias.module.scss';

const siglaDoAtributo = (id) => ATRIBUTOS.find((a) => a.id === id)?.sigla;

// Ícone de d20 (fica pronto para o rolador de dados)
const IconeD20 = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2 21 7v10l-9 5-9-5V7Z M12 2 7 10h10Z M7 10l5 12 5-12 M3 7l4 3 M21 7l-4 3 M3 17l4-7 M21 17l-4-7" />
  </svg>
);

export default function Pericias({ dados, onAlterarDados }) {
  const pericias = dados.pericias ?? {};
  const outros = dados.periciasOutros ?? {};

  function alterarGrau(id, grau) {
    const novas = { ...pericias };
    if (grau === 'destreinado') delete novas[id];   // não guarda o que é padrão
    else novas[id] = grau;
    onAlterarDados({ pericias: novas });
  }

  function alterarOutros(id, valor) {
    const atual = outros[id] ?? 0;
    if (valor === atual) return;
    const novos = { ...outros };
    if (!valor) delete novos[id];
    else novos[id] = valor;
    onAlterarDados({ periciasOutros: novos });
  }

  return (
    <section className={styles.pericias}>
      <h2 className={styles.titulo}>Perícias</h2>

      <table className={styles.tabela}>
        <thead>
          <tr>
            <th aria-label="Rolar" />
            <th className={styles.esquerda}>Perícia</th>
            <th>Dados</th>
            <th>Bônus</th>
            <th>Treino</th>
            <th>Outros</th>
          </tr>
        </thead>

        <tbody>
          {PERICIAS.map((p) => {
            const grau = grauDaPericia(dados, p.id);
            const bonus = bonusPericia(dados, p.id);
            const treinada = grau !== 'destreinado';

            return (
              <tr key={p.id} className={treinada ? styles.treinada : ''}>
                <td>
                  <button
                    className={styles.rolar}
                    title={`${p.nome}: ${dadosDoTeste(dados, p.id)} (rolagem em breve)`}
                    aria-label={`Rolar ${p.nome}`}
                    disabled
                  >
                    <IconeD20 />
                  </button>
                </td>

                <td className={styles.esquerda}>
                  {p.nome}
                  {p.somenteTreinada && <sup title="Somente treinada">*</sup>}
                  {p.carga && <sup title="Penalidade de carga">+</sup>}
                </td>

                <td>
                  {dadosDoAtributo(dados, p.atributo)}
                  <span className={styles.sigla}>{siglaDoAtributo(p.atributo)}</span>
                </td>

                <td className={styles.bonus}>{bonus > 0 ? `+${bonus}` : bonus}</td>

                <td>
                  <select value={grau} onChange={(e) => alterarGrau(p.id, e.target.value)} aria-label={`Treino em ${p.nome}`}>
                    {Object.entries(GRAUS).map(([id, g]) => (
                      <option key={id} value={id} title={g.nome}>{g.bonus}</option>
                    ))}
                  </select>
                </td>

                <td>
                  <input
                    type="number"
                    defaultValue={outros[p.id] ?? 0}
                    onBlur={(e) => alterarOutros(p.id, Number(e.target.value) || 0)}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                    aria-label={`Outros bônus em ${p.nome}`}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className={styles.legenda}>* Somente treinada · + Penalidade de carga</p>
    </section>
  );
}