import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../../services/api';
import { useConta } from '../../../../conta/conta';
import { obterSistema } from '../../../../sistemas';
import CardFicha from './CardFicha/CardFicha';
import NovaFicha from './NovaFicha/NovaFicha';
import Parentes from './Parentes/Parentes';
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
  const { usuario } = useConta();
  const sistema = obterSistema(campanha.sistema_id);

  // useCallback: a função só muda se a campanha ou o tipo mudarem
  const carregar = useCallback(
    () => api.listarFichas(campanha.id, tipo).then(setFichas).catch((e) => setErro(e.message)),
    [campanha.id, tipo]
  );

  useEffect(() => { carregar(); }, [carregar]);

  // Parentes dos agentes (o servidor só manda os que a conta pode ver)
  const [parentes, setParentes] = useState([]);
  const carregarParentes = useCallback(
    () => api.listarParentes(campanha.id).then(setParentes).catch((e) => setErro(e.message)),
    [campanha.id],
  );
  useEffect(() => { if (tipo === 'jogador') carregarParentes(); }, [tipo, carregarParentes]);

  async function salvarParente(agente, parente, { nome, dados }) {
    if (parente) await api.atualizarParente(parente.id, { nome, dados });
    else await api.criarParente(campanha.id, { ficha_id: agente.id, nome, dados });
    await carregarParentes();
  }

  async function excluirParente(parente) {
    await api.excluirParente(parente.id);
    await carregarParentes();
  }

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

  // Jogador: cria só o próprio agente (um), vê o dele primeiro e os dos outros só no básico
  const jogador = campanha.papel === 'jogador';
  const meu = (f) => f.dono_id === usuario.id;
  const temAgente = (fichas ?? []).some(meu);
  const podeCriar = !jogador || (tipo === 'jogador' && fichas && !temAgente);
  const rotuloNovo = jogador ? 'Criar meu agente' : 'Nova ficha';
  const lista = jogador ? [...(fichas ?? [])].sort((a, b) => meu(b) - meu(a)) : fichas;

  return (
    <section className={styles.lista}>
      <header className={styles.topo}>
        <h1 className={styles.titulo}>{titulo}</h1>
        {fichas && <span className={styles.contador}>{fichas.length}</span>}
        {podeCriar && <button className={styles.novo} onClick={() => setCriando(true)}>+ {rotuloNovo}</button>}
      </header>

      {erro && <p className="erro">{erro}</p>}
      {!fichas && !erro && <p className={styles.aviso}>Carregando…</p>}
      {jogador && fichas && (
        <p className={styles.aviso}>
          {temAgente
            ? 'Os agentes dos outros jogadores aparecem só no básico.'
            : 'Crie o seu agente para entrar na mesa. Você tem direito a um; para trocar, fale com o mestre.'}
        </p>
      )}

      {fichas && (
        <div className={styles.grade}>
          {lista.map((f) => {
            const cartao = (
              <CardFicha
                key={f.id}
                ficha={f}
                sistema={sistema}
                destinos={destinos}
                comMenu={!jogador}
                selo={meu(f) ? 'Seu agente' : null}
                onAbrir={() => abrir(f)}
                onDuplicar={() => duplicar(f)}
                onMover={(novoTipo) => mover(f, novoTipo)}
                onExcluir={() => excluir(f)}
              />
            );
            // Agentes: o mestre e o dono veem os parentes embaixo do cartão
            if (tipo !== 'jogador' || (jogador && !meu(f))) return cartao;
            return (
              <div key={f.id} className={styles.agente}>
                {cartao}
                <Parentes
                  agente={f}
                  parentes={parentes.filter((p) => p.ficha_id === f.id)}
                  mestre={!jogador}
                  onSalvar={(parente, dados) => salvarParente(f, parente, dados)}
                  onExcluir={excluirParente}
                />
              </div>
            );
          })}

          {podeCriar && (
            <button className={styles.cardNovo} onClick={() => setCriando(true)}>
              <span aria-hidden="true">+</span>
              {rotuloNovo}
            </button>
          )}
        </div>
      )}

      {/* Montado só quando aberto: cada vez que abre, o formulário começa limpo */}
      {criando && (
        <NovaFicha
          aberto
          tipo={tipo}
          sistema={sistema}
          jogadorInicial={jogador ? usuario.nome : ''}
          onFechar={() => setCriando(false)}
          onCriar={criar}
        />
      )}
    </section>
  );
}