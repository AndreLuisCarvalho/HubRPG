import { useState } from 'react';
import Modal from '../../../../components/Modal/Modal';
import AdicionarParticipantes from './AdicionarParticipantes';
import CartaCombatente from './CartaCombatente';
import FaixaTurnos from './FaixaTurnos';
import {
  comecar, estadoAproximado, inserirNaOrdem, mover, mudarPvDaCopia, mudarRecursoDaFicha, novoId,
  ordenarPorIniciativa, passarVez, remover, rolarIniciativa, verParticipante,
} from './regrasCombate';
import styles from './Combate.module.scss';

const LIMITE_LOG = 150;

/**
 * A arena: faixa de turnos no topo, agentes de um lado e ameaças do outro, registro da missão ao lado.
 * mestre: vê os números de tudo e tem os controles. Jogadores: ameaças só com estado aproximado,
 * ocultos não aparecem.
 */
export default function Arena({
  combate, fichas, sessao, mestre, chaveVisao, erro, onSalvar, onMudarFicha, onVoltar, onExcluir,
}) {
  const [adicionando, setAdicionando] = useState(false);
  // Último golpe de cada participante (anima o número saltando e a tremida)
  const [golpes, setGolpes] = useState({});
  const [queda, setQueda] = useState(0);
  const dados = combate.dados;
  const { participantes, estado } = dados;
  const preparando = estado === 'preparando';
  const andamento = estado === 'andamento';
  const encerrado = estado === 'encerrado';

  const vistos = participantes.map((p) => ({ ...p, ver: verParticipante(p, fichas) }));
  const visiveis = mestre ? vistos : vistos.filter((p) => !p.oculto);
  const daVez = vistos.find((p) => p.id === dados.vez);

  // Registro: o texto do mestre e o dos jogadores (null = os jogadores não veem)
  const comLog = (novo, texto, textoJogadores = texto, tipo = 'acao') => ({
    ...novo,
    log: [...(novo.log ?? []), { id: novoId(), rodada: novo.rodada, tipo, texto, textoJogadores }].slice(-LIMITE_LOG),
  });

  const salvar = (novo) => onSalvar({ dados: novo });

  /* ---------- Turnos ---------- */
  function iniciar() {
    const semIniciativa = participantes.filter((p) => p.iniciativa == null);
    if (semIniciativa.length && !window.confirm(`${semIniciativa.length} participante(s) sem iniciativa vão para o fim da ordem. Começar mesmo assim?`)) return;
    const novo = comecar(dados);
    const primeiro = vistos.find((p) => p.id === novo.vez);
    salvar(comLog(comLog(novo, 'O combate começou.', 'O combate começou.', 'sistema'), ...textoDeTurno(primeiro)));
  }

  function passar(passo) {
    const novo = passarVez(dados, fichas, passo);
    const proximo = vistos.find((p) => p.id === novo.vez);
    const virou = novo.rodada !== dados.rodada && passo > 0;
    const base = virou ? comLog(novo, `Rodada ${novo.rodada}`, `Rodada ${novo.rodada}`, 'rodada') : novo;
    salvar(passo > 0 && proximo ? comLog(base, ...textoDeTurno(proximo)) : base);
  }

  // [texto do mestre, texto dos jogadores (null se oculto), tipo]
  const textoDeTurno = (p) => (p.oculto
    ? [`Turno de ${p.ver.nome} (oculto).`, null, 'turno']
    : [`Turno de ${p.ver.nome}.`, `Turno de ${p.ver.nome}.`, 'turno']);

  function encerrar() {
    if (!window.confirm('Encerrar este combate? Ele fica salvo na lista como encerrado.')) return;
    salvar(comLog({ ...dados, estado: 'encerrado' }, 'Combate encerrado.', 'Combate encerrado.', 'sistema'));
  }

  const reabrir = () => salvar({ ...dados, estado: dados.rodada ? 'andamento' : 'preparando' });

  /* ---------- Participantes ---------- */
  function adicionar(novos) {
    setAdicionando(false);
    if (!novos.length) return;
    const lista = andamento ? inserirNaOrdem(participantes, novos) : [...participantes, ...novos];
    const nomes = novos.map((n) => verParticipante(n, fichas).nome).join(', ');
    const visiveisNovos = novos.filter((n) => !n.oculto).map((n) => verParticipante(n, fichas).nome).join(', ');
    // Na preparação só o mestre vê quem entrou (ele ainda pode esconder alguém antes de começar)
    const paraJogadores = andamento && visiveisNovos ? `Entrou na luta: ${visiveisNovos}.` : null;
    salvar(comLog({ ...dados, participantes: lista }, `Entrou na luta: ${nomes}.`, paraJogadores, 'sistema'));
  }

  const trocar = (id, mudancas) =>
    salvar({ ...dados, participantes: participantes.map((p) => (p.id === id ? { ...p, ...mudancas } : p)) });

  function rolarAmeacas() {
    salvar({
      ...dados,
      participantes: participantes.map((p) => (p.lado === 'ameacas' && p.iniciativa == null
        ? { ...p, iniciativa: rolarIniciativa(verParticipante(p, fichas).formula) }
        : p)),
    });
  }

  function revelar(p) {
    const novo = { ...dados, participantes: participantes.map((x) => (x.id === p.id ? { ...x, oculto: !x.oculto } : x)) };
    salvar(p.oculto ? comLog(novo, `${p.ver.nome} foi revelado.`, `${p.ver.nome} surge!`, 'sistema') : novo);
  }

  function tirar(p) {
    if (!window.confirm(`Tirar ${p.ver.nome} do combate?`)) return;
    salvar(remover(dados, p.id, fichas));
  }

  const reordenar = (de, para) => salvar({ ...dados, participantes: mover(participantes, de, para) });

  /* ---------- Dano e cura ---------- */
  function ajustar(p, recursoId, delta) {
    if (!delta) return;
    const recurso = p.ver.recursos.find((r) => r.id === recursoId);
    if (!recurso) return;
    const antes = recurso.atual;
    let depois;
    let novoDados = dados;

    if (p.catalogo) {
      const copia = mudarPvDaCopia(p, delta);
      depois = copia.pv;
      novoDados = { ...dados, participantes: participantes.map((x) => (x.id === p.id ? copia : x)) };
    } else {
      const ficha = fichas[p.fichaId];
      if (!ficha) return;
      const parcial = mudarRecursoDaFicha(ficha.dados, recursoId, delta);
      onMudarFicha(p.fichaId, parcial);
      depois = verParticipante(p, { ...fichas, [p.fichaId]: { ...ficha, dados: { ...ficha.dados, ...parcial } } })
        .recursos.find((r) => r.id === recursoId)?.atual ?? antes;
    }

    const nome = p.ver.nome;
    const sigla = recurso.sigla;
    const verbo = delta < 0 ? `perdeu ${-delta} ${sigla}` : `recuperou ${delta} ${sigla}`;
    const texto = `${nome} ${verbo} (${depois}/${recurso.maximo}).`;
    let paraJogadores = texto;
    if (p.oculto) paraJogadores = null;
    else if (p.lado === 'ameacas') {
      const aprox = estadoAproximado({ atual: depois, maximo: recurso.maximo });
      paraJogadores = delta < 0 ? `${nome} foi atingido: ${aprox.rotulo.toLowerCase()}.` : `${nome} se recuperou.`;
    }
    salvar(comLog(novoDados, texto, paraJogadores, delta < 0 ? 'dano' : 'cura'));

    setGolpes((g) => ({ ...g, [p.id]: { chave: novoId(), delta, sigla, cor: recurso.cor } }));
    if (recursoId === 'pv' && antes > 0 && depois === 0) setQueda((q) => q + 1);
  }

  /* ---------- Desenho ---------- */
  const lado = (id) => visiveis.filter((p) => p.lado === id);
  const carta = (p) => (
    <CartaCombatente
      key={p.id}
      participante={p}
      ver={p.ver}
      mestre={mestre}
      daVez={andamento && p.id === dados.vez}
      preparando={preparando}
      golpe={golpes[p.id]}
      onIniciativa={(v) => trocar(p.id, { iniciativa: v })}
      onRolarIniciativa={() => trocar(p.id, { iniciativa: rolarIniciativa(p.ver.formula) })}
      onAjustar={(recursoId, delta) => ajustar(p, recursoId, delta)}
      onRevelar={() => revelar(p)}
      onTirar={() => tirar(p)}
      onMover={(passo) => {
        const i = participantes.findIndex((x) => x.id === p.id);
        reordenar(i, i + passo);
      }}
    />
  );

  const log = (dados.log ?? [])
    .map((e) => ({ ...e, mostrar: mestre ? e.texto : e.textoJogadores }))
    .filter((e) => e.mostrar)
    .reverse();

  let faixaVez = null;
  if (andamento && daVez) {
    faixaVez = !mestre && daVez.oculto ? 'Algo se move nas sombras…' : `Vez de ${daVez.ver.nome}`;
  }

  return (
    <section className={`${styles.pagina} ${styles.arena}`}>
      <header className={styles.topo}>
        <button type="button" className={styles.voltar} onClick={onVoltar} aria-label="Voltar para a lista de combates">← Combates</button>
        <div className={styles.titulo}>
          <span className={styles.sobre}>{sessao ? `Sessão ${sessao.numero}${sessao.titulo ? ` · ${sessao.titulo}` : ''}` : 'Combate'}</span>
          <h1>{combate.nome}</h1>
        </div>
        <div className={styles.acoesTopo}>
          {chaveVisao}
          {mestre && !encerrado && (
            <button type="button" className={styles.secundario} onClick={() => setAdicionando(true)}>+ Participantes</button>
          )}
        </div>
      </header>

      {erro && <p className="erro">{erro}</p>}

      {/* Barra de comando: o que fazer agora */}
      <div className={styles.comando}>
        {preparando && (
          <>
            <span className={styles.rodada}>Preparando</span>
            <p>{mestre ? 'Digite a iniciativa que cada jogador tirou na mesa e role a das ameaças.' : 'O combate vai começar…'}</p>
            {mestre && (
              <div className={styles.botoes}>
                <button type="button" className={styles.secundario} onClick={rolarAmeacas} disabled={!participantes.some((p) => p.lado === 'ameacas' && p.iniciativa == null)}>Rolar ameaças</button>
                <button type="button" className={styles.secundario} onClick={() => salvar({ ...dados, participantes: ordenarPorIniciativa(participantes) })}>Ordenar</button>
                <button type="button" className={styles.primario} onClick={iniciar} disabled={!participantes.length}>Começar combate</button>
              </div>
            )}
          </>
        )}
        {andamento && (
          <>
            <span className={styles.rodada}>Rodada {dados.rodada}</span>
            <p className={styles.vezAtual} key={dados.vez}>{faixaVez}</p>
            <div className={styles.botoes}>
              {mestre && <button type="button" className={styles.secundario} onClick={() => passar(-1)} aria-label="Voltar um turno">◂ Anterior</button>}
              <button type="button" className={styles.primario} onClick={() => passar(1)}>Próximo turno ▸</button>
              {mestre && <button type="button" className={styles.perigo} onClick={encerrar}>Encerrar</button>}
            </div>
          </>
        )}
        {encerrado && (
          <>
            <span className={styles.rodada}>Encerrado</span>
            <p>Combate encerrado{dados.rodada ? ` na rodada ${dados.rodada}` : ''}.</p>
            {mestre && (
              <div className={styles.botoes}>
                <button type="button" className={styles.secundario} onClick={reabrir}>Reabrir</button>
                <button type="button" className={styles.perigo} onClick={onExcluir}>Apagar</button>
              </div>
            )}
          </>
        )}
      </div>

      {!preparando && (
        <FaixaTurnos
          participantes={visiveis}
          vez={andamento ? dados.vez : null}
          mestre={mestre}
          onReordenar={(de, para) => reordenar(
            participantes.findIndex((p) => p.id === visiveis[de].id),
            participantes.findIndex((p) => p.id === visiveis[para].id),
          )}
        />
      )}

      <div className={styles.mesa}>
        <div className={styles.batalha}>
          <div className={styles.lado} data-lado="agentes">
            <h2>Agentes</h2>
            {lado('agentes').length ? <ul>{lado('agentes').map(carta)}</ul> : <p className={styles.ladoVazio}>Nenhum agente na luta.</p>}
          </div>
          <div className={styles.versus} aria-hidden="true">VS</div>
          <div className={styles.lado} data-lado="ameacas">
            <h2>Ameaças</h2>
            {lado('ameacas').length ? <ul>{lado('ameacas').map(carta)}</ul> : <p className={styles.ladoVazio}>Nenhuma ameaça à vista.</p>}
          </div>
        </div>

        <aside className={styles.registro} aria-label="Registro da missão">
          <h2>Registro da missão</h2>
          {log.length === 0 && <p className={styles.ladoVazio}>Nada registrado ainda.</p>}
          <ol>
            {log.map((e) => (
              <li key={e.id} data-tipo={e.tipo}>
                {e.tipo !== 'rodada' && e.rodada > 0 && <small>R{e.rodada}</small>}
                <span>{e.mostrar}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>

      {queda > 0 && <div key={queda} className={styles.pulsoQueda} aria-hidden="true" />}

      <Modal aberto={adicionando} onFechar={() => setAdicionando(false)} largura="720px" titulo="Participantes" classeCaixa={styles.caixa}>
        {adicionando && (
          <AdicionarParticipantes
            fichas={Object.values(fichas)}
            participantes={participantes}
            onAdicionar={adicionar}
            onCancelar={() => setAdicionando(false)}
          />
        )}
      </Modal>
    </section>
  );
}
