import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { criarPalco, materiaisDo, pecasDoDado } from './dadoWebGL';
import { aparencia } from './skins';
import styles from './PreviaDado.module.scss';

const FOV = 26;
const DISTANCIA = 30;

/**
 * Vitrine do dado: um d20 grande (teste) e um d8 (dano) girando devagar com a cor/skin escolhida.
 * Sem WebGL, mostra só a mensagem.
 */
export default function PreviaDado({ estilo, className = '' }) {
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
      // [lados, tipo, raio, x, y]
      const pecasDaVitrine = [[20, 'teste', 4.3, -2.6, 0.7], [8, 'dano', 2.3, 5.4, -3.1]];
      pecasDaVitrine.forEach(([lados, tipo, raio, x, y]) => {
        const ap = aparencia(estilo, tipo);
        const pecas = pecasDoDado(lados, lados, ap);
        const malha = new THREE.Mesh(pecas.geometria, materiaisDo(pecas, ap));
        malha.scale.setScalar(raio);
        malha.position.set(x, y, 0);
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
  }, [estilo]);

  return (
    <div className={`${styles.previa} ${className}`}>
      <canvas ref={tela} className={styles.tela} aria-label="Prévia do dado" role="img" />
    </div>
  );
}
