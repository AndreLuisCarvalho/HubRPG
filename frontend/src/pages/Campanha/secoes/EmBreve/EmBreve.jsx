import { useParams } from 'react-router-dom';
import styles from './EmBreve.module.scss';

const NOMES = {
  mapas: 'Mapas',
  arquivos: 'Arquivos',
  itens: 'Itens',
  livro: 'Livro do sistema',
  dados: 'Dados',
};

export default function EmBreve() {
  const { secao } = useParams();

  return (
    <section className={styles.emBreve}>
      <h1>{NOMES[secao] ?? 'Seção'}</h1>
      <p>Essa parte da campanha ainda está sendo construída.</p>
    </section>
  );
}