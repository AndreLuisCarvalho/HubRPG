import { destaquesDo, duracao } from './relatorio';
import styles from './Relatorio.module.scss';

/**
 * Relatório de missão (folha de dossiê): saldo da luta, destaques, agentes, ameaças e momentos.
 * "relatorio" já vem filtrado para quem está vendo (relatorioPara). compacto: dentro da sessão.
 */
export default function RelatorioCombate({ relatorio, mestre, nome, sessao, compacto = false }) {
  const agentes = relatorio.participantes.filter((p) => p.lado === 'agentes');
  const ameacas = relatorio.participantes.filter((p) => p.lado === 'ameacas');
  const derrotadas = ameacas.filter((p) => p.situacao === 'Derrotado').length;
  const dePe = agentes.filter((p) => !['Morrendo', 'Morto', 'Insano', 'Enlouquecendo'].includes(p.situacao)).length;
  const destaques = destaquesDo(relatorio);
  const tempo = duracao(relatorio);

  // Jogadores não veem o dano causado em números (contaria as resistências das ameaças)
  const valorDestaque = (d) => {
    if (d.campo === 'danoCausado') return mestre ? `${d.p.danoCausado} de dano` : 'quem mais feriu';
    if (d.campo === 'danoSofrido') return `${d.p.danoSofrido} de dano`;
    return `${d.p.criticos} crítico${d.p.criticos > 1 ? 's' : ''}`;
  };

  return (
    <article className={`${styles.relatorio} ${compacto ? styles.compacto : ''}`} aria-label={`Relatório de missão: ${nome}`}>
      <header className={styles.cabeca}>
        <span className={styles.sobre}>Relatório de missão</span>
        <h2>{nome}</h2>
        <p>
          {[
            sessao ? `Sessão ${sessao.numero}${sessao.titulo ? ` · ${sessao.titulo}` : ''}` : null,
            `${relatorio.rodadas} rodada${relatorio.rodadas === 1 ? '' : 's'}`,
            tempo,
          ].filter(Boolean).join(' · ')}
        </p>
        <span className={styles.carimbo} aria-hidden="true">Encerrado</span>
      </header>

      <div className={styles.saldo}>
        <div><b>{relatorio.rodadas}</b><span>Rodadas</span></div>
        <div><b>{derrotadas}<small>/{ameacas.length}</small></b><span>Ameaças derrotadas</span></div>
        <div><b>{dePe}<small>/{agentes.length}</small></b><span>Agentes de pé</span></div>
      </div>

      {destaques.length > 0 && (
        <div className={styles.destaques}>
          {destaques.map((d) => (
            <div key={d.rotulo}>
              <span>{d.rotulo}</span>
              <b>{d.p.nome}</b>
              <small>{valorDestaque(d)}</small>
            </div>
          ))}
        </div>
      )}

      {agentes.length > 0 && (
        <section>
          <h3>Agentes</h3>
          <table className={styles.tabela}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Situação</th>
                <th>Acertos</th>
                <th>Críticos</th>
                {mestre && <th>Dano causado</th>}
                <th>Dano sofrido</th>
              </tr>
            </thead>
            <tbody>
              {agentes.map((p) => (
                <tr key={p.id}>
                  <td>{p.nome}</td>
                  <td data-situacao={p.situacao}>{p.situacao}</td>
                  <td>{p.acertos}<small>/{p.acertos + p.erros}</small></td>
                  <td>{p.criticos}</td>
                  {mestre && <td>{p.danoCausado}</td>}
                  <td>{p.danoSofrido}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {ameacas.length > 0 && (
        <section>
          <h3>Ameaças</h3>
          <ul className={styles.ameacas}>
            {ameacas.map((p) => (
              <li key={p.id} data-derrotado={p.situacao === 'Derrotado' || undefined}>
                <b>{p.nome}{mestre && p.oculto ? ' (oculto)' : ''}</b>
                <span>{p.situacao}</span>
                {mestre && p.pv && <small>PV {p.pv.atual}/{p.pv.maximo} · sofreu {p.danoSofrido}</small>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {relatorio.momentos.length > 0 && (
        <section>
          <h3>Momentos marcantes</h3>
          <ol className={styles.momentos}>
            {relatorio.momentos.map((m) => (
              <li key={m.id} data-tom={m.carimbo}>
                <small>R{m.rodada}</small>
                <span>{m.texto}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </article>
  );
}
