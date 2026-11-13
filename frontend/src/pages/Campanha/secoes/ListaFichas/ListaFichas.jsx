import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../../services/api';
import { obterSistema } from '../../../../sistemas';
import CardFicha from './CardFicha/CardFicha';
import NovaFicha from './NovaFicha/NovaFicha';
import styles from './ListaFichas.module.scss';

const TIPOS = [
  { tipo: 'jogador', rotulo: 'Jogadores' },
  { tipo: 'npc', rotulo: 'NPCs' },
  { tipo: 'monstro', rotulo: 'Monstros' },
];

export default function ListaFichas({ campanha, tipo, titulo }) {
  const [fichas, setFichas] = useState(null);
  const [erro, setErro] = useState('');
  const [criando, setCriando] = useState(false);
  const navigate = useNavigate();
  const sistema = obterSistema(campanha.sistema_id);

  // useCallback: a função só muda se a campanha ou o tipo mudarem
  const carregar = useCallback(
    () => api.listarFichas(campanha.id, tipo).then(setFichas).catch((e) => setErro(e.message)),
    [campanha.id, tipo]
  );

  useEffect(() => { carregar(); }, [carregar]);

  const abrir = (ficha) => navigate(`/campanha/${campanha.id}/fichas/${ficha.id}`);

  async function criar({ nome, imagem, opcoes }) {
    try {
      const nova = await api.criarFicha(campanha.id, {
        nome,
        tipo,
        imagem,
        dados: sistema?.fichaInicial(opcoes) ?? {},
      });
      abrir(nova);
    } catch (e) {
      setErro(e.message);
    }
  }

  // Ações do menu ⋯: depois de cada uma, recarrega a lista
  async function executar(acao) {
    try {
      await acao();
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  const duplicar = (f) => executar(() =>
    api.criarFicha(campanha.id, { nome: `${f.nome} (cópia)`, tipo: f.tipo, imagem: f.imagem, dados: f.dados })
  );
  const mover = (f, novoTipo) => executar(() => api.atualizarFicha(f.id, { tipo: novoTipo }));
  const excluir = (f) => executar(() => api.excluirFicha(f.id));

  const destinos = TIPOS.filter((t) => t.tipo !== tipo);

  return (
    <section className={styles.lista}>
      <header className={styles.topo}>
        <h1 className={styles.titulo}>{titulo}</h1>
        {fichas && <span className={styles.contador}>{fichas.length}</span>}
        <button className={styles.novo} onClick={() => setCriando(true)}>+ Nova ficha</button>
      </header>

      {erro && <p className="erro">{erro}</p>}
      {!fichas && !erro && <p className={styles.aviso}>Carregando…</p>}

      {fichas && (
        <div className={styles.grade}>
          {fichas.map((f) => (
            <CardFicha
              key={f.id}
              ficha={f}
              sistema={sistema}
              destinos={destinos}
              onAbrir={() => abrir(f)}
              onDuplicar={() => duplicar(f)}
              onMover={(novoTipo) => mover(f, novoTipo)}
              onExcluir={() => excluir(f)}
            />
          ))}

          <button className={styles.cardNovo} onClick={() => setCriando(true)}>
            <span aria-hidden="true">+</span>
            Nova ficha
          </button>
        </div>
      )}

      {/* Montado só quando aberto: cada vez que abre, o formulário começa limpo */}
      {criando && (
        <NovaFicha
          aberto
          tipo={tipo}
          sistema={sistema}
          onFechar={() => setCriando(false)}
          onCriar={criar}
        />
      )}
    </section>
  );
}