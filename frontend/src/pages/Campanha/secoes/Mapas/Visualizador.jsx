import { useCallback, useEffect, useRef, useState } from 'react';
import IconePino from './IconePino';
import RosaDosVentos from './RosaDosVentos';
import { limitar, PAPEL_EM_BRANCO, TIPOS_PINO } from './regrasMapa';
import styles from './Visualizador.module.scss';

const ARRASTO_MINIMO = 4;   // px: menos que isso é clique, não arrasto
const ZOOM_MAXIMO = 5;

/**
 * O mapa na tela: arrastar para mover, roda do mouse / pinça para zoom, tela cheia.
 * A imagem (e o papel por cima) ficam num "mundo" com transform; os pinos ficam por cima, em
 * coordenadas de tela, para manterem o mesmo tamanho em qualquer zoom.
 *
 * ferramenta: 'mover' | 'pino' (mestre: clicar no mapa põe um pino ali)
 * cartao(pino): conteúdo do cartão do pino aberto · barra: botões extras no canto
 */
export default function Visualizador({
  imagem, pergaminho = true, pinos, mestre, ferramenta = 'mover',
  pinoAberto, onAbrirPino, onAdicionarPino, onMoverPino, cartao, barra,
}) {
  const moldura = useRef(null);
  const area = useRef(null);
  const [tamanho, setTamanho] = useState(imagem ? null : PAPEL_EM_BRANCO);
  const [vista, setVista] = useState({ x: 0, y: 0, s: 1 });
  const vistaRef = useRef(vista);
  const zoomMinimo = useRef(0.1);
  const ponteiros = useRef(new Map());
  const gesto = useRef(null);
  const [arrasto, setArrasto] = useState(null);   // pino sendo arrastado: { id, x, y }
  const engolirClique = useRef(false);
  const [telaCheia, setTelaCheia] = useState(false);
  const [caixa, setCaixa] = useState({ w: 0, h: 0 });   // tamanho da área na tela
  // Cópias em ref para o enquadrar (chamado de dentro do ResizeObserver e do onLoad)
  const tamanhoRef = useRef(tamanho);
  const caixaRef = useRef(caixa);

  const aplicar = useCallback((v) => {
    vistaRef.current = v;
    setVista(v);
  }, []);

  // Mapa inteiro visível e centralizado
  const enquadrar = useCallback(() => {
    const t = tamanhoRef.current;
    const c = caixaRef.current;
    if (!t || !c.w) return;
    const s = Math.min(c.w / t.w, c.h / t.h) * 0.94;
    zoomMinimo.current = s * 0.6;
    aplicar({ x: (c.w - t.w * s) / 2, y: (c.h - t.h * s) / 2, s });
  }, [aplicar]);

  // Mede a área e enquadra (de novo quando a janela muda ou entra em tela cheia)
  useEffect(() => {
    const el = area.current;
    const observador = new ResizeObserver(() => {
      caixaRef.current = { w: el.clientWidth, h: el.clientHeight };
      setCaixa(caixaRef.current);
      enquadrar();
    });
    observador.observe(el);
    return () => observador.disconnect();
  }, [enquadrar]);

  function imagemCarregou(e) {
    tamanhoRef.current = { w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight };
    setTamanho(tamanhoRef.current);
    enquadrar();
  }

  // Zoom no ponto (px, py) da área, multiplicando a escala por "fator"
  const zoomEm = useCallback((px, py, fator) => {
    const base = vistaRef.current;
    const s = limitar(base.s * fator, zoomMinimo.current, ZOOM_MAXIMO);
    const k = s / base.s;
    aplicar({ x: px - (px - base.x) * k, y: py - (py - base.y) * k, s });
  }, [aplicar]);

  // Roda do mouse: precisa ser "não passivo" para impedir a página de rolar
  useEffect(() => {
    const el = area.current;
    function roda(e) {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomEm(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
    }
    el.addEventListener('wheel', roda, { passive: false });
    return () => el.removeEventListener('wheel', roda);
  }, [zoomEm]);

  // Tela cheia (para projetar)
  useEffect(() => {
    const mudou = () => setTelaCheia(document.fullscreenElement === moldura.current);
    document.addEventListener('fullscreenchange', mudou);
    return () => document.removeEventListener('fullscreenchange', mudou);
  }, []);

  function alternarTelaCheia() {
    if (document.fullscreenElement) document.exitFullscreen();
    else moldura.current?.requestFullscreen?.();
  }

  /* ---------- Arrastar / pinça no mapa ---------- */
  const relativo = (e) => {
    const r = area.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function comecarGesto() {
    const lista = [...ponteiros.current.values()];
    if (lista.length === 1) {
      gesto.current = { tipo: 'mover', inicio: lista[0], vista0: vistaRef.current, moveu: gesto.current?.tipo === 'pinca' };
    } else if (lista.length === 2) {
      const [a, b] = lista;
      gesto.current = {
        tipo: 'pinca', vista0: vistaRef.current, moveu: true,
        dist0: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        centro0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    }
  }

  function aoApertar(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    area.current.setPointerCapture(e.pointerId);
    ponteiros.current.set(e.pointerId, relativo(e));
    comecarGesto();
  }

  function aoMover(e) {
    if (!ponteiros.current.has(e.pointerId)) return;
    ponteiros.current.set(e.pointerId, relativo(e));
    const g = gesto.current;
    if (!g) return;

    if (g.tipo === 'mover') {
      const p = ponteiros.current.get(e.pointerId);
      const dx = p.x - g.inicio.x;
      const dy = p.y - g.inicio.y;
      if (Math.hypot(dx, dy) > ARRASTO_MINIMO) g.moveu = true;
      if (g.moveu) aplicar({ ...g.vista0, x: g.vista0.x + dx, y: g.vista0.y + dy });
    } else {
      const [a, b] = [...ponteiros.current.values()];
      const centro = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const s = limitar(g.vista0.s * (Math.hypot(a.x - b.x, a.y - b.y) / g.dist0), zoomMinimo.current, ZOOM_MAXIMO);
      // O ponto do mapa que estava sob o centro dos dedos acompanha os dedos
      const mx = (g.centro0.x - g.vista0.x) / g.vista0.s;
      const my = (g.centro0.y - g.vista0.y) / g.vista0.s;
      aplicar({ x: centro.x - mx * s, y: centro.y - my * s, s });
    }
  }

  function aoSoltar(e) {
    if (!ponteiros.current.has(e.pointerId)) return;
    const p = ponteiros.current.get(e.pointerId);
    ponteiros.current.delete(e.pointerId);
    const g = gesto.current;

    if (ponteiros.current.size === 0) {
      gesto.current = null;
      if (g?.tipo === 'mover' && !g.moveu && e.type === 'pointerup') clicouNoMapa(p);
    } else {
      comecarGesto();   // saiu um dedo da pinça: segue arrastando com o outro
    }
  }

  function clicouNoMapa(p) {
    const v = vistaRef.current;
    const x = (p.x - v.x) / (v.s * tamanho.w);
    const y = (p.y - v.y) / (v.s * tamanho.h);
    if (mestre && ferramenta === 'pino' && x >= 0 && x <= 1 && y >= 0 && y <= 1) onAdicionarPino?.(x, y);
    else onAbrirPino?.(null);
  }

  /* ---------- Arrastar pino (mestre) ---------- */
  function apertarPino(e, pino) {
    e.stopPropagation();
    if (!mestre || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    gesto.current = { tipo: 'pino', id: pino.id, inicio: { x: e.clientX, y: e.clientY }, orig: { x: pino.x, y: pino.y }, moveu: false };
  }

  function moverPino(e) {
    const g = gesto.current;
    if (g?.tipo !== 'pino') return;
    const dx = e.clientX - g.inicio.x;
    const dy = e.clientY - g.inicio.y;
    if (Math.hypot(dx, dy) > ARRASTO_MINIMO) g.moveu = true;
    if (!g.moveu) return;
    const v = vistaRef.current;
    setArrasto({
      id: g.id,
      x: limitar(g.orig.x + dx / (v.s * tamanho.w), 0, 1),
      y: limitar(g.orig.y + dy / (v.s * tamanho.h), 0, 1),
    });
  }

  function soltarPino() {
    const g = gesto.current;
    if (g?.tipo !== 'pino') return;
    gesto.current = null;
    if (g.moveu && arrasto) {
      engolirClique.current = true;   // o "click" que vem depois do arrasto não abre o cartão
      onMoverPino?.(g.id, { x: arrasto.x, y: arrasto.y });
    }
    setArrasto(null);
  }

  function clicarPino(pino) {
    if (engolirClique.current) {
      engolirClique.current = false;
      return;
    }
    onAbrirPino?.(pinoAberto === pino.id ? null : pino.id);
  }

  /* ---------- Desenho ---------- */
  const naTela = (p) => ({ left: vista.x + p.x * tamanho.w * vista.s, top: vista.y + p.y * tamanho.h * vista.s });
  const aberto = pinos.find((p) => p.id === pinoAberto);
  const largura = caixa.w;

  return (
    <div ref={moldura} className={`${styles.moldura} ${telaCheia ? styles.cheia : ''}`}>
      <div
        ref={area}
        className={`${styles.area} ${ferramenta === 'pino' && mestre ? styles.mira : ''}`}
        onPointerDown={aoApertar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
      >
        {tamanho && (
          <div
            className={`${styles.mundo} ${pergaminho ? styles.pergaminho : ''}`}
            style={{ width: tamanho.w, height: tamanho.h, transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.s})` }}
          >
            {imagem && <img src={imagem} alt="" draggable={false} />}
            <div className={`${styles.papel} ${imagem ? '' : styles.emBranco}`} aria-hidden="true" />
          </div>
        )}

        {/* Imagem carregando: mede o tamanho natural antes de mostrar */}
        {imagem && !tamanho && (
          <img
            className={styles.medir}
            src={imagem}
            alt=""
            onLoad={imagemCarregou}
          />
        )}

        {tamanho && pinos.map((p) => {
          const pos = arrasto?.id === p.id ? arrasto : p;
          const tipo = TIPOS_PINO[p.tipo] ?? TIPOS_PINO.lugar;
          return (
            <button
              key={p.id}
              type="button"
              className={`${styles.pino} ${p.oculto ? styles.pinoOculto : ''} ${p.id === pinoAberto ? styles.pinoAberto : ''}`}
              style={{ ...naTela(pos), '--c': tipo.cor }}
              onPointerDown={(e) => apertarPino(e, p)}
              onPointerMove={moverPino}
              onPointerUp={soltarPino}
              onPointerCancel={soltarPino}
              onClick={() => clicarPino(p)}
              aria-label={`${tipo.nome}: ${p.nome || 'sem nome'}${p.oculto ? ' (oculto)' : ''}`}
            >
              <span className={styles.cabeca}><IconePino tipo={p.tipo} /></span>
              <span className={styles.agulha} />
              {p.nome && <span className={styles.rotulo}>{p.nome}</span>}
            </button>
          );
        })}

        {/* Cartão do pino aberto: em cima do pino (ou embaixo, se faltar espaço) */}
        {tamanho && aberto && (() => {
          const pos = naTela(aberto);
          const embaixo = pos.top < 230;
          return (
            <div
              className={`${styles.cartao} ${embaixo ? styles.embaixo : ''}`}
              style={{ left: limitar(pos.left, 150, Math.max(150, largura - 150)), top: pos.top }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {cartao?.(aberto)}
            </div>
          );
        })()}

        <RosaDosVentos className={styles.rosa} />
      </div>

      <div className={styles.barra} onPointerDown={(e) => e.stopPropagation()}>
        {barra}
        <button type="button" onClick={() => zoomEm(caixa.w / 2, caixa.h / 2, 1.3)} aria-label="Aproximar" title="Aproximar">+</button>
        <button type="button" onClick={() => zoomEm(caixa.w / 2, caixa.h / 2, 1 / 1.3)} aria-label="Afastar" title="Afastar">−</button>
        <button type="button" onClick={enquadrar} aria-label="Mostrar o mapa inteiro" title="Mostrar o mapa inteiro">⤢</button>
        <button type="button" onClick={alternarTelaCheia} aria-pressed={telaCheia} title={telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}>
          {telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}
        </button>
      </div>
    </div>
  );
}
