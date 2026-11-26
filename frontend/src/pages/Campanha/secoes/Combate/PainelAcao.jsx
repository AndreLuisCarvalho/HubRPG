import { useEffect, useState } from 'react';
import Seletor from '../../../../components/Seletor/Seletor';
import { useRolagem } from '../../../../components/Dados/rolagem';
import { lerFormula, rolarDanos, rolarTeste } from '../../../../components/Dados/formula';
import { lerDanos, nomeDoTipo, partesParaRolar } from '../../../../sistemas/ordemParanormal/danos';
import { ELEMENTOS } from '../../../../sistemas/ordemParanormal/modelo';
import { custoParanormal } from '../../../../sistemas/ordemParanormal/regras';
import {
  ataquesDe, baseDe, calcularDano, comAjuste, defesasContraDano, formulaDeResistencia, lerResistenciaDoRitual,
  periciasDe, reacoesDe, rituaisDe,
} from './acoesCombate';
import { CONDICOES, DURACOES, condicaoPorId } from './condicoes';
import { dtDoItem, efeitoDoItem, iconeDoItem, itensUsaveis, rotuloDaDt, usosRestantes } from './itensEmCombate';
import MaoDeCartas from './MaoDeCartas';
import { novoId } from './regrasCombate';
import { FOLGA_DA_REACAO, SEGUNDOS_DE_REACAO, useContagem } from './reacao';
import styles from './PainelAcao.module.scss';

/**
 * Uma ação de quem está na barra de turno: atacar (com reações e dano), conjurar ritual, rolar
 * perícia ou "outros" (item, ação livre, condição). As rolagens aparecem na mesa de dados 3D.
 * alvoIds / setAlvoIds vêm da arena: clicar no palco também escolhe o alvo.
 */
export default function PainelAcao(props) {
  const { ator, livro, aba } = props;
  const base = baseDe(ator, props.fichas, livro);
  return (
    <div className={styles.painel}>
      {!livro && ator.catalogo && <p className={styles.ajuda}>Abrindo o bestiário…</p>}
      {aba === 'atacar' && <AbaAtaque {...props} base={base} />}
      {aba === 'ritual' && <AbaRitual {...props} base={base} />}
      {aba === 'teste' && <AbaTeste {...props} base={base} />}
      {aba === 'outros' && <AbaOutros {...props} base={base} />}
    </div>
  );
}

/* ---------- Item / Outros ---------- */
function AbaOutros(props) {
  const { mestre, escolha } = props;
  const [modo, setModo] = useState(escolha ?? 'item');
  // Veio de uma carta da mão: a carta já diz o que é, sem a troca de modo
  if (escolha) {
    return (
      <div className={styles.aba}>
        {modo === 'item' && <AbaItem {...props} />}
        {modo === 'livre' && <AbaLivre {...props} />}
        {modo === 'condicao' && <AbaCondicao {...props} />}
      </div>
    );
  }
  const modos = [
    { id: 'item', rotulo: 'Usar item' },
    { id: 'livre', rotulo: 'Ação livre' },
    mestre && { id: 'condicao', rotulo: 'Condição' },
  ].filter(Boolean);
  return (
    <div className={styles.aba}>
      <div className={styles.segmentos} role="radiogroup" aria-label="Tipo de ação">
        {modos.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={modo === m.id} onClick={() => setModo(m.id)}>{m.rotulo}</button>
        ))}
      </div>
      {modo === 'item' && <AbaItem {...props} />}
      {modo === 'livre' && <AbaLivre {...props} />}
      {modo === 'condicao' && <AbaCondicao {...props} />}
    </div>
  );
}

const ACOES_LIVRES = ['Padrão', 'Movimento', 'Completa', 'Livre', 'Reação'];

/*
 * Usar um item do inventário (as armas atacam pela carta Atacar). Os itens aparecem em leque de cartas;
 * os que têm efeito no livro (itensEmCombate) rolam sozinhos: cura, dano com o teste de resistência
 * de cada alvo contra a DT do item, condição em quem falhar, e o uso é descontado. Os outros ficam
 * registrados, com dano ou cura à mão se precisar.
 */
