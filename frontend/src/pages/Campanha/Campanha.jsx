import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api';
import styles from './Campanha.module.scss';

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

  if (erro) {
    return (
      <main className={styles.pagina}>
        <p className="erro">{erro}</p>
        <Link to="/" className={styles.voltar}>← Voltar</Link>
      </main>
    );
  }

  if (!campanha) return <main className={styles.pagina}><p>Carregando…</p></main>;

  return (
    <main className={styles.pagina} style={{ '--cor': campanha.cor }}>
      <Link to="/" className={styles.voltar}>← Menu <kbd>Esc</kbd></Link>
      <p className={styles.sistema}>{campanha.sistema}</p>
      <h1 className={styles.titulo}>{campanha.nome}</h1>
      <p>{campanha.descricao}</p>
      <p className={styles.dica}>A base da campanha chega em breve.</p>
    </main>
  );
}