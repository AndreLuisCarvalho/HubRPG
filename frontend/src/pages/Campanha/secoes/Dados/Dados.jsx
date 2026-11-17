import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PreviaDado from '../../../../components/Dados/PreviaDado';
import { useRolagem } from '../../../../components/Dados/rolagem';
import { aparencia, COR_PADRAO, corDoNumero, escolhaDoKit, KIT, PALETA, SKINS } from '../../../../components/Dados/skins';
import Seletor from '../../../../components/Seletor/Seletor';
import { api } from '../../../../services/api';
import styles from './Dados.module.scss';

const TIPOS = { jogador: 'Jogador', npc: 'NPC', monstro: 'Monstro' };
const GRUPOS = [
  { id: 'Elementos', titulo: 'Elementos do Outro Lado' },
  { id: 'Ordem', titulo: 'Temáticas da Ordem' },
];

/**
 * Kit de dados de cada ficha: d4, d6, d8, d10, d12, d20 e d100, cada peça com a sua cor ou skin.
 * Fica em ficha.dados.dado = { kit: { d4: { cor } | { skin }, … } } e vale em todas as rolagens dela.
 */
export default function Dados({ campanha }) {
  const [fichas, setFichas] = useState(null);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useSearchParams();
  const { rolar } = useRolagem();
  const salvando = useRef({});   // um temporizador por ficha (salva 350ms depois da última mudança)

  useEffect(() => {
    const efeito = { ativo: true };
    api.listarFichas(campanha.id)
      .then((f) => efeito.ativo && setFichas(f))
      .catch((e) => efeito.ativo && setErro(e.message));
    return () => { efeito.ativo = false; };
  }, [campanha.id]);

  if (erro && !fichas) return <p className="erro">{erro}</p>;
  if (!fichas) return <p className={styles.carregando}>Carregando…</p>;

  const ficha = fichas.find((f) => f.id === Number(busca.get('ficha'))) ?? fichas[0];
  const estilo = ficha?.dados?.dado ?? {};
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

  // O kit atual completo (o formato antigo, uma cor para tudo, vira um kit com todas as peças iguais)
  const kitAtual = () => Object.fromEntries(KIT.map((l) => [`d${l}`, escolhaDoKit(estilo, l)]));
  const mudarPeca = (nova) => salvar({ kit: { ...kitAtual(), [`d${peca}`]: nova } });
  const aplicarATodos = () => salvar({ kit: Object.fromEntries(KIT.map((l) => [`d${l}`, escolha])) });

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
        <p>Cada ficha tem o seu kit: d4, d6, d8, d10, d12, d20 e d100, cada peça com a sua cor ou skin.</p>
      </header>

      {erro && <p className="erro">{erro}</p>}

      {fichas.length === 0 ? (
        <p className={styles.vazio}>Crie uma ficha (jogador, NPC ou monstro) para montar o kit dela.</p>
      ) : (
        <div className={styles.grade}>
          {/* ---------- Vitrine ---------- */}
          <div className={styles.vitrine}>
            <PreviaDado estilo={estilo} selecionado={peca} />
            <div className={styles.testar}>
              <button type="button" className={styles.primario} onClick={testarPeca}>Rolar o d{peca}</button>
              <button type="button" onClick={testarKit}>Rolar o kit inteiro</button>
            </div>
            <p className={styles.dica}>
              Dano de elemento (Sangue, Morte, Conhecimento, Energia, Medo) cai com a skin do elemento,
              qualquer que seja o kit. O d100 é o d10 das dezenas: ele rola junto com o d10.
            </p>
          </div>

          {/* ---------- Escolhas ---------- */}
          <div className={styles.controles}>
            <div className={styles.bloco}>
              <h2>Ficha</h2>
              <Seletor
                rotulo="Ficha"
                valor={ficha.id}
                opcoes={fichas.map((f) => ({ valor: f.id, rotulo: f.nome, detalhe: TIPOS[f.tipo] }))}
                onMudar={(id) => irPara({ ficha: id })}
              />
            </div>

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
              <Cores valor={skin ? null : escolha.cor ?? COR_PADRAO} onMudar={(cor) => mudarPeca({ cor })} />
              {skin && <p className={styles.dica}>Escolher uma cor tira a skin desta peça.</p>}
            </div>

            <div className={styles.bloco}>
              <h2>Skin do d{peca}</h2>
              <button
                type="button"
                className={styles.semSkin}
                aria-pressed={!skin}
                onClick={() => mudarPeca({ cor: escolha.cor ?? COR_PADRAO })}
              >
                Sem skin (usar a cor)
              </button>
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
