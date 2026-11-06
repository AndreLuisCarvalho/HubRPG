import { useEffect, useState } from 'react';
import { api } from '../../../../services/api';
import styles from './ListaFichas.module.scss';

export default function ListaFichas({ campanha, tipo, titulo }) {
  const [fichas, setFichas] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.listarFichas(campanha.id, tipo).then(setFichas).catch((e) => setErro(e.message));
  }, [campanha.id, tipo]);

  return (
    <section className={styles.lista}>
      <header className={styles.topo}>
        <h1 className={styles.titulo}>{titulo}</h1>
        {fichas && <span className={styles.contador}>{fichas.length}</span>}
      </header>

      {erro && <p className="erro">{erro}</p>}
      {!fichas && !erro && <p className={styles.aviso}>Carregando…</p>}
      {fichas?.length === 0 && <p className={styles.aviso}>Nenhuma ficha por aqui ainda.</p>}

      {fichas?.length > 0 && (
        <div className={styles.grade}>
          {fichas.map((ficha) => (
            <article key={ficha.id} className={styles.ficha}>
              <span className={styles.avatar}>{ficha.nome.charAt(0)}</span>
              <span className={styles.nome}>{ficha.nome}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}