import { useState } from 'react';
import { ITENS, TIPOS_DE_ITEM } from '../../../itens';
import { adicionarDoLivro, itensPorCategoria, patenteAtual, resumoDoItem, romano } from '../../../inventario';
import styles from './Arsenal.module.scss';

// Ignora acentos e maiúsculas na busca
const normalizar = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const CATALOGO = Object.entries(ITENS).map(([id, item]) => ({ id, ...item }));
const ABAS = Object.keys(TIPOS_DE_ITEM).filter((tipo) => tipo !== 'outro');

// Catálogo do livro dentro da aba Inventário. O "+" copia o item para a ficha.
export default function Arsenal({ dados, onAlterarDados, onVoltar }) {
  const [aba, setAba] = useState('arma');
  const [busca, setBusca] = useState('');
  const [ultimo, setUltimo] = useState('');

  const porCategoria = itensPorCategoria(dados);
  const limites = patenteAtual(dados).limites;
  const noLimite = (categoria) => categoria >= 1 && porCategoria[categoria - 1] >= limites[categoria - 1];

  const termo = normalizar(busca.trim());
  const lista = termo
    ? CATALOGO.filter((item) => normalizar(item.nome).includes(termo))
    : CATALOGO.filter((item) => item.tipo === aba);

  function adicionar(item) {
    onAlterarDados(adicionarDoLivro(dados, item.id));
    setUltimo(item.nome);
  }

  return (
    <div className={styles.arsenal}>
      <header className={styles.cabecalho}>
        <button className={styles.voltar} onClick={onVoltar}>← Voltar</button>
        <input type="search" placeholder="Buscar no livro…" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </header>

      {!termo && (
        <nav className={styles.abas}>
          {ABAS.map((tipo) => (
            <button key={tipo} aria-pressed={aba === tipo} onClick={() => setAba(tipo)}>
              {TIPOS_DE_ITEM[tipo]}
            </button>
          ))}
        </nav>
      )}

      {ultimo && <p className={styles.adicionado}>✓ {ultimo} foi para o inventário</p>}

      <ul className={styles.lista}>
        {lista.map((item) => (
          <li key={item.id}>
            <span className={styles.titulo}>
              <b>{item.nome}</b>
              <small>{resumoDoItem(item)}</small>
            </span>
            <span
              className={noLimite(item.categoria) ? styles.cheio : ''}
              title={noLimite(item.categoria) ? 'Sua patente já está no limite desta categoria' : 'Categoria'}
            >
              {romano(item.categoria)}
            </span>
            <span title="Espaços">{item.espacos} esp</span>
            <button className={styles.mais} onClick={() => adicionar(item)} aria-label={`Adicionar ${item.nome}`}>+</button>
          </li>
        ))}
        {lista.length === 0 && <li className={styles.vazio}>Nada encontrado.</li>}
      </ul>
    </div>
  );
}