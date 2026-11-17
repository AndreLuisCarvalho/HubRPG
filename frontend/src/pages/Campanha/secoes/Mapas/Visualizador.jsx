import { useCallback, useEffect, useRef, useState } from 'react';
import CamadaNevoa from './CamadaNevoa';
import IconePino from './IconePino';
import RosaDosVentos from './RosaDosVentos';
import {
  caixaDe, caminhoDaRota, centroDe, distanciaPx, formatarDistancia, limitar, PAPEL_EM_BRANCO, retangulo, TIPOS_PINO,
} from './regrasMapa';
import styles from './Visualizador.module.scss';

const ARRASTO_MINIMO = 4;   // px: menos que isso é clique, não arrasto
const ZOOM_MAXIMO = 5;
const FERRAMENTAS_DE_CLIQUE = ['pino', 'rota', 'token', 'texto', 'comodo'];
const VOO_MS = 700;   // duração do zoom até um cômodo
const calmo = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
// Ponto dentro do polígono (raio cruzando as arestas)
function pontoNoPoligono(p, pontos) {
  let dentro = false;
  for (let i = 0, j = pontos.length - 1; i < pontos.length; j = i, i += 1) {
    const a = pontos[i];
    const b = pontos[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) dentro = !dentro;
  }
  return dentro;
}
const suave = (k) => (k < 0.5 ? 2 * k * k : 1 - ((-2 * k + 2) ** 2) / 2);
const MEDIDAS = ['regua', 'escala'];   // cliques que medem (não salvam nada)

// Cada post-it fica um pouco torto, sempre do mesmo jeito (sai do id)
const inclinacaoDo = (id) => ([...String(id)].reduce((s, c) => s + c.charCodeAt(0), 0) % 9) - 4;
const PINCEIS = ['revelar', 'cobrir'];

/**
 * O mapa na tela: arrastar para mover, roda do mouse / pinça para zoom, tela cheia.
 * A imagem, o papel e a névoa ficam num "mundo" com transform; pinos, tokens e rotas ficam por cima,
 * em coordenadas de tela, para manterem o mesmo tamanho em qualquer zoom.
 *
 * ferramenta: 'mover' | 'pino' | 'rota' | 'token' | 'texto' (clicar no mapa → onClicarMapa)
 *   | 'revelar' | 'cobrir' (pincel da névoa) | 'regua' (medir, todos) | 'escala' (mestre: 2 cliques → onMedirEscala)
 * selecionado: { tipo: 'pino' | 'token' | 'rota' | 'nota', id } — o que tem o cartão aberto
 * cartao(selecionado): conteúdo do cartão · ferramentas / rodape: barras do mestre dentro da moldura
 * barra: botões extras no canto (régua) · miniatura: só para ver (Visão geral), sem controles
 * regioes: cômodos (polígonos). Ferramenta 'comodo': arrastar = retângulo, clicar = ponto do polígono
 *   (rascunhoRegiao), clicar no 1º ponto fecha. Clicar num cômodo (mestre, ferramenta mover): a câmera
 *   voa até ele e chama onEntrarRegiao. focoInicial: começa enquadrado nesses pontos e afasta (voltar
 *   de um cômodo) · entrada: o mapa aparece com a transição de entrar num cômodo
 */
