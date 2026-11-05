import styles from './StatusBadge.module.scss';

const ROTULOS = { ativa: 'Ativa', pausada: 'Pausada', encerrada: 'Encerrada' };

export default function StatusBadge({ status }) {
  return (
    <span className={`${styles.badge} ${styles[status] ?? ''}`}>
      {ROTULOS[status] ?? status}
    </span>
  );
}