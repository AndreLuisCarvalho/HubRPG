import { useEffect } from 'react';
import styles from './Arena.module.scss';

const ROTULO_CARIMBO = {
  acerto: 'Acerto', falha: 'Falha', critico: 'Crítico', sucesso: 'Sucesso', fracasso: 'Fracasso',
};

/**
 * Registro da missão, numa gaveta que abre pela direita (botão "Registro" no topo): o histórico da
 * luta, do mais novo para o mais antigo, com cor por tipo e os carimbos dos testes.
 */
export default function LogCombate({ log, aberto, onFechar }) {
  useEffect(() => {
    if (!aberto) return undefined;
    const tecla = (e) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aberto, onFechar]);

  return (
    <aside className={styles.log} data-aberto={aberto || undefined} aria-label="Registro da missão" aria-hidden={!aberto}>
      <header className={styles.logTitulo}>
        Registro da missão
        <button type="button" onClick={onFechar} aria-label="Fechar registro" tabIndex={aberto ? 0 : -1}>✕</button>
      </header>
      <ol className={styles.logLista}>
        {log.length === 0 && <li className={styles.logVazio}>Nada registrado ainda.</li>}
        {log.map((e) => (
          <li key={e.id} data-tipo={e.tipo} data-recurso={e.dados?.rid} data-tom={e.carimbo ?? undefined}>
            {e.tipo !== 'rodada' && e.rodada > 0 && <small>R{e.rodada}</small>}
            <span>
              {e.mostrar}
              {e.carimbo && <em data-tom={e.carimbo}>{ROTULO_CARIMBO[e.carimbo]}</em>}
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