export default function Visualizador({
  imagem, pergaminho = true, mestre, ferramenta = 'mover',
  pinos = [], tokens = [], rotas = [], notas = [], rascunhoRota = null,
  nevoa = null, pincel = 60, escala = null, onMedirEscala,
  selecionado, onSelecionar, onClicarMapa, onMover, cartao,
  ferramentas, rodape, barra, miniatura = false,
  regioes = [], rascunhoRegiao = null, onDesenharRegiao, onFecharRegiao, onEntrarRegiao,
  entrada = false, focoInicial = null,
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
  const [mira, setMira] = useState(null);   // posição do mouse (círculo do pincel, trecho da régua)
  // Pontos da régua/escala; valem só para a ferramenta em que foram marcados
  const [medida, setMedida] = useState({ ferramenta: null, pontos: [] });
  const pontosMedida = medida.ferramenta === ferramenta ? medida.pontos : [];
  const medindo = MEDIDAS.includes(ferramenta) && (ferramenta === 'regua' || mestre);
  // Cópias em ref para o enquadrar (chamado de dentro do ResizeObserver e do onLoad)
  const tamanhoRef = useRef(tamanho);
  const caixaRef = useRef(caixa);
  const pintando = mestre && PINCEIS.includes(ferramenta) && nevoa?.ativa;
  const [esboco, setEsboco] = useState(null);   // retângulo de cômodo sendo arrastado: { a, b }
  const [acesa, setAcesa] = useState(null);   // cômodo aceso pelo 1º toque (celular)
  const tipoDoToque = useRef('mouse');
  const voo = useRef(0);
  const focoRef = useRef(focoInicial);
  const desenhandoPoligono = (rascunhoRegiao?.length ?? 0) > 0;

  const aplicar = useCallback((v) => {
    vistaRef.current = v;
    setVista(v);
  }, []);

  // A vista que enquadra uma caixa do mapa (frações), com folga
  const vistaPara = useCallback((pontos, folga = 0.88) => {
    const t = tamanhoRef.current;
    const c = caixaRef.current;
    const { x0, y0, x1, y1 } = caixaDe(pontos);
    const w = Math.max((x1 - x0) * t.w, 1);
    const h = Math.max((y1 - y0) * t.h, 1);
    const s = Math.min((c.w * folga) / w, (c.h * folga) / h);
    const cx = ((x0 + x1) / 2) * t.w;
    const cy = ((y0 + y1) / 2) * t.h;
    return { x: c.w / 2 - cx * s, y: c.h / 2 - cy * s, s };
  }, []);

  // Voo da câmera: o centro anda em linha reta e a escala muda "em proporção" (zoom natural)
  const voar = useCallback((destino, aoFim) => {
    cancelAnimationFrame(voo.current);
    const ini = vistaRef.current;
    const c = caixaRef.current;
    const centro = (v) => ({ x: (c.w / 2 - v.x) / v.s, y: (c.h / 2 - v.y) / v.s });
    const c0 = centro(ini);
    const c1 = centro(destino);
    const ms = calmo() ? 0 : VOO_MS;
    const t0 = performance.now();
    const passo = (agora) => {
      const k = ms ? Math.min(1, (agora - t0) / ms) : 1;
      const e = suave(k);
      const s = Math.exp(Math.log(ini.s) + (Math.log(destino.s) - Math.log(ini.s)) * e);
      const cx = c0.x + (c1.x - c0.x) * e;
      const cy = c0.y + (c1.y - c0.y) * e;
      aplicar({ x: c.w / 2 - cx * s, y: c.h / 2 - cy * s, s });
      if (k < 1) voo.current = requestAnimationFrame(passo);
      else aoFim?.();
    };
    voo.current = requestAnimationFrame(passo);
  }, [aplicar]);

  useEffect(() => () => cancelAnimationFrame(voo.current), []);

  // Mapa inteiro visível e centralizado (voltando de um cômodo: começa nele e afasta)
  const enquadrar = useCallback(() => {
    const t = tamanhoRef.current;
    const c = caixaRef.current;
    if (!t || !c.w) return;
    const s = Math.min(c.w / t.w, c.h / t.h) * 0.94;
    zoomMinimo.current = s * 0.6;
    const inteira = { x: (c.w - t.w * s) / 2, y: (c.h - t.h * s) / 2, s };
    if (focoRef.current) {
      aplicar(vistaPara(focoRef.current));
      focoRef.current = null;
      voar(inteira);
    } else {
      aplicar(inteira);
    }
  }, [aplicar, vistaPara, voar]);

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
      // Cômodo novo: arrastar desenha um retângulo (com o polígono começado, arrastar move o mapa)
      if (mestre && ferramenta === 'comodo' && !desenhandoPoligono && gesto.current?.tipo !== 'pinca') {
        gesto.current = { tipo: 'retangulo', inicio: lista[0], a: noMapa(lista[0]), moveu: false };
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
    cancelAnimationFrame(voo.current);
    tipoDoToque.current = e.pointerType;
    area.current.setPointerCapture(e.pointerId);
    ponteiros.current.set(e.pointerId, relativo(e));
    comecarGesto();
  }

  function aoMover(e) {
    if ((pintando || medindo || (mestre && ferramenta === 'comodo')) && e.pointerType === 'mouse') setMira(relativo(e));
    if (!ponteiros.current.has(e.pointerId)) return;
    ponteiros.current.set(e.pointerId, relativo(e));
    const g = gesto.current;
    if (!g) return;

    if (g.tipo === 'retangulo') {
      const p = ponteiros.current.get(e.pointerId);
      if (Math.hypot(p.x - g.inicio.x, p.y - g.inicio.y) > ARRASTO_MINIMO) g.moveu = true;
      if (g.moveu) setEsboco({ a: g.a, b: noMapa(p) });
    } else if (g.tipo === 'pincel') {
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
      if (g?.tipo === 'retangulo') {
        setEsboco(null);
        const b = noMapa(p);
        const grande = Math.abs(b.x - g.a.x) * tamanho.w * vistaRef.current.s > 12 && Math.abs(b.y - g.a.y) * tamanho.h * vistaRef.current.s > 12;
        if (g.moveu && grande) onDesenharRegiao?.(retangulo(g.a, b));
        else if (!g.moveu && e.type === 'pointerup') clicouNoMapa(p);
      }
    } else {
      comecarGesto();   // saiu um dedo da pinça: segue com o outro
    }
  }

  function clicouNoMapa(p) {
    const { x, y } = noMapa(p);
    const dentro = x >= 0 && x <= 1 && y >= 0 && y <= 1;
    // Clique dentro de um cômodo (o de cima, se houver vários)
    if (clicaveis && dentro) {
      const r = [...regioes].reverse().find((regiao) => pontoNoPoligono({ x, y }, regiao.pontos));
      if (r) {
        clicarRegiao(r);
        return;
      }
    }
    setAcesa(null);
    // Polígono do cômodo: clicar perto do 1º ponto fecha
    if (mestre && ferramenta === 'comodo' && rascunhoRegiao?.length >= 3) {
      const v = vistaRef.current;
      const primeiro = { x: v.x + rascunhoRegiao[0].x * tamanho.w * v.s, y: v.y + rascunhoRegiao[0].y * tamanho.h * v.s };
      if (Math.hypot(p.x - primeiro.x, p.y - primeiro.y) < 14) {
        onFecharRegiao?.();
        return;
      }
    }
    if (medindo && dentro) {
      const pontos = [...pontosMedida, { x, y }];
      if (ferramenta === 'escala' && pontos.length === 2) {
        setMedida({ ferramenta, pontos: [] });
        onMedirEscala?.(distanciaPx(pontos[0], pontos[1], tamanho));
      } else {
        setMedida({ ferramenta, pontos });
      }
      return;
    }
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
      // O "click" que vem depois do arrasto não abre o cartão (o ponto do cômodo não tem click)
      engolirClique.current = g.alvo !== 'vertice';
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

  /* ---------- Cômodos ---------- */
  function clicarRegiao(r) {
    if (ferramenta === 'comodo') {
      clicarObjeto('regiao', r.id);   // editar: seleciona (mostra os pontos para ajustar)
      return;
    }
    // No celular, o 1º toque acende o cômodo e o 2º entra
    if (tipoDoToque.current !== 'mouse' && acesa !== r.id) {
      setAcesa(r.id);
      return;
    }
    setAcesa(null);
    onSelecionar?.(null);
    voar(vistaPara(r.pontos), () => onEntrarRegiao?.(r));
  }

  const clicaveis = mestre && !miniatura && (ferramenta === 'mover' || (ferramenta === 'comodo' && !desenhandoPoligono));

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
    if (selecionado.tipo === 'nota') ancora = notas.find((n) => n.id === selecionado.id);
    if (selecionado.tipo === 'regiao') {
      const r = regioes.find((x) => x.id === selecionado.id);
      ancora = r && { id: r.id, ...centroDe(r.pontos) };
    }
    if (selecionado.tipo === 'rota') {
      const r = rotas.find((x) => x.id === selecionado.id);
      ancora = r?.pontos[Math.floor((r.pontos.length - 1) / 2)];
    }
  }

  const classesArea = [
    styles.area,
    mestre && FERRAMENTAS_DE_CLIQUE.includes(ferramenta) && styles.mira,
    pintando && styles.pincel,
    medindo && styles.mira,
  ].filter(Boolean).join(' ');

  // Régua: trechos marcados + o trecho até o mouse
  const sobOMouse = mira && tamanho && { x: (mira.x - vista.x) / (vista.s * tamanho.w), y: (mira.y - vista.y) / (vista.s * tamanho.h) };
  const trechos = medindo && tamanho ? [...pontosMedida, ...(sobOMouse && pontosMedida.length ? [sobOMouse] : [])] : [];
  const totalPx = trechos.slice(1).reduce((soma, p, i) => soma + distanciaPx(trechos[i], p, tamanho), 0);
  const rotuloDistancia = (px) => formatarDistancia(px, escala) ?? (ferramenta === 'escala' ? '' : 'sem escala');

  return (
    <div ref={moldura} className={`${styles.moldura} ${telaCheia ? styles.cheia : ''} ${miniatura ? styles.mini : ''} ${entrada ? styles.entrando : ''}`}>
      <div
        ref={area}
        className={classesArea}
        {...(miniatura ? {} : {
          onPointerDown: aoApertar,
          onPointerMove: aoMover,
          onPointerUp: aoSoltar,
          onPointerCancel: aoSoltar,
          onPointerLeave: () => setMira(null),
          onDoubleClick: () => medindo && setMedida({ ferramenta, pontos: [] }),
        })}
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

        {/* Cômodos: invisíveis; ao passar o mouse acendem com o contorno e o nome */}
        {tamanho && (regioes.length > 0 || rascunhoRegiao || esboco) && (
          <svg className={styles.regioes} width={caixa.w} height={caixa.h}>
            {regioes.map((r) => {
              const pontos = r.pontos.map((pt, i) => posicao('vertice', { id: `${r.id}:${i}`, ...pt }));
              const tela = pontos.map(telaXY);
              const centro = telaXY(centroDe(pontos));
              const escolhida = selecionado?.tipo === 'regiao' && selecionado.id === r.id;
              const classes = [
                styles.regiao,
                clicaveis && styles.clicavel,
                (acesa === r.id || escolhida) && styles.acesa,
                r.oculta && styles.regiaoOculta,
              ].filter(Boolean).join(' ');
              return (
                <g key={r.id} className={classes}>
                  <polygon points={tela.map((t) => `${t.x},${t.y}`).join(' ')}>
                    <title>{r.nome || 'Cômodo'}</title>
                  </polygon>
                  {r.nome && <text x={centro.x} y={centro.y}>{r.nome}</text>}
                  {/* Pontos para ajustar o contorno (cômodo selecionado) */}
                  {escolhida && tela.map((t, i) => (
                    <circle
                      key={i}
                      className={styles.vertice}
                      cx={t.x}
                      cy={t.y}
                      r="7"
                      onPointerDown={(e) => apertarObjeto(e, 'vertice', { id: `${r.id}:${i}`, ...r.pontos[i] })}
                      onPointerMove={moverObjeto}
                      onPointerUp={soltarObjeto}
                      onPointerCancel={soltarObjeto}
                    />
                  ))}
                </g>
              );
            })}

            {/* Rascunho: retângulo arrastado ou polígono ponto a ponto (com o trecho até o mouse) */}
            {esboco && (
              <polygon className={styles.esboco} points={retangulo(esboco.a, esboco.b).map(telaXY).map((t) => `${t.x},${t.y}`).join(' ')} />
            )}
            {rascunhoRegiao?.length > 0 && (
              <g className={styles.esboco}>
                <polyline points={[...rascunhoRegiao, ...(sobOMouse ? [sobOMouse] : [])].map(telaXY).map((t) => `${t.x},${t.y}`).join(' ')} />
                {rascunhoRegiao.map((pt, i) => {
                  const t = telaXY(pt);
                  return <circle key={i} cx={t.x} cy={t.y} r={i === 0 && rascunhoRegiao.length >= 3 ? 8 : 4} className={i === 0 ? styles.primeiro : ''} />;
                })}
              </g>
            )}
          </svg>
        )}

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

        {/* Régua: linha com trechos; cada trecho e o total na escala do mapa */}
        {trechos.length > 0 && (
          <svg className={styles.regua} width={caixa.w} height={caixa.h} aria-hidden="true">
            <polyline points={trechos.map((p) => { const t = telaXY(p); return `${t.x},${t.y}`; }).join(' ')} />
            {trechos.map((p, i) => {
              const t = telaXY(p);
              return <circle key={i} cx={t.x} cy={t.y} r="4" />;
            })}
            {trechos.length > 2 && trechos.slice(1).map((p, i) => {
              const a = telaXY(trechos[i]);
              const b = telaXY(p);
              const texto = rotuloDistancia(distanciaPx(trechos[i], p, tamanho));
              return texto && <text key={i} x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 8}>{texto}</text>;
            })}
          </svg>
        )}
        {trechos.length > 1 && rotuloDistancia(totalPx) && (
          <span className={styles.totalRegua} style={{ left: telaXY(trechos.at(-1)).x, top: telaXY(trechos.at(-1)).y }}>
            {trechos.length > 2 ? `Total: ${rotuloDistancia(totalPx)}` : rotuloDistancia(totalPx)}
          </span>
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

        {/* Post-its: bilhete preso por alfinete, tamanho fixo na tela, por cima da névoa */}
        {tamanho && notas.map((n) => {
          const aberta = selecionado?.tipo === 'nota' && selecionado.id === n.id;
          return (
            <button
              key={n.id}
              type="button"
              className={`${styles.postit} ${n.oculta ? styles.notaOculta : ''} ${aberta ? styles.notaAberta : ''}`}
              style={{ ...naTela(posicao('nota', n)), '--papel': n.cor, '--giro': `${inclinacaoDo(n.id)}deg` }}
              onPointerDown={(e) => apertarObjeto(e, 'nota', n)}
              onPointerMove={moverObjeto}
              onPointerUp={soltarObjeto}
              onPointerCancel={soltarObjeto}
              onClick={() => mestre && clicarObjeto('nota', n.id)}
              tabIndex={miniatura ? -1 : 0}
              aria-label={`Post-it: ${n.texto}${n.oculta ? ' (oculto)' : ''}`}
            >
              <span className={styles.alfinete} aria-hidden="true" />
              <span className={styles.bilhete}>{n.texto}</span>
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

        {!miniatura && <RosaDosVentos className={styles.rosa} />}
      </div>

      {!miniatura && ferramentas && (
        <div className={styles.ferramentas} onPointerDown={(e) => e.stopPropagation()}>{ferramentas}</div>
      )}

      {!miniatura && (
      <div className={styles.barra} onPointerDown={(e) => e.stopPropagation()}>
        {barra}
        <button type="button" onClick={() => zoomEm(caixa.w / 2, caixa.h / 2, 1.3)} aria-label="Aproximar" title="Aproximar">+</button>
        <button type="button" onClick={() => zoomEm(caixa.w / 2, caixa.h / 2, 1 / 1.3)} aria-label="Afastar" title="Afastar">−</button>
        <button type="button" onClick={enquadrar} aria-label="Mostrar o mapa inteiro" title="Mostrar o mapa inteiro">⤢</button>
        <button type="button" onClick={alternarTelaCheia} aria-pressed={telaCheia} title={telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}>
          {telaCheia ? 'Sair' : 'Tela cheia'}
        </button>
      </div>
      )}

      {!miniatura && rodape && <div className={styles.rodape} onPointerDown={(e) => e.stopPropagation()}>{rodape}</div>}
    </div>
  );
}
