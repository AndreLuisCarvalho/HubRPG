import { useEffect, useState } from 'react';
import { ITENS } from '../../../../sistemas/ordemParanormal/itens';
import { ehTreinada } from '../../../../sistemas/ordemParanormal/regras';
import { baseDe, periciasDe, rituaisDe } from './acoesCombate';
import { condicaoPorId } from './condicoes';
import Contador from './Contador';
import styles from './MinhaFicha.module.scss';

const ABAS = [
  { id: 'pericias', rotulo: 'Perícias' },
  { id: 'inventario', rotulo: 'Inventário' },
  { id: 'rituais', rotulo: 'Rituais' },
];

/**
 * A ficha do jogador sempre à mão (fora da vez também): um cartão no canto com retrato, PV/SAN/PE
 * e defesa; clicar abre uma gaveta pela esquerda com perícias, inventário e rituais (só para ver).
 */
export default function MinhaFicha({ p, fichas, livro, naVez, escondido = false }) {
  const [aberta, setAberta] = useState(false);
  const [aba, setAba] = useState('pericias');

  useEffect(() => {
    if (!aberta) return undefined;
    const tecla = (e) => e.key === 'Escape' && setAberta(false);
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aberta]);

  const { ver } = p;
  const base = baseDe(p, fichas, livro);
  const dados = base.dados ?? {};
  const condicoes = p.condicoes ?? [];

  return (
    <>
      <button
        type="button"
        className={styles.cartao}
        data-na-vez={naVez || undefined}
        // Celular: some quando a barra de baixo já mostra o meu agente ou há uma ação em jogo
        data-escondido={escondido || undefined}
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        title="Minha ficha"
      >
        <span className={styles.retrato}>{ver.imagem ? <img src={ver.imagem} alt="" /> : ver.nome.charAt(0)}</span>
        <span className={styles.corpo}>
          <b>{ver.nome}{ver.defesa !== '—' && <em>Def {ver.defesa}</em>}</b>
          <Barras recursos={ver.recursos} />
          {condicoes.length > 0 && <small className={styles.contaCond}>{condicoes.length} condiç{condicoes.length > 1 ? 'ões' : 'ão'}</small>}
        </span>
      </button>

      <aside className={styles.gaveta} data-aberta={aberta || undefined} aria-label="Minha ficha" aria-hidden={!aberta}>
        <header className={styles.topo}>
          <span className={styles.retrato}>{ver.imagem ? <img src={ver.imagem} alt="" /> : ver.nome.charAt(0)}</span>
          <div>
            <b>{ver.nome}</b>
            <small>{[ver.resumo, ver.defesa !== '—' ? `Defesa ${ver.defesa}` : null].filter(Boolean).join(' · ')}</small>
          </div>
          <button type="button" onClick={() => setAberta(false)} aria-label="Fechar minha ficha" tabIndex={aberta ? 0 : -1}>✕</button>
        </header>

        <div className={styles.resumo}>
          <Barras recursos={ver.recursos} grande />
          {condicoes.length > 0 && (
            <ul className={styles.condicoes}>
              {condicoes.map((c) => {
                const info = condicaoPorId(c.id);
                return <li key={c.uid} title={info?.resumo}>{info?.nome ?? c.id}</li>;
              })}
            </ul>
          )}
        </div>

        <div className={styles.abas} role="tablist">
          {ABAS.map((a) => (
            <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} onClick={() => setAba(a.id)} tabIndex={aberta ? 0 : -1}>
              {a.rotulo}
            </button>
          ))}
        </div>

        <div className={styles.lista}>
          {aba === 'pericias' && <Pericias base={base} dados={dados} />}
          {aba === 'inventario' && <Inventario itens={dados.inventario ?? []} />}
          {aba === 'rituais' && <Rituais rituais={rituaisDe(base, livro)} carregando={!livro} />}
        </div>
      </aside>
    </>
  );
}

function Barras({ recursos, grande = false }) {
  return (
    <span className={styles.barras} data-grande={grande || undefined}>
      {recursos.map((r) => (
        <span key={r.id} style={{ '--cor-barra': r.cor }}>
          <em>{r.sigla}</em>
          <i><b style={{ width: `${r.maximo ? Math.min(100, (r.atual / r.maximo) * 100) : 0}%` }} /></i>
          <strong><Contador valor={r.atual} /><small>/{r.maximo}</small></strong>
        </span>
      ))}
    </span>
  );
}

function Pericias({ base, dados }) {
  const lista = periciasDe(base);
  if (!lista.length) return <p className={styles.vazio}>Sem perícias.</p>;
  const agente = base.tipo === 'agente';
  return (
    <ul className={styles.pericias}>
      {lista.map((x) => (
        <li key={x.id} data-treinada={(agente && ehTreinada(dados, x.id)) || undefined}>
          <span>{x.nome}</span>
          <code>{x.formula}</code>
        </li>
      ))}
    </ul>
  );
}

function Inventario({ itens }) {
  if (!itens.length) return <p className={styles.vazio}>Inventário vazio.</p>;
  return (
    <ul className={styles.itens}>
      {itens.map((i) => {
        const arma = i.arma ?? ITENS[i.id]?.arma;
        return (
          <li key={i.uid ?? i.nome}>
            <b>{i.nome}</b>
            {i.quantidade > 1 && <em>×{i.quantidade}</em>}
            {i.usos != null && Number.isFinite(i.usos) && <small>{i.usos} uso{i.usos === 1 ? '' : 's'}</small>}
            {arma && <small>{arma.dano}{arma.critico ? ` · ${arma.critico}` : ''}</small>}
          </li>
        );
      })}
    </ul>
  );
}

function Rituais({ rituais, carregando }) {
  if (carregando) return <p className={styles.vazio}>Carregando os rituais…</p>;
  if (!rituais.length) return <p className={styles.vazio}>Nenhum ritual conhecido.</p>;
  return (
    <ul className={styles.rituais}>
      {rituais.map((r) => (
        <li key={r.id}>
          <b>{r.nome}</b>
          <small>{r.circulo}º círculo · {r.formas[0]?.custo ?? '—'} PE · {r.execucao}{r.alcance ? ` · ${r.alcance}` : ''}</small>
          {r.formas[0]?.dano && <em>{r.formas[0].dano}</em>}
          {r.resistencia && <em>{r.resistencia}</em>}
        </li>
      ))}
    </ul>
  );
}
