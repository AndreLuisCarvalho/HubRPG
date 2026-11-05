import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const STATUS = { ativa: 'Ativa', pausada: 'Pausada', encerrada: 'Encerrada' };
const DURACAO_MERGULHO = 800; // ms, igual ao CSS

export default function MenuCampanhas() {
  const [campanhas, setCampanhas] = useState([]);
  const [selecionada, setSelecionada] = useState(0);
  const [anterior, setAnterior] = useState(null);
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState('');
  const listaRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.listarCampanhas().then(setCampanhas).catch((e) => setErro(e.message));
  }, []);

  function selecionar(indice) {
    if (indice === selecionada || entrando) return;
    setAnterior(selecionada);
    setSelecionada(indice);
  }

  function entrar(indice = selecionada) {
    const campanha = campanhas[indice];
    if (entrando || !campanha) return;
    setSelecionada(indice);
    setEntrando(true);
    setTimeout(() => navigate(`/campanha/${campanha.id}`), DURACAO_MERGULHO);
  }

  // Teclado: ↑ ↓ escolhem, Enter entra
  useEffect(() => {
    function aoTeclar(e) {
      if (!campanhas.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const passo = e.key === 'ArrowDown' ? 1 : -1;
        selecionar(Math.min(Math.max(selecionada + passo, 0), campanhas.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        entrar();
      }
    }
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [campanhas, selecionada, entrando]);

  // Mantém o card selecionado visível na lista
  useEffect(() => {
    listaRef.current?.children[selecionada]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selecionada]);

  const atual = campanhas[selecionada];

  return (
    <main className={`palco ${entrando ? 'entrando' : ''}`}>
      <aside className="palco-lateral">
        <header className="menu-topo">
          <p className="menu-rotulo">Menu principal</p>
          <h1>Campanhas de RPG</h1>
          <p className="menu-subtitulo">Selecione a campanha</p>
        </header>

        {erro && <p className="erro">Não foi possível carregar: {erro}</p>}

        <div className="lista" ref={listaRef}>
          {campanhas.map((c, i) => (
            <button
              key={c.id}
              className={`card ${i === selecionada ? 'selecionado' : ''}`}
              style={{ '--cor': c.cor }}
              onMouseEnter={() => selecionar(i)}
              onFocus={() => selecionar(i)}
              onClick={() => entrar(i)}
            >
              <span className="card-sistema">{c.sistema || 'Sistema livre'}</span>
              <span className="card-nome">{c.nome}</span>
            </button>
          ))}
        </div>

        <p className="menu-dica">
          <kbd>↑ ↓</kbd> escolher · <kbd>Enter</kbd> entrar
        </p>
      </aside>

      <section className="palco-mapa">
        {campanhas.map((c, i) => (
          <div
            key={c.id}
            className={`mapa-camada ${i === selecionada ? 'ativo' : ''} ${i === anterior ? 'saindo' : ''}`}
            style={{ '--cor': c.cor }}
          >
            <div
              className={`mapa-imagem ${c.mapa ? '' : 'mapa-vazio'}`}
              style={c.mapa ? { backgroundImage: `url(${c.mapa})` } : undefined}
            />
          </div>
        ))}

        <div className="mapa-vinheta" />

        {atual && (
          <div className="mapa-info" key={atual.id} style={{ '--cor': atual.cor }}>
            <span className="card-sistema">{atual.sistema || 'Sistema livre'}</span>
            <h2>{atual.nome}</h2>
            {atual.descricao && <p>{atual.descricao}</p>}
            <div className="mapa-dados">
              <span className={`card-status status-${atual.status}`}>{STATUS[atual.status] ?? atual.status}</span>
              <span>{atual.ultima_sessao ? `Última sessão: #${atual.ultima_sessao}` : 'Nenhuma sessão ainda'}</span>
              <span>{atual.total_personagens} personagem(ns)</span>
            </div>
          </div>
        )}
      </section>

      <div className="cortina" />
    </main>
  );
}