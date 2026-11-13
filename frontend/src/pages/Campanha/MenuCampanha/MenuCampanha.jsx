import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import styles from './MenuCampanha.module.scss';

const GRUPOS = [
  {
    titulo: null,
    itens: [
      { caminho: '', rotulo: 'Visão geral', icone: '◈' },
      { caminho: 'sessoes', rotulo: 'Sessões', icone: '◷' },
    ],
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
      { caminho: 'livro', rotulo: 'Livro do sistema', icone: '❖' },
      { caminho: 'dados', rotulo: 'Dados', icone: '⚄', emBreve: true },
    ],
  },
];

export default function MenuCampanha({ campanha }) {
  const base = `/campanha/${campanha.id}`;
  // No celular a lista vira uma gaveta; no PC ela fica sempre à mostra
  const [aberto, setAberto] = useState(false);

  return (
    <nav className={`${styles.menu} ${aberto ? styles.aberto : ''}`}>
      <div className={styles.topo}>
        <Link to="/" className={styles.voltar}>← Menu <kbd>Esc</kbd></Link>

        <header className={styles.cabecalho}>
          <span className={styles.sistema}>{campanha.sistema || 'Sistema livre'}</span>
          <span className={styles.nome}>{campanha.nome}</span>
        </header>

        <button
          type="button"
          className={styles.alternar}
          aria-expanded={aberto}
          aria-controls="itens-campanha"
          aria-label={aberto ? 'Fechar menu da campanha' : 'Abrir menu da campanha'}
          onClick={() => setAberto((a) => !a)}
        >
          {aberto ? '✕' : '☰'}
        </button>
      </div>

      <div id="itens-campanha" className={styles.itens}>
        {GRUPOS.map((grupo, i) => (
          <div key={i} className={styles.grupo}>
            {grupo.titulo && <span className={styles.rotuloGrupo}>{grupo.titulo}</span>}

            {grupo.itens.map((item) => (
              <NavLink
                key={item.caminho}
                to={item.caminho ? `${base}/${item.caminho}` : base}
                end={!item.caminho}   // "Visão geral" só fica ativa na página exata
                onClick={() => setAberto(false)}   // escolheu uma seção: fecha a gaveta
                className={({ isActive }) => `${styles.item} ${isActive ? styles.ativo : ''}`}
              >
                <span className={styles.icone} aria-hidden="true">{item.icone}</span>
                {item.rotulo}
                {item.emBreve && <span className={styles.emBreve}>breve</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* Clicar fora da gaveta fecha */}
      {aberto && <div className={styles.veu} onClick={() => setAberto(false)} aria-hidden="true" />}
    </nav>
  );
}
