import styles from './OlhoMedo.module.scss';

/*
 * Efeito do Medo: um olho enorme e doente toma a tela inteira, treme, olha para você,
 * as veias crescem e ele chora sangue. Tudo desenhado aqui (nada de imagem de fora).
 *
 * O desenho é calculado uma vez só, com um gerador "aleatório" de semente fixa:
 * as veias parecem orgânicas, mas são sempre as mesmas.
 */

// Gerador de números com semente (mulberry32)
function gerador(semente) {
  let s = semente;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Olho no viewBox 400×200, centro (200,100). Pálpebras: duas curvas de Bézier.
const CENTRO = { x: 200, y: 100 };
const RAIO_IRIS = 55;
const CURVA_CIMA = [{ x: 10, y: 100 }, { x: 200, y: -40 }, { x: 390, y: 100 }];
const CURVA_BAIXO = [{ x: 10, y: 100 }, { x: 200, y: 235 }, { x: 390, y: 100 }];
const FENDA = 'M10 100 Q200 -40 390 100 Q200 235 10 100 Z';

// Ponto da curva quadrática no instante t (0 a 1)
const naCurva = ([a, c, b], t) => ({
  x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t ** 2 * b.x,
  y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t ** 2 * b.y,
});

// Uma veia: sai da borda e vai serpenteando até perto da íris
function tracarVeia(aleatorio, inicio, passos, alcance) {
  const pontos = [inicio];
  let { x, y } = inicio;
  for (let i = 0; i < passos; i++) {
    const dx = CENTRO.x - x;
    const dy = CENTRO.y - y;
    const dist = Math.hypot(dx, dy);
    if (dist < RAIO_IRIS + 6) break;
    const passo = Math.min(alcance, dist - RAIO_IRIS - 4);
    const desvio = (aleatorio() - 0.5) * 1.1;   // serpenteia para os lados
    const ang = Math.atan2(dy, dx) + desvio;
    x += Math.cos(ang) * passo;
    y += Math.sin(ang) * passo;
    pontos.push({ x, y });
  }
  return pontos;
}

const emCaminho = (pontos) => pontos.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

function gerarVeias() {
  const aleatorio = gerador(666);
  const veias = [];
  const largadas = [
    ...Array.from({ length: 10 }, (_, i) => naCurva(CURVA_CIMA, 0.04 + i * 0.1)),
    ...Array.from({ length: 10 }, (_, i) => naCurva(CURVA_BAIXO, 0.06 + i * 0.1)),
    { x: 14, y: 100 }, { x: 22, y: 96 }, { x: 386, y: 100 }, { x: 378, y: 104 },   // cantos
  ];

  largadas.forEach((inicio, i) => {
    const principal = tracarVeia(aleatorio, inicio, 9, 18 + aleatorio() * 10);
    veias.push({ d: emCaminho(principal), grossura: 1.4 + aleatorio() * 1.2, atraso: i * 0.025 });

    // 1 ou 2 galhos saindo do meio da veia
    const galhos = 1 + Math.round(aleatorio());
    for (let g = 0; g < galhos && principal.length > 3; g++) {
      const de = principal[1 + Math.floor(aleatorio() * (principal.length - 2))];
      const fim = tracarVeia(aleatorio, de, 4, 10 + aleatorio() * 8);
      veias.push({ d: emCaminho(fim), grossura: 0.6 + aleatorio() * 0.6, atraso: i * 0.025 + 0.15 });
    }
  });
  return veias;
}

// Estrias da íris: raios do anel da pupila até a borda
const ESTRIAS = Array.from({ length: 64 }, (_, i) => {
  const ang = (i / 64) * Math.PI * 2;
  const r1 = 22 + (i % 3) * 2;
  const r2 = RAIO_IRIS - 3 - (i % 4) * 3;
  return {
    x1: CENTRO.x + Math.cos(ang) * r1, y1: CENTRO.y + Math.sin(ang) * r1,
    x2: CENTRO.x + Math.cos(ang) * r2, y2: CENTRO.y + Math.sin(ang) * r2,
    cor: ['#ff4a2a', '#8a0a0a', '#d42020', '#3a0303'][i % 4],
  };
});

// Cílios ao longo da pálpebra de cima, apontando para fora
const CILIOS = Array.from({ length: 34 }, (_, i) => {
  const t = 0.06 + (i / 33) * 0.88;
  const p = naCurva(CURVA_CIMA, t);
  const ang = -Math.PI / 2 + (t - 0.5) * 2.2;   // abrem em leque
  const tam = 14 + Math.sin(t * Math.PI) * 16;
  return `M${p.x.toFixed(1)} ${(p.y + 2).toFixed(1)} q${(Math.cos(ang) * tam * 0.4).toFixed(1)} ${(Math.sin(ang) * tam * 0.6).toFixed(1)} ${(Math.cos(ang) * tam).toFixed(1)} ${(Math.sin(ang) * tam).toFixed(1)}`;
});

const VEIAS = gerarVeias();

// Rugas: curvas que acompanham as pálpebras, mais afastadas e tortas
const RUGAS = [
  ...[14, 26, 40, 56].map((d, i) => `M${30 + i * 8} ${100 - d * 0.4} Q200 ${-40 - d * 1.1 + i * 6} ${370 - i * 10} ${100 - d * 0.5}`),
  ...[14, 28, 44].map((d, i) => `M${40 + i * 12} ${104 + d * 0.3} Q200 ${235 + d * 0.9 - i * 8} ${360 - i * 14} ${104 + d * 0.4}`),
];

// Lágrimas de sangue escorrendo da pálpebra de baixo
const LAGRIMAS = [
  { x: 150, d: 0.9 }, { x: 236, d: 1.1 }, { x: 268, d: 1.25 },
].map(({ x, d }) => {
  const p = naCurva(CURVA_BAIXO, (x - 10) / 380);
  return { d: `M${x} ${(p.y - 6).toFixed(1)} q-3 30 2 60 t-2 60`, atraso: d };
});

export default function OlhoMedo() {
  return (
    <div className={styles.tela} aria-hidden="true">
      {/* O tamanho vem do CSS (preenche a tela deitada; inteiro na tela em pé) */}
      <svg className={styles.olho} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* A fenda abre e fecha: tudo do olho é cortado por ela */}
          <clipPath id="medo-fenda">
            <path className={styles.fenda} d={FENDA} />
          </clipPath>

          {/* Esclera doente: amarelada no meio, avermelhada e escura nas bordas */}
          <radialGradient id="medo-esclera" cx="50%" cy="52%" r="60%">
            <stop offset="0%" stopColor="#e6d6b4" />
            <stop offset="40%" stopColor="#c9a882" />
            <stop offset="68%" stopColor="#9a4a3a" />
            <stop offset="100%" stopColor="#2a0605" />
          </radialGradient>

          <radialGradient id="medo-iris" cx="50%" cy="50%" r="50%">
            <stop offset="30%" stopColor="#c4361c" />
            <stop offset="62%" stopColor="#7a0a0a" />
            <stop offset="88%" stopColor="#2e0303" />
            <stop offset="100%" stopColor="#0c0000" />
          </radialGradient>

          {/* Sujeira/textura orgânica: manchas escuras por cima da esclera e da íris */}
          <filter id="medo-textura" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035 0.08" numOctaves="4" seed="13" />
            <feColorMatrix values="0 0 0 0 0.25  0 0 0 0 0.03  0 0 0 0 0.02  0 0 0 1.1 -0.35" />
          </filter>

          {/* Sombra da pálpebra de cima sobre o olho */}
          <linearGradient id="medo-sombra" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000" stopOpacity="0.85" />
            <stop offset="35%" stopColor="#000" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g className={styles.tremor}>
          <g clipPath="url(#medo-fenda)">
            <rect x="0" y="-40" width="400" height="280" fill="url(#medo-esclera)" />

            <g className={styles.veias}>
              {VEIAS.map((v, i) => (
                <path key={i} d={v.d} pathLength="1" strokeWidth={v.grossura} style={{ '--atraso': `${v.atraso}s` }} />
              ))}
            </g>

            {/* Íris: começa desviada e vira de repente para você */}
            <g className={styles.iris}>
              <circle cx={CENTRO.x} cy={CENTRO.y} r={RAIO_IRIS} fill="url(#medo-iris)" />
              {ESTRIAS.map((e, i) => (
                <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={e.cor} strokeWidth="0.9" opacity="0.7" />
              ))}
              <circle cx={CENTRO.x} cy={CENTRO.y} r={RAIO_IRIS} fill="none" stroke="#0a0000" strokeWidth="4" />
              <circle className={styles.pupila} cx={CENTRO.x} cy={CENTRO.y} r="22" />
              {/* Reflexo pequeno e frio: vidrado, não "olho de desenho" */}
              <ellipse cx="184" cy="83" rx="5" ry="3" fill="#f4e8e0" opacity="0.55" />
            </g>

            {/* Manchas e sujeira por cima de tudo, e a sombra da pálpebra */}
            <rect x="0" y="-40" width="400" height="280" filter="url(#medo-textura)" opacity="0.9" />
            <rect x="0" y="-40" width="400" height="280" fill="url(#medo-sombra)" />
          </g>

          {/* Rugas da pele em volta do olho */}
          <g className={styles.rugas}>
            {RUGAS.map((d) => <path key={d} d={d} />)}
          </g>

          {/* Pálpebras: contorno grosso e escuro com a borda molhada avermelhada */}
          <path className={styles.palpebra} d={FENDA} />
          <path className={styles.borda} d={FENDA} />

          <g className={styles.cilios}>
            {CILIOS.map((d, i) => <path key={i} d={d} />)}
          </g>

          <g className={styles.lagrimas}>
            {LAGRIMAS.map((l) => (
              <path key={l.d} d={l.d} pathLength="1" style={{ '--atraso': `${l.atraso}s` }} />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}
