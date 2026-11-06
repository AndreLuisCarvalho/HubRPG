import { Link, NavLink } from 'react-router-dom';
import styles from './MenuCampanha.module.scss';

const GRUPOS = [
  {
    titulo: null,
    itens: [{ caminho: '', rotulo: 'Visão geral', icone: '◈' }],
  },
  {
    titulo: 'Fichas',
    itens: [
      { caminho: 'jogadores', rotulo: 'Jogadores', icone: '♟' },
      { caminho: 'npcs', rotulo: 'NPCs', icone: '☉' },
      { caminho: 'monstros', rotulo: 'Monstros', icone: '☠' },
    ],
  },
  {
    titulo: 'Mesa',
    itens: [
      { caminho: 'mapas', rotulo: 'Mapas', icone: '▦', emBreve: true },
      { caminho: 'arquivos', rotulo: 'Arquivos', icone: '▤', emBreve: true },
      { caminho: 'itens', rotulo: 'Itens', icone: '⚔', emBreve: true },
      { caminho: 'livro', rotulo: 'Livro do sistema', icone: '❖', emBreve: true },
      { caminho: 'dados', rotulo: 'Dados', icone: '⚄', emBreve: true },
    ],
  },
];

export default function MenuCampanha({ campanha }) {
  const base = `/campanha/${campanha.id}`;

  return (
    <nav className={styles.menu}>
      <Link to="/" className={styles.voltar}>← Menu <kbd>Esc</kbd></Link>

      <header className={styles.cabecalho}>
        <span className={styles.sistema}>{campanha.sistema || 'Sistema livre'}</span>
        <span className={styles.nome}>{campanha.nome}</span>
      </header>

      {GRUPOS.map((grupo, i) => (
        <div key={i} className={styles.grupo}>
          {grupo.titulo && <span className={styles.rotuloGrupo}>{grupo.titulo}</span>}

          {grupo.itens.map((item) => (
            <NavLink
              key={item.caminho}
              to={item.caminho ? `${base}/${item.caminho}` : base}
              end={!item.caminho}   // "Visão geral" só fica ativa na página exata
              className={({ isActive }) => `${styles.item} ${isActive ? styles.ativo : ''}`}
            >
              <span className={styles.icone} aria-hidden="true">{item.icone}</span>
              {item.rotulo}
              {item.emBreve && <span className={styles.emBreve}>breve</span>}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}