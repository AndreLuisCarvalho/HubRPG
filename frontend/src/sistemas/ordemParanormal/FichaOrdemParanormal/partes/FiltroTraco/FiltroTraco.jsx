// Filtro SVG que "treme" de leve as linhas das molduras, como traço feito à mão.
// As molduras (mixin moldura-a-mao) usam filter: url(#traco-a-mao): toda ficha precisa renderizar isto.
export default function FiltroTraco() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true" focusable="false">
      <filter id="traco-a-mao">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" />
        <feDisplacementMap in="SourceGraphic" scale="2.5" />
      </filter>
    </svg>
  );
}
