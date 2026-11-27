import { grupoDaCondicao } from './condicoes';

/*
 * Ícone de uma condição, pelo grupo dela (medo, preso, sentidos, defesa, fraqueza, sem ação, caído,
 * dano contínuo). Silhuetas simples em currentColor, num quadro 24×24.
 */
const DESENHO = {
  // Rosto assustado
  medo: <><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="9" cy="10" r="1.6" /><circle cx="15" cy="10" r="1.6" /><ellipse cx="12" cy="16" rx="2.2" ry="2.8" /></>,
  // Espiral
  mente: <path d="M12 12m0 0a2 2 0 1 1 2 2a4 4 0 1 1 -4 -4a6 6 0 1 1 6 6a8 8 0 0 1 -8 -8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  // Corrente
  preso: <><rect x="3" y="8" width="10" height="8" rx="4" fill="none" stroke="currentColor" strokeWidth="2.2" /><rect x="11" y="8" width="10" height="8" rx="4" fill="none" stroke="currentColor" strokeWidth="2.2" /></>,
  // Caracol de passos: pé com seta curta
  lento: <><path d="M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M6 15c0-5 4-8 8-8s5 3 5 5-2 3-4 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>,
  // Olho riscado
  sentidos: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="3" /><path d="M4 20 20 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></>,
  // Ouvido riscado
  surdo: <><path d="M8 18c2 0 3-1 3-3 0-1.5 4-3 4-7a5 5 0 0 0-10 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M4 20 20 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></>,
  // Escudo rachado
  defesa: <><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M12 6l-2 5 3 2-2 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></>,
  // Exclamação
  surpresa: <><rect x="10.5" y="3" width="3" height="12" rx="1.5" /><circle cx="12" cy="19.5" r="1.8" /></>,
  // Bateria fraca
  fraqueza: <><rect x="3" y="7" width="16" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><rect x="20" y="10" width="2" height="4" /><rect x="5.5" y="9.5" width="3.5" height="5" /></>,
  // Ondas de enjoo
  enjoo: <path d="M3 8c3-3 6 3 9 0s6 3 9 0M3 14c3-3 6 3 9 0s6 3 9 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  // Estrelas rodando
  atordoado: <><path d="M7 4l1.2 2.6 2.8.3-2.1 1.9.6 2.8L7 10.2 4.5 11.6l.6-2.8L3 6.9l2.8-.3z" /><path d="M17 11l1.2 2.6 2.8.3-2.1 1.9.6 2.8-2.5-1.4-2.5 1.4.6-2.8-2.1-1.9 2.8-.3z" /><path d="M5 18c4 3 10 3 14-1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>,
  // Zz
  sono: <path d="M4 6h7l-7 7h7M13 13h7l-7 7h7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />,
  // Seta para baixo numa linha
  caido: <><path d="M12 3v11M7 9l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 20h16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></>,
  // Gota
  sangue: <path d="M12 2c3 5 7 9 7 13a7 7 0 0 1-14 0c0-4 4-8 7-13z" />,
  // Frasco
  veneno: <><path d="M9 2h6M10 2v6l-5 10a2.5 2.5 0 0 0 2.2 4h9.6A2.5 2.5 0 0 0 19 18l-5-10V2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M7 15h10l2 4H5z" /></>,
  // Bolhas
  ar: <><circle cx="8" cy="15" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="16" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17" cy="17" r="2" /></>,
};

export default function IconeCondicao({ id, className }) {
  const grupo = grupoDaCondicao(id);
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {DESENHO[grupo]}
    </svg>
  );
}
