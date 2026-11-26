/*
 * Silhuetas das 34 armas do livro, em cor sólida (currentColor), para as cartas da mão.
 * As armas brancas são desenhadas deitadas (cabo à esquerda, ponta à direita) e giradas na
 * diagonal; as de fogo e os arcos ficam como estão. id = id do item do livro (itens.js).
 */
// Estrela (cabeça de maça): pontas alternando raio de fora e de dentro
function estrela(cx, cy, fora, dentro, pontas) {
  const pts = [];
  for (let i = 0; i < pontas * 2; i++) {
    const r = i % 2 ? dentro : fora;
    const a = (Math.PI * i) / pontas - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

const traco = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' };

/* { girar: true → diagonal, corpo: JSX } */
const ARMAS = {
  faca: { girar: true, corpo: (<>
    <rect x="6" y="29" width="16" height="6" rx="2.5" />
    <rect x="21" y="26.5" width="3" height="11" rx="1" />
    <path d="M24 29 L50 28.5 Q57 29.5 59 32.5 L24 35 Z" />
  </>) },
  martelo: { girar: true, corpo: (<>
    <rect x="6" y="30" width="40" height="4.5" rx="2" />
    <rect x="42" y="21" width="12" height="20" rx="2" />
    <rect x="53" y="25" width="5" height="12" rx="1.5" />
    <path d="M42 21 Q36 18 34 12 Q40 16 44 19 Z" />
  </>) },
  punhal: { girar: true, corpo: (<>
    <circle cx="7" cy="32" r="3.5" />
    <rect x="8" y="29.5" width="14" height="5" rx="1.5" />
    <rect x="21.5" y="24.5" width="3.5" height="15" rx="1.2" />
    <path d="M25 29 L59 32 L25 35 Z" />
  </>) },
  bastao: { girar: true, corpo: (<>
    <circle cx="6" cy="32" r="3.5" />
    <path d="M7 30 L38 27.5 Q58 25 59 32 Q58 39 38 36.5 L7 34 Z" />
  </>) },
  machete: { girar: true, corpo: (<>
    <rect x="4" y="30" width="14" height="5" rx="2" />
    <rect x="17" y="28" width="3" height="9" rx="1" />
    <path d="M21 29.5 L46 27 Q53 22 60 23 Q60 32 52 38 L21 35.5 Z" />
  </>) },
  lanca: { girar: true, corpo: (<>
    <rect x="2" y="30.8" width="46" height="2.8" rx="1.4" />
    <rect x="40" y="29.5" width="4" height="5.5" rx="1" />
    <path d="M45 26 L62 32.2 L45 38.5 L48.5 32.2 Z" />
  </>) },
  cajado: { girar: true, corpo: (<>
    <rect x="4" y="30.3" width="52" height="3.6" rx="1.8" />
    <circle cx="57" cy="32" r="4.5" />
    <circle cx="5" cy="32" r="3" />
    <rect x="28" y="29" width="7" height="6.2" rx="1.5" />
  </>) },
  arco: { girar: false, corpo: (<>
    <path d="M22 5 Q47 32 22 59 L25.5 59 Q51 32 25.5 5 Z" />
    <path d="M23 6 L23 58" {...traco} strokeWidth="1" />
    <rect x="9" y="31" width="40" height="2" rx="1" />
    <path d="M48 28 L58 32 L48 36 Z" />
    <path d="M9 31 L4 26.5 L13 31 Z M9 33 L4 37.5 L13 33 Z" />
  </>) },
  besta: { girar: false, corpo: (<>
    <path d="M3 29.5 L40 29.5 L40 34.5 L17 34.5 L11 41 L3 41 Z" />
    <rect x="36" y="29" width="22" height="4" rx="1.5" />
    <path d="M44 13 Q53 31 44 49 L47.5 49 Q57 31 47.5 13 Z" />
    <path d="M45 14 L37 31 L45 48" {...traco} strokeWidth="1" />
    <rect x="22" y="34.5" width="3" height="6" rx="1" />
  </>) },
  pistola: { girar: false, corpo: (<>
    <path d="M10 21 L56 21 L56 30 L30 30 L29 33 L25 33 L22 46 Q22 48 20 48 L11 48 Q9 48 9.5 46 L14 30 L10 30 Z" />
    <path d="M25 33 Q25 39 31 39 L31 33" {...traco} strokeWidth="2" />
    <rect x="12" y="18.5" width="4" height="3" rx="1" />
  </>) },
  revolver: { girar: false, corpo: (<>
    <rect x="31" y="22" width="28" height="5" rx="1.5" />
    <rect x="23" y="19.5" width="12" height="12" rx="3" />
    <path d="M14 21 L24 21 L24 31 L22 31 L18 46 Q17.5 48 16 48 L8 48 Q6.5 48 7 46 L12 30 L14 28 Z" />
    <path d="M23 31 Q23 37 29 37 L29 31" {...traco} strokeWidth="2" />
    <rect x="12" y="18" width="4" height="4" rx="1" />
  </>) },
  fuzilDeCaca: { girar: false, corpo: (<>
    <path d="M2 30 L18 27.5 L20 33.5 L13 36 L4 41 Q2 41 2 39 Z" />
    <rect x="18" y="27" width="16" height="6.5" rx="1.5" />
    <rect x="34" y="28" width="28" height="2.8" rx="1" />
    <rect x="34" y="30.5" width="16" height="3" rx="1.2" />
    <rect x="22" y="23.5" width="9" height="3" rx="1.2" />
  </>) },
  machadinha: { girar: true, corpo: (<>
    <rect x="8" y="30.3" width="42" height="3.6" rx="1.8" />
    <path d="M40 27 L46 27 L52 17 Q60 26 57 37 L47 35 L40 35 Z" />
  </>) },
  nunchaku: { girar: false, corpo: (<>
    <rect x="8" y="32" width="8" height="28" rx="3.5" />
    <rect x="32" y="8" width="28" height="8" rx="3.5" />
    <path d="M12 32 Q12 12 32 12" {...traco} strokeWidth="2.4" strokeDasharray="2.6 2" />
  </>) },
  corrente: { girar: true, corpo: (<>
    {[6, 22, 38, 54].map((x) => <ellipse key={x} cx={x} cy="32" rx="6.5" ry="4" {...traco} strokeWidth="2.6" />)}
    {[14, 30, 46].map((x) => <rect key={x} x={x - 5} y="30.6" width="10" height="2.8" rx="1.4" />)}
  </>) },
  espada: { girar: true, corpo: (<>
    <circle cx="6" cy="32" r="3.5" />
    <rect x="7" y="29.5" width="12" height="5" rx="1.5" />
    <rect x="18.5" y="22" width="3.5" height="20" rx="1.3" />
    <path d="M22 29 L54 29 L61 32 L54 35 L22 35 Z" />
  </>) },
  florete: { girar: true, corpo: (<>
    <circle cx="6" cy="32" r="3" />
    <rect x="7" y="30" width="10" height="4" rx="1.5" />
    <path d="M16 24 Q24 32 16 40 L19.5 40 Q27 32 19.5 24 Z" />
    <path d="M20 30.8 L62 32 L20 33.2 Z" />
  </>) },
  machado: { girar: true, corpo: (<>
    <rect x="5" y="30.2" width="46" height="3.8" rx="1.9" />
    <path d="M42 27 L47 27 Q51 20 57 17 Q61 32 57 47 Q51 44 47 37 L42 37 Z" />
  </>) },
  maca: { girar: true, corpo: (<>
    <rect x="5" y="30.2" width="38" height="3.8" rx="1.9" />
    <rect x="8" y="29" width="10" height="6.2" rx="2" />
    <polygon points={estrela(49, 32, 12, 7.5, 8)} />
  </>) },
  acha: { girar: true, corpo: (<>
    <rect x="2" y="30.4" width="54" height="3.4" rx="1.7" />
    <path d="M37 30 Q42 15 52 9 Q59 32 52 55 Q42 49 37 34 Z" />
    <path d="M55 29.5 L63 32 L55 34.5 Z" />
  </>) },
  gadanho: { girar: false, corpo: (<>
    <path d="M15 61 L45 6 L48.5 7.8 L18.5 62.5 Z" />
    <rect x="26" y="33" width="9" height="3" rx="1.4" transform="rotate(-61 30 34.5)" />
    <path d="M45 6 Q22 0 3 19 Q25 9.5 43 13 Z" />
  </>) },
  katana: { girar: true, corpo: (<>
    <rect x="3" y="30.5" width="15" height="4.5" rx="1.8" />
    <ellipse cx="19" cy="32.7" rx="1.8" ry="5.5" />
    <path d="M20.5 30.5 Q42 30 62 23.5 Q46 34.5 20.5 35 Z" />
  </>) },
  marreta: { girar: true, corpo: (<>
    <rect x="3" y="30.2" width="45" height="3.8" rx="1.9" />
    <rect x="44" y="19" width="15" height="26" rx="2.5" />
    <rect x="5" y="29" width="9" height="6.2" rx="2" />
  </>) },
  montante: { girar: true, corpo: (<>
    <circle cx="4" cy="32" r="3.5" />
    <rect x="5" y="29.5" width="11" height="5" rx="1.5" />
    <path d="M15 18 L19.5 21 L19.5 43 L15 46 Z" />
    <rect x="19.5" y="28" width="5" height="8" rx="1" />
    <path d="M24 27 L55 27 L64 32 L55 37 L24 37 Z" />
    <path d="M26 31.3 L54 31.3 L54 32.7 L26 32.7 Z" fill="#000" fillOpacity="0.35" />
  </>) },
  motosserra: { girar: false, corpo: (<>
    <path d="M4 25 L26 25 L28 20 L35 20 L35 43 L9 43 Q4 43 4 38 Z" />
    <path d="M9 25 Q11 13 24 15 L27 20" {...traco} strokeWidth="3" />
    <rect x="34" y="27" width="25" height="10" rx="5" />
    <rect x="32" y="25" width="29" height="14" rx="7" {...traco} strokeWidth="1.4" strokeDasharray="1.6 1.6" />
  </>) },
  arcoComposto: { girar: false, corpo: (<>
    <path d="M24 4 Q15 10 23 18 Q35 32 23 46 Q15 54 24 60 L27.5 60 Q19 54 27 46 Q39 32 27 18 Q19 10 27.5 4 Z" />
    <path d="M25 5 L25 59" {...traco} strokeWidth="1" />
    <rect x="11" y="31" width="38" height="2" rx="1" />
    <path d="M48 28 L58 32 L48 36 Z" />
    <path d="M11 31 L6 26.5 L15 31 Z M11 33 L6 37.5 L15 33 Z" />
  </>) },
  balestra: { girar: false, corpo: (<>
    <path d="M2 28.5 L40 28.5 L40 35.5 L18 35.5 L11 43 L2 43 Z" />
    <rect x="35" y="28" width="25" height="5" rx="1.5" />
    <path d="M44 8 Q56 31 44 54 L48.5 54 Q61 31 48.5 8 Z" />
    <path d="M45 9 L36 31 L45 53" {...traco} strokeWidth="1.2" />
    <path d="M58 25 Q63 30.5 58 36" {...traco} strokeWidth="2.4" />
  </>) },
  submetralhadora: { girar: false, corpo: (<>
    <rect x="15" y="20" width="32" height="10" rx="2" />
    <rect x="46" y="23" width="12" height="3.5" rx="1" />
    <path d="M22 30 L29 30 L27 43 L20 43 Z" />
    <rect x="34" y="30" width="6" height="17" rx="1.2" />
    <path d="M15 22 L4 22 L4 31 L15 28.5" {...traco} strokeWidth="2.6" />
  </>) },
  espingarda: { girar: false, corpo: (<>
    <path d="M2 28 L16 25.5 L18 32 L11 35 L4 39 Q2 39 2 37 Z" />
    <rect x="16" y="24.5" width="15" height="7.5" rx="1.5" />
    <rect x="30" y="24.5" width="32" height="3.4" rx="1" />
    <rect x="34" y="28.4" width="15" height="4" rx="1.8" />
    <path d="M22 32 Q22 37 27 37 L27 32" {...traco} strokeWidth="1.8" />
  </>) },
  fuzilDeAssalto: { girar: false, corpo: (<>
    <path d="M2 25 L14 23 L14 34 L4 37 Q2 37 2 35 Z" />
    <rect x="14" y="22" width="28" height="9" rx="1.5" />
    <rect x="41" y="23" width="13" height="6.5" rx="1.5" />
    <rect x="53" y="24.8" width="9" height="2.6" rx="1" />
    <path d="M21 31 L27 31 L25.5 42 L19.5 42 Z" />
    <path d="M31 31 L37 31 Q39 38 42 44 L36.5 46.5 Q33.5 38 31 31 Z" />
    <rect x="20" y="17.5" width="11" height="4.5" rx="1.2" />
  </>) },
  fuzilDePrecisao: { girar: false, corpo: (<>
    <path d="M2 27 L18 26 L19 33 L12 35 L4 40 Q2 40 2 38 Z" />
    <rect x="18" y="26" width="16" height="7" rx="1.5" />
    <rect x="34" y="27.5" width="28" height="2.6" rx="1" />
    <rect x="19" y="17" width="20" height="5.5" rx="2.5" />
    <rect x="22" y="22" width="3" height="4.5" /><rect x="33" y="22" width="3" height="4.5" />
    <path d="M44 30 L40 42 M44 30 L49 42" {...traco} strokeWidth="1.8" />
    <path d="M23 33 L22 40 L27 40 L28 33 Z" />
  </>) },
  bazuca: { girar: false, corpo: (<>
    <rect x="4" y="24" width="52" height="10" rx="2.5" />
    <rect x="54" y="21.5" width="7" height="15" rx="1.5" />
    <rect x="2" y="22.5" width="5" height="13" rx="1.5" />
    <path d="M24 34 L30 34 L29 43 L23 43 Z M38 34 L43 34 L43 40 L38 40 Z" />
    <rect x="30" y="18" width="8" height="6" rx="1.2" />
  </>) },
  lancaChamas: { girar: false, corpo: (<>
    <rect x="3" y="19" width="14" height="24" rx="6" />
    <rect x="22" y="27" width="34" height="5.5" rx="2" />
    <rect x="55" y="25.5" width="7" height="8.5" rx="1.5" />
    <path d="M30 32.5 L36 32.5 L34.5 43 L28.5 43 Z" />
    <path d="M10 43 Q14 52 26 48 Q32 46 32 40" {...traco} strokeWidth="2.6" />
    <path d="M45 32.5 L45 38" {...traco} strokeWidth="3" />
  </>) },
  metralhadora: { girar: false, corpo: (<>
    <path d="M2 23 L13 23 L13 32 L2 35 Z" />
    <rect x="12" y="21" width="28" height="11" rx="1.8" />
    <rect x="39" y="23.5" width="14" height="6.5" rx="1.5" {...traco} strokeWidth="1.6" strokeDasharray="2 1.4" />
    <rect x="40" y="25.3" width="22" height="3" rx="1" />
    <rect x="22" y="32" width="11" height="10" rx="1.2" />
    <path d="M17 32 L22 32 L21 41 L16 41 Z" />
    <path d="M50 30 L46 44 M50 30 L55 44" {...traco} strokeWidth="1.8" />
  </>) },
};

export default function IconeArma({ id, className }) {
  const arma = ARMAS[id];
  if (!arma) return null;
  return (
    <svg className={className} viewBox="0 0 64 64" fill="currentColor" aria-hidden="true" focusable="false">
      <g transform={arma.girar ? 'rotate(-45 32 32)' : undefined}>{arma.corpo}</g>
    </svg>
  );
}
