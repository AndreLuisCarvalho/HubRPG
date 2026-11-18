import styles from './Arena.module.scss';

const ROTULO_CARIMBO = {
  acerto: 'Acerto', falha: 'Falha', critico: 'Crítico', sucesso: 'Sucesso', fracasso: 'Fracasso',
};

/**
 * Registro da missão (coluna da direita): o histórico da luta, do mais novo para o mais antigo,
 * com cor por tipo (dano de PV, SAN, PE, cura, turnos, rodadas) e os carimbos dos testes.
 */
export default function LogCombate({ log, aberto, onAlternar }) {
  return (
    <aside className={styles.log} data-aberto={aberto || undefined} aria-label="Registro da missão">
      <button type="button" className={styles.logTitulo} onClick={onAlternar} aria-expanded={aberto}>
        Registro da missão <small>{log.filter((e) => e.tipo !== 'rodada' && e.tipo !== 'turno').length}</small>
      </button>
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
