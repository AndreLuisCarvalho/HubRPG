import { useEffect, useRef } from 'react';
import styles from './Modal.module.scss';

/**
 * Janela modal com o <dialog> nativo: Esc fecha, o foco fica preso dentro
 * e o fundo escurece (::backdrop). Clicar fora da caixa ou no ✕ também fecha.
 */
// classeCaixa: estilo extra para a caixa (ex.: o pergaminho do Grimório) · largura: máx. da janela
export default function Modal({ aberto, onFechar, titulo, sobretitulo, classeCaixa = '', largura, children }) {
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
    <dialog
      ref={ref}
      className={styles.modal}
      style={largura ? { '--largura': largura } : undefined}
      onClose={onFechar}
      onClick={aoClicar}
    >
      <div className={`${styles.caixa} ${classeCaixa}`}>
        <button type="button" className={styles.fechar} onClick={onFechar} aria-label="Fechar" title="Fechar (Esc)">
          ✕
        </button>
        {sobretitulo && <span className={styles.sobretitulo}>{sobretitulo}</span>}
        {titulo && <h2 className={styles.titulo}>{titulo}</h2>}
        {children}
      </div>
    </dialog>
  );
}