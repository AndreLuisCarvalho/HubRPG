import StatusBadge from '../StatusBadge/StatusBadge';
import styles from './InfoCampanha.module.scss';

export default function InfoCampanha({ campanha }) {
  const { nome, sistema, descricao, status, cor, ultima_sessao, total_personagens } = campanha;

  return (
    <div className={styles.info} style={{ '--cor': cor }}>
      <span className={styles.sistema}>{sistema || 'Sistema livre'}</span>
      <h2 className={styles.nome}>{nome}</h2>
      {descricao && <p className={styles.descricao}>{descricao}</p>}
      <div className={styles.dados}>
        <StatusBadge status={status} />
        <span>{ultima_sessao ? `Última sessão: #${ultima_sessao}` : 'Nenhuma sessão ainda'}</span>
        <span>{total_personagens} personagem(ns)</span>
      </div>
    </div>
  );
}