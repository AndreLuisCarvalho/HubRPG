// Ícones dos pinos, desenhados como traço de tinta (24×24, sem preenchimento)
const DESENHOS = {
  lugar: <path d="M12 21s-6-6-6-11a6 6 0 0 1 12 0c0 5-6 11-6 11Z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />,
  pista: <><circle cx="10" cy="10" r="5.5" /><path d="m14.2 14.2 5.8 5.8" /></>,
  perigo: (
    <>
      <path d="M12 3.5a7 7 0 0 0-7 7c0 2.4 1.2 3.9 3 5v3.5h8V15.5c1.8-1.1 3-2.6 3-5a7 7 0 0 0-7-7Z" />
      <circle cx="9.3" cy="10.5" r="1.6" /><circle cx="14.7" cy="10.5" r="1.6" /><path d="M10.5 19v-2M13.5 19v-2" />
    </>
  ),
  refugio: <path d="M4 11.5 12 4.5l8 7M6.5 10v10h11V10M10 20v-5.5h4V20" />,
  npc: <><circle cx="12" cy="8" r="3.6" /><path d="M5 20.5c0-4 3.1-6.6 7-6.6s7 2.6 7 6.6" /></>,
  paranormal: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></>,
  tesouro: <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />,
  passagem: <><path d="M6 21V10a6 6 0 0 1 12 0v11M3.5 21h17" /><circle cx="14.5" cy="15" r="0.9" /></>,
};

export default function IconePino({ tipo, className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {DESENHOS[tipo] ?? DESENHOS.lugar}
    </svg>
  );
}
