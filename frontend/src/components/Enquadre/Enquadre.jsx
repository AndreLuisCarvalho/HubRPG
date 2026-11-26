import { useRef } from 'react';
import styles from './Enquadre.module.scss';

/*
 * Enquadramento de uma imagem que preenche uma caixa (banner, fundo do menu).
 * Nada é cortado (o GIF continua animado): guarda só { x, y, z }:
 * x e y = o ponto da imagem que fica no centro do enquadre (0–100 %), z = zoom (1 = preenche a caixa).
 */
export const ENQUADRE_PADRAO = { x: 50, y: 50, z: 1 };
const ZOOM_MAXIMO = 3;
const limitar = (v, min, max) => Math.min(max, Math.max(min, v));

export function estiloDoEnquadre(enquadre) {
  const { x, y, z } = { ...ENQUADRE_PADRAO, ...enquadre };
  return {
    objectPosition: `${x}% ${y}%`,
    transform: z > 1 ? `scale(${z})` : undefined,
    transformOrigin: `${x}% ${y}%`,
  };
}

/** A imagem já enquadrada: ocupa a caixa inteira do pai (que precisa de position: relative) */
export function ImagemEnquadrada({ src, enquadre, className = '' }) {
  return (
    <img
      className={`${styles.imagem} ${className}`}
      src={src}
      alt=""
      draggable={false}
      style={estiloDoEnquadre(enquadre)}
    />
  );
}

/**
 * Prévia que enquadra: arrastar escolhe a parte que aparece; a barra dá zoom.
 * className dá o tamanho da caixa (o mesmo formato de onde a imagem aparece de verdade).
 * children ficam por cima (ex.: o botão de trocar a imagem).
 */
export function AjusteEnquadre({ src, valor, onMudar, className = '', rotulo = 'Enquadramento', children }) {
  const caixaRef = useRef(null);
  const arrasto = useRef(null);
  const atual = { ...ENQUADRE_PADRAO, ...valor };

  function comecar(e) {
    if (!src || e.button !== 0 || e.target.closest('button, label, input')) return;
    const img = caixaRef.current.querySelector('img');
    if (!img?.naturalWidth) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    arrasto.current = { px: e.clientX, py: e.clientY, x0: atual.x, y0: atual.y, img };
  }

  function mover(e) {
    const a = arrasto.current;
    if (!a) return;
    const caixa = caixaRef.current.getBoundingClientRect();
    // Quanto a imagem (coberta e com zoom) passa da caixa: é o curso do arrasto em cada eixo
    const cobre = Math.max(caixa.width / a.img.naturalWidth, caixa.height / a.img.naturalHeight);
    const sobraX = atual.z * a.img.naturalWidth * cobre - caixa.width;
    const sobraY = atual.z * a.img.naturalHeight * cobre - caixa.height;
    onMudar({
      ...atual,
      x: sobraX > 0.5 ? limitar(a.x0 - ((e.clientX - a.px) / sobraX) * 100, 0, 100) : atual.x,
      y: sobraY > 0.5 ? limitar(a.y0 - ((e.clientY - a.py) / sobraY) * 100, 0, 100) : atual.y,
    });
  }

  const soltar = () => { arrasto.current = null; };

  return (
    <div className={styles.ajuste}>
      <div
        ref={caixaRef}
        className={`${styles.caixa} ${src ? styles.arrastavel : ''} ${className}`}
        onPointerDown={comecar}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        title={src ? 'Arraste para escolher a parte que aparece' : undefined}
      >
        {src && <ImagemEnquadrada src={src} enquadre={atual} />}
        {children}
      </div>
      {src && (
        <div className={styles.controles}>
          <label className={styles.zoom}>
            <span>Zoom</span>
            <input
              type="range"
              min="1"
              max={ZOOM_MAXIMO}
              step="0.05"
              value={atual.z}
              onChange={(e) => onMudar({ ...atual, z: Number(e.target.value) })}
              aria-label={`${rotulo}: zoom`}
            />
          </label>
          <button type="button" onClick={() => onMudar({ ...ENQUADRE_PADRAO })}>Centralizar</button>
          <small>Arraste a imagem para enquadrar</small>
        </div>
      )}
    </div>
  );
}
