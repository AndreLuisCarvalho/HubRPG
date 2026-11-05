import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { CardCampanha, InfoCampanha, PalcoMapa } from '../../components';
import styles from './MenuCampanhas.module.scss';

const DURACAO_MERGULHO = 800; // ms, igual ao SCSS

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

  useEffect(() => {
    listaRef.current?.children[selecionada]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selecionada]);

  const atual = campanhas[selecionada];

  return (
    <main className={`${styles.pagina} ${entrando ? styles.entrando : ''}`}>
      <aside className={styles.lateral}>
        <header>
          <p className={styles.rotulo}>Menu principal</p>
          <h1 className={styles.titulo}>Campanhas de RPG</h1>
          <p className={styles.subtitulo}>Selecione a campanha</p>
        </header>

        {erro && <p className="erro">Não foi possível carregar: {erro}</p>}

        <div className={styles.lista} ref={listaRef}>
          {campanhas.map((c, i) => (
            <CardCampanha
              key={c.id}
              campanha={c}
              selecionado={i === selecionada}
              onSelecionar={() => selecionar(i)}
              onEntrar={() => entrar(i)}
            />
          ))}
        </div>

        <p className={styles.dica}>
          <kbd>↑ ↓</kbd> escolher · <kbd>Enter</kbd> entrar
        </p>
      </aside>

      <PalcoMapa
        campanhas={campanhas}
        selecionada={selecionada}
        anterior={anterior}
        mergulhando={entrando}
      >
        {atual && <InfoCampanha key={atual.id} campanha={atual} />}
      </PalcoMapa>

      <div className={styles.cortina} />
    </main>
  );
}