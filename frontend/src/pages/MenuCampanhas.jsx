import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const STATUS = { ativa: 'Ativa', pausada: 'Pausada', encerrada: 'Encerrada' };

export default function MenuCampanhas() {
  const [campanhas, setCampanhas] = useState([]);
  const [selecionada, setSelecionada] = useState(0);
  const [erro, setErro] = useState('');
  const gradeRef = useRef(null);
  const navigate = useNavigate();

  const abrir = (campanha) => navigate(`/campanha/${campanha.id}`);

  useEffect(() => {
    api.listarCampanhas().then(setCampanhas).catch((e) => setErro(e.message));
  }, []);

  // Navegação pelo teclado: setas movem, Enter entra
  useEffect(() => {
    function aoTeclar(e) {
      if (!campanhas.length) return;
      const colunas = getComputedStyle(gradeRef.current).gridTemplateColumns.split(' ').length;
      const passos = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: colunas, ArrowUp: -colunas };

      if (e.key in passos) {
        e.preventDefault();
        setSelecionada((atual) =>
          Math.min(Math.max(atual + passos[e.key], 0), campanhas.length - 1)
        );
      } else if (e.key === 'Enter') {
        abrir(campanhas[selecionada]);
      }
    }
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [campanhas, selecionada]);

  // Mantém o card selecionado visível
  useEffect(() => {
    gradeRef.current?.children[selecionada]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selecionada]);

  return (
    <main className="menu">
      <header className="menu-topo">
        <p className="menu-rotulo">Menu principal</p>
        <h1>Campanhas de RPG</h1>
        <p className="menu-subtitulo">Selecione a campanha</p>
        <p className="menu-dica">
          <kbd>← ↑ ↓ →</kbd> escolher · <kbd>Enter</kbd> entrar
        </p>
      </header>

      {erro && <p className="erro">Não foi possível carregar: {erro}</p>}

      <div className="grade" ref={gradeRef}>
        {campanhas.map((c, i) => (
          <button
            key={c.id}
            className={`card ${i === selecionada ? 'selecionado' : ''}`}
            style={{ '--cor': c.cor }}
            onMouseEnter={() => setSelecionada(i)}
            onClick={() => abrir(c)}
          >
            <span className="card-sistema">{c.sistema || 'Sistema livre'}</span>
            <span className="card-nome">{c.nome}</span>
            {c.descricao && <span className="card-descricao">{c.descricao}</span>}
            <span className={`card-status status-${c.status}`}>{STATUS[c.status] ?? c.status}</span>
          </button>
        ))}
      </div>
    </main>
  );
}