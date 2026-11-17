import { useState } from 'react';
import { ITENS, TIPOS_DE_ITEM } from '../../../../sistemas/ordemParanormal/itens';
import { resumoDoItem, romano } from '../../../../sistemas/ordemParanormal/inventario';
import styles from './Itens.module.scss';

const normalizar = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Lista do equipamento do livro: escolher um traz uma cópia para editar antes de salvar */
export default function DoLivro({ onEscolher }) {
  const [tipo, setTipo] = useState('arma');
  const [busca, setBusca] = useState('');

  const termo = normalizar(busca.trim());
  const lista = Object.entries(ITENS).filter(([, item]) =>
    (termo ? normalizar(item.nome).includes(termo) : item.tipo === tipo));

  return (
    <div className={styles.doLivro}>
      <input
        type="search"
        className={styles.busca}
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar no livro…"
        aria-label="Buscar item do livro"
      />

      {!termo && (
        <div className={styles.filtros} role="tablist" aria-label="Tipo de item">
          {Object.entries(TIPOS_DE_ITEM).map(([id, nome]) => (
            <button key={id} type="button" role="tab" aria-selected={tipo === id} onClick={() => setTipo(id)}>{nome}</button>
          ))}
        </div>
      )}

      <ul className={styles.listaLivro}>
        {lista.map(([id, item]) => (
          <li key={id}>
            <button type="button" onClick={() => onEscolher(id)}>
              <b>{item.nome}</b>
              <small>{resumoDoItem(item)}</small>
              <span>{romano(item.categoria ?? 0)} · {item.espacos ?? 0} esp</span>
            </button>
          </li>
        ))}
        {lista.length === 0 && <li className={styles.vazio}>Nada encontrado.</li>}
      </ul>
    </div>
  );
}
