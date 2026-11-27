import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PreviaDado from '../../../../components/Dados/PreviaDado';
import { useRolagem } from '../../../../components/Dados/rolagem';
import { aparencia, COR_PADRAO, corDoNumero, escolhaDoKit, KIT, PALETA, SKINS } from '../../../../components/Dados/skins';
import { guardarImagemDoDado, imagemDoDado, useVersaoDasImagens } from '../../../../components/Dados/imagensDeDado';
import Seletor from '../../../../components/Seletor/Seletor';
import EnviarImagemDoDado from './EnviarImagemDoDado';
import { api } from '../../../../services/api';
import styles from './Dados.module.scss';

const TIPOS = { jogador: 'Jogador', npc: 'NPC', monstro: 'Monstro' };
const GRUPOS = [
  { id: 'Elementos', titulo: 'Elementos do Outro Lado' },
  { id: 'Ordem', titulo: 'Temáticas da Ordem' },
];

/**
 * Kits de dados de cada ficha: d4, d6, d8, d10, d12, d20 e d100, cada peça com a sua cor ou skin.
 * Fica em ficha.dados.dado = { kits: [{ nome, kit }, ×3], ativo, kit }: "kit" é a cópia do kit em
 * uso, o que todas as rolagens leem (as fichas antigas, só com "kit", continuam valendo).
 */
