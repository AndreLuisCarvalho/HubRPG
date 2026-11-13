import { useId, useState } from 'react';
import {
  adicionarItem, capacidadeDeCarga, cargaMaxima, espacosUsados, estaSobrecarregado, itensPorCategoria,
  patenteAtual, removerItem, resumoDoItem, romano,
} from '../../../inventario';
import Contador from '../../../../../components/Contador/Contador';
import Arsenal from '../Arsenal/Arsenal';
import styles from './Inventario.module.scss';

const ITEM_VAZIO = { nome: '', categoria: 0, espacos: 1 };

// Aba Inventário: carga, patente, limite por categoria e a lista de itens
export default function Inventario({ dados, onAlterarDados }) {
  const [novo, setNovo] = useState(ITEM_VAZIO);
  const [noLivro, setNoLivro] = useState(false);
  const idCategoria = useId();

  // "+ Livro" troca a lista pelo catálogo, dentro da própria aba
  if (noLivro) {
    return <Arsenal dados={dados} onAlterarDados={onAlterarDados} onVoltar={() => setNoLivro(false)} />;
  }

  const itens = dados.inventario ?? [];
  const usados = espacosUsados(dados);
  const capacidade = capacidadeDeCarga(dados);
  const maximo = cargaMaxima(dados);
  const patente = patenteAtual(dados);
  const porCategoria = itensPorCategoria(dados);

  const nivel = usados > maximo ? styles.estourou : estaSobrecarregado(dados) ? styles.pesado : '';

  function adicionar(e) {
    e.preventDefault();
    if (!novo.nome.trim()) return;
    onAlterarDados(adicionarItem(dados, novo));
    setNovo(ITEM_VAZIO);
  }

  return (
    <div className={styles.inventario}>
      <header className={styles.cabecalho}>
        {/* A barra vai até o máximo (2x); a marca no meio é a capacidade */}
        <div className={`${styles.carga} ${nivel}`} title={`Acima de ${capacidade} fica sobrecarregado; máximo ${maximo}.`}>
          <span className={styles.rotulo}>Carga</span>
          <b>{usados}<small> / {capacidade}</small></b>
          <div className={styles.barra}>
            <i style={{ width: `${Math.min(100, (usados / maximo) * 100)}%` }} />
          </div>
        </div>

        <div className={styles.patente} title={`Limite de crédito: ${patente.credito}`}>
          <span className={styles.rotulo}>Patente</span>
          <b>{patente.nome}</b>
          <label>
            PP
            <input
              type="number"
              min="0"
              value={dados.prestigio ?? 0}
              onChange={(e) => onAlterarDados({ prestigio: Math.max(0, Number(e.target.value) || 0) })}
            />
          </label>
        </div>
      </header>

      {/* Itens por categoria x o que a patente libera */}
      <ul className={styles.categorias}>
        {patente.limites.map((limite, i) => (limite > 0 || porCategoria[i] > 0) && (
          <li key={i} className={porCategoria[i] > limite ? styles.excedeu : ''}>
            <b>{romano(i + 1)}</b> {porCategoria[i]}/{limite}
          </li>
        ))}
      </ul>

      {estaSobrecarregado(dados) && (
        <p className={styles.aviso}>{usados > maximo ? 'Acima do máximo de carga!' : 'Sobrecarregado.'}</p>
      )}

      <ul className={styles.lista}>
        {itens.map((item) => (
          <li key={item.uid}>
            <div className={styles.titulo}>
              <b>{item.nome}</b>
              {resumoDoItem(item) && <small>{resumoDoItem(item)}</small>}
            </div>
            <span title="Categoria">{romano(item.categoria)}</span>
            <span title="Espaços">{item.espacos} esp</span>
            <button onClick={() => onAlterarDados(removerItem(dados, item.uid))} aria-label={`Remover ${item.nome}`}>×</button>
          </li>
        ))}
        {itens.length === 0 && <li className={styles.vazio}>Mochila vazia.</li>}
      </ul>

      {/* Item escrito à mão: nome + adicionar em cima, categoria e espaços embaixo */}
      <form className={styles.novo} onSubmit={adicionar}>
        <div className={styles.linhaNome}>
          <input
            value={novo.nome}
            onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
            placeholder="Novo item"
            aria-label="Nome do novo item"
          />
          <button type="submit" disabled={!novo.nome.trim()} aria-label="Adicionar item">+</button>
        </div>

        <div className={styles.detalhes}>
          <div className={styles.campo}>
            <span id={idCategoria}>Categoria</span>
            <div className={styles.categoriasNovo} role="radiogroup" aria-labelledby={idCategoria}>
              {[0, 1, 2, 3, 4].map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={novo.categoria === c}
                  onClick={() => setNovo({ ...novo, categoria: c })}
                >
                  {romano(c)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.campo}>
            <span>Espaços</span>
            <Contador valor={novo.espacos} onMudar={(espacos) => setNovo({ ...novo, espacos })} min={0} max={20} rotulo="Espaços" />
          </div>
        </div>
      </form>

      <button className={styles.livro} onClick={() => setNoLivro(true)}>+ Adicionar do livro</button>
    </div>
  );
}