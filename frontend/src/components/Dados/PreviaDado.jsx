import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { criarPalco, materiaisDo, pecasDoDado } from './dadoWebGL';
import { aparencia, KIT } from './skins';
import styles from './PreviaDado.module.scss';

const FOV = 26;
const DISTANCIA = 30;

// Onde cada peça do kit fica na vitrine (unidades do mundo): d4 a d10 em cima, d12, d20 e d100 embaixo
const POSICOES = {
  4: [-6.6, 2.7], 6: [-2.2, 2.7], 8: [2.2, 2.7], 10: [6.6, 2.7],
  12: [-4.4, -2.9], 20: [0, -2.9], 100: [4.4, -2.9],
};

/**
 * Vitrine do kit: as 7 peças girando devagar, cada uma com a sua cor/skin.
 * "selecionado" (lados) aparece maior e mais à frente.
 */
export default function PreviaDado({ estilo, selecionado = 20, className = '' }) {
  const tela = useRef(null);
  const mundo = useRef(null);

  /* ---------- Palco (uma vez) e o giro contínuo ---------- */
  useEffect(() => {
    let palco;
    try {
      palco = criarPalco(tela.current, { fov: FOV, distancia: DISTANCIA });
    } catch {
      return undefined;
    }
    const m = { ...palco, dados: [], quadro: 0 };
    mundo.current = m;

    function medir() {
      if (!tela.current) return;   // já saiu da tela (o observador ainda dispara uma vez)
      const { clientWidth: w, clientHeight: h } = tela.current;
      if (!w || !h) return;
      m.renderer.setSize(w, h, false);
      m.camera.aspect = w / h;
      m.camera.updateProjectionMatrix();
    }
    const observador = new ResizeObserver(medir);
    observador.observe(tela.current);
    medir();

    const giro = new THREE.Euler();
    const animar = (agora) => {
      const t = agora / 1000;
      m.dados.forEach((malha, i) => {
        giro.set(0.35 + Math.sin(t * 0.5 + i) * 0.35, t * (0.45 + i * 0.2), Math.sin(t * 0.3 + i) * 0.2);
        malha.quaternion.setFromEuler(giro);
      });
      m.renderer.render(m.cena, m.camera);
      m.quadro = requestAnimationFrame(animar);
    };
    m.quadro = requestAnimationFrame(animar);

    return () => {
      cancelAnimationFrame(m.quadro);
      observador.disconnect();
      palco.descartar();
      mundo.current = null;
    };
  }, []);

  /* ---------- Os dados com a aparência atual ---------- */
  useEffect(() => {
    const m = mundo.current;
    if (!m) return undefined;
    const vivo = { cancelado: false };
    const criados = [];

    (async () => {
      await document.fonts?.load('700 64px "Barlow Condensed"').catch(() => {});
      if (vivo.cancelado) return;
      KIT.forEach((lados) => {
        const [x, y] = POSICOES[lados];
        const ap = aparencia(estilo, lados);
        const pecas = pecasDoDado(lados, lados, ap, lados === 100 ? 'dezenas' : null);
        const malha = new THREE.Mesh(pecas.geometria, materiaisDo(pecas, ap));
        const escolhido = lados === selecionado;
        malha.scale.setScalar(escolhido ? 2.35 : 1.6);
        malha.position.set(x, y, escolhido ? 1.5 : 0);
        m.cena.add(malha);
        criados.push(malha);
      });
      m.dados = criados;
    })();

    return () => {
      vivo.cancelado = true;
      criados.forEach((malha) => {
        m.cena.remove(malha);
        malha.material.forEach((mat) => mat.dispose());
      });
      m.dados = [];
    };
  }, [estilo, selecionado]);

  return (
    <div className={`${styles.previa} ${className}`}>
      <canvas ref={tela} className={styles.tela} aria-label="Prévia do dado" role="img" />
    </div>
  );
}
