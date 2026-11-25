import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useConta } from '../../conta/conta';
import { useAoMudar } from '../../services/tempoReal';
import styles from './AvisosTempoReal.module.scss';

const DURACAO = 6000;
const TEXTOS = {
  arquivo: { texto: 'O mestre liberou o arquivo', link: (id) => `arquivos?abrir=${id}` },
  item: { texto: 'O mestre liberou o item', link: (id) => `itens?abrir=${id}` },
  mapa: { texto: 'O mestre revelou o mapa', link: (id) => `mapas?mapa=${id}` },
};

/**
 * O que vale para a campanha toda, venha de onde vier no tempo real:
 * - jogador: aviso no canto quando o mestre libera um arquivo/item ou revela um mapa (some sozinho)
 * - a campanha mudou (nome, cor, mapa): recarrega; foi apagada ou tiraram a conta dela: volta ao menu
 */
export default function AvisosTempoReal({ campanha, onAtualizar }) {
  const [avisos, setAvisos] = useState([]);
  const navigate = useNavigate();
  const { usuario } = useConta();
  const relogios = useRef([]);
  const jogador = campanha.papel === 'jogador';

  useEffect(() => () => relogios.current.forEach(clearTimeout), []);

  function mostrar(aviso) {
    setAvisos((lista) => [...lista.slice(-2), aviso]);
    relogios.current.push(setTimeout(() => setAvisos((lista) => lista.filter((a) => a.chave !== aviso.chave)), DURACAO));
  }

  useAoMudar(campanha.id, ['campanhas', 'membros', 'arquivos', 'itens', 'mapas'], (eventos) => {
    for (const e of eventos) {
      if (e.tabela === 'membros' && e.acao === 'apagou' && e.id === usuario.id) return navigate('/');
      if (e.tabela === 'campanhas' && e.acao === 'apagou') return navigate('/');
      if (e.liberou && jogador && TEXTOS[e.liberou.tipo]) {
        mostrar({ chave: `${e.tabela}-${e.id}-${Date.now()}`, ...TEXTOS[e.liberou.tipo], nome: e.liberou.nome, id: e.id });
      }
    }
    if (eventos.some((e) => e.tabela === '*' || (e.tabela === 'campanhas' && e.acao === 'mudou'))) {
      api.buscarCampanha(campanha.id).then(onAtualizar).catch(() => {});
    }
  }, { esperar: false });

  if (!avisos.length) return null;
  return (
    <div className={styles.pilha} aria-live="polite">
      {avisos.map((a) => (
        <Link
          key={a.chave}
          to={`/campanha/${campanha.id}/${a.link(a.id)}`}
          className={styles.aviso}
          style={{ '--duracao': `${DURACAO}ms` }}
          onClick={() => setAvisos((lista) => lista.filter((x) => x.chave !== a.chave))}
        >
          <span>{a.texto}</span>
          <b>{a.nome || 'sem nome'}</b>
          <small>Toque para abrir</small>
        </Link>
      ))}
    </div>
  );
}
