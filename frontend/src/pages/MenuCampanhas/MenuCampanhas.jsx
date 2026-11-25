import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { CardCampanha, InfoCampanha, PalcoMapa } from '../../components';
import Modal from '../../components/Modal/Modal';
import { useConta } from '../../conta/conta';
import { FormEntrar, FormNovaCampanha } from './FormsCampanha';
import PainelContas from './PainelContas';
import styles from './MenuCampanhas.module.scss';

const DURACAO_MERGULHO = 800; // ms, igual ao SCSS

export default function MenuCampanhas() {
  const [campanhas, setCampanhas] = useState([]);
  const [selecionada, setSelecionada] = useState(0);
  const [anterior, setAnterior] = useState(null);
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState('');
  const [janela, setJanela] = useState(null);   // 'criar' | 'entrar'
  const listaRef = useRef(null);
  const navigate = useNavigate();
  const { usuario, sair } = useConta();

  // Campanha nova (criada ou entrou pelo código): entra direto nela
  function abrirNova(campanha) {
    setJanela(null);
    navigate(`/campanha/${campanha.id}`);
  }

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
      if (!campanhas.length || janela) return;
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
  }, [campanhas, selecionada, entrando, janela]);

  useEffect(() => {
    listaRef.current?.children[selecionada]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selecionada]);

  const atual = campanhas[selecionada];

  return (
    <main className={`${styles.pagina} ${entrando ? styles.entrando : ''}`}>
      <aside className={styles.lateral}>
        {/* A conta: foto, nome e sair */}
        <div className={styles.conta}>
          <span className={styles.avatar}>
            {usuario.foto ? <img src={usuario.foto} alt="" referrerPolicy="no-referrer" /> : usuario.nome.charAt(0)}
          </span>
          <span className={styles.contaNome}>
            <b>{usuario.nome}</b>
            {usuario.teste ? <small>conta de teste</small> : usuario.email && <small>{usuario.email}</small>}
          </span>
          {usuario.dono && <button type="button" onClick={() => setJanela('contas')}>Contas</button>}
          <button type="button" onClick={sair}>Sair</button>
        </div>

        <header>
          <p className={styles.rotulo}>Menu principal</p>
          <h1 className={styles.titulo}>Campanhas de RPG</h1>
          <p className={styles.subtitulo}>{campanhas.length ? 'Selecione a campanha' : 'Crie uma campanha ou entre na de alguém com o código'}</p>
        </header>

        <div className={styles.acoes}>
          <button type="button" className={styles.principal} onClick={() => setJanela('criar')}>+ Criar campanha</button>
          <button type="button" onClick={() => setJanela('entrar')}>Entrar com código</button>
        </div>

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

      <Modal aberto={janela === 'criar'} onFechar={() => setJanela(null)} titulo="Nova campanha" sobretitulo="Você será o mestre" largura="480px">
        {janela === 'criar' && <FormNovaCampanha onCriada={abrirNova} />}
      </Modal>
      <Modal aberto={janela === 'entrar'} onFechar={() => setJanela(null)} titulo="Entrar numa campanha" sobretitulo="Como jogador" largura="400px">
        {janela === 'entrar' && <FormEntrar onEntrou={abrirNova} />}
      </Modal>
      {usuario.dono && (
        <Modal aberto={janela === 'contas'} onFechar={() => setJanela(null)} titulo="Contas do site" sobretitulo="Só você vê" largura="680px">
          {janela === 'contas' && <PainelContas meuId={usuario.id} />}
        </Modal>
      )}
    </main>
  );
}