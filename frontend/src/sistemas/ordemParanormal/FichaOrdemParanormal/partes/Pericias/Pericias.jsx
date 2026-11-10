import { useState } from 'react';
import { ATRIBUTOS, GRAUS, PERICIAS } from '../../../modelo';
import { bonusPericia, dadosDoAtributo, dadosDoTeste, grauDaPericia } from '../../../regras';
import Painel from '../Painel/Painel';
import styles from './Pericias.module.scss';

// ['destreinado', 'treinado', 'veterano', 'expert']: a posição é o nível (0 a 3)
const NIVEIS = Object.keys(GRAUS);

const siglaDoAtributo = (id) => ATRIBUTOS.find((a) => a.id === id)?.sigla;

const IconeD20 = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2 21 7v10l-9 5-9-5V7Z M12 2 7 10h10Z M7 10l5 12 5-12" />
  </svg>
);

export default function Pericias({ dados, onAlterarDados, className = '' }) {
  const [soTreinadas, setSoTreinadas] = useState(false);
  const pericias = dados.pericias ?? {};

  const lista = soTreinadas
    ? PERICIAS.filter((p) => grauDaPericia(dados, p.id) !== 'destreinado')
    : PERICIAS;

  // Clicar num losango define o nível; clicar no último aceso apaga ele
  function alterarNivel(id, nivelClicado) {
    const atual = NIVEIS.indexOf(grauDaPericia(dados, id));
    const novo = atual === nivelClicado ? nivelClicado - 1 : nivelClicado;
    const grau = NIVEIS[novo];

    const novas = { ...pericias };
    if (grau === 'destreinado') delete novas[id];
    else novas[id] = grau;
    onAlterarDados({ pericias: novas });
  }

  const filtro = (
    <div className={styles.filtro} role="group" aria-label="Filtrar perícias">
      <button aria-pressed={!soTreinadas} onClick={() => setSoTreinadas(false)}>Todas</button>
      <button aria-pressed={soTreinadas} onClick={() => setSoTreinadas(true)}>Treinadas</button>
    </div>
  );

  return (
    <Painel rotulo="Perícias" acoes={filtro} className={className}>
      <ul className={styles.lista}>
        {lista.map((p) => {
          const nivel = NIVEIS.indexOf(grauDaPericia(dados, p.id));
          const bonus = bonusPericia(dados, p.id);

          return (
            <li key={p.id} className={`${styles.pericia} ${nivel > 0 ? styles.treinada : ''}`}>
              <button
                className={styles.rolar}
                title={`${p.nome}: ${dadosDoTeste(dados, p.id)} (rolagem em breve)`}
                aria-label={`Rolar ${p.nome}`}
                disabled
              >
                <IconeD20 />
              </button>

              <span className={styles.nome} title={p.nome}>
                {p.nome}
                {p.somenteTreinada && <sup title="Somente treinada">*</sup>}
                {p.carga && <sup title="Penalidade de carga">+</sup>}
              </span>

              <span className={styles.dados}>
                {dadosDoAtributo(dados, p.atributo)}
                <small>{siglaDoAtributo(p.atributo)}</small>
              </span>

              <span className={styles.losangos} role="group" aria-label={`Treino em ${p.nome}`}>
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    className={`${styles.losango} ${n <= nivel ? styles.aceso : ''}`}
                    onClick={() => alterarNivel(p.id, n)}
                    title={GRAUS[NIVEIS[n]].nome}
                    aria-label={`${p.nome}: ${GRAUS[NIVEIS[n]].nome}`}
                    aria-pressed={n <= nivel}
                  />
                ))}
              </span>

              <span className={styles.bonus}>{bonus > 0 ? `+${bonus}` : bonus}</span>
            </li>
          );
        })}

        {lista.length === 0 && <li className={styles.vazio}>Nenhuma perícia treinada ainda.</li>}
      </ul>
    </Painel>
  );
}