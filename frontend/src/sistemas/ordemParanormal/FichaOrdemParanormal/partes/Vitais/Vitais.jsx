import { useState } from 'react';
import { recursos } from '../../../regras';
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

  function alterar(recurso, valor) {
    const atuais = Object.fromEntries(lista.map((r) => [r.id, r.atual]));
    atuais[recurso.id] = Math.min(Math.max(valor, 0), recurso.maximo);
    onAlterarDados({ atuais });
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
          <Orbe key={r.id} recurso={r} passo={passo} onAlterar={(valor) => alterar(r, valor)} />
        ))}
      </div>
    </Painel>
  );
}