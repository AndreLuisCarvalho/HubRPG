import { useState } from 'react';
import { EscolherFoto, Modal, Seletor } from '../../../../../components';
import styles from './NovaFicha.module.scss';

const TEXTOS = {
  jogador: { sobretitulo: 'Novo agente da Ordem', titulo: 'Recrutar agente' },
  npc: { sobretitulo: 'Novo personagem', titulo: 'Criar NPC' },
  monstro: { sobretitulo: 'Nova ameaça', titulo: 'Criar monstro' },
};

const MODELOS_NPC = [
  { id: 'simples', nome: 'Simples', descricao: 'Gente comum: quem é, como age e o básico de combate.' },
  { id: 'agente', nome: 'Agente', descricao: 'Ficha completa, com classe, NEX, atributos e rituais.' },
];

export default function NovaFicha({ aberto, onFechar, onCriar, sistema, tipo }) {
  const classes = sistema?.classes ?? [];
  const origens = sistema?.origens ?? [];
  const textos = TEXTOS[tipo] ?? TEXTOS.jogador;

  const [nome, setNome] = useState('');
  const [jogador, setJogador] = useState('');
  const [origem, setOrigem] = useState('');
  const [classe, setClasse] = useState(classes[0]?.id ?? '');
  const [trilha, setTrilha] = useState('');
  const [imagem, setImagem] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Trilhas da classe escolhida (sistemas sem trilha: lista vazia, o campo nem aparece)
  const trilhas = sistema?.trilhas?.(classe) ?? [];
  const trilhaEscolhida = trilhas.find((t) => t.id === trilha);

  // Trocar de classe apaga a trilha (cada classe tem as suas)
  function escolherClasse(id) {
    setClasse(id);
    setTrilha('');
  }

  // Agente de jogador: Origem, Jogador e Trilha são definidos aqui e não mudam mais na ficha
  const ehJogador = tipo === 'jogador';
  // NPC: "simples" (gente comum, ficha curta) ou "agente" (ficha completa, sem travas)
  const ehNpc = tipo === 'npc';
  const [modelo, setModelo] = useState('simples');
  const [papel, setPapel] = useState('');
  const simples = ehNpc && modelo === 'simples';

  // Monstro: feito do zero ou copiado do catálogo oficial (que só baixa ao escolher "Do livro")
  const ehMonstro = tipo === 'monstro';
  const [deOnde, setDeOnde] = useState('zero');
  const [catalogo, setCatalogo] = useState(null);
  const [buscaMonstro, setBuscaMonstro] = useState('');
  const [escolhido, setEscolhido] = useState(null);

  function escolherDeOnde(id) {
    setDeOnde(id);
    if (id === 'livro' && !catalogo) sistema?.monstros?.().then(setCatalogo).catch(() => setCatalogo([]));
  }

  // Escolher um oficial preenche o nome (se ainda não foi mudado à mão)
  function escolherMonstro(m) {
    if (!nome.trim() || nome === escolhido?.nome) setNome(m.nome);
    setEscolhido(m);
  }

  const termo = buscaMonstro.trim().toLocaleLowerCase('pt-BR');
  const listaMonstros = (catalogo ?? []).filter((m) => !termo || m.nome.toLocaleLowerCase('pt-BR').includes(termo));

  const semClasse = simples || ehMonstro;
  const completo = nome.trim()
    && (!ehJogador || (jogador.trim() && origem.trim()))
    && (!ehMonstro || deOnde === 'zero' || escolhido);

  function opcoesDaFicha() {
    if (ehMonstro) return { modelo: 'monstro', base: deOnde === 'livro' ? escolhido : undefined };
    if (simples) return { modelo: 'simples', papel: papel.trim() };
    return { classe, trilha, jogador: jogador.trim(), origem: origem.trim(), ...(ehNpc && { modelo: 'agente', papel: papel.trim() }) };
  }

  async function enviar(e) {
    e.preventDefault();   // impede o formulário de recarregar a página
    if (!completo) return;
    setEnviando(true);
    try {
      await onCriar({ nome: nome.trim(), imagem, opcoes: opcoesDaFicha() });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal aberto={aberto} onFechar={onFechar} sobretitulo={textos.sobretitulo} titulo={textos.titulo}>
      <form className={styles.form} onSubmit={enviar}>
        <div className={styles.identidade}>
          <EscolherFoto imagem={imagem} inicial={nome.trim().charAt(0) || '?'} onEscolher={setImagem} tamanho={64} />
          <label className={styles.campo}>
            <span>{ehMonstro ? 'Nome da ameaça' : 'Nome do personagem'}</span>
            <input
              autoFocus
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={ehMonstro ? 'Ex.: Zumbi de Sangue' : 'Ex.: Helena Vasconcelos'}
            />
          </label>
        </div>

        {ehJogador && (
          <label className={styles.campo}>
            <span>Jogador</span>
            <input required value={jogador} onChange={(e) => setJogador(e.target.value)} placeholder="Quem vai jogar com este agente" />
          </label>
        )}

        {ehMonstro && (
          <fieldset className={styles.campo}>
            <legend>De onde vem</legend>
            <div className={styles.modelos}>
              {[
                { id: 'zero', nome: 'Do zero', descricao: 'Uma ameaça sua: começa em branco e você preenche.' },
                { id: 'livro', nome: 'Do livro', descricao: 'Copia um monstro oficial; depois dá para mudar tudo.' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`${styles.modelo} ${deOnde === m.id ? styles.escolhida : ''}`}
                  onClick={() => escolherDeOnde(m.id)}
                  aria-pressed={deOnde === m.id}
                >
                  <b>{m.nome}</b>
                  <small>{m.descricao}</small>
                </button>
              ))}
            </div>

            {deOnde === 'livro' && (
              <div className={styles.catalogo}>
                <input
                  type="search"
                  value={buscaMonstro}
                  onChange={(e) => setBuscaMonstro(e.target.value)}
                  placeholder="Buscar monstro…"
                  aria-label="Buscar monstro do livro"
                />
                {!catalogo && <p className={styles.aviso}>Abrindo o livro…</p>}
                {catalogo && listaMonstros.length === 0 && <p className={styles.aviso}>Nenhum monstro encontrado.</p>}
                <ul role="listbox" aria-label="Monstros do livro">
                  {listaMonstros.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={escolhido?.id === m.id}
                        style={m.cor ? { '--el': m.cor } : undefined}
                        onClick={() => escolherMonstro(m)}
                      >
                        <b>{m.nome}</b>
                        <small>{m.nomeElemento} · {m.nomeTamanho}</small>
                        <span className={styles.vdMonstro}>VD {m.vd}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </fieldset>
        )}

        {ehNpc && (
          <>
            <fieldset className={styles.campo}>
              <legend>Tipo de NPC</legend>
              <div className={styles.modelos}>
                {MODELOS_NPC.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`${styles.modelo} ${modelo === m.id ? styles.escolhida : ''}`}
                    onClick={() => setModelo(m.id)}
                    aria-pressed={modelo === m.id}
                  >
                    <b>{m.nome}</b>
                    <small>{m.descricao}</small>
                  </button>
                ))}
              </div>
            </fieldset>

            <label className={styles.campo}>
              <span>Papel</span>
              <input value={papel} onChange={(e) => setPapel(e.target.value)} placeholder="Ex.: delegado da cidade, dona da pensão" />
            </label>
          </>
        )}

        {!semClasse && classes.length > 0 && (
          <fieldset className={styles.campo}>
            <legend>Classe</legend>
            <div className={styles.classes}>
              {classes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.classe} ${classe === c.id ? styles.escolhida : ''}`}
                  onClick={() => escolherClasse(c.id)}
                  aria-pressed={classe === c.id}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d={c.icone} /></svg>
                  <b>{c.nome}</b>
                  <small>{c.descricao}</small>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {!semClasse && trilhas.length > 0 && (
          <div className={styles.campo}>
            <span>Trilha</span>
            <Seletor
              rotulo="Trilha"
              valor={trilha}
              onMudar={setTrilha}
              placeholder="Escolher depois (no NEX 10%)"
              opcoes={[
                { valor: '', rotulo: 'Escolher depois', detalhe: 'no NEX 10%' },
                ...trilhas.map((t) => ({ valor: t.id, rotulo: t.nome })),
              ]}
            />
            {/* Prévia: o que a trilha libera em cada NEX */}
            {trilhaEscolhida && (
              <div className={styles.previa}>
                <p>{trilhaEscolhida.descricao}</p>
                <ol>
                  {trilhaEscolhida.habilidades.map((h) => (
                    <li key={h.nome}><small>NEX {h.nex}%</small> {h.nome}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Sistema com lista de origens: escolhe da lista (select próprio); senão, texto livre.
            É <div> e não <label>: um label em volta faria o clique na lista reabrir o seletor. */}
        {semClasse ? null : origens.length > 0 ? (
          <div className={styles.campo}>
            <span>Origem</span>
            <Seletor
              rotulo="Origem"
              valor={origem}
              onMudar={setOrigem}
              obrigatorio={ehJogador}
              placeholder={ehJogador ? 'Escolha a origem' : 'Escolher depois'}
              opcoes={[
                ...(ehJogador ? [] : [{ valor: '', rotulo: 'Escolher depois' }]),
                ...origens.map((o) => ({ valor: o.id, rotulo: o.nome, detalhe: o.poder })),
              ]}
            />
          </div>
        ) : (
          <label className={styles.campo}>
            <span>Origem</span>
            <input value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="Ex.: Acadêmico, Policial, T.I." />
          </label>
        )}

        {ehJogador && (
          <p className={styles.aviso}>Origem, jogador e trilha ficam fixos depois de escolhidos.</p>
        )}
        {simples && (
          <p className={styles.aviso}>Dá para transformar em agente depois, na própria ficha.</p>
        )}

        <div className={styles.acoes}>
          <button type="button" className={styles.cancelar} onClick={onFechar}>Cancelar</button>
          <button type="submit" className={styles.criar} disabled={enviando || !completo}>
            {enviando ? 'Criando…' : 'Criar e abrir ficha'}
          </button>
        </div>
      </form>
    </Modal>
  );
}