function AbaItem({
  ator, participantes, fichas, livro, rodada, vez, base, mestre, alvoIds, setAlvoIds, aplicar, mudarRecursos, onMudarFicha, onFechar,
  itemUid,
}) {
  const { rolar } = useRolagem();
  const itens = base.tipo === 'agente' ? itensUsaveis(base.dados) : [];
  // Carta de um item (aba Curas): ele já vem escolhido e o leque de itens não aparece
  const [uid, setUid] = useState(itemUid ?? itens[0]?.uid ?? '');
  const [manual, setManual] = useState({ efeito: 'nenhum', recurso: 'pv', valor: '' });
  const [feito, setFeito] = useState(null);   // resumo do que aconteceu (depois de usar)
  const item = itens.find((i) => i.uid === uid) ?? itens[0];
  const efeito = efeitoDoItem(item);
  const area = efeito?.alvos === 'varios';
  // Sem alvo escolhido: o próprio (cicatrizante) ou nenhum (granada)
  // (na área, quem usa fica de fora: a carta já começa marcando o próprio agente)
  const alvos = participantes.filter((p) => alvoIds.includes(p.id) && !(area && p.id === ator.id));
  const alvosOuEu = alvos.length ? alvos : (area ? [] : [ator]);
  const dt = efeito?.resiste ? dtDoItem(base.dados, efeito.resiste.dt) : null;
  const usos = item ? usosRestantes(item) : 0;

  if (!itens.length && !feito) {
    return <p className={styles.vazio}>{ator.ver.nome} não tem itens para usar (as armas ficam na carta Atacar).</p>;
  }

  const escolherAlvo = (id) => (area
    ? setAlvoIds(alvoIds.includes(id) ? alvoIds.filter((x) => x !== id) : [...alvoIds, id])
    : setAlvoIds([id]));

  // Desconta um uso: no último, o item sai do inventário
  function gastarUso() {
    if (!ator.fichaId || usos === Infinity) return;
    const inventario = base.dados.inventario ?? [];
    onMudarFicha(ator.fichaId, {
      inventario: usos <= 1
        ? inventario.filter((i) => i.uid !== item.uid)
        : inventario.map((i) => (i.uid === item.uid ? { ...i, usos: usos - 1 } : i)),
    });
  }

  function usarComEfeito() {
    const emQuem = alvosOuEu.filter((p) => p.id !== ator.id).map((p) => (p.oculto && !mestre ? 'alguém' : p.ver.nome));
    const abertura = `${ator.ver.nome} usou ${item.nome}${emQuem.length ? ` em ${emQuem.join(', ')}` : ''}.`;
    const entradas = [[abertura, ator.oculto ? null : abertura, 'acao']];
    const efeitos = [];
    const condicoes = {};   // id do alvo → condição nova
    const linhas = [];

    // A rolagem do item (uma só para todos os alvos, como numa explosão)
    const partes = efeito.rolar ? [{ formula: efeito.rolar, rotulo: efeito.tipoDano ? nomeDoTipo(efeito.tipoDano) : 'cura' }] : [];
    const rolagem = partes.length ? rolarDanos(partes, 1) : null;
    if (rolagem) {
      rolar({
        titulo: item.nome,
        subtitulo: efeito.efeito === 'cura' ? 'Cura' : 'Dano',
        partes,
        tipo: 'dano',
        resultado: rolagem,
        estilo: ator.ver.estilo,
      });
    }

    for (const alvo of alvosOuEu) {
      const nome = alvo.ver.nome;
      // Teste de resistência do alvo contra a DT do item
      let passou = false;
      if (efeito.resiste) {
        const formula = formulaDeResistencia(baseDe(alvo, fichas, livro), efeito.resiste.pericia);
        const teste = rolarTeste(lerFormula(formula));
        passou = teste.total >= dt;
        const pericia = efeito.resiste.pericia.charAt(0).toUpperCase() + efeito.resiste.pericia.slice(1);
        const texto = `${nome} rolou ${pericia}: ${teste.total} contra DT ${dt} — ${passou ? 'passou' : 'falhou'}.`;
        entradas.push([texto, alvo.oculto ? null : `${nome} ${passou ? 'resistiu' : 'não resistiu'} (${pericia}).`, 'acao', passou ? 'sucesso' : 'fracasso']);
      }
      const anulou = passou && efeito.resiste?.efeito === 'anula';

      if (rolagem && !anulou) {
        if (efeito.efeito === 'cura') {
          const r = mudarRecursos(alvo, { pv: rolagem.total }, item.nome, ator.id);
          efeitos.push(...r.efeitos);
          entradas.push(...r.entradas);
          linhas.push(`${nome}: +${rolagem.total} PV`);
        } else {
          const calculo = calcularDano(rolagem.partes, defesasContraDano(baseDe(alvo, fichas, livro)), {
            metade: passou && efeito.resiste?.efeito === 'metade',
            temSan: temSan(alvo),
          });
          const r = mudarRecursos(alvo, { pv: -calculo.pv, san: -calculo.san }, detalheDoDano(calculo), ator.id);
          efeitos.push(...r.efeitos);
          entradas.push(...r.entradas);
          linhas.push(`${nome}: ${calculo.pv} PV${calculo.san ? ` e ${calculo.san} SAN` : ''}${passou ? ' (metade)' : ''}`);
        }
      } else if (anulou) {
        linhas.push(`${nome}: resistiu`);
      }

      if (efeito.condicao && !passou) {
        const c = efeito.condicao;
        condicoes[alvo.id] = { uid: novoId(), id: c.id, desde: rodada, rodadas: c.rodadas, origem: vez };
        const nomeCondicao = condicaoPorId(c.id)?.nome.toLowerCase() ?? c.id;
        const texto = `${nome} ficou ${nomeCondicao}${c.rodadas ? ` (${c.rodadas} rodada${c.rodadas > 1 ? 's' : ''})` : ''}.`;
        entradas.push([texto, alvo.oculto ? null : texto, 'condicao']);
        if (!rolagem) linhas.push(`${nome}: ${nomeCondicao}`);
      }
    }

    gastarUso();
    aplicar({
      efeitos,
      entradas,
      mudarDados: (d) => (Object.keys(condicoes).length ? {
        ...d,
        participantes: d.participantes.map((p) => (condicoes[p.id] ? { ...p, condicoes: [...(p.condicoes ?? []), condicoes[p.id]] } : p)),
      } : d),
    });
    // Guarda o nome: o item gasto sai do inventário antes do resumo aparecer
    setFeito({ nome: item.nome, total: rolagem?.total ?? null, linhas });
  }

  // Item sem efeito no livro: registra; dano ou cura à mão, se precisar
  function usarSemEfeito() {
    const alvo = alvosOuEu[0];
    const n = Math.abs(Number(manual.valor) || 0);
    const emQuem = alvo && alvo.id !== ator.id ? ` em ${alvo.ver.nome}` : '';
    const texto = `${ator.ver.nome} usou ${item.nome}${emQuem}.`;
    const entradas = [[texto, ator.oculto ? null : texto, 'acao']];
    let efeitos = [];
    if (manual.efeito !== 'nenhum' && n && alvo) {
      const r = mudarRecursos(alvo, { [manual.recurso]: manual.efeito === 'cura' ? n : -n }, item.nome, ator.id);
      efeitos = r.efeitos;
      entradas.push(...r.entradas);
    }
    aplicar({ efeitos, entradas });
    onFechar();
  }

  // As cartas dos itens: ícone, nome e o efeito resumido
  const cartas = itens.map((i) => {
    const e = efeitoDoItem(i);
    const u = usosRestantes(i);
    const resumo = e
      ? [e.rolar && `${e.rolar}${e.efeito === 'cura' ? ' PV' : ''}`, e.condicao && condicaoPorId(e.condicao.id)?.nome, e.alvos === 'varios' && 'área']
        .filter(Boolean).join(' · ')
      : 'registrar';
    return {
      id: i.uid,
      tipo: u > 1 && u !== Infinity ? `${u} usos` : (e ? 'Item' : 'Equipamento'),
      nome: i.nome,
      detalhe: resumo,
      icone: iconeDoItem(i),
      tom: e?.efeito === 'dano' ? 'ataque' : e?.efeito === 'condicao' ? 'condicao' : 'item',
    };
  });

  if (feito) {
    return (
      <div className={styles.resultado} data-tom="acerto">
        <div className={styles.placar}>
          {feito.total != null && <b>{feito.total}</b>}
          <span>{feito.nome}</span>
        </div>
        {feito.linhas.length > 0 && <ul className={styles.listaItem}>{feito.linhas.map((l) => <li key={l}>{l}</li>)}</ul>}
        <div className={styles.rodape}>
          <button type="button" className={styles.primario} onClick={onFechar}>Fechar</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {!itemUid && (
        <div className={styles.maoDeItens}>
          <MaoDeCartas cartas={cartas} selecionada={item.uid} onJogar={(c) => c && setUid(c.id)} />
        </div>
      )}

      <div className={styles.detalheItem}>
        <b>{item.nome}</b>
        {item.descricao && <small className={styles.ajuda}>{item.descricao}</small>}
        {efeito?.resiste && (
          <small className={styles.ajuda}>
            {efeito.resiste.pericia.charAt(0).toUpperCase() + efeito.resiste.pericia.slice(1)} {rotuloDaDt(efeito.resiste.dt)} = {dt}
            {efeito.resiste.efeito === 'metade' ? ' (reduz à metade)' : ' (evita)'}
          </small>
        )}
      </div>

      <div className={styles.campo}>
        <span>
          {area ? 'Quem está na área' : 'Em quem'} <small>{area ? '(clique em cada um)' : '(ou clique no palco)'}</small>
        </span>
        <EscolherAlvos lista={participantes} selecionados={alvosOuEu.map((p) => p.id)} mestre={mestre} onEscolher={escolherAlvo} />
      </div>

      {!efeito && (
        <div className={styles.campo}>
          <span>Dano ou cura à mão <small>(opcional)</small></span>
          <div className={styles.segmentos} role="radiogroup" aria-label="Efeito">
            {[['nenhum', 'Só registrar'], ['cura', 'Cura'], ['dano', 'Dano']].map(([id, r]) => (
              <button key={id} type="button" role="radio" aria-checked={manual.efeito === id} onClick={() => setManual({ ...manual, efeito: id })}>{r}</button>
            ))}
          </div>
          {manual.efeito !== 'nenhum' && (
            <div className={styles.rodape}>
              <div className={styles.segmentos} role="radiogroup" aria-label="Recurso">
                {alvosOuEu[0]?.ver.recursos.map((r) => (
                  <button key={r.id} type="button" role="radio" aria-checked={manual.recurso === r.id} onClick={() => setManual({ ...manual, recurso: r.id })}>{r.sigla}</button>
                ))}
              </div>
              <Numero rotulo="Quanto" valor={manual.valor} min={0} onMudar={(v) => setManual({ ...manual, valor: v })} />
            </div>
          )}
        </div>
      )}

      <div className={styles.rodape}>
        {efeito
          ? (
            <button type="button" className={styles.grande} onClick={usarComEfeito} disabled={!alvosOuEu.length}>
              {alvosOuEu.length ? `Usar ${item.nome}` : 'Escolha quem está na área'}
            </button>
          )
          : <button type="button" className={styles.grande} onClick={usarSemEfeito}>Usar {item.nome}</button>}
      </div>
    </>
  );
}

// Ação livre: o que o personagem faz, em texto, direto no registro
function AbaLivre({ ator, aplicar, onFechar }) {
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState('Padrão');

  function registrar(e) {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    const linha = `${ator.ver.nome} (${tipo.toLowerCase()}): ${t}`;
    aplicar({ entradas: [[linha, ator.oculto ? null : linha, 'acao']] });
    onFechar();
  }

  return (
    <form className={styles.aba} onSubmit={registrar}>
      <label className={styles.campo}>
        <span>O que {ator.ver.nome} faz</span>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: derruba a estante na porta" maxLength={140} autoFocus />
      </label>
      <div className={styles.segmentos} role="radiogroup" aria-label="Tipo de ação">
        {ACOES_LIVRES.map((a) => (
          <button key={a} type="button" role="radio" aria-checked={tipo === a} onClick={() => setTipo(a)}>{a}</button>
        ))}
      </div>
      <div className={styles.rodape}>
        <button type="submit" className={styles.grande} disabled={!texto.trim()}>Registrar ação</button>
      </div>
    </form>
  );
}

/* ---------- Comum ---------- */
// Escolher alvo(s): mini-retratos (o palco faz o mesmo)
function EscolherAlvos({ lista, selecionados, onEscolher, mestre }) {
  return (
    <div className={styles.alvos} role="group" aria-label="Alvo">
      {lista.map((p) => (
        <button
          key={p.id}
          type="button"
          data-lado={p.lado}
          aria-pressed={selecionados.includes(p.id)}
          onClick={() => onEscolher(p.id)}
        >
          <span className={styles.miniRetrato}>
            {p.ver.imagem && p.lado !== 'ameacas' ? <img src={p.ver.imagem} alt="" /> : p.ver.nome.charAt(0)}
          </span>
          {p.ver.nome}{mestre && p.oculto ? ' (oculto)' : ''}
        </button>
      ))}
    </div>
  );
}

// Lista curta de opções em botões (ataques, rituais)
function Opcoes({ rotulo, opcoes, valor, onMudar }) {
  return (
    <div className={styles.opcoes} role="radiogroup" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button key={o.valor} type="button" role="radio" aria-checked={valor === o.valor} disabled={o.desativado} onClick={() => onMudar(o.valor)}>
          <b>{o.rotulo}</b>
          {o.detalhe && <small>{o.detalhe}</small>}
        </button>
      ))}
    </div>
  );
}

