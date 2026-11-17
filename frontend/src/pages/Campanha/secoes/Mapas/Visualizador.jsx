import { useCallback, useEffect, useRef, useState } from 'react';
import CamadaNevoa from './CamadaNevoa';
import IconePino from './IconePino';
import RosaDosVentos from './RosaDosVentos';
import { caminhoDaRota, limitar, PAPEL_EM_BRANCO, TIPOS_PINO } from './regrasMapa';
import styles from './Visualizador.module.scss';

const ARRASTO_MINIMO = 4;   // px: menos que isso é clique, não arrasto
const ZOOM_MAXIMO = 5;
const FERRAMENTAS_DE_CLIQUE = ['pino', 'rota', 'token'];
const PINCEIS = ['revelar', 'cobrir'];

/**
 * O mapa na tela: arrastar para mover, roda do mouse / pinça para zoom, tela cheia.
 * A imagem, o papel e a névoa ficam num "mundo" com transform; pinos, tokens e rotas ficam por cima,
 * em coordenadas de tela, para manterem o mesmo tamanho em qualquer zoom.
 *
 * ferramenta: 'mover' | 'pino' | 'rota' | 'token' (clicar no mapa → onClicarMapa) | 'revelar' | 'cobrir' (pincel da névoa)
 * selecionado: { tipo: 'pino' | 'token' | 'rota', id } — o que tem o cartão aberto
 * cartao(selecionado): conteúdo do cartão · ferramentas / rodape: barras do mestre dentro da moldura
 */
