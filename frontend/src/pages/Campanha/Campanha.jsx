import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api';
import MenuCampanha from './MenuCampanha/MenuCampanha';
import VisaoGeral from './secoes/VisaoGeral/VisaoGeral';
import ListaFichas from './secoes/ListaFichas/ListaFichas';
import EmBreve from './secoes/EmBreve/EmBreve';
import styles from './Campanha.module.scss';
import DetalheFicha from './secoes/DetalheFicha/DetalheFicha';
import { FundoOutroLado } from '../../components';
import { obterSistema } from '../../sistemas';

// Leitor do livro: só baixa ao abrir a seção
const Livro = lazy(() => import('./secoes/Livro/Livro'));

export default function Campanha() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campanha, setCampanha] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.buscarCampanha(id).then(setCampanha).catch((e) => setErro(e.message));
  }, [id]);

    useEffect(() => {
    function aoTeclar(e) {
      const digitando = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
      const modalAberto = document.querySelector('dialog[open]');   // o Esc é do modal
      if (e.key === 'Escape' && !digitando && !modalAberto) navigate('/');
    }
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [navigate]);

  if (erro) {
    return (
      <main className={styles.estado}>
        <p className="erro">{erro}</p>
        <Link to="/">← Voltar ao menu</Link>
      </main>
    );
  }

  if (!campanha) return <main className={styles.estado}><p>Carregando…</p></main>;

  return (
    // A paleta do sistema (se houver) vale por cima da cor da campanha
    <div className={styles.layout} style={{ '--cor': campanha.cor, ...obterSistema(campanha.sistema_id)?.paleta }}>
      <FundoOutroLado />
        <MenuCampanha campanha={campanha} />

        <main className={styles.conteudo}>
          <Routes>
            <Route index element={<VisaoGeral campanha={campanha} />} />
            <Route path="jogadores" element={<ListaFichas key="jogador" campanha={campanha} tipo="jogador" titulo="Jogadores" />} />
            <Route path="npcs" element={<ListaFichas key="npc" campanha={campanha} tipo="npc" titulo="NPCs" />} />
            <Route path="monstros" element={<ListaFichas key="monstro" campanha={campanha} tipo="monstro" titulo="Monstros" />} />
            <Route path="fichas/:fichaId" element={<DetalheFicha campanha={campanha} />} />
            <Route path="livro" element={<Suspense fallback={null}><Livro campanha={campanha} /></Suspense>} />
            <Route path=":secao" element={<EmBreve />} />
          </Routes>
        </main>
      </div>
  );
}