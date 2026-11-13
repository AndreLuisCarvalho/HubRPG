import { useState } from 'react';
import styles from './Listas.module.scss';

/*
 * Listas da ficha de ameaça no estilo do bloco do livro:
 * cada linha aparece como texto pronto para consultar na mesa, e o ✎ abre a edição só dela.
 * Cada lista recebe os itens e devolve a lista nova em onMudar.
 */

// Chave de cada linha: não pode ser a posição (apagar uma do meio trocaria os textos de lugar).
// Só é chamada ao clicar em "+", nunca durante a renderização.
const novoUid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const TIPOS_DE_ACAO = ['Padrão', 'Movimento', 'Completa', 'Reação', 'Livre'];
// ◆ ação que gasta o turno · ◇ as demais (como no livro)
const marca = (tipo) => (tipo === 'Padrão' || tipo === 'Completa' ? '◆' : '◇');

/**
 * Controla qual linha está em edição. Uma linha nova já nasce aberta;
 * cancelar uma linha nova (ainda vazia) apaga ela.
 */
function useEdicao(itens, onMudar, vazio) {
  const [editando, setEditando] = useState(null);   // uid da linha aberta
  const [nova, setNova] = useState(null);           // uid da linha recém-criada

  return {
    editando,
    abrir: (uid) => setEditando(uid),
    adicionar: () => {
      const uid = novoUid();
      onMudar([...itens, { uid, ...vazio }]);
      setEditando(uid);
      setNova(uid);
    },
    salvar: (uid, valores) => {
      onMudar(itens.map((it) => (it.uid === uid ? { ...it, ...valores } : it)));
      setEditando(null);
      setNova(null);
    },
    cancelar: (uid) => {
      if (uid === nova) onMudar(itens.filter((it) => it.uid !== uid));
      setEditando(null);
      setNova(null);
    },
    apagar: (uid) => {
      onMudar(itens.filter((it) => it.uid !== uid));
      setEditando(null);
    },
  };
}

