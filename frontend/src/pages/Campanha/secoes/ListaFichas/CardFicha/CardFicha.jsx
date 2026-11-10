import { useEffect, useRef, useState } from 'react';
import { OrbeMini } from '../../../../../components';
import styles from './CardFicha.module.scss';

export default function CardFicha({ ficha, sistema, destinos, onAbrir, onDuplicar, onMover, onExcluir }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const menuRef = useRef(null);

  const estado = sistema?.estado?.(ficha.dados);
  const recursos = sistema?.recursos(ficha.dados) ?? [];
  const destaques = sistema?.destaques?.(ficha.dados) ?? [];

  // Fecha o menu ao clicar fora dele
  useEffect(() => {
    if (!menuAberto) return;
    function clicouFora(e) {
      if (!menuRef.current?.contains(e.target)) {
        setMenuAberto(false);
        setConfirmando(false);
      }
    }
    document.addEventListener('pointerdown', clicouFora);
    return () => document.removeEventListener('pointerdown', clicouFora);
  }, [menuAberto]);

  // Executa uma ação do menu e fecha ele
  const acao = (fn) => () => {
    setMenuAberto(false);
    setConfirmando(false);
    fn();
  };

  const classes = [
    styles.card,
    estado && styles[estado.id],
    menuAberto && styles.comMenu,
  ].filter(Boolean).join(' ');

  return (
    <article
      className={classes}
      onClick={onAbrir}
      onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && onAbrir()}
      role="link"
      tabIndex={0}
      aria-label={`Abrir ficha de ${ficha.nome}`}
    >
      {estado && <span className={`${styles.estado} ${styles[estado.id]}`}>{estado.rotulo}</span>}

      <header className={styles.cabecalho}>
        <span className={styles.avatar} aria-hidden="true">{ficha.nome.charAt(0)}</span>

        <div className={styles.identidade}>
          <h2 className={styles.nome} title={ficha.nome}>{ficha.nome}</h2>
          {sistema && <span className={styles.resumo}>{sistema.resumo(ficha.dados)}</span>}
          {ficha.dados?.jogador && <span className={styles.jogador}>Jogador: {ficha.dados.jogador}</span>}
        </div>

        {/* stopPropagation: clicar no menu não pode abrir a ficha */}
        <div className={styles.menuArea} ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button
            className={styles.mais}
            onClick={() => setMenuAberto((a) => !a)}
            aria-label="Mais ações"
            aria-expanded={menuAberto}
          >
            ⋯
          </button>

          {menuAberto && (
            <div className={styles.menu} role="menu">
              <button role="menuitem" onClick={acao(onAbrir)}>Abrir ficha</button>
              <button role="menuitem" onClick={acao(onDuplicar)}>Duplicar</button>
              {destinos.map((d) => (
                <button key={d.tipo} role="menuitem" onClick={acao(() => onMover(d.tipo))}>
                  Mover para {d.rotulo}
                </button>
              ))}
              {confirmando ? (
                <button role="menuitem" className={styles.confirmar} onClick={acao(onExcluir)}>
                  Confirmar exclusão
                </button>
              ) : (
                <button role="menuitem" className={styles.excluir} onClick={() => setConfirmando(true)}>
                  Excluir
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {recursos.length > 0 && (
        <div className={styles.orbes}>
          {recursos.map((r) => (
            <OrbeMini key={r.id} nome={r.nome} atual={r.atual} maximo={r.maximo} cor={r.cor} />
          ))}
        </div>
      )}

      {destaques.length > 0 && (
        <div className={styles.destaques}>
          {destaques.map((d) => (
            <div key={d.rotulo} className={styles.destaque}>
              <b title={String(d.valor)}>{d.valor}</b>
              <span>{d.rotulo}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}