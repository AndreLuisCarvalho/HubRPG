import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

export default function Campanha() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campanha, setCampanha] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.buscarCampanha(id).then(setCampanha).catch((e) => setErro(e.message));
  }, [id]);

  useEffect(() => {
    const aoTeclar = (e) => e.key === 'Escape' && navigate('/');
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [navigate]);

  if (erro) return <main className="pagina"><p className="erro">{erro}</p><Link to="/">← Voltar</Link></main>;
  if (!campanha) return <main className="pagina"><p>Carregando…</p></main>;

  return (
    <main className="pagina" style={{ '--cor': campanha.cor }}>
      <Link to="/" className="voltar">← Menu <kbd>Esc</kbd></Link>
      <p className="card-sistema">{campanha.sistema}</p>
      <h1 className="campanha-titulo">{campanha.nome}</h1>
      <p>{campanha.descricao}</p>
      <p className="menu-dica">Sessões, personagens e notas chegam na próxima etapa.</p>
    </main>
  );
}