export default function Visualizador({
  imagem, pergaminho = true, mestre, ferramenta = 'mover',
  pinos = [], tokens = [], rotas = [], rascunhoRota = null,
  nevoa = null, pincel = 60,
  selecionado, onSelecionar, onClicarMapa, onMover, cartao,
  ferramentas, rodape,
}) {
  const moldura = useRef(null);
  const area = useRef(null);
  const nevoaRef = useRef(null);
  const [tamanho, setTamanho] = useState(imagem ? null : PAPEL_EM_BRANCO);
  const [vista, setVista] = useState({ x: 0, y: 0, s: 1 });
  const vistaRef = useRef(vista);
  const zoomMinimo = useRef(0.1);
  const ponteiros = useRef(new Map());
  const gesto = useRef(null);
  const [arrasto, setArrasto] = useState(null);   // objeto sendo arrastado: { tipo, id, x, y }
  const engolirClique = useRef(false);
  const [telaCheia, setTelaCheia] = useState(false);
  const [caixa, setCaixa] = useState({ w: 0, h: 0 });   // tamanho da área na tela
  const [mira, setMira] = useState(null);   // círculo do pincel seguindo o mouse
  // Cópias em ref para o enquadrar (chamado de dentro do ResizeObserver e do onLoad)
  const tamanhoRef = useRef(tamanho);
  const caixaRef = useRef(caixa);
  const pintando = mestre && PINCEIS.includes(ferramenta) && nevoa?.ativa;

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

  /* ---------- Coordenadas ---------- */
  const relativo = (e) => {
    const r = area.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  // Ponto da tela → fração do mapa (0–1)
  const noMapa = (p) => {
    const v = vistaRef.current;
    return { x: (p.x - v.x) / (v.s * tamanho.w), y: (p.y - v.y) / (v.s * tamanho.h) };
  };

  /* ---------- Gestos no mapa: arrastar, pinça, pincel ---------- */
  function comecarGesto() {
    const lista = [...ponteiros.current.values()];
    if (lista.length === 1) {
      if (pintando && gesto.current?.tipo !== 'pinca') {
        gesto.current = { tipo: 'pincel', ultimo: noMapa(lista[0]) };
        nevoaRef.current?.pintar(gesto.current.ultimo, gesto.current.ultimo, ferramenta, pincel / (vistaRef.current.s * tamanho.w));
        return;
      }
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
    if (pintando && e.pointerType === 'mouse') setMira(relativo(e));
    if (!ponteiros.current.has(e.pointerId)) return;
    ponteiros.current.set(e.pointerId, relativo(e));
    const g = gesto.current;
    if (!g) return;

    if (g.tipo === 'pincel') {
      const ponto = noMapa(ponteiros.current.get(e.pointerId));
      nevoaRef.current?.pintar(g.ultimo, ponto, ferramenta, pincel / (vistaRef.current.s * tamanho.w));
      g.ultimo = ponto;
    } else if (g.tipo === 'mover') {
      const p = ponteiros.current.get(e.pointerId);
      const dx = p.x - g.inicio.x;
      const dy = p.y - g.inicio.y;
      if (Math.hypot(dx, dy) > ARRASTO_MINIMO) g.moveu = true;
      if (g.moveu) aplicar({ ...g.vista0, x: g.vista0.x + dx, y: g.vista0.y + dy });
    } else if (g.tipo === 'pinca') {
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
      if (g?.tipo === 'pincel') nevoaRef.current?.salvar();
      if (g?.tipo === 'mover' && !g.moveu && e.type === 'pointerup') clicouNoMapa(p);
    } else {
      comecarGesto();   // saiu um dedo da pinça: segue com o outro
    }
  }

  function clicouNoMapa(p) {
    const { x, y } = noMapa(p);
    const dentro = x >= 0 && x <= 1 && y >= 0 && y <= 1;
    if (mestre && FERRAMENTAS_DE_CLIQUE.includes(ferramenta) && dentro) onClicarMapa?.(x, y);
    else onSelecionar?.(null);
  }

  /* ---------- Arrastar pino / token (mestre) ---------- */
  function apertarObjeto(e, tipo, obj) {
    e.stopPropagation();
    if (!mestre || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    gesto.current = { tipo: 'objeto', alvo: tipo, id: obj.id, inicio: { x: e.clientX, y: e.clientY }, orig: { x: obj.x, y: obj.y }, moveu: false };
  }

  function moverObjeto(e) {
    const g = gesto.current;
    if (g?.tipo !== 'objeto') return;
    const dx = e.clientX - g.inicio.x;
    const dy = e.clientY - g.inicio.y;
    if (Math.hypot(dx, dy) > ARRASTO_MINIMO) g.moveu = true;
    if (!g.moveu) return;
    const v = vistaRef.current;
    setArrasto({
      tipo: g.alvo,
      id: g.id,
      x: limitar(g.orig.x + dx / (v.s * tamanho.w), 0, 1),
      y: limitar(g.orig.y + dy / (v.s * tamanho.h), 0, 1),
    });
  }

  function soltarObjeto() {
    const g = gesto.current;
    if (g?.tipo !== 'objeto') return;
    gesto.current = null;
    if (g.moveu && arrasto) {
      engolirClique.current = true;   // o "click" que vem depois do arrasto não abre o cartão
      onMover?.(g.alvo, g.id, { x: arrasto.x, y: arrasto.y });
    }
    setArrasto(null);
  }

  function clicarObjeto(tipo, id) {
    if (engolirClique.current) {
      engolirClique.current = false;
      return;
    }
    const mesmo = selecionado?.tipo === tipo && selecionado.id === id;
    onSelecionar?.(mesmo ? null : { tipo, id });
  }

  /* ---------- Desenho ---------- */
  const naTela = (p) => ({ left: vista.x + p.x * tamanho.w * vista.s, top: vista.y + p.y * tamanho.h * vista.s });
  const posicao = (tipo, obj) => (arrasto?.tipo === tipo && arrasto.id === obj.id ? arrasto : obj);
  const telaXY = (p) => {
    const t = naTela(p);
    return { x: t.left, y: t.top };
  };

  // Onde fica o cartão do que está selecionado
  let ancora = null;
  if (tamanho && selecionado) {
    if (selecionado.tipo === 'pino') ancora = pinos.find((p) => p.id === selecionado.id);
    if (selecionado.tipo === 'token') ancora = tokens.find((t) => t.id === selecionado.id);
    if (selecionado.tipo === 'rota') {
      const r = rotas.find((x) => x.id === selecionado.id);
      ancora = r?.pontos[Math.floor((r.pontos.length - 1) / 2)];
    }
  }

  const classesArea = [
    styles.area,
    mestre && FERRAMENTAS_DE_CLIQUE.includes(ferramenta) && styles.mira,
    pintando && styles.pincel,
  ].filter(Boolean).join(' ');

  return (
    <div ref={moldura} className={`${styles.moldura} ${telaCheia ? styles.cheia : ''}`}>
      <div
        ref={area}
        className={classesArea}
        onPointerDown={aoApertar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        onPointerLeave={() => setMira(null)}
      >
        {tamanho && (
          <div
            className={`${styles.mundo} ${pergaminho ? styles.pergaminho : ''}`}
            style={{ width: tamanho.w, height: tamanho.h, transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.s})` }}
          >
            {imagem && <img src={imagem} alt="" draggable={false} />}
            <div className={`${styles.papel} ${imagem ? '' : styles.emBranco}`} aria-hidden="true" />
            {nevoa?.ativa && (
              <CamadaNevoa
                ref={nevoaRef}
                largura={tamanho.w}
                altura={tamanho.h}
                mascara={nevoa.mascara}
                transparente={mestre}
                onMudar={nevoa.onMudar}
              />
            )}
          </div>
        )}

        {/* Imagem carregando: mede o tamanho natural antes de mostrar */}
        {imagem && !tamanho && <img className={styles.medir} src={imagem} alt="" onLoad={imagemCarregou} />}

        {/* Rotas tracejadas (em coordenadas de tela: o traço fica do mesmo tamanho em qualquer zoom) */}
        {tamanho && (rotas.length > 0 || rascunhoRota) && (
          <svg className={styles.rotas} width={caixa.w} height={caixa.h} aria-hidden={!mestre}>
            {rotas.map((r) => {
              const pts = r.pontos.map(telaXY);
              const d = caminhoDaRota(pts);
              const fim = pts.at(-1);
              const aberta = selecionado?.tipo === 'rota' && selecionado.id === r.id;
              return (
                <g key={r.id} className={`${r.oculta ? styles.rotaOculta : ''} ${aberta ? styles.rotaAberta : ''}`} style={{ '--r': r.cor }}>
                  <path className={styles.tracado} d={d} />
                  <circle className={styles.inicio} cx={pts[0].x} cy={pts[0].y} r="5" />
                  {fim && <path className={styles.xis} d={`M${fim.x - 7} ${fim.y - 7}l14 14M${fim.x + 7} ${fim.y - 7}l-14 14`} />}
                  {ferramenta === 'mover' && (
                    <path
                      className={styles.alvoRota}
                      d={d}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => clicarObjeto('rota', r.id)}
                    >
                      <title>{r.nome || 'Rota'}</title>
                    </path>
                  )}
                </g>
              );
            })}
            {rascunhoRota && (
              <g className={styles.rascunho}>
                <path className={styles.tracado} d={caminhoDaRota(rascunhoRota.map(telaXY))} />
                {rascunhoRota.map((p, i) => {
                  const t = telaXY(p);
                  return <circle key={i} cx={t.x} cy={t.y} r="4" />;
                })}
              </g>
            )}
          </svg>
        )}

        {tamanho && pinos.map((p) => {
          const tipo = TIPOS_PINO[p.tipo] ?? TIPOS_PINO.lugar;
          const aberto = selecionado?.tipo === 'pino' && selecionado.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              className={`${styles.pino} ${p.oculto ? styles.pinoOculto : ''} ${aberto ? styles.pinoAberto : ''}`}
              style={{ ...naTela(posicao('pino', p)), '--c': tipo.cor }}
              onPointerDown={(e) => apertarObjeto(e, 'pino', p)}
              onPointerMove={moverObjeto}
              onPointerUp={soltarObjeto}
              onPointerCancel={soltarObjeto}
              onClick={() => clicarObjeto('pino', p.id)}
              aria-label={`${tipo.nome}: ${p.nome || 'sem nome'}${p.oculto ? ' (oculto)' : ''}`}
            >
              <span className={styles.cabeca}><IconePino tipo={p.tipo} /></span>
              <span className={styles.agulha} />
              {p.nome && <span className={styles.rotulo}>{p.nome}</span>}
            </button>
          );
        })}

        {/* Tokens dos agentes: foto redonda; só o mestre arrasta */}
        {tamanho && tokens.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${styles.token} ${selecionado?.tipo === 'token' && selecionado.id === t.id ? styles.tokenAberto : ''}`}
            style={naTela(posicao('token', t))}
            onPointerDown={(e) => apertarObjeto(e, 'token', t)}
            onPointerMove={moverObjeto}
            onPointerUp={soltarObjeto}
            onPointerCancel={soltarObjeto}
            onClick={() => mestre && clicarObjeto('token', t.id)}
            aria-label={`Agente ${t.nome}`}
            title={t.nome}
          >
            {t.foto ? <img src={t.foto} alt="" draggable={false} /> : <span>{t.nome.slice(0, 1)}</span>}
            <span className={styles.rotulo}>{t.nome}</span>
          </button>
        ))}

        {/* Cartão do que está selecionado: em cima (ou embaixo, se faltar espaço) */}
        {ancora && (() => {
          const pos = naTela(posicao(selecionado.tipo, ancora));
          const embaixo = pos.top < 230;
          return (
            <div
              className={`${styles.cartao} ${embaixo ? styles.embaixo : ''} ${selecionado.tipo !== 'pino' ? styles.cartaoBaixo : ''}`}
              style={{ left: limitar(pos.left, 150, Math.max(150, caixa.w - 150)), top: pos.top }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {cartao?.(selecionado)}
            </div>
          );
        })()}

        {/* Círculo do pincel */}
        {pintando && mira && (
          <span className={`${styles.miraPincel} ${ferramenta === 'cobrir' ? styles.cobrindo : ''}`} style={{ left: mira.x, top: mira.y, width: pincel * 2, height: pincel * 2 }} />
        )}

        <RosaDosVentos className={styles.rosa} />
      </div>

      {ferramentas && (
        <div className={styles.ferramentas} onPointerDown={(e) => e.stopPropagation()}>{ferramentas}</div>
      )}

      <div className={styles.barra} onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => zoomEm(caixa.w / 2, caixa.h / 2, 1.3)} aria-label="Aproximar" title="Aproximar">+</button>
        <button type="button" onClick={() => zoomEm(caixa.w / 2, caixa.h / 2, 1 / 1.3)} aria-label="Afastar" title="Afastar">−</button>
        <button type="button" onClick={enquadrar} aria-label="Mostrar o mapa inteiro" title="Mostrar o mapa inteiro">⤢</button>
        <button type="button" onClick={alternarTelaCheia} aria-pressed={telaCheia} title={telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}>
          {telaCheia ? 'Sair' : 'Tela cheia'}
        </button>
      </div>

      {rodape && <div className={styles.rodape} onPointerDown={(e) => e.stopPropagation()}>{rodape}</div>}
    </div>
  );
}
