import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../../../services/api';
import { obterSistema } from '../../../../sistemas';
import { BarraRecurso } from '../../../../components';
import styles from './ListaFichas.module.scss';

export default function ListaFichas({ campanha, tipo, titulo }) {
  const [fichas, setFichas] = useState(null);
  const [erro, setErro] = useState('');
  const navigate = useNavigate();
  const sistema = obterSistema(campanha.sistema_id);

  useEffect(() => {
    api.listarFichas(campanha.id, tipo).then(setFichas).catch((e) => setErro(e.message));
  }, [campanha.id, tipo]);

  async function criarFicha() {
    const nome = window.prompt('Nome da nova ficha:')?.trim();
    if (!nome) return;
    try {
      const nova = await api.criarFicha(campanha.id, {
        nome,
        tipo,
        dados: sistema?.fichaInicial() ?? {},
      });
      navigate(`/campanha/${campanha.id}/fichas/${nova.id}`);
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <section className={styles.lista}>
      <header className={styles.topo}>
        <h1 className={styles.titulo}>{titulo}</h1>
        {fichas && <span className={styles.contador}>{fichas.length}</span>}
        <button className={styles.novo} onClick={criarFicha}>+ Nova ficha</button>
      </header>

      {erro && <p className="erro">{erro}</p>}
      {!fichas && !erro && <p className={styles.aviso}>Carregando…</p>}
      {fichas?.length === 0 && <p className={styles.aviso}>Nenhuma ficha por aqui ainda.</p>}

      {fichas?.length > 0 && (
        <div className={styles.grade}>
          {fichas.map((ficha) => (
            <Link key={ficha.id} to={`/campanha/${campanha.id}/fichas/${ficha.id}`} className={styles.ficha}>
              <div className={styles.identidade}>
                <span className={styles.avatar}>{ficha.nome.charAt(0)}</span>
                <div>
                  <span className={styles.nome}>{ficha.nome}</span>
                  {sistema && <span className={styles.resumo}>{sistema.resumo(ficha.dados)}</span>}
                </div>
              </div>

              {sistema && (
                <div className={styles.barras}>
                  {sistema.recursos(ficha.dados).map((r) => (
                    <BarraRecurso key={r.id} rotulo={r.sigla} nome={r.nome} cor={r.cor} atual={r.atual} maximo={r.maximo} />
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}