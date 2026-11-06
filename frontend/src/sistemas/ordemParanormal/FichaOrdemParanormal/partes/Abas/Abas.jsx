import { useState } from 'react';
import styles from './Abas.module.scss';

const ABAS = [
  { id: 'combate', rotulo: 'Combate', emBreve: 'Ataques chegam junto com o rolador de dados.' },
  { id: 'habilidades', rotulo: 'Habilidades', emBreve: 'Habilidades de classe e trilha em breve.' },
  { id: 'rituais', rotulo: 'Rituais', emBreve: 'Rituais em breve.' },
  { id: 'inventario', rotulo: 'Inventário', emBreve: 'O inventário em grade chega numa fase própria.' },
  { id: 'descricao', rotulo: 'Descrição' },
];

export default function Abas({ dados, onAlterarDados }) {
  const [ativa, setAtiva] = useState(ABAS[0].id);
  const aba = ABAS.find((a) => a.id === ativa);

  function salvarDescricao(e) {
    const texto = e.target.value;
    if (texto !== (dados.descricao ?? '')) onAlterarDados({ descricao: texto });
  }

  return (
    <section className={styles.abas}>
      <div className={styles.lista} role="tablist">
        {ABAS.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={a.id === ativa}
            className={`${styles.aba} ${a.id === ativa ? styles.ativa : ''}`}
            onClick={() => setAtiva(a.id)}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      <div className={styles.painel} role="tabpanel">
        {aba.id === 'descricao' ? (
          <textarea
            className={styles.texto}
            defaultValue={dados.descricao ?? ''}
            onBlur={salvarDescricao}
            placeholder="Aparência, personalidade, história, objetivos…"
          />
        ) : (
          <p className={styles.vazio}>{aba.emBreve}</p>
        )}
      </div>
    </section>
  );
}