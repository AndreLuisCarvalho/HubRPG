import { useState } from 'react';
import {
  contagemDoRecurso, definirAtual, definirContagem, definirTemporario, perderRecurso, recursos,
} from '../../../regras';
import Contagem from '../Contagem/Contagem';
import Orbe from '../Orbe/Orbe';
import Painel from '../Painel/Painel';
import BotaoRecolher from '../Recolher/BotaoRecolher';
import useRecolhido from '../Recolher/useRecolhido';
import styles from './Vitais.module.scss';

const PASSOS = [1, 5, 10];
const CHAVE_PASSO = 'hubrpg:passo-vitais';

// O passo escolhido fica salvo só neste navegador; se não der para ler, começa em 1
function lerPasso() {
  try {
    const salvo = Number(localStorage.getItem(CHAVE_PASSO));
    return PASSOS.includes(salvo) ? salvo : 1;
  } catch {
    return 1;
  }
}

export default function Vitais({ dados, onAlterarDados, className = '' }) {
  const [passo, setPasso] = useState(lerPasso);
  // No celular o painel pode ficar recolhido numa linha só
  const [recolhido, alternar] = useRecolhido('hubrpg:vitais-recolhido');
  const lista = recursos(dados);

  function escolherPasso(novo) {
    setPasso(novo);
    try {
      localStorage.setItem(CHAVE_PASSO, String(novo));
    } catch {
      // sem armazenamento (aba anônima, por exemplo): só não lembra da escolha
    }
  }

  // Com PV/SAN em 0 (ou já marcando), o nome da orbe vira a contagem de morrendo/enlouquecendo
  function rodapeDe(recurso) {
    const contagem = contagemDoRecurso(dados, recurso.id);
    if (!contagem || (recurso.atual > 0 && contagem.valor === 0)) return null;
    return (
      <Contagem
        {...contagem}
        onAlterar={(valor) => onAlterarDados(definirContagem(dados, contagem.id, valor))}
      />
    );
  }

  // Resumo de uma linha (só aparece no celular com o painel recolhido): toque para abrir
  const resumo = (
    <button
      type="button"
      className={styles.resumo}
      onClick={alternar}
      aria-expanded="false"
      aria-controls="orbes-vitais"
      title="Mostrar Vida, Sanidade e Esforço"
    >
      {lista.map((r) => (
        <span key={r.id} className={styles.item} style={{ '--cor-recurso': r.cor }}>
          <span className={styles.linha}>
            <b>{r.sigla}</b>
            <span className={styles.valor}>
              {r.atual + r.temporario}<small>/{r.maximo}</small>
            </span>
          </span>
          <span className={styles.barra}>
            <span style={{ width: `${r.maximo ? Math.min(100, (r.atual / r.maximo) * 100) : 0}%` }} />
          </span>
        </span>
      ))}
    </button>
  );

  const seletor = (
    <div className={styles.passo} role="group" aria-label="Quanto cada clique tira ou soma">
      <span>Passo</span>
      <div className={styles.opcoes}>
        {PASSOS.map((p) => (
          <button key={p} aria-pressed={passo === p} onClick={() => escolherPasso(p)}>
            {p}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Painel
      acoes={(
        <>
          {resumo}
          {seletor}
          <BotaoRecolher recolhido={recolhido} onClick={alternar} nome="Vida, Sanidade e Esforço" controla="orbes-vitais" />
        </>
      )}
      className={`${className} ${recolhido ? styles.recolhido : ''}`}
    >
      <div id="orbes-vitais" className={styles.orbes}>
        {lista.map((r) => (
          <Orbe
            key={r.id}
            recurso={r}
            passo={passo}
            onMenos={(qtd) => onAlterarDados(perderRecurso(dados, r.id, qtd))}
            onMais={(qtd) => onAlterarDados(definirAtual(dados, r.id, r.atual + qtd))}
            onDigitar={(valor) => onAlterarDados(definirAtual(dados, r.id, valor))}
            onTemporario={(valor) => onAlterarDados(definirTemporario(dados, r.id, valor))}
            rodape={rodapeDe(r)}
          />
        ))}
      </div>
    </Painel>
  );
}