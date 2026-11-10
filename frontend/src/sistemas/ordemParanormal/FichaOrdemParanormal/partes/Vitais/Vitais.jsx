import { useState } from 'react';
import {
  contagemDoRecurso, definirAtual, definirContagem, definirTemporario, perderRecurso, recursos,
} from '../../../regras';
import Contagem from '../Contagem/Contagem';
import Orbe from '../Orbe/Orbe';
import Painel from '../Painel/Painel';
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
    <Painel acoes={seletor} className={className}>
      <div className={styles.orbes}>
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