const pvDe = (p) => p.ver.recursos.find((r) => r.id === 'pv');
const caido = (p) => (pvDe(p)?.maximo ?? 0) > 0 && pvDe(p)?.atual === 0;
const temSan = (p) => p.ver.recursos.some((r) => r.id === 'san');
// Visão Jogadores: números das ameaças (Defesa, resistências, testes) ficam escondidos
const secreto = (p, mestre) => !mestre && p?.lado === 'ameacas';

function Numero({ rotulo, valor, onMudar, min }) {
  return (
    <label className={styles.numero}>
      <span>{rotulo}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        value={valor}
        onChange={(e) => onMudar(e.target.value === '' ? '' : Number(e.target.value))}
      />
    </label>
  );
}

// Linhas da conta do dano: "12 corte · RD 5 → 7"
function ContaDoDano({ calculo }) {
  return (
    <ul className={styles.conta}>
      {calculo.linhas.map((l, i) => (
        <li key={i}>
          <b>{l.bruto}</b> <span>{l.rotulo}</span>
          {l.notas.length > 0 && <small>{l.notas.join(' · ')}</small>}
          <i>→ {l.final}</i>
        </li>
      ))}
      {calculo.bloqueado > 0 && <li><span>Bloqueio</span><i>−{calculo.bloqueado}</i></li>}
    </ul>
  );
}

const detalheDoDano = (calculo) => calculo.linhas
  .map((l) => `${l.bruto} ${l.rotulo}${l.notas.length ? ` (${l.notas.join(', ')})` : ''}`)
  .concat(calculo.bloqueado ? [`bloqueio −${calculo.bloqueado}`] : [])
  .join(' + ');

// Quem atacou espera a reação do jogador: contagem e, para o mestre, responder no lugar dele
function EsperaDaReacao({ chave, nome, esquiva, bloqueio, onResponder, onCancelar }) {
  const faltam = useContagem(chave);
  return (
    <div className={styles.espera} role="status" aria-live="polite">
      <div className={styles.esperaTopo}>
        <span>Aguardando a reação de <b>{nome}</b>…</span>
        <strong>{faltam}s</strong>
      </div>
      <i className={styles.esperaBarra} style={{ '--total': `${SEGUNDOS_DE_REACAO}s` }} key={chave} />
      <div className={styles.esperaBotoes}>
        <small>Responder por {nome}:</small>
        {esquiva != null && <button type="button" onClick={() => onResponder('esquiva')}>Esquiva +{esquiva}</button>}
        {bloqueio != null && <button type="button" onClick={() => onResponder('bloqueio')}>Bloqueio RD {bloqueio}</button>}
        <button type="button" onClick={() => onResponder('nenhuma')}>Toma</button>
        <button type="button" className={styles.esperaCancelar} onClick={onCancelar}>Cancelar ataque</button>
      </div>
    </div>
  );
}

