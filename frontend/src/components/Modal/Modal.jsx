import { useEffect, useRef } from 'react';
import styles from './Modal.module.scss';

/**
 * Janela modal com o <dialog> nativo: Esc fecha, o foco fica preso dentro
 * e o fundo escurece (::backdrop). Clicar fora da caixa também fecha.
 */
export default function Modal({ aberto, onFechar, titulo, sobretitulo, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  // O clique no fundo chega com o próprio <dialog> como alvo
  function aoClicar(e) {
    if (e.target === ref.current) onFechar();
  }

  return (
    <dialog ref={ref} className={styles.modal} onClose={onFechar} onClick={aoClicar}>
      <div className={styles.caixa}>
        {sobretitulo && <span className={styles.sobretitulo}>{sobretitulo}</span>}
        {titulo && <h2 className={styles.titulo}>{titulo}</h2>}
        {children}
      </div>
    </dialog>
  );
}