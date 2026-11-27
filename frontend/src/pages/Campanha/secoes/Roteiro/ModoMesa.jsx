import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../../services/api';
import { PERICIAS } from '../../../../sistemas/ordemParanormal/modelo';
import { dadosCompletos, novoId } from './missao';
import styles from './ModoMesa.module.scss';

const NOME_PERICIA = Object.fromEntries(PERICIAS.map((p) => [p.id, p.nome]));

/**
 * Modo mesa (o mestre, durante a sessão): a missão enxuta para jogar. À esquerda as cenas (a atual
 * em destaque), no meio a cena atual com quem está lá e as pistas para marcar como encontradas, à
 * direita as notas rápidas. O que é marcado fica em missao.dados.mesa = { cenaAtual, encontradas, notas }
 * — as pistas encontradas aparecem para os jogadores no quadro de Investigação.
 */
export default function ModoMesa({ missao, fichas, onSalva, onSair, onErro }) {
  const [d, setD] = useState(() => {
    const base = dadosCompletos(missao.dados);
    return { ...base, mesa: { cenaAtual: base.cenas[0]?.id ?? null, encontradas: [], notas: [], ...base.mesa } };
  });
  const [nota, setNota] = useState('');
  const temporizador = useRef(null);
  const pendente = useRef(null);

  function gravar() {
    const p = pendente.current;
    if (!p) return;
    pendente.current = null;
    api.atualizarMissao(missao.id, { dados: p }).then(onSalva).catch((e) => onErro(`Não foi possível salvar: ${e.message}`));
  }
  useEffect(() => () => { clearTimeout(temporizador.current); gravar(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  // Marcar uma pista salva logo (os jogadores veem no quadro); o resto espera um pouco
  const mudarMesa = (fn, rapido = false) => setD((atual) => {
    const novo = { ...atual, mesa: fn(atual.mesa) };
    pendente.current = novo;
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(gravar, rapido ? 150 : 600);
    return novo;
  });

  const porFicha = Object.fromEntries(fichas.map((f) => [f.id, f]));
  const npcDe = Object.fromEntries(d.npcs.map((n) => [n.fichaId, n]));
  const cena = d.cenas.find((c) => c.id === d.mesa.cenaAtual) ?? null;
  const encontradas = new Set(d.mesa.encontradas);
  const pistasDaCena = d.pistas.filter((p) => p.cenaId === cena?.id);
  const pistasSoltas = d.pistas.filter((p) => !d.cenas.some((c) => c.id === p.cenaId));
  const totalAchadas = d.pistas.filter((p) => encontradas.has(p.id)).length;

  const alternarPista = (id) => mudarMesa((m) => ({
    ...m,
    encontradas: m.encontradas.includes(id) ? m.encontradas.filter((x) => x !== id) : [...m.encontradas, id],
  }), true);

  function anotar(e) {
    e.preventDefault();
    const texto = nota.trim();
    if (!texto) return;
    const quando = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    mudarMesa((m) => ({ ...m, notas: [...m.notas, { id: novoId(), texto, quando, cenaId: m.cenaAtual }] }));
    setNota('');
  }

  const pista = (p) => (
    <li key={p.id} data-achada={encontradas.has(p.id) || undefined}>
      <label>
        <input type="checkbox" checked={encontradas.has(p.id)} onChange={() => alternarPista(p.id)} />
        <span>
          {p.texto || 'Pista sem texto'}
          {p.pericia && <small>{NOME_PERICIA[p.pericia] ?? p.pericia}{p.dt ? ` · DT ${p.dt}` : ''}</small>}
        </span>
      </label>
    </li>
  );

  return (
    <div className={styles.mesa}>
      <header className={styles.topo}>
        {/* Ao sair, a lista já recebe o que foi marcado (o editor abre com os dados novos) */}
        <button type="button" className={styles.sair} onClick={() => { gravar(); onSalva({ ...missao, dados: d }); onSair(); }}>← Roteiro</button>
        <div>
          <small>Modo mesa</small>
          <b>{missao.nome}</b>
        </div>
        <span className={styles.placar} title="Pistas encontradas">{totalAchadas}/{d.pistas.length} pistas</span>
        {d.confronto.combateId && (
          <Link to={`../combate?abrir=${d.confronto.combateId}`} className={styles.combate}>✸ Combate</Link>
        )}
      </header>

      <div className={styles.grade}>
        {/* Cenas */}
        <nav className={styles.cenas} aria-label="Cenas">
          <h2>Cenas</h2>
          {d.cenas.length === 0 && <p className={styles.vazio}>A missão não tem cenas.</p>}
          {d.cenas.map((c, n) => {
            const achadas = d.pistas.filter((p) => p.cenaId === c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-current={c.id === cena?.id || undefined}
                onClick={() => mudarMesa((m) => ({ ...m, cenaAtual: c.id }))}
              >
                <i>{n + 1}</i>
                <span>{c.nome || `Cena ${n + 1}`}</span>
                {achadas.length > 0 && <small>{achadas.filter((p) => encontradas.has(p.id)).length}/{achadas.length}</small>}
              </button>
            );
          })}
          {d.gancho.texto && (
            <details className={styles.briefing}>
              <summary>Briefing</summary>
              <p>{d.gancho.texto}</p>
            </details>
          )}
        </nav>

        {/* A cena atual */}
        <section className={styles.cena} aria-label="Cena atual">
          {cena ? (
            <>
              <h2>{cena.nome || 'Cena sem nome'}</h2>
              {cena.descricao && <p className={styles.descricao}>{cena.descricao}</p>}
              {cena.mapaId && <Link to="../mapas" className={styles.mapa}>▦ Abrir mapas</Link>}

              {cena.fichas.length > 0 && (
                <div className={styles.bloco}>
                  <h3>Quem está aqui</h3>
                  <ul className={styles.pessoas}>
                    {cena.fichas.filter((id) => porFicha[id]).map((id) => {
                      const f = porFicha[id];
                      const n = npcDe[id];
                      return (
                        <li key={id}>
                          <b>{f.nome}</b>
                          {n?.sabe && <small><em>Sabe:</em> {n.sabe}</small>}
                          {n?.esconde && <small><em>Esconde:</em> {n.esconde}</small>}
                          {n?.reacao && <small><em>Reage:</em> {n.reacao}</small>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className={styles.bloco}>
                <h3>Pistas desta cena</h3>
                {pistasDaCena.length === 0 ? <p className={styles.vazio}>Nenhuma pista nesta cena.</p> : <ul className={styles.pistas}>{pistasDaCena.map(pista)}</ul>}
              </div>
            </>
          ) : (
            <p className={styles.vazio}>Escolha uma cena.</p>
          )}

          {pistasSoltas.length > 0 && (
            <div className={styles.bloco}>
              <h3>Pistas sem cena</h3>
              <ul className={styles.pistas}>{pistasSoltas.map(pista)}</ul>
            </div>
          )}
          <p className={styles.aviso}>As pistas marcadas aparecem para os jogadores em Investigação (só o texto e a cena).</p>
        </section>

        {/* Notas rápidas */}
        <aside className={styles.notas} aria-label="Notas rápidas">
          <h2>Notas da sessão</h2>
          <form onSubmit={anotar}>
            <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="O que aconteceu…" aria-label="Nova nota" maxLength={300} />
            <button type="submit" disabled={!nota.trim()}>Anotar</button>
          </form>
          <ol>
            {[...d.mesa.notas].reverse().map((n) => (
              <li key={n.id}>
                <small>{n.quando}{n.cenaId ? ` · ${d.cenas.find((c) => c.id === n.cenaId)?.nome ?? ''}` : ''}</small>
                <span>{n.texto}</span>
                <button type="button" onClick={() => mudarMesa((m) => ({ ...m, notas: m.notas.filter((x) => x.id !== n.id) }))} aria-label="Apagar nota">✕</button>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
