import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api';
import MenuCampanha from './MenuCampanha/MenuCampanha';
import VisaoGeral from './secoes/VisaoGeral/VisaoGeral';
import ListaFichas from './secoes/ListaFichas/ListaFichas';
import EmBreve from './secoes/EmBreve/EmBreve';
import styles from './Campanha.module.scss';
import DetalheFicha from './secoes/DetalheFicha/DetalheFicha';
import { FundoOutroLado } from '../../components';
import RolagemProvider from '../../components/Dados/RolagemProvider';
import { obterSistema } from '../../sistemas';
import { definirPapel } from './visao';
import AvisosTempoReal from './AvisosTempoReal';

// Leitor do livro: só baixa ao abrir a seção
const Livro = lazy(() => import('./secoes/Livro/Livro'));
const Sessoes = lazy(() => import('./secoes/Sessoes/Sessoes'));
const Dados = lazy(() => import('./secoes/Dados/Dados'));   // traz o three.js junto (prévia 3D)
const Itens = lazy(() => import('./secoes/Itens/Itens'));
const Arquivos = lazy(() => import('./secoes/Arquivos/Arquivos'));
const Mapas = lazy(() => import('./secoes/Mapas/Mapas'));
const Combate = lazy(() => import('./secoes/Combate/Combate'));
const Roteiro = lazy(() => import('./secoes/Roteiro/Roteiro'));   // só o mestre
const Investigacao = lazy(() => import('./secoes/Investigacao/Investigacao'));

export default function Campanha() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campanha, setCampanha] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    // O papel (mestre/jogador) fica anotado antes das seções abrirem: elas leem a visão por ele
    api.buscarCampanha(id).then((c) => {
      definirPapel(c.id, c.papel);
      setCampanha(c);
    }).catch((e) => setErro(e.message));
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
  const mestre = campanha.papel === 'mestre';

  return (
    // A paleta do sistema (se houver) vale por cima da cor da campanha
    <div className={styles.layout} style={{ '--cor': campanha.cor, ...obterSistema(campanha.sistema_id)?.paleta }}>
      <FundoOutroLado />
        <MenuCampanha campanha={campanha} />

        {/* Mesa de dados: dentro da paleta, para os dados terem as cores do sistema */}
        <RolagemProvider>
        <main className={styles.conteudo}>
          <Routes>
            <Route index element={<VisaoGeral campanha={campanha} onAtualizar={setCampanha} />} />
            <Route path="sessoes" element={<Suspense fallback={null}><Sessoes campanha={campanha} /></Suspense>} />
            <Route path="jogadores" element={<ListaFichas key="jogador" campanha={campanha} tipo="jogador" titulo="Jogadores" />} />
            {/* NPCs e monstros são do mestre: o jogador volta para a visão geral */}
            <Route path="npcs" element={mestre ? <ListaFichas key="npc" campanha={campanha} tipo="npc" titulo="NPCs" /> : <Navigate to=".." replace />} />
            <Route path="monstros" element={mestre ? <ListaFichas key="monstro" campanha={campanha} tipo="monstro" titulo="Monstros" /> : <Navigate to=".." replace />} />
            <Route path="fichas/:fichaId" element={<DetalheFicha campanha={campanha} />} />
            <Route path="livro" element={<Suspense fallback={null}><Livro campanha={campanha} /></Suspense>} />
            <Route path="dados" element={<Suspense fallback={null}><Dados campanha={campanha} /></Suspense>} />
            <Route path="itens" element={<Suspense fallback={null}><Itens campanha={campanha} /></Suspense>} />
            <Route path="arquivos" element={<Suspense fallback={null}><Arquivos campanha={campanha} /></Suspense>} />
            <Route path="mapas" element={<Suspense fallback={null}><Mapas campanha={campanha} /></Suspense>} />
            <Route path="combate" element={<Suspense fallback={null}><Combate campanha={campanha} /></Suspense>} />
            <Route path="investigacao" element={<Suspense fallback={null}><Investigacao campanha={campanha} /></Suspense>} />
            <Route path="roteiro"element={mestre ? <Suspense fallback={null}><Roteiro campanha={campanha} /></Suspense> : <Navigate to=".." replace />} />
            <Route path=":secao" element={<EmBreve />} />
          </Routes>
        </main>
        </RolagemProvider>
        <AvisosTempoReal campanha={campanha} onAtualizar={setCampanha} />
      </div>
  );
}