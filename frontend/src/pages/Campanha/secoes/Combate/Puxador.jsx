import styles from './Arena.module.scss';

const MINIMO = 130;        // o painel nunca fica menor que isto
const CAMPO_MINIMO = 120;  // nem o campo acima dele

/**
 * Alça do painel da carta no celular: arrastar para cima/baixo muda a altura do painel (o campo
 * fica com o resto). Toque duplo volta ao tamanho automático. alvo: o ref do bloco do meio (campo +
 * painel), de onde se mede o espaço.
 */
export default function Puxador({ alvo, onMudar }) {
  function comecar(e) {
    const caixa = alvo.current?.getBoundingClientRect();
    if (!caixa) return;
    const el = e.currentTarget;
    el.setPointerCapture?.(e.pointerId);
    const mover = (ev) => {
      const altura = caixa.bottom - ev.clientY;
      onMudar(Math.round(Math.max(MINIMO, Math.min(caixa.height - CAMPO_MINIMO, altura))));
    };
    const soltar = () => {
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerup', soltar);
      el.removeEventListener('pointercancel', soltar);
    };
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
  }

  return (
    <div
      className={styles.puxador}
      role="separator"
      aria-orientation="horizontal"
      aria-label="Arraste para mudar a altura do painel (toque duplo: automático)"
      onPointerDown={comecar}
      onDoubleClick={() => onMudar(null)}
    >
      <i />
    </div>
  );
}