/* ---------------------------------------------------------------- */
/* Ataques: NOME  alcance          ✎                               */
/*          TESTE 3d20+10 | DANO 2d6+6 impacto                      */
/* ---------------------------------------------------------------- */
export function ListaAtaques({ ataques = [], onMudar }) {
  const ed = useEdicao(ataques, onMudar, { nome: '', alcance: 'Corpo a corpo', teste: '', dano: '' });

  return (
    <section className={styles.lista}>
      <h3>Ataques <small>Padrão ◆ Agredir</small></h3>
      {ataques.length === 0 && <p className={styles.vazio}>Nenhum ataque.</p>}
      {ataques.map((a) => (ed.editando === a.uid ? (
        <Formulario
          key={a.uid}
          inicial={a}
          campos={[
            { id: 'nome', rotulo: 'Ataque', dica: 'Ex.: Garras' },
            { id: 'alcance', rotulo: 'Alcance', dica: 'Ex.: Corpo a corpo ×2' },
            { id: 'teste', rotulo: 'Teste', dica: '3d20+10', curto: true },
            { id: 'dano', rotulo: 'Dano', dica: '2d6+6 impacto', curto: true },
          ]}
          onSalvar={(v) => ed.salvar(a.uid, v)}
          onCancelar={() => ed.cancelar(a.uid)}
          onApagar={() => ed.apagar(a.uid)}
        />
      ) : (
        <div key={a.uid} className={styles.linha}>
          <div className={styles.cabeca}>
            <b>{a.nome || 'Sem nome'}</b>
            {a.alcance && <i>{a.alcance}</i>}
            <Lapis onClick={() => ed.abrir(a.uid)} rotulo={`Editar ${a.nome || 'ataque'}`} />
          </div>
          <p className={styles.numeros}>
            <span>TESTE</span> {a.teste || '—'} <span className={styles.barra}>|</span> <span>DANO</span> {a.dano || '—'}
          </p>
        </div>
      )))}
      <button type="button" className={styles.adicionar} onClick={ed.adicionar}>+ Ataque</button>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Ações (com tipo) e habilidades (sem tipo): TIPO ◇ NOME ✎ + texto */
/* ---------------------------------------------------------------- */
export function ListaAcoes({ acoes = [], onMudar }) {
  return <ListaDeTextos titulo="Ações" itens={acoes} onMudar={onMudar} comTipo rotuloNovo="+ Ação" />;
}

export function ListaHabilidades({ habilidades = [], onMudar }) {
  return <ListaDeTextos titulo="Habilidades" itens={habilidades} onMudar={onMudar} rotuloNovo="+ Habilidade" />;
}

function ListaDeTextos({ titulo, itens, onMudar, comTipo = false, rotuloNovo }) {
  const ed = useEdicao(itens, onMudar, { ...(comTipo && { tipo: 'Padrão' }), nome: '', texto: '' });

  return (
    <section className={styles.lista}>
      <h3>{titulo}</h3>
      {itens.length === 0 && <p className={styles.vazio}>Nada por aqui ainda.</p>}
      {itens.map((it) => (ed.editando === it.uid ? (
        <Formulario
          key={it.uid}
          inicial={it}
          tipos={comTipo ? TIPOS_DE_ACAO : null}
          campos={[
            { id: 'nome', rotulo: 'Nome', dica: comTipo ? 'Ex.: Agarrão' : 'Ex.: Regeneração' },
            { id: 'texto', rotulo: 'O que faz', dica: 'Gatilho, alcance, teste, dano, DT…', longo: true },
          ]}
          onSalvar={(v) => ed.salvar(it.uid, v)}
          onCancelar={() => ed.cancelar(it.uid)}
          onApagar={() => ed.apagar(it.uid)}
        />
      ) : (
        <div key={it.uid} className={styles.linha}>
          <div className={styles.cabeca}>
            {comTipo && <span className={styles.tipo}>{it.tipo} {marca(it.tipo)}</span>}
            <b>{it.nome || 'Sem nome'}</b>
            <Lapis onClick={() => ed.abrir(it.uid)} rotulo={`Editar ${it.nome || titulo}`} />
          </div>
          {it.texto && <p className={styles.texto}>{it.texto}</p>}
        </div>
      )))}
      <button type="button" className={styles.adicionar} onClick={ed.adicionar}>{rotuloNovo}</button>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Peças                                                            */
/* ---------------------------------------------------------------- */
function Lapis({ onClick, rotulo }) {
  return (
    <button type="button" className={styles.lapis} onClick={onClick} aria-label={rotulo} title="Editar">✎</button>
  );
}

// Edição de uma linha: só grava ao clicar em Salvar
function Formulario({ inicial, campos, tipos, onSalvar, onCancelar, onApagar }) {
  const [valores, setValores] = useState(() =>
    Object.fromEntries([...(tipos ? ['tipo'] : []), ...campos.map((c) => c.id)].map((id) => [id, inicial[id] ?? ''])));
  const mudar = (id, v) => setValores((atual) => ({ ...atual, [id]: v }));

  function enviar(e) {
    e.preventDefault();
    onSalvar(Object.fromEntries(Object.entries(valores).map(([id, v]) => [id, typeof v === 'string' ? v.trim() : v])));
  }

  return (
    <form className={styles.formulario} onSubmit={enviar}>
      {tipos && (
        <div className={styles.tipos} role="radiogroup" aria-label="Tipo de ação">
          {tipos.map((t) => (
            <button key={t} type="button" role="radio" aria-checked={valores.tipo === t} onClick={() => mudar('tipo', t)}>
              {t}
            </button>
          ))}
        </div>
      )}
      <div className={styles.campos}>
        {campos.map((c) => (
          <label key={c.id} className={`${styles.campo} ${c.curto ? styles.curto : ''}`}>
            <span>{c.rotulo}</span>
            {c.longo ? (
              <textarea value={valores[c.id]} onChange={(e) => mudar(c.id, e.target.value)} placeholder={c.dica} rows={3} />
            ) : (
              <input value={valores[c.id]} onChange={(e) => mudar(c.id, e.target.value)} placeholder={c.dica} />
            )}
          </label>
        ))}
      </div>
      <div className={styles.botoes}>
        <button type="button" className={styles.apagar} onClick={onApagar}>Apagar</button>
        <button type="button" className={styles.cancelar} onClick={onCancelar}>Cancelar</button>
        <button type="submit" className={styles.salvar}>Salvar</button>
      </div>
    </form>
  );
}
