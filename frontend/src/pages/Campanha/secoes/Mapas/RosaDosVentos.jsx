// Rosa dos ventos a tinta, no canto do mapa (só enfeite)
export default function RosaDosVentos({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <circle cx="50" cy="50" r="30" />
        <circle cx="50" cy="50" r="26" strokeDasharray="2 3" />
      </g>
      {/* Pontas: norte escura, as outras em contorno */}
      <g stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
        <path d="M50 8 56 44 50 50 44 44Z" fill="currentColor" />
        <path d="M50 92 56 56 50 50 44 56Z" fill="none" />
        <path d="M92 50 56 56 50 50 56 44Z" fill="none" />
        <path d="M8 50 44 44 50 50 44 56Z" fill="none" />
        <path d="M71 29 54 50 50 50 50 46Z M29 71 46 50 50 50 50 54Z M71 71 50 54 50 50 54 50Z M29 29 50 46 50 50 46 50Z" fill="currentColor" opacity="0.55" />
      </g>
      <text x="50" y="6" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor" fontFamily="'Barlow Condensed', sans-serif">N</text>
    </svg>
  );
}
