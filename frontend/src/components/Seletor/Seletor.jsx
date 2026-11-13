import { useEffect, useId, useRef, useState } from 'react';
import styles from './Seletor.module.scss';

/**
 * Select próprio do HubRPG: um botão que abre uma lista estilizada.
 * opcoes: [{ valor, rotulo, detalhe? }] — "detalhe" aparece menor, à direita (ex.: nome do poder).
 *
 * Teclado: Enter/Espaço/↓ abre; ↑/↓ andam; Enter escolhe; Esc fecha;
 * digitar uma letra pula para a primeira opção que começa com ela.
 */
export default function Seletor({
  valor, opcoes, onMudar, placeholder = 'Escolher…', rotulo, obrigatorio = false, className = '',
  classeBotao = '',   // para trocar o visual do botão (ex.: a "pílula" de trilha na ficha)
  desativado = false,
}) {
  const id = useId();
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(-1);   // opção marcada pelo teclado/mouse
  const raiz = useRef(null);
  const lista = useRef(null);

  const atual = opcoes.find((o) => o.valor === valor);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => { if (!raiz.current?.contains(e.target)) setAberto(false); };
    document.addEventListener('pointerdown', fora);
    return () => document.removeEventListener('pointerdown', fora);
  }, [aberto]);

  // Mantém a opção destacada visível ao andar com as setas
  useEffect(() => {
    if (aberto && destaque >= 0) lista.current?.children[destaque]?.scrollIntoView({ block: 'nearest' });
  }, [aberto, destaque]);

  function abrir() {
    setDestaque(Math.max(0, opcoes.findIndex((o) => o.valor === valor)));
    setAberto(true);
  }

  function escolher(i) {
    onMudar(opcoes[i].valor);
    setAberto(false);
  }

  function teclado(e) {
    if (!aberto) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); abrir(); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setDestaque((d) => Math.min(d + 1, opcoes.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setDestaque((d) => Math.max(d - 1, 0)); }
    else if (e.key === 'Home') { e.preventDefault(); setDestaque(0); }
    else if (e.key === 'End') { e.preventDefault(); setDestaque(opcoes.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (destaque >= 0) escolher(destaque); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setAberto(false); }   // não fecha o modal
    else if (e.key === 'Tab') setAberto(false);
    else if (e.key.length === 1) {
      const letra = e.key.toLocaleLowerCase('pt-BR');
      const i = opcoes.findIndex((o) => o.rotulo.toLocaleLowerCase('pt-BR').normalize('NFD').startsWith(letra));
      if (i >= 0) setDestaque(i);
    }
  }

  return (
    <div ref={raiz} className={`${styles.seletor} ${aberto ? styles.aberto : ''} ${className}`}>
      <button
        type="button"
        className={`${styles.botao} ${classeBotao}`}
        disabled={desativado}
        onClick={() => (aberto ? setAberto(false) : abrir())}
        onKeyDown={teclado}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={`${id}-lista`}
        aria-activedescendant={aberto && destaque >= 0 ? `${id}-${destaque}` : undefined}
        aria-label={rotulo}
        aria-required={obrigatorio}
      >
        <span className={atual ? styles.valor : styles.placeholder}>
          {atual ? atual.rotulo : placeholder}
          {atual?.detalhe && <small>{atual.detalhe}</small>}
        </span>
        <svg className={styles.seta} viewBox="0 0 16 16" aria-hidden="true">
          <polyline points="4,6 8,10 12,6" />
        </svg>
      </button>

      {aberto && (
        <ul ref={lista} id={`${id}-lista`} className={styles.lista} role="listbox" aria-label={rotulo}>
          {opcoes.map((o, i) => (
            <li
              key={o.valor}
              id={`${id}-${i}`}
              role="option"
              aria-selected={o.valor === valor}
              className={i === destaque ? styles.destacada : ''}
              onPointerEnter={() => setDestaque(i)}
              onPointerDown={(e) => e.preventDefault()}   // não tira o foco do botão
              onClick={() => escolher(i)}
            >
              <span>{o.rotulo}</span>
              {o.detalhe && <small>{o.detalhe}</small>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