export default function Dados({ campanha }) {
  const [fichas, setFichas] = useState(null);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useSearchParams();
  const { rolar } = useRolagem();
  const salvando = useRef({});   // um temporizador por ficha (salva 350ms depois da última mudança)

  useEffect(() => {
    const efeito = { ativo: true };
    // O jogador monta só o kit do próprio agente (os dos outros vêm só no básico)
    api.listarFichas(campanha.id)
      .then((f) => efeito.ativo && setFichas(f.filter((x) => !x.basica)))
      .catch((e) => efeito.ativo && setErro(e.message));
    return () => { efeito.ativo = false; };
  }, [campanha.id]);

  // Imagens próprias da ficha aberta (só os ids; cada imagem vem do cache de imagensDeDado)
  const fichaIdAtual = fichas ? (fichas.find((f) => f.id === Number(busca.get('ficha'))) ?? fichas[0])?.id : null;
  const [imagens, setImagens] = useState({ ficha: null, ids: [] });
  const [enviando, setEnviando] = useState(false);
  useVersaoDasImagens();   // redesenha as miniaturas quando uma imagem termina de carregar
  useEffect(() => {
    if (!fichaIdAtual) return undefined;
    const efeito = { ativo: true };
    api.listarImagensDado(fichaIdAtual)
      .then((ids) => efeito.ativo && setImagens({ ficha: fichaIdAtual, ids }))
      .catch(() => efeito.ativo && setImagens({ ficha: fichaIdAtual, ids: [] }));
    return () => { efeito.ativo = false; };
  }, [fichaIdAtual]);

  if (erro && !fichas) return <p className="erro">{erro}</p>;
  if (!fichas) return <p className={styles.carregando}>Carregando…</p>;

  const ficha = fichas.find((f) => f.id === Number(busca.get('ficha'))) ?? fichas[0];
  const { kits, ativo } = kitsDaFicha(ficha?.dados?.dado);
  // O kit que está sendo montado (não precisa ser o que está em uso)
  const editando = [0, 1, 2].includes(Number(busca.get('kit'))) && busca.get('kit') !== null ? Number(busca.get('kit')) : ativo;
  const estilo = { kit: kits[editando].kit };
  const peca = KIT.includes(Number(busca.get('peca'))) ? Number(busca.get('peca')) : 20;
  const escolha = escolhaDoKit(estilo, peca);
  const skin = SKINS.find((s) => s.id === escolha.skin);

  const irPara = (mudancas) => {
    const proxima = new URLSearchParams(busca);
    Object.entries(mudancas).forEach(([k, v]) => proxima.set(k, String(v)));
    setBusca(proxima, { replace: true });
  };

  function salvar(novo) {
    const id = ficha.id;
    setFichas((lista) => lista.map((f) => (f.id === id ? { ...f, dados: { ...f.dados, dado: novo } } : f)));
    clearTimeout(salvando.current[id]);
    salvando.current[id] = setTimeout(() => {
      api.atualizarFicha(id, { dados: { dado: novo } }).catch((e) => setErro(`Não foi possível salvar: ${e.message}`));
    }, 350);
  }

  // Guarda os três kits; "kit" (o que as rolagens leem) é sempre a cópia do kit em uso
  const salvarKits = (novos, emUso = ativo) => salvar({ kits: novos, ativo: emUso, kit: novos[emUso].kit });
  const mudarKit = (mudar) => salvarKits(kits.map((k, i) => (i === editando ? mudar(k) : k)));

  // O kit em edição completo (o formato antigo, uma cor para tudo, vira um kit com todas as peças iguais)
  const kitAtual = () => Object.fromEntries(KIT.map((l) => [`d${l}`, escolhaDoKit(estilo, l)]));
  const mudarPeca = (nova) => mudarKit((k) => ({ ...k, kit: { ...kitAtual(), [`d${peca}`]: nova } }));
  const aplicarATodos = () => mudarKit((k) => ({ ...k, kit: Object.fromEntries(KIT.map((l) => [`d${l}`, escolha])) }));
  const renomear = (nome) => mudarKit((k) => ({ ...k, nome }));
  const usarEste = () => salvarKits(kits, editando);

  // Imagem própria na peça (a aresta fica escura; uma cor escolhida depois tira a imagem)
  // Regra: uma imagem própria por kit. Escolher outra troca a imagem em todas as peças deste kit
  // que já usavam uma (cada uma mantém a cor da aresta)
  const usarImagem = (id) => mudarKit((k) => {
    const completo = kitAtual();
    const novo = Object.fromEntries(Object.entries(completo).map(([chave, p]) => (
      [chave, p?.imagem ? { ...p, imagem: id, ficha: ficha.id } : p]
    )));
    return { ...k, kit: { ...novo, [`d${peca}`]: { imagem: id, ficha: ficha.id } } };
  });
  // A imagem que este kit usa (se usa alguma)
  const imagemDoKit = Object.values(kits[editando].kit).find((p) => p?.imagem)?.imagem ?? null;
  const idsDaFicha = imagens.ficha === ficha.id ? imagens.ids : [];

  async function enviarImagem(dataUrl) {
    const { id } = await api.enviarImagemDado(ficha.id, dataUrl);
    guardarImagemDoDado(ficha.id, id, dataUrl);
    setImagens((atual) => ({ ficha: ficha.id, ids: [...(atual.ficha === ficha.id ? atual.ids : []), id] }));
    usarImagem(id);
  }

  async function apagarImagem(id) {
    if (!window.confirm('Apagar esta imagem? As peças que usam ela voltam para a cor.')) return;
    try {
      await api.apagarImagemDado(ficha.id, id);
      setImagens((atual) => ({ ...atual, ids: atual.ids.filter((x) => x !== id) }));
      if (escolha.imagem === id) mudarPeca({ cor: COR_PADRAO });
    } catch (e) {
      setErro(`Não foi possível apagar: ${e.message}`);
    }
  }

  // Testes: a peça escolhida (o d20 num teste, as outras num dano) e o kit inteiro de uma vez
  const testarPeca = () => rolar(peca === 20
    ? { titulo: ficha.nome, subtitulo: 'Teste do d20', formula: '3d20', tipo: 'teste', estilo }
    : { titulo: ficha.nome, subtitulo: `Teste do d${peca}`, partes: [{ formula: `2d${peca}` }], tipo: 'dano', estilo });
  const testarKit = () => rolar({
    titulo: ficha.nome,
    subtitulo: 'O kit inteiro',
    partes: [{ formula: KIT.map((l) => `1d${l}`).join('+') }],
    tipo: 'dano',
    estilo,
  });

  return (
    <section className={styles.pagina}>
      <header className={styles.topo}>
        <h1>Dados</h1>
        <p>Cada ficha tem até 3 kits (d4, d6, d8, d10, d12, d20 e d100, cada peça com a sua cor ou skin); o kit em uso vale em todas as rolagens dela.</p>
      </header>

      {erro && <p className="erro">{erro}</p>}

      {fichas.length === 0 ? (
        <p className={styles.vazio}>Crie uma ficha (jogador, NPC ou monstro) para montar o kit dela.</p>
      ) : (
        <div className={styles.grade}>
          {/* ---------- Vitrine ---------- */}
          <div className={styles.vitrine}>
            <PreviaDado estilo={estilo} selecionado={peca} className={styles.previaGrande} />
            <div className={styles.testar}>
              <button type="button" className={styles.primario} onClick={testarPeca}>Rolar o d{peca}</button>
              <button type="button" onClick={testarKit}>Rolar o kit inteiro</button>
            </div>
            <p className={styles.dica}>
              Dano de elemento (Sangue, Morte, Conhecimento, Energia, Medo) cai com a skin do elemento,
              qualquer que seja o kit. O d100 é o d10 das dezenas: ele rola junto com o d10.
            </p>

            {/* Ficha e kits embaixo da vitrine, lado a lado */}
            <div className={styles.fichaEKits}>
            <div className={styles.bloco}>
              <h2>Ficha</h2>
              <Seletor
                rotulo="Ficha"
                valor={ficha.id}
                opcoes={fichas.map((f) => ({ valor: f.id, rotulo: f.nome, detalhe: TIPOS[f.tipo] }))}
                onMudar={(id) => {
                  const proxima = new URLSearchParams(busca);
                  proxima.set('ficha', String(id));
                  proxima.delete('kit');   // a outra ficha abre no kit em uso dela
                  setBusca(proxima, { replace: true });
                }}
              />
            </div>

            {/* Três kits por ficha: um em uso nas rolagens, os outros guardados para trocar */}
            <div className={styles.bloco}>
              <h2>Kits da ficha</h2>
              <div className={styles.kits} role="tablist" aria-label="Kits da ficha">
                {kits.map((k, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === editando}
                    onClick={() => irPara({ kit: i })}
                  >
                    <span className={styles.miniKit} aria-hidden="true">
                      {[20, 6, 4].map((l) => {
                        const ap = aparencia({ kit: k.kit }, l);
                        return <i key={l} style={{ '--base': ap.base, '--aresta': ap.aresta }} />;
                      })}
                    </span>
                    <b>{k.nome || `Kit ${i + 1}`}</b>
                    {i === ativo && <small>Em uso</small>}
                  </button>
                ))}
              </div>
              <div className={styles.kitLinha}>
                <input
                  value={kits[editando].nome}
                  onChange={(e) => renomear(e.target.value)}
                  maxLength={20}
                  placeholder={`Kit ${editando + 1}`}
                  aria-label="Nome do kit"
                />
                {editando === ativo ? (
                  <span className={styles.emUso}>✓ Em uso nas rolagens</span>
                ) : (
                  <button type="button" className={styles.usarKit} onClick={usarEste}>Usar este kit</button>
                )}
              </div>
            </div>
            </div>
          </div>

          {/* ---------- Escolhas da peça ---------- */}
          <div className={styles.controles}>
            <div className={styles.bloco}>
              <h2>Peça do kit</h2>
              <div className={styles.pecas} role="tablist" aria-label="Peça do kit">
                {KIT.map((l) => {
                  const ap = aparencia(estilo, l);
                  return (
                    <button
                      key={l}
                      type="button"
                      role="tab"
                      aria-selected={l === peca}
                      onClick={() => irPara({ peca: l })}
                      style={{ '--base': ap.base, '--aresta': ap.aresta, '--numero': ap.numero }}
                    >
                      <span className={styles.amostraPeca} aria-hidden="true" />
                      d{l}
                    </button>
                  );
                })}
              </div>
              <button type="button" className={styles.todos} onClick={aplicarATodos}>
                Usar o visual do d{peca} no kit inteiro
              </button>
            </div>

            <div className={styles.bloco}>
              <h2>Cor do d{peca}</h2>
              <Cores valor={skin || escolha.imagem ? null : escolha.cor ?? COR_PADRAO} onMudar={(cor) => mudarPeca({ cor })} />
              {(skin || escolha.imagem) && <p className={styles.dica}>Escolher uma cor tira a skin desta peça.</p>}
            </div>

            <div className={styles.bloco}>
              <h2>Skin do d{peca}</h2>
              <button
                type="button"
                className={styles.semSkin}
                aria-pressed={!skin && !escolha.imagem}
                onClick={() => mudarPeca({ cor: escolha.cor ?? COR_PADRAO })}
              >
                Sem skin (usar a cor)
              </button>

              {/* Personalizadas: imagens próprias da ficha (até 3, uma por kit) e o "+" para enviar outra */}
              <div className={styles.grupo}>
                <h3>Personalizadas <small className={styles.regra}>1 imagem por kit</small></h3>
                {imagemDoKit && idsDaFicha.length > 1 && (
                  <p className={styles.dica}>Este kit usa a Imagem {idsDaFicha.indexOf(imagemDoKit) + 1}. Escolher outra troca em todas as peças dele.</p>
                )}
                <div className={styles.skins}>
                  {idsDaFicha.map((id) => {
                    const img = imagemDoDado(ficha.id, id);
                    return (
                      <div key={id} className={styles.personalizada}>
                        <button
                          type="button"
                          aria-pressed={escolha.imagem === id}
                          onClick={() => usarImagem(id)}
                          title="Usar esta imagem na peça"
                        >
                          <span className={styles.amostraFoto} aria-hidden="true">
                            {img && <img src={img.src} alt="" />}
                            <b>20</b>
                          </span>
                          Imagem {idsDaFicha.indexOf(id) + 1}
                        </button>
                        <button type="button" className={styles.apagarFoto} onClick={() => apagarImagem(id)} aria-label="Apagar esta imagem" title="Apagar">✕</button>
                      </div>
                    );
                  })}
                  {idsDaFicha.length < 3 && (
                    <button type="button" className={styles.novaFoto} onClick={() => setEnviando(true)} title="Enviar uma imagem própria para os dados">
                      <span className={styles.amostraMais} aria-hidden="true">+</span>
                      Personalizada
                    </button>
                  )}
                </div>
              </div>
              <EnviarImagemDoDado aberto={enviando} onFechar={() => setEnviando(false)} onPronto={enviarImagem} />
              {GRUPOS.map((grupo) => (
                <div key={grupo.id} className={styles.grupo}>
                  <h3>{grupo.titulo}</h3>
                  <div className={styles.skins}>
                    {SKINS.filter((s) => s.grupo === grupo.id).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={escolha.skin === s.id}
                        onClick={() => mudarPeca({ skin: s.id })}
                        style={{ '--base': s.base, '--aresta': s.aresta, '--numero': s.numero }}
                      >
                        <span className={styles.amostra} aria-hidden="true">20</span>
                        {s.nome}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/*
 * Os três kits da ficha: { kits: [{ nome, kit }, ×3], ativo }. Ficha antiga (um kit só, ou o
 * formato de uma cor para tudo) vira o Kit 1 em uso; os vazios começam com a cor padrão.
 */
function kitsDaFicha(dado) {
  const ativo = [0, 1, 2].includes(dado?.ativo) ? dado.ativo : 0;
  const atual = Object.fromEntries(KIT.map((l) => [`d${l}`, escolhaDoKit(dado, l)]));
  const kits = [0, 1, 2].map((i) => {
    const guardado = dado?.kits?.[i];
    if (guardado) return { nome: guardado.nome ?? `Kit ${i + 1}`, kit: guardado.kit ?? {} };
    return { nome: `Kit ${i + 1}`, kit: i === ativo ? atual : {} };
  });
  return { kits, ativo };
}

// Paleta pronta + cor livre
function Cores({ valor, onMudar }) {
  const livre = valor && !PALETA.includes(valor);
  return (
    <div className={styles.cores} role="radiogroup">
      {PALETA.map((cor) => (
        <button
          key={cor}
          type="button"
          role="radio"
          aria-checked={valor === cor}
          aria-label={`Cor ${cor}`}
          style={{ '--c': cor, '--marca': corDoNumero(cor) }}
          onClick={() => onMudar(cor)}
        />
      ))}
      <label
        className={styles.livre}
        title="Outra cor"
        style={livre ? { '--c': valor, '--marca': corDoNumero(valor) } : undefined}
        aria-checked={Boolean(livre)}
      >
        <input type="color" value={valor ?? COR_PADRAO} onChange={(e) => onMudar(e.target.value)} aria-label="Outra cor" />
        <span aria-hidden="true">{livre ? '✓' : '+'}</span>
      </label>
    </div>
  );
}