/* ---------- Atacar ---------- */
function AbaAtaque({
  ator, participantes, fichas, livro, rodada, base, mestre, alvoIds, setAlvoIds, aplicar, mudarRecursos, onFechar, escolha,
  pedidoReacao,
}) {
  const { rolar } = useRolagem();
  const ataques = ataquesDe(base);
  const outros = participantes.filter((p) => p.id !== ator.id);
  const [ataqueId, setAtaqueId] = useState(escolha ?? ataques[0]?.id ?? '');
  // Reação e resultado valem para o alvo em que foram escolhidos (trocar o alvo no palco recomeça)
  const [reacaoDe, setReacaoDe] = useState({ alvoId: null, tipo: 'nenhuma' });
  const [ajuste, setAjuste] = useState('');
  const [rolado, setRolado] = useState(null);
  const [dano, setDano] = useState(null);
  // Pedido de reação mandado ao jogador do alvo: { id, alvoId } enquanto espera a resposta
  const [esperando, setEsperando] = useState(null);

  const ataque = ataques.find((a) => a.id === ataqueId) ?? ataques[0];
  const alvoId = alvoIds[0];
  const alvo = outros.find((p) => p.id === alvoId);
  const reacao = reacaoDe.alvoId === alvoId ? reacaoDe.tipo : 'nenhuma';
  const setReacao = (tipo) => setReacaoDe({ alvoId, tipo });
  const resultado = rolado?.alvoId === alvoId ? rolado : null;
  const setResultado = (r) => setRolado(r && { ...r, alvoId });
  const baseAlvo = alvo ? baseDe(alvo, fichas, livro) : null;
  const reacoes = baseAlvo ? reacoesDe(baseAlvo) : { esquiva: null, bloqueio: null };
  const jaReagiu = alvo?.reacao === rodada;
  const escondido = secreto(alvo, mestre);

  // Reações que valem contra este ataque (Bloqueio só corpo a corpo)
  const podeEsquivar = Boolean(reacoes.esquiva) && !jaReagiu;
  const podeBloquear = Boolean(reacoes.bloqueio) && !jaReagiu && ataque?.corpo !== false;
  // Ameaça atacando agente que pode reagir: quem decide é o jogador (na tela dele, com tempo)
  const perguntaAoJogador = ator.lado !== 'agentes' && alvo?.lado === 'agentes' && (podeEsquivar || podeBloquear);

  // A resposta chegou (ou o mestre respondeu por ele, ou o tempo acabou): rola o ataque com ela
  const respondida = esperando && pedidoReacao?.id === esperando.id ? pedidoReacao.escolha : null;
  useEffect(() => {
    if (respondida) rolarAtaque(respondida, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reage só à resposta
  }, [respondida]);

  useEffect(() => {
    if (!esperando) return undefined;
    // Folga além do tempo do jogador (a contagem dele começa quando o pedido chega na tela dele):
    // a resposta do último instante ainda chega antes daqui
    const fim = setTimeout(() => rolarAtaque('nenhuma', true, true), (SEGUNDOS_DE_REACAO + FOLGA_DA_REACAO) * 1000);
    return () => clearTimeout(fim);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- um prazo por pedido
  }, [esperando?.id]);

  function pedirReacao() {
    if (!ataque || !alvo) return;
    const id = novoId();
    setEsperando({ id, alvoId: alvo.id });
    aplicar({
      mudarDados: (d) => ({
        ...d,
        pedidoReacao: {
          id,
          criado: Date.now(),
          autor: ator.id,
          alvo: alvo.id,
          ataque: ataque.nome,
          arma: ataque.arma ?? null,
          esquiva: podeEsquivar ? reacoes.esquiva.bonus : null,
          bloqueio: podeBloquear ? reacoes.bloqueio.rd : null,
          escolha: null,
        },
      }),
    });
  }

  // O mestre responde no lugar do jogador (ou desiste de esperar)
  function responderPeloJogador(tipo) {
    rolarAtaque(tipo, true);
  }

  /*
   * tipo: a reação escolhida (senão, a marcada no painel); doPedido: fecha o pedido aberto;
   * semResposta: o tempo acabou e o jogador não respondeu
   */
  function rolarAtaque(tipo = reacao, doPedido = false, semResposta = false) {
    if (!ataque || !alvo) return;
    if (doPedido) {
      if (!esperando) return;
      setEsperando(null);
      setReacao(tipo);
    }
    const reacao = tipo;
    const formula = comAjuste(ataque.formula, Number(ajuste) || 0);
    const teste = rolarTeste(lerFormula(formula));
    const esquiva = reacao === 'esquiva' && reacoes.esquiva ? reacoes.esquiva.bonus : 0;
    const defesa = Number(alvo.ver.defesa) + esquiva;
    const acertou = teste.total >= defesa;
    const critico = acertou && teste.natural >= (ataque.critico?.margem ?? 20);
    setResultado({ teste, defesa, acertou, critico, formula });
    setDano(null);

    const carimbos = [{ texto: acertou ? 'Acerto' : 'Falha', tom: acertou ? 'acerto' : 'falha' }];
    if (critico) carimbos.push({ texto: 'Crítico', tom: 'critico' });
    rolar({
      titulo: ataque.nome,
      subtitulo: `${ator.ver.nome} → ${alvo.ver.nome}`,
      formula,
      tipo: 'teste',
      resultado: teste,
      carimbos,
      nota: escondido ? null : `${teste.total} contra Defesa ${defesa}${esquiva ? ` (com esquiva +${esquiva})` : ''}`,
      estilo: ator.ver.estilo,
    });

    let reagiu = reacao !== 'nenhuma' ? ` (${reacao})` : '';
    if (doPedido && reacao === 'nenhuma') reagiu = semResposta ? ' (não reagiu a tempo)' : ' (tomou o golpe)';
    // A rolagem no registro: "21 (1d20+5, d20 16)"; os jogadores veem a dos agentes, nunca a Defesa das ameaças
    const rolagem = `${teste.total} (${formula}, d20 ${teste.natural})`;
    const texto = `${ator.ver.nome} atacou ${alvo.ver.nome} com ${ataque.nome}: ${rolagem} contra Defesa ${defesa}${reagiu}.`;
    const nomeAlvo = alvo.oculto ? 'alguém' : alvo.ver.nome;
    let jogadores = `${ator.ver.nome} atacou ${nomeAlvo} com ${ataque.nome}${ator.lado === 'agentes' ? `: ${rolagem}` : ''}${reagiu}.`;
    if (ator.oculto) jogadores = null;
    aplicar({
      entradas: [[texto, jogadores, 'ataque', critico ? 'critico' : acertou ? 'acerto' : 'falha', {
        autor: ator.id, alvo: alvo.id, resultado: critico ? 'critico' : acertou ? 'acerto' : 'falha',
      }]],
      mudarDados: (d) => {
        const { pedidoReacao: _pedido, ...semPedido } = d;   // o pedido (se houve) se fecha aqui
        return reacao === 'nenhuma' ? semPedido : {
          ...semPedido, participantes: d.participantes.map((p) => (p.id === alvo.id ? { ...p, reacao: rodada } : p)),
        };
      },
    });
  }

  // Desistir do ataque enquanto espera: o pedido some da tela do jogador
  function cancelarPedido() {
    setEsperando(null);
    aplicar({ mudarDados: ({ pedidoReacao: _pedido, ...d }) => d });
  }

  function rolarDano() {
    const mult = resultado.critico ? ataque.critico?.mult ?? 2 : 1;
    const rolagem = rolarDanos(ataque.partes, mult);
    const calculo = calcularDano(rolagem.partes, defesasContraDano(baseAlvo), {
      rdExtra: reacao === 'bloqueio' && reacoes.bloqueio && ataque.corpo !== false ? reacoes.bloqueio.rd : 0,
      temSan: temSan(alvo),
    });
    rolar({
      titulo: ataque.nome,
      subtitulo: mult > 1 ? `Dano crítico ×${mult}` : 'Dano',
      partes: ataque.partes,
      tipo: 'dano',
      mult,
      resultado: rolagem,
      nota: escondido ? null : `Depois das resistências de ${alvo.ver.nome}: ${calculo.pv} PV${calculo.san ? ` e ${calculo.san} SAN` : ''}`,
      estilo: ator.ver.estilo,
    });
    // Jogadores: o dano entra sozinho (as resistências são descontadas por trás)
    if (!mestre) {
      aplicar(mudarRecursos(alvo, { pv: -calculo.pv, san: -calculo.san }, detalheDoDano(calculo), ator.id));
      setDano({ aplicado: true, total: rolagem.total });
      return;
    }
    setDano({ calculo, pv: calculo.pv, san: calculo.san });
  }

  function confirmar() {
    const deltas = { pv: -(Number(dano.pv) || 0), san: -(Number(dano.san) || 0) };
    aplicar(mudarRecursos(alvo, deltas, detalheDoDano(dano.calculo), ator.id));
    onFechar();
  }

  if (!ataques.length) {
    return (
      <p className={styles.vazio}>
        {ator.ver.nome} não tem ataques na ficha. Use o dano à mão na carta, ou cadastre os ataques na ficha.
      </p>
    );
  }

  return (
    <div className={styles.aba}>
      {escolha && ataque ? (
        <p className={styles.ajuda}>
          {[
            ataque.testePadrao ? `${ataque.formula} (sem teste na ficha: usando ${ataque.testePadrao})` : ataque.formula,
            ataque.partes.map((p) => `${p.formula} ${p.rotulo}`).join(' + ') || 'sem dano',
            ataque.alcance,
          ].filter(Boolean).join(' · ')}
        </p>
      ) : (
      <div className={styles.campo}>
        <span>1 · Com o quê</span>
        <Opcoes
          rotulo="Ataque"
          valor={ataque?.id}
          opcoes={ataques.map((a) => ({
            valor: a.id,
            rotulo: a.nome,
            detalhe: [
              a.testePadrao ? `${a.formula} (sem teste na ficha: usando ${a.testePadrao})` : a.formula,
              a.partes.map((p) => `${p.formula} ${p.rotulo}`).join(' + ') || 'sem dano',
              a.alcance,
            ].filter(Boolean).join(' · '),
          }))}
          onMudar={(v) => { setAtaqueId(v); setResultado(null); setDano(null); }}
        />
      </div>
      )}

      <div className={styles.campo}>
        <span>Em quem <small>(ou clique na carta no campo)</small></span>
        <EscolherAlvos
          lista={outros}
          selecionados={alvoIds}
          mestre={mestre}
          onEscolher={(id) => { setAlvoIds([id]); setDano(null); }}
        />
        {alvo && (
          <small className={styles.ajuda}>
            {[
              escondido ? null : `Defesa ${alvo.ver.defesa}`,
              (alvo.condicoes ?? []).map((c) => condicaoPorId(c.id)?.nome).join(', ') || null,
            ].filter(Boolean).join(' · ')}
          </small>
        )}
      </div>

      {(reacoes.esquiva || reacoes.bloqueio) && !resultado && !perguntaAoJogador && (
        <div className={styles.campo}>
          <span>Reação de {alvo.ver.nome}{jaReagiu ? ' (já reagiu nesta rodada)' : ''}</span>
          <div className={styles.segmentos} role="radiogroup" aria-label="Reação">
            <button type="button" role="radio" aria-checked={reacao === 'nenhuma'} onClick={() => setReacao('nenhuma')}>Nenhuma</button>
            {reacoes.esquiva && (
              <button type="button" role="radio" aria-checked={reacao === 'esquiva'} disabled={jaReagiu} onClick={() => setReacao('esquiva')}>
                Esquiva (+{reacoes.esquiva.bonus} Defesa)
              </button>
            )}
            {reacoes.bloqueio && (
              <button type="button" role="radio" aria-checked={reacao === 'bloqueio'} disabled={jaReagiu || ataque?.corpo === false} onClick={() => setReacao('bloqueio')}>
                Bloqueio (RD {reacoes.bloqueio.rd}{ataque?.corpo == null ? ', só corpo a corpo' : ''})
              </button>
            )}
          </div>
        </div>
      )}

      {!resultado && esperando && (
        <EsperaDaReacao
          chave={esperando.id}
          nome={alvo?.ver.nome ?? 'o alvo'}
          esquiva={podeEsquivar ? reacoes.esquiva.bonus : null}
          bloqueio={podeBloquear ? reacoes.bloqueio.rd : null}
          onResponder={responderPeloJogador}
          onCancelar={cancelarPedido}
        />
      )}

      {!resultado && !esperando && (
        <div className={styles.rodape}>
          {mestre && <Numero rotulo="Ajuste no teste" valor={ajuste} onMudar={setAjuste} />}
          <button
            type="button"
            className={styles.grande}
            onClick={() => (perguntaAoJogador ? pedirReacao() : rolarAtaque())}
            disabled={!ataque || !alvo}
          >
            {alvo ? `Atacar ${alvo.ver.nome}` : 'Escolha o alvo'}
          </button>
        </div>
      )}
      {!resultado && !esperando && perguntaAoJogador && (
        <small className={styles.ajuda}>{alvo.ver.nome} vai escolher se esquiva, bloqueia ou toma o golpe ({SEGUNDOS_DE_REACAO} s).</small>
      )}

      {resultado && (
        <div className={styles.resultado} data-tom={resultado.acertou ? 'acerto' : 'falha'}>
          <div className={styles.placar}>
            <b>{resultado.teste.total}</b>
            {!escondido && <span>contra Defesa {resultado.defesa}</span>}
            <em className={styles.carimbo} data-tom={resultado.critico ? 'critico' : resultado.acertou ? 'acerto' : 'falha'}>
              {resultado.critico ? 'Crítico' : resultado.acertou ? 'Acerto' : 'Falha'}
            </em>
          </div>
          {mestre && !dano?.aplicado && (
            <button
              type="button"
              className={styles.discreto}
              onClick={() => { setResultado({ ...resultado, acertou: !resultado.acertou, critico: false }); setDano(null); }}
            >
              Contar como {resultado.acertou ? 'falha' : 'acerto'}
            </button>
          )}

          {resultado.acertou && !dano && (
            ataque.partes.length
              ? <button type="button" className={styles.grande} onClick={rolarDano}>Rolar dano{resultado.critico ? ` ×${ataque.critico?.mult ?? 2}` : ''}</button>
              : <p className={styles.ajuda}>Este ataque não tem dano cadastrado: use o dano à mão na carta do alvo.</p>
          )}

          {dano?.aplicado && (
            <div className={styles.rodape}>
              <span className={styles.ajuda}>{dano.total} de dano rolado. O golpe já foi aplicado em {alvo.ver.nome}.</span>
              <button type="button" className={styles.primario} onClick={onFechar}>Fechar</button>
            </div>
          )}

          {dano && !dano.aplicado && (
            <div className={styles.dano}>
              <ContaDoDano calculo={dano.calculo} />
              <div className={styles.rodape}>
                <Numero rotulo="PV a tirar" valor={dano.pv} min={0} onMudar={(v) => setDano({ ...dano, pv: v })} />
                {temSan(alvo) && <Numero rotulo="SAN a tirar" valor={dano.san} min={0} onMudar={(v) => setDano({ ...dano, san: v })} />}
                <button type="button" className={styles.perigo} onClick={confirmar}>Confirmar dano</button>
              </div>
            </div>
          )}

          {!resultado.acertou && <button type="button" className={styles.secundario} onClick={onFechar}>Fechar</button>}
        </div>
      )}
    </div>
  );
}

/* ---------- Ritual ---------- */
function AbaRitual({
  ator, participantes, fichas, livro, base, mestre, alvoIds, setAlvoIds, aplicar, mudarRecursos, onFechar, escolha,
}) {
  const { rolar } = useRolagem();
  const rituais = rituaisDe(base, livro);
  const [ritualId, setRitualId] = useState(escolha ?? rituais[0]?.id ?? '');
  const ritual = rituais.find((r) => r.id === ritualId) ?? rituais[0];
  const [formaId, setFormaId] = useState('basico');
  const forma = ritual?.formas.find((f) => f.id === formaId) ?? ritual?.formas[0];
  // null = o dano da forma escolhida; texto = o que o mestre digitou
  const [danoEditado, setDanoEditado] = useState(null);
  const danoTexto = danoEditado ?? forma?.dano ?? '';
  const [etapa, setEtapa] = useState(null);   // depois de conjurar: { resistencias, rolagem, porAlvo }
  const [erro, setErro] = useState('');

  if (!livro) return <p className={styles.ajuda}>Abrindo o grimório…</p>;
  if (!rituais.length) return <p className={styles.vazio}>{ator.ver.nome} não conhece rituais.</p>;

  const pe = ator.ver.recursos.find((r) => r.id === 'pe');
  const resistencia = lerResistenciaDoRitual(ritual.resistencia);
  const listaAlvos = participantes.filter((p) => alvoIds.includes(p.id));

  const escolherRitual = (id) => {
    setRitualId(id);
    setFormaId('basico');
    setDanoEditado(null);
    setErro('');
  };
  const escolherForma = (id) => {
    setFormaId(id);
    setDanoEditado(null);
  };
  const alternarAlvo = (id) => setAlvoIds(alvoIds.includes(id) ? alvoIds.filter((x) => x !== id) : [...alvoIds, id]);

  function conjurar() {
    if (!forma.permitida) return setErro(`O limite de PE por turno de ${ator.ver.nome} não comporta esta forma.`);
    if (pe && forma.custo > pe.atual + pe.temporario) return setErro(`${ator.ver.nome} não tem PE suficiente (${pe.atual}).`);
    const nomeForma = forma.id === 'basico' ? '' : ` ${forma.nome.toLowerCase()}`;
    const quem = listaAlvos.map((p) => p.ver.nome).join(', ');
    const texto = `${ator.ver.nome} conjurou ${ritual.nome}${nomeForma} (${forma.custo} PE, DT ${ritual.dt})${quem ? ` em ${quem}` : ''}.`;
    const jogadores = ator.oculto ? null : `${ator.ver.nome} conjurou ${ritual.nome}${nomeForma}${quem ? ` em ${listaAlvos.map((p) => (p.oculto ? 'alguém' : p.ver.nome)).join(', ')}` : ''}.`;
    aplicar({ efeitos: [{ id: ator.id, deltas: { pe: -forma.custo } }], entradas: [[texto, jogadores, 'ritual']] });
    setEtapa({ resistencias: null, rolagem: null, porAlvo: {} });
    setErro('');
  }

  function rolarResistencias() {
    const resistencias = {};
    const entradas = [];
    for (const alvo of listaAlvos) {
      const formula = formulaDeResistencia(baseDe(alvo, fichas, livro), resistencia.pericia);
      const teste = rolarTeste(lerFormula(formula));
      const passou = teste.total >= ritual.dt;
      resistencias[alvo.id] = { total: teste.total, passou, teste, formula };
      const nomePericia = resistencia.pericia.charAt(0).toUpperCase() + resistencia.pericia.slice(1);
      const texto = `${alvo.ver.nome} ${passou ? 'resistiu' : 'não resistiu'}: ${nomePericia} ${teste.total} contra DT ${ritual.dt}.`;
      entradas.push([texto, alvo.oculto ? null : `${alvo.ver.nome} ${passou ? 'resistiu' : 'não resistiu'} ao ritual.`, 'acao', passou ? 'sucesso' : 'fracasso']);
    }
    // Um alvo só: a resistência rola na mesa (menos para os jogadores contra ameaça: o teste dela é segredo)
    if (listaAlvos.length === 1 && !secreto(listaAlvos[0], mestre)) {
      const [alvo] = listaAlvos;
      const r = resistencias[alvo.id];
      rolar({
        titulo: `Resistência de ${alvo.ver.nome}`,
        subtitulo: `${resistencia.texto} · DT ${ritual.dt}`,
        formula: r.formula,
        tipo: 'teste',
        resultado: r.teste,
        carimbos: [{ texto: r.passou ? 'Resistiu' : 'Falhou', tom: r.passou ? 'acerto' : 'falha' }],
        estilo: alvo.ver.estilo,
      });
    }
    aplicar({ entradas });
    setEtapa((e) => ({ ...e, resistencias, porAlvo: e.rolagem ? danoPorAlvo(e.rolagem, resistencias) : e.porAlvo }));
  }

  function danoPorAlvo(rolagem, resistencias) {
    return Object.fromEntries(listaAlvos.map((alvo) => {
      const passou = resistencias?.[alvo.id]?.passou;
      if (passou && resistencia?.efeito === 'anula') return [alvo.id, { pv: 0, san: 0, calculo: null, anulou: true }];
      const calculo = calcularDano(rolagem.partes, defesasContraDano(baseDe(alvo, fichas, livro)), {
        // "parcial" com dano: quem passa sofre metade (o resto do efeito o mestre resolve)
        metade: passou && ['metade', 'parcial'].includes(resistencia?.efeito),
        temSan: temSan(alvo),
      });
      return [alvo.id, { pv: calculo.pv, san: calculo.san, calculo }];
    }));
  }

  const partes = partesParaRolar(lerDanos(danoTexto, ritual?.elemento));

  function rolarDano() {
    const rolagem = rolarDanos(partes);
    rolar({
      titulo: ritual.nome,
      subtitulo: 'Dano do ritual',
      partes,
      tipo: 'dano',
      resultado: rolagem,
      estilo: ator.ver.estilo,
    });
    const porAlvo = danoPorAlvo(rolagem, etapa.resistencias);
    // Jogadores: aplica na hora, sem mostrar a conta
    if (!mestre) {
      aplicarDano(porAlvo, false);
      setEtapa((e) => ({ ...e, rolagem, porAlvo, aplicado: true }));
      return;
    }
    setEtapa((e) => ({ ...e, rolagem, porAlvo }));
  }

  function aplicarDano(porAlvo = etapa.porAlvo, fechar = true) {
    const efeitos = [];
    const entradas = [];
    for (const alvo of listaAlvos) {
      const d = porAlvo[alvo.id];
      if (!d) continue;
      const deltas = { pv: -(Number(d.pv) || 0), san: -(Number(d.san) || 0) };
      const r = mudarRecursos(alvo, deltas, d.calculo ? detalheDoDano(d.calculo) : '', ator.id);
      efeitos.push(...r.efeitos);
      entradas.push(...r.entradas);
    }
    aplicar({ efeitos, entradas });
    if (fechar) onFechar();
  }

  if (etapa) {
    const precisaResistir = resistencia && listaAlvos.length > 0 && !etapa.resistencias;
    return (
      <div className={styles.aba}>
        <p className={styles.feito}>
          <b>{ritual.nome}</b> conjurado ({forma.custo} PE). DT {ritual.dt}.
        </p>
        <p className={styles.efeito}>{forma.texto}</p>

        {resistencia && listaAlvos.length > 0 && (
          etapa.resistencias ? (
            <ul className={styles.resistencias}>
              {listaAlvos.map((p) => (
                <li key={p.id}>
                  <span>{p.ver.nome}</span>
                  {!secreto(p, mestre) && <b>{etapa.resistencias[p.id].total}</b>}
                  <em className={styles.carimbo} data-tom={etapa.resistencias[p.id].passou ? 'acerto' : 'falha'}>
                    {etapa.resistencias[p.id].passou ? 'Resistiu' : 'Falhou'}
                  </em>
                </li>
              ))}
            </ul>
          ) : (
            <button type="button" className={styles.primario} onClick={rolarResistencias}>
              Rolar resistências ({resistencia.texto}, DT {ritual.dt})
            </button>
          )
        )}

        {partes.length > 0 && listaAlvos.length > 0 && !etapa.rolagem && !precisaResistir && (
          <button type="button" className={styles.primario} onClick={rolarDano}>Rolar dano ({danoTexto})</button>
        )}

        {etapa.aplicado && (
          <div className={styles.rodape}>
            <span className={styles.ajuda}>{etapa.rolagem.total} de dano rolado. O efeito já foi aplicado.</span>
            <button type="button" className={styles.primario} onClick={onFechar}>Fechar</button>
          </div>
        )}

        {etapa.rolagem && !etapa.aplicado && (
          <div className={styles.dano}>
            {listaAlvos.map((alvo) => {
              const d = etapa.porAlvo[alvo.id];
              const mudar = (campo, v) => setEtapa((e) => ({ ...e, porAlvo: { ...e.porAlvo, [alvo.id]: { ...d, [campo]: v } } }));
              return (
                <div key={alvo.id} className={styles.porAlvo}>
                  <h4>{alvo.ver.nome}</h4>
                  {d.anulou ? <p className={styles.ajuda}>Resistiu: o ritual não tem efeito.</p> : <ContaDoDano calculo={d.calculo} />}
                  <div className={styles.rodape}>
                    <Numero rotulo="PV" valor={d.pv} min={0} onMudar={(v) => mudar('pv', v)} />
                    {temSan(alvo) && <Numero rotulo="SAN" valor={d.san} min={0} onMudar={(v) => mudar('san', v)} />}
                  </div>
                </div>
              );
            })}
            <div className={styles.rodape}>
              <button type="button" className={styles.perigo} onClick={() => aplicarDano()}>Aplicar dano</button>
            </div>
          </div>
        )}

        {!etapa.rolagem && (!partes.length || !listaAlvos.length) && !precisaResistir && (
          <div className={styles.rodape}>
            <span className={styles.ajuda}>Resolva o efeito na mesa; condições ficam na aba Condição.</span>
            <button type="button" className={styles.secundario} onClick={onFechar}>Fechar</button>
          </div>
        )}
      </div>
    );
  }

  const cor = ELEMENTOS[ritual.elemento]?.cor;
  return (
    <div className={styles.aba}>
      {!escolha && (
        <div className={styles.campo}>
          <span>1 · Qual ritual</span>
          <Opcoes
            rotulo="Ritual"
            valor={ritual.id}
            opcoes={rituais.map((r) => ({ valor: r.id, rotulo: r.nome, detalhe: `${r.circulo}º círculo · ${ELEMENTOS[r.elemento]?.nome ?? ''}` }))}
            onMudar={escolherRitual}
          />
        </div>
      )}
      <div className={styles.campo}>
        <span>Forma</span>
        <div className={styles.segmentos} role="radiogroup" aria-label="Forma">
          {ritual.formas.map((f) => (
            <button key={f.id} type="button" role="radio" aria-checked={formaId === f.id} disabled={!f.permitida} onClick={() => escolherForma(f.id)}>
              {f.nome} · {f.custo} PE
            </button>
          ))}
        </div>
      </div>

      <div className={styles.ficha} style={cor ? { '--elemento': cor } : undefined}>
        <dl>
          <div><dt>Execução</dt><dd>{ritual.execucao}</dd></div>
          <div><dt>Alcance</dt><dd>{ritual.alcance}</dd></div>
          <div><dt>{ritual.tipoAlvo}</dt><dd>{ritual.alvo}</dd></div>
          <div><dt>Resistência</dt><dd>{ritual.resistencia ?? '—'}</dd></div>
          <div><dt>DT</dt><dd>{ritual.dt}</dd></div>
        </dl>
        <p>{forma.texto}</p>
        <small>{custoParanormal(ritual, ritual.elemento, forma.id)} · PE de {ator.ver.nome}: {pe?.atual ?? '—'}</small>
      </div>

      <div className={styles.campo}>
        <span>2 · Em quem <small>(um ou vários; ou clique no palco)</small></span>
        <EscolherAlvos
          lista={participantes.filter((p) => !caido(p) || p.lado === 'agentes')}
          selecionados={alvoIds}
          mestre={mestre}
          onEscolher={alternarAlvo}
        />
      </div>

      <label className={styles.campo}>
        <span>Dano (opcional)</span>
        <input value={danoTexto} onChange={(e) => setDanoEditado(e.target.value)} placeholder="Ex.: 3d6 eletricidade" />
      </label>

      {erro && <p className="erro">{erro}</p>}
      <div className={styles.rodape}>
        <button type="button" className={styles.grande} onClick={conjurar}>Conjurar ({forma.custo} PE)</button>
      </div>
    </div>
  );
}

/* ---------- Teste de perícia ---------- */
function AbaTeste({ ator, base, aplicar }) {
  const { rolar } = useRolagem();
  const pericias = periciasDe(base);
  const [periciaId, setPericiaId] = useState(pericias[0]?.id ?? '');
  const [dt, setDt] = useState('');
  const [ajuste, setAjuste] = useState('');
  const [ultimo, setUltimo] = useState(null);
  const pericia = pericias.find((p) => p.id === periciaId);

  if (!pericias.length) return <p className={styles.vazio}>Sem perícias para rolar.</p>;

  function rolarTesteDaPericia() {
    const formula = comAjuste(pericia.formula, Number(ajuste) || 0);
    const teste = rolarTeste(lerFormula(formula) ?? lerFormula('1d20'));
    const temDt = dt !== '' && dt != null;
    const passou = temDt ? teste.total >= Number(dt) : null;
    setUltimo({ total: teste.total, passou });
    rolar({
      titulo: pericia.nome,
      subtitulo: `Teste de ${ator.ver.nome}${temDt ? ` · DT ${dt}` : ''}`,
      formula,
      tipo: 'teste',
      resultado: teste,
      carimbos: temDt ? [{ texto: passou ? 'Sucesso' : 'Fracasso', tom: passou ? 'acerto' : 'falha' }] : [],
      estilo: ator.ver.estilo,
    });
    const texto = `${ator.ver.nome} rolou ${pericia.nome}: ${teste.total} (${formula}, d20 ${teste.natural})${temDt ? ` contra DT ${dt}` : ''}.`;
    let jogadores = texto;
    if (ator.oculto) jogadores = null;
    else if (ator.lado === 'ameacas') jogadores = `${ator.ver.nome} fez um teste de ${pericia.nome}.`;
    aplicar({ entradas: [[texto, jogadores, 'acao', temDt ? (passou ? 'sucesso' : 'fracasso') : null]] });
  }

  return (
    <div className={styles.aba}>
      <div className={styles.campo}>
        <span>Perícia</span>
        <Seletor
          rotulo="Perícia"
          valor={periciaId}
          opcoes={pericias.map((p) => ({ valor: p.id, rotulo: `${p.nome} · ${p.formula}` }))}
          onMudar={(v) => { setPericiaId(v); setUltimo(null); }}
        />
      </div>
      <div className={styles.rodape}>
        <Numero rotulo="DT (opcional)" valor={dt} min={0} onMudar={setDt} />
        <Numero rotulo="Ajuste" valor={ajuste} onMudar={setAjuste} />
        <button type="button" className={styles.grande} onClick={rolarTesteDaPericia}>Rolar {pericia?.nome}</button>
      </div>
      {ultimo && (
        <div className={styles.placar}>
          <b>{ultimo.total}</b>
          {ultimo.passou != null && (
            <em className={styles.carimbo} data-tom={ultimo.passou ? 'acerto' : 'falha'}>{ultimo.passou ? 'Sucesso' : 'Fracasso'}</em>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Condições ---------- */
function AbaCondicao({ ator, participantes, rodada, vez, mestre, alvoIds, setAlvoIds, aplicar, onFechar }) {
  const alvoId = alvoIds[0] ?? ator.id;
  const [condicaoId, setCondicaoId] = useState('abalado');
  const [duracao, setDuracao] = useState('1');
  const alvo = participantes.find((p) => p.id === alvoId);
  const condicao = condicaoPorId(condicaoId);
  const dur = DURACOES.find((d) => d.id === duracao);

  function aplicarCondicao() {
    const nova = { uid: novoId(), id: condicaoId, desde: rodada, rodadas: dur.rodadas, origem: vez };
    const texto = `${alvo.ver.nome} ficou ${condicao.nome.toLowerCase()} (${dur.rotulo.toLowerCase()}).`;
    aplicar({
      entradas: [[texto, alvo.oculto ? null : texto, 'condicao']],
      mudarDados: (d) => ({
        ...d,
        participantes: d.participantes.map((p) => (p.id === alvoId ? { ...p, condicoes: [...(p.condicoes ?? []), nova] } : p)),
      }),
    });
    onFechar();
  }

  return (
    <div className={styles.aba}>
      <div className={styles.campo}>
        <span>Em quem <small>(ou clique no palco)</small></span>
        <EscolherAlvos lista={participantes} selecionados={[alvoId]} mestre={mestre} onEscolher={(id) => setAlvoIds([id])} />
      </div>
      <div className={styles.campo}>
        <span>Condição</span>
        <Seletor rotulo="Condição" valor={condicaoId} opcoes={CONDICOES.map((c) => ({ valor: c.id, rotulo: c.nome }))} onMudar={setCondicaoId} />
      </div>
      <p className={styles.efeito}>{condicao?.resumo} <small>(resumo; a regra completa está no livro)</small></p>
      <div className={styles.campo}>
        <span>Duração</span>
        <div className={styles.segmentos} role="radiogroup" aria-label="Duração">
          {DURACOES.map((d) => (
            <button key={d.id} type="button" role="radio" aria-checked={duracao === d.id} onClick={() => setDuracao(d.id)}>{d.rotulo}</button>
          ))}
        </div>
        <small className={styles.ajuda}>Em rodadas: vale até o início do turno de quem está agindo agora, depois dessas rodadas.</small>
      </div>
      <div className={styles.rodape}>
        <button type="button" className={styles.grande} onClick={aplicarCondicao} disabled={!alvo}>Aplicar em {alvo?.ver.nome}</button>
      </div>
    </div>
  );
}
