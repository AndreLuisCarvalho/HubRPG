import { estadoAproximado, marcaDe } from './regrasCombate';
import styles from './Arena.module.scss';

const TIPOS = { jogador: 'Agente', npc: 'NPC', monstro: 'Ameaça' };
const ECONOMIA = [
  { id: 'padrao', rotulo: 'Ação padrão' },
  { id: 'movimento', rotulo: 'Movimento' },
];

/**
 * Barra de controle do turno (embaixo): quem está agindo à esquerda, economia de ação e botões de
 * ação no meio, Finalizar turno à direita. Na preparação, os controles da iniciativa.
 */
export default function Hud({
  ator, daVez, mestre, preparando, acoes, economia, aba, lembretes,
  onAba, onEconomia, onFinalizar, onVoltarTurno, onVoltarParaVez, onAvancarContagem,
  podeRolarAmeacas, onRolarAmeacas, onOrdenar, onComecar, podeComecar,
}) {
  if (preparando) {
    return (
      <div className={styles.hud} data-modo="preparo">
        <div className={styles.hudQuem}>
          <b className={styles.hudTitulo}>Preparando o combate</b>
          <small>{mestre ? 'Clique em cada retrato para digitar a iniciativa que o jogador tirou.' : 'O mestre está montando a luta…'}</small>
        </div>
        {mestre && (
          <div className={styles.hudAcoes}>
            <button type="button" onClick={onRolarAmeacas} disabled={!podeRolarAmeacas}><span aria-hidden="true">⚄</span>Rolar ameaças</button>
            <button type="button" onClick={onOrdenar}><span aria-hidden="true">⇅</span>Ordenar</button>
          </div>
        )}
        {mestre && (
          <button type="button" className={styles.hudFinalizar} onClick={onComecar} disabled={!podeComecar}>Começar combate</button>
        )}
      </div>
    );
  }

  if (!ator) return <div className={styles.hud}><p className={styles.hudTitulo}>Ninguém na vez.</p></div>;

  const { ver } = ator;
  const ameaca = ator.lado === 'ameacas';
  // Jogadores na vez de uma ameaça (ou de alguém oculto): só nome e estado
  const segredo = !mestre && (ameaca || ator.oculto);
  const estado = estadoAproximado(ver.recursos.find((r) => r.id === 'pv'));
  const marca = marcaDe(ator);
  const foraDaVez = daVez && ator.id !== daVez.id;

  return (
    <div className={styles.hud} data-lado={ator.lado}>
      {/* Esquerda: quem age */}
      <div className={styles.hudQuem}>
        <span className={styles.hudRetrato} data-lado={ator.lado} data-estado={estado.id}>
          {ver.imagem && !ameaca ? <img src={ver.imagem} alt="" /> : ver.nome.charAt(0)}
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
                  <strong>{r.atual}<small>/{r.maximo}</small></strong>
                </span>
              ))}
            </div>
          )}
          {foraDaVez && (
            <button type="button" className={styles.hudLink} onClick={onVoltarParaVez}>Fora da vez · voltar para {daVez.ver.nome}</button>
          )}
        </div>
      </div>

      {/* Centro: economia e ações */}
      {!segredo && (
        <div className={styles.hudCentro}>
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
          <div className={styles.hudAcoes}>
            {acoes.map((a) => (
              <button key={a.id} type="button" aria-pressed={aba === a.id} onClick={() => onAba(aba === a.id ? null : a.id)}>
                <span aria-hidden="true">{a.icone}</span>
                {a.rotulo}
              </button>
            ))}
          </div>
          {mestre && lembretes.map(({ rid, c }) => (
            <div key={rid} className={styles.hudLembrete}>
              <span><b>{c.rotulo}</b> {c.valor}/{c.limite} · na {c.limite}ª fica {c.final.toLowerCase()}</span>
              <button type="button" onClick={() => onAvancarContagem(rid)}>Avançar</button>
            </div>
          ))}
        </div>
      )}

      {/* Direita: fim do turno */}
      <div className={styles.hudFim}>
        <button type="button" className={styles.hudFinalizar} onClick={onFinalizar}>Finalizar turno ▸</button>
        {mestre && <button type="button" className={styles.hudLink} onClick={onVoltarTurno}>◂ voltar um turno</button>}
      </div>
    </div>
  );
}
