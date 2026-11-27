import { destaquesDo, duracao, resumirMomentos, textoDaQueda } from './relatorio';
import styles from './Relatorio.module.scss';

/**
 * Relatório de missão (folha de dossiê). Na tela larga, em duas colunas: à esquerda o resumo
 * (título, carimbo, saldo e destaques), à direita os detalhes (agentes, ameaças e momentos).
 * "relatorio" já vem filtrado para quem está vendo (relatorioPara). compacto: dentro da sessão
 * (uma coluna só).
 */
export default function RelatorioCombate({ relatorio, mestre, nome, sessao, compacto = false }) {
  const agentes = relatorio.participantes.filter((p) => p.lado === 'agentes');
  const ameacas = relatorio.participantes.filter((p) => p.lado === 'ameacas');
  const derrotadas = ameacas.filter((p) => p.situacao === 'Derrotado').length;
  const dePe = agentes.filter((p) => !['Morrendo', 'Morto', 'Insano', 'Enlouquecendo'].includes(p.situacao)).length;
  const destaques = destaquesDo(relatorio);
  const tempo = duracao(relatorio);
  const momentos = resumirMomentos(relatorio.momentos);

  // Jogadores não veem o dano causado em números (contaria as resistências das ameaças)
  const valorDestaque = (d) => {
    if (d.campo === 'danoCausado') return mestre ? `${d.p.danoCausado} de dano` : 'quem mais feriu';
    if (d.campo === 'danoSofrido') return `${d.p.danoSofrido} de dano`;
    return `${d.p.criticos} crítico${d.p.criticos > 1 ? 's' : ''}`;
  };

  return (
    <article className={`${styles.relatorio} ${compacto ? styles.compacto : ''}`} aria-label={`Relatório de missão: ${nome}`}>
      {/* Resumo */}
      <div className={styles.resumo}>
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
          <span
            className={styles.carimbo}
            data-vitoria={relatorio.vitoria ? true : undefined}
            data-derrota={relatorio.derrota ? true : undefined}
            aria-hidden="true"
          >
            {relatorio.vitoria ?? relatorio.derrota ?? 'Encerrado'}
          </span>
        </header>

        {relatorio.derrota && relatorio.caidos?.length > 0 && (
          <section>
            <h3>Agentes perdidos</h3>
            <ul className={styles.perdidos}>
              {relatorio.caidos.map((c) => (
                <li key={c.id}><b>{c.nome}</b> {textoDaQueda(c, mestre)}</li>
              ))}
            </ul>
          </section>
        )}

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
      </div>

      {/* Detalhes */}
      <div className={styles.detalhes}>
        {agentes.length > 0 && (
          <section>
            <h3>Agentes</h3>
            <div className={styles.rolavel}>
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
            </div>
          </section>
        )}

        {/* Ameaças: a mesma tabela dos agentes (derrotadas riscadas) */}
        {ameacas.length > 0 && (
          <section>
            <h3>Ameaças</h3>
            <div className={styles.rolavel}>
            <table className={styles.tabela}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Situação</th>
                  {mestre && <th>PV</th>}
                  <th>Acertos</th>
                  {mestre && <th>Dano sofrido</th>}
                </tr>
              </thead>
              <tbody>
                {ameacas.map((p) => (
                  <tr key={p.id} data-derrotado={p.situacao === 'Derrotado' || undefined}>
                    <td>{p.nome}{mestre && p.oculto ? ' (oculto)' : ''}</td>
                    <td data-situacao={p.situacao}>{p.situacao}</td>
                    {mestre && <td>{p.pv ? <>{p.pv.atual}<small>/{p.pv.maximo}</small></> : '—'}</td>}
                    <td>{p.acertos}<small>/{p.acertos + p.erros}</small></td>
                    {mestre && <td>{p.danoSofrido}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </section>
        )}

        {momentos.length > 0 && (
          <section className={styles.secMomentos}>
            <h3>Momentos marcantes</h3>
            <ol className={styles.momentos}>
              {momentos.map((m) => (
                <li key={m.id} data-tom={m.carimbo}>
                  <small>{m.rodadas}</small>
                  <span>{m.texto}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </article>
  );
}
