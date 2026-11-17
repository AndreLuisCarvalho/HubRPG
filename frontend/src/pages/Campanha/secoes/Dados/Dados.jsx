import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PreviaDado from '../../../../components/Dados/PreviaDado';
import { useRolagem } from '../../../../components/Dados/rolagem';
import { COR_PADRAO, corDoNumero, PALETA, SKINS } from '../../../../components/Dados/skins';
import Seletor from '../../../../components/Seletor/Seletor';
import { api } from '../../../../services/api';
import styles from './Dados.module.scss';

const TIPOS = { jogador: 'Jogador', npc: 'NPC', monstro: 'Monstro' };
const GRUPOS = [
  { id: 'Elementos', titulo: 'Elementos do Outro Lado' },
  { id: 'Ordem', titulo: 'Temáticas da Ordem' },
];

/**
 * Personalização dos dados: cada ficha escolhe a cor (teste e dano) ou uma skin.
 * A escolha fica em ficha.dados.dado = { cor, corDano, skin } e vale em todas as rolagens dela.
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
  const skin = SKINS.find((s) => s.id === estilo.skin);

  function mudar(parcial) {
    const novo = Object.fromEntries(Object.entries({ ...estilo, ...parcial }).filter(([, v]) => v !== undefined));
    const id = ficha.id;
    setFichas((lista) => lista.map((f) => (f.id === id ? { ...f, dados: { ...f.dados, dado: novo } } : f)));
    clearTimeout(salvando.current[id]);
    salvando.current[id] = setTimeout(() => {
      api.atualizarFicha(id, { dados: { dado: novo } }).catch((e) => setErro(`Não foi possível salvar: ${e.message}`));
    }, 350);
  }

  const testar = (tipo) => rolar({
    titulo: ficha.nome,
    subtitulo: tipo === 'dano' ? 'Teste do dado de dano' : 'Teste do dado',
    formula: tipo === 'dano' ? '2d8+2' : '3d20',
    tipo,
    estilo,
  });

  return (
    <section className={styles.pagina}>
      <header className={styles.topo}>
        <h1>Dados</h1>
        <p>Cada ficha rola com o próprio dado. Escolha uma cor para os testes e outra para o dano, ou uma skin.</p>
      </header>

      {erro && <p className="erro">{erro}</p>}

      {fichas.length === 0 ? (
        <p className={styles.vazio}>Crie uma ficha (jogador, NPC ou monstro) para personalizar o dado dela.</p>
      ) : (
        <div className={styles.grade}>
          {/* ---------- Vitrine ---------- */}
          <div className={styles.vitrine}>
            <PreviaDado estilo={estilo} />
            <div className={styles.legenda}>
              <span>d20 · teste</span>
              <b>{skin ? `Skin ${skin.nome}` : 'Cores'}</b>
              <span>d8 · dano</span>
            </div>
            <div className={styles.testar}>
              <button type="button" className={styles.primario} onClick={() => testar('teste')}>Testar teste</button>
              <button type="button" onClick={() => testar('dano')}>Testar dano</button>
            </div>
          </div>

          {/* ---------- Escolhas ---------- */}
          <div className={styles.controles}>
            <div className={styles.bloco}>
              <h2>Ficha</h2>
              <Seletor
                rotulo="Ficha"
                valor={ficha.id}
                opcoes={fichas.map((f) => ({ valor: f.id, rotulo: f.nome, detalhe: TIPOS[f.tipo] }))}
                onMudar={(id) => setBusca({ ficha: String(id) }, { replace: true })}
              />
            </div>

            <div className={styles.bloco}>
              <h2>Cor do dado</h2>
              <Cores
                valor={skin ? null : estilo.cor ?? COR_PADRAO}
                onMudar={(cor) => mudar({ cor, skin: undefined })}
              />
              {skin && <p className={styles.dica}>Escolher uma cor tira a skin.</p>}
            </div>

            <div className={styles.bloco}>
              <h2>Cor do dano</h2>
              <Cores
                valor={skin || !estilo.corDano ? null : estilo.corDano}
                onMudar={(corDano) => mudar({ corDano, skin: undefined })}
                antes={(
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!skin && !estilo.corDano}
                    className={styles.igual}
                    onClick={() => mudar({ corDano: undefined, skin: undefined })}
                  >
                    Igual ao teste
                  </button>
                )}
              />
            </div>

            <div className={styles.bloco}>
              <h2>Skins</h2>
              <p className={styles.dica}>A skin vale para todos os dados da ficha, de teste e de dano.</p>
              <button
                type="button"
                className={styles.semSkin}
                aria-pressed={!skin}
                onClick={() => mudar({ skin: undefined })}
              >
                Sem skin (usar as cores)
              </button>
              {GRUPOS.map((grupo) => (
                <div key={grupo.id} className={styles.grupo}>
                  <h3>{grupo.titulo}</h3>
                  <div className={styles.skins}>
                    {SKINS.filter((s) => s.grupo === grupo.id).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={estilo.skin === s.id}
                        onClick={() => mudar({ skin: s.id })}
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
function Cores({ valor, onMudar, antes }) {
  const livre = valor && !PALETA.includes(valor);
  return (
    <div className={styles.cores} role="radiogroup">
      {antes}
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
