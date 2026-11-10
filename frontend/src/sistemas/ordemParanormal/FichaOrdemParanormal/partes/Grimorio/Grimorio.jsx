import { useState } from 'react';
import { Modal } from '../../../../../components';
import { CUSTO_POR_CIRCULO, ELEMENTOS, RITUAIS } from '../../../modelo';
import { aprenderRitual, conheceRitual, contarAprendidos, limiteDeRituais } from '../../../regras';
import SigiloElemento from '../SigiloElemento/SigiloElemento';
import styles from './Grimorio.module.scss';

const ROMANOS = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };

// Busca sem diferenciar acento nem maiúscula ("odio" acha "Ódio")
const normalizar = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Modal com todos os rituais do livro: filtra por elemento, círculo e texto, e aprende com o "+"
export default function Grimorio({ aberto, onFechar, dados, onAlterarDados }) {
  const [soMeus, setSoMeus] = useState(false);
  const [elemento, setElemento] = useState(null);
  const [circulo, setCirculo] = useState(null);
  const [busca, setBusca] = useState('');

  const termo = normalizar(busca.trim());
  const lista = RITUAIS
    .filter((r) => !soMeus || conheceRitual(dados, r.id))
    .filter((r) => !elemento || r.elementos.includes(elemento))
    .filter((r) => !circulo || r.circulo === circulo)
    .filter((r) => !termo || normalizar(`${r.nome} ${r.resumo}`).includes(termo))
    .sort((a, b) => a.circulo - b.circulo || a.nome.localeCompare(b.nome, 'pt-BR'));

  const aprendidos = contarAprendidos(dados);
  const limite = limiteDeRituais(dados);

  return (
    <Modal aberto={aberto} onFechar={onFechar} sobretitulo="Ordem Paranormal" titulo="Grimório">
      <div className={styles.grimorio}>
        <div className={styles.alternar} role="group" aria-label="Mostrar">
          <button aria-pressed={!soMeus} onClick={() => setSoMeus(false)}>Todos os rituais</button>
          <button aria-pressed={soMeus} onClick={() => setSoMeus(true)}>Meus rituais</button>
        </div>

        <div className={styles.elementos} role="group" aria-label="Elemento">
          <button aria-pressed={!elemento} onClick={() => setElemento(null)}>Todos</button>
          {Object.entries(ELEMENTOS).map(([id, el]) => (
            <button key={id} aria-pressed={elemento === id} onClick={() => setElemento(id)} style={{ '--e': el.cor }}>
              <i />
              {el.nome}
            </button>
          ))}
        </div>

        <div className={styles.circulos} role="group" aria-label="Círculo">
          <button aria-pressed={!circulo} onClick={() => setCirculo(null)}>Todos</button>
          {Object.entries(CUSTO_POR_CIRCULO).map(([c, custo]) => (
            <button key={c} aria-pressed={circulo === Number(c)} onClick={() => setCirculo(Number(c))}>
              {c}º <em>{custo} PE</em>
            </button>
          ))}
        </div>

        <input
          className={styles.busca}
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar ritual…"
        />

        <ul className={styles.lista}>
          {lista.map((r) => {
            const conhece = conheceRitual(dados, r.id);
            const varia = r.elementos.length > 1;

            return (
              <li key={r.id} className={styles.ritual} style={{ '--e': ELEMENTOS[r.elementos[0]].cor }}>
                <SigiloElemento elemento={r.elementos[0]} />
                <div className={styles.texto}>
                  <b>
                    {r.nome}
                    {varia && <small>Varia</small>}
                  </b>
                  <span>{r.resumo}</span>
                </div>
                <span className={styles.romano} title={`${r.circulo}º círculo`}>{ROMANOS[r.circulo]}</span>
                {conhece ? (
                  <span className={styles.conhece} title="Você já conhece este ritual">✓</span>
                ) : (
                  <button
                    className={styles.aprender}
                    onClick={() => onAlterarDados(aprenderRitual(dados, r))}
                    title="Aprender"
                    aria-label={`Aprender ${r.nome}`}
                  >
                    +
                  </button>
                )}
              </li>
            );
          })}

          {lista.length === 0 && <li className={styles.vazio}>Nenhum ritual encontrado.</li>}
        </ul>

        <p className={`${styles.limite} ${aprendidos >= limite ? styles.cheio : ''}`}>
          <span>Aprendidos pelo poder Aprender Ritual: <b>{aprendidos} de {limite}</b> (Intelecto)</span>
          <span>Rituais de classe não contam</span>
        </p>
      </div>
    </Modal>
  );
}