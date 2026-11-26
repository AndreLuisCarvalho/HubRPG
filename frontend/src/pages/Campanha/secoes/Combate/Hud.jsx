import Contador from './Contador';
import MaoDeCartas from './MaoDeCartas';
import { estadoAproximado, marcaDe } from './regrasCombate';
import styles from './Arena.module.scss';

const TIPOS = { jogador: 'Agente', npc: 'NPC', monstro: 'Ameaça' };
const ECONOMIA = [
  { id: 'padrao', rotulo: 'Padrão' },
  { id: 'movimento', rotulo: 'Movimento' },
];

/**
 * A base da tela, como o lado de quem duela: à esquerda quem age (retrato e contadores de PV/SAN/PE),
 * no meio a mão de cartas de ação, à direita a economia de ação e o Finalizar turno.
 * Na preparação, os controles da iniciativa.
 */
export default function Hud({
  ator, daVez, mestre, preparando, cartas, soVer, caido = false, cartaId, economia, lembretes,
  onCarta, onEconomia, onFinalizar, onVoltarTurno, onVoltarParaVez, onAvancarContagem,
  podeRolarAmeacas, onRolarAmeacas, onOrdenar, onComecar, podeComecar,
}) {
  if (preparando) {
    return (
      <div className={styles.hud} data-modo="preparo">
        <div className={styles.hudQuem}>
          <div className={styles.hudFicha}>
            <b className={styles.hudTitulo}>Preparando o combate</b>
            <small>{mestre ? 'Cada um já rolou a iniciativa ao entrar. Corrija um valor embaixo da carta, se precisar.' : 'O mestre está montando a luta…'}</small>
          </div>
        </div>
        {mestre ? (
          <div className={styles.hudPreparo}>
            <button type="button" onClick={onRolarAmeacas} disabled={!podeRolarAmeacas}><span aria-hidden="true">⚄</span>Rolar quem falta</button>
            <button type="button" onClick={onOrdenar}><span aria-hidden="true">⇅</span>Ordenar</button>
          </div>
        ) : <span />}
        {mestre && (
          <div className={styles.hudFim}>
            <button type="button" className={styles.hudFinalizar} onClick={onComecar} disabled={!podeComecar}>Começar!</button>
          </div>
        )}
      </div>
    );
  }

  if (!ator) return <div className={styles.hud}><p className={styles.hudTitulo}>Ninguém na vez.</p></div>;

  const { ver } = ator;
  const ameaca = ator.lado === 'ameacas';
  // Jogadores na vez de uma ameaça (ou de alguém oculto): só nome, estado e a mão virada
  const segredo = !mestre && (ameaca || ator.oculto);
  const estado = estadoAproximado(ver.recursos.find((r) => r.id === 'pv'));
  const marca = marcaDe(ator);
  const foraDaVez = daVez && ator.id !== daVez.id;

  return (
    <div className={styles.hud} data-lado={ator.lado}>
      {/* Esquerda: quem age, com os contadores */}
      <div className={styles.hudQuem}>
        <span className={styles.hudRetrato} data-lado={ator.lado} data-estado={estado.id}>
          {ver.imagem && !segredo ? <img src={ver.imagem} alt="" /> : ver.nome.charAt(0)}
        </span>
        <div className={styles.hudFicha}>
          <b className={styles.hudTitulo}>
            {segredo && ator.oculto ? 'Algo se move nas sombras…' : ver.nome}
            {marca && <em className={styles.hudMarca}>{marca}</em>}
          </b>
          <small>
            {segredo
              ? (ator.oculto ? '' : estado.rotulo)
              : [ver.resumo ?? (ver.doLivro ? 'Do livro' : TIPOS[ver.tipo]), ver.defesa !== '—' ? `Defesa ${ver.defesa}` : null].filter(Boolean).join(' · ')}
          </small>
          {!segredo && (
            <div className={styles.hudBarras}>
              {ver.recursos.map((r) => (
                <span key={r.id} style={{ '--cor-barra': r.cor }}>
                  <em>{r.sigla}</em>
                  <i><b style={{ width: `${r.maximo ? Math.min(100, (r.atual / r.maximo) * 100) : 0}%` }} /></i>
                  <strong><Contador valor={r.atual} /><small>/{r.maximo}</small></strong>
                </span>
              ))}
            </div>
          )}
          {foraDaVez && (
            <button type="button" className={styles.hudLink} onClick={onVoltarParaVez}>Fora da vez · voltar para {daVez.ver.nome}</button>
          )}
          {mestre && lembretes.map(({ rid, c }) => (
            <div key={rid} className={styles.hudLembrete}>
              <span><b>{c.rotulo}</b> {c.valor}/{c.limite}</span>
              <button type="button" onClick={() => onAvancarContagem(rid)}>Avançar</button>
            </div>
          ))}
        </div>
      </div>

      {/* Meio: a mão de cartas (mestre na vez de um agente: só para ver) */}
      <div className={styles.hudMao}>
        {soVer && (
          <p className={styles.hudAviso}>
            {caido
              ? `${segredo && ator.oculto ? 'Quem está na vez' : ver.nome} está fora de combate: não pode agir. Finalize o turno.`
              : 'Vez do jogador: aguardando a ação na tela dos Jogadores'}
          </p>
        )}
        <MaoDeCartas cartas={cartas} selecionada={cartaId} virada={segredo} soVer={soVer} onJogar={onCarta} />
      </div>

      {/* Direita: economia de ação e fim do turno */}
      <div className={styles.hudFim}>
        {!segredo && (
          <div className={styles.hudEconomia} aria-label="Economia de ação">
            {ECONOMIA.map((e) => (
              <button
                key={e.id}
                type="button"
                aria-pressed={Boolean(economia?.[e.id])}
                onClick={() => onEconomia(e.id)}
                title={economia?.[e.id] ? 'Gasta (clique para devolver)' : 'Disponível (clique para marcar como gasta)'}
              >
                <i aria-hidden="true" />
                {e.rotulo}
              </button>
            ))}
          </div>
        )}
        {onFinalizar && <button type="button" className={styles.hudFinalizar} onClick={onFinalizar}>Finalizar turno</button>}
        {mestre && <button type="button" className={styles.hudLink} onClick={onVoltarTurno}>◂ voltar um turno</button>}
      </div>
    </div>
  );
}
