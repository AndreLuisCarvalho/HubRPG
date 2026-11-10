import { ELEMENTOS } from '../../../modelo';
import styles from './SigiloElemento.module.scss';

// Desenhos de cada elemento (feitos para o HubRPG)
const DESENHOS = {
  con: (
    <>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  ene: <path d="M13 2 5 14h6l-1 8 8-12h-6l1-8Z" />,
  mor: <path d="M6 3h12M6 21h12M7 3c0 6 10 6 10 9s-10 3-10 9M17 3c0 6-10 6-10 9s10 3 10 9" />,
  san: <path d="M12 3c3 5 6 8 6 12a6 6 0 0 1-12 0c0-4 3-7 6-12Z" />,
  med: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v5M12 16v5" />
    </>
  ),
};

// Círculo com o símbolo do elemento, na cor dele. "apagado" = fora do filtro
export default function SigiloElemento({ elemento, tamanho = 30, apagado = false }) {
  return (
    <span
      className={`${styles.sigilo} ${apagado ? styles.apagado : ''}`}
      style={{ '--e': ELEMENTOS[elemento]?.cor, '--tamanho': `${tamanho}px` }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24">{DESENHOS[elemento]}</svg>
    </span>
  );
}