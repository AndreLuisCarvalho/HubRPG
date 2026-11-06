import StatusBadge from '../../StatusBadge/StatusBadge';
import styles from './DadosCampanha.module.scss';

export default function DadosCampanha({ campanha, className = '' }) {
  const { status, ultima_sessao, total_personagens } = campanha;

  return (
    <div className={`${styles.dados} ${className}`}>
      <StatusBadge status={status} />
      <span>{ultima_sessao ? `Última sessão: #${ultima_sessao}` : 'Nenhuma sessão ainda'}</span>
      <span>{total_personagens} personagem(ns)</span>
    </div>
  );
}