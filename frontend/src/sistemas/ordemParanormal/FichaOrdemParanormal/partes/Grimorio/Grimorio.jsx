import { useState } from 'react';
import { Modal } from '../../../../../components';
import { CUSTO_POR_CIRCULO, ELEMENTOS } from '../../../modelo';
import { RITUAIS } from '../../../rituais';
import {
  aprenderRitual, conheceRitual, contarAprendidos, esquecerRitual, limiteDeRituais,
} from '../../../regras';
import SigiloElemento from '../SigiloElemento/SigiloElemento';
import EfeitoElemento from './EfeitoElemento';
import PaginaRitual from './PaginaRitual';
import { ROMANOS } from './romanos';
import styles from './Grimorio.module.scss';

// Busca sem diferenciar acento nem maiúscula ("odio" acha "Ódio")
const normalizar = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Grimório: uma página de livro velho. Primeiro o índice (filtros + lista);
// clicar num ritual abre a página dele para leitura, com o efeito do elemento.
export default function Grimorio({ aberto, onFechar, dados, onAlterarDados }) {
  const [soMeus, setSoMeus] = useState(false);
  const [elemento, setElemento] = useState(null);
  const [circulo, setCirculo] = useState(null);
  const [busca, setBusca] = useState('');
  const [lendo, setLendo] = useState(null);   // ritual aberto na página de leitura
  // Efeito tocando agora: { elemento, n }. O "n" muda a cada disparo, então o efeito recomeça.
  const [efeito, setEfeito] = useState(null);
  const [confirmando, setConfirmando] = useState(null);   // id do ritual com "Purificar?" à mostra
  const [purificando, setPurificando] = useState(null);   // id da linha que está desbotando

  const termo = normalizar(busca.trim());
  const lista = RITUAIS
    .filter((r) => !soMeus || conheceRitual(dados, r.id))
    .filter((r) => !elemento || r.elementos.includes(elemento))
    .filter((r) => !circulo || r.circulo === circulo)
    .filter((r) => !termo || normalizar(`${r.nome} ${r.resumo}`).includes(termo))
    .sort((a, b) => a.circulo - b.circulo || a.nome.localeCompare(b.nome, 'pt-BR'));

  const aprendidos = contarAprendidos(dados);
  const limite = limiteDeRituais(dados);
  // Ritual de vários elementos (Amaldiçoar Arma): usa o do filtro, se houver
  const elementoDe = (r) => (elemento && r.elementos.includes(elemento) ? elemento : r.elementos[0]);

  // Toca um efeito por cima do pergaminho (o do elemento do ritual, ou "purificar")
  const tocar = (nome) => setEfeito((atual) => ({ elemento: nome, n: (atual?.n ?? 0) + 1 }));
  const disparar = (r) => tocar(elementoDe(r));

  // Esquecer um ritual conhecido = purificar. 1º clique pede confirmação; o 2º purifica:
  // toca a purificação, a linha desbota e só então o ritual sai da ficha.
  function purificar(r) {
    if (confirmando !== r.id) {
      setConfirmando(r.id);
      return;
    }
    setConfirmando(null);
    setPurificando(r.id);
    tocar('purificar');
    setTimeout(() => {
      onAlterarDados(esquecerRitual(dados, r.id));
      setPurificando(null);
    }, 750);
  }

  // Aprender (pelo "+" do índice ou pelo botão da página) também toca o efeito
  function aprender(r) {
    onAlterarDados(aprenderRitual(dados, r));
    disparar(r);
  }

  // Selecionar um ritual: abre a página e dispara o efeito na mesma hora
  function ler(r) {
    setLendo(r);
    disparar(r);
  }

  // Fechar volta ao índice, para a próxima abertura começar do começo
  function fechar() {
    setLendo(null);
    setEfeito(null);
    onFechar();
  }

  return (
    <Modal
      aberto={aberto}
      onFechar={fechar}
      sobretitulo="Ordem Paranormal"
      titulo="Grimório"
      classeCaixa={styles.pergaminho}
      largura="580px"
    >
      {/* Efeito por cima do pergaminho inteiro, fora da página (que entra com fade) */}
      {efeito && <EfeitoElemento key={efeito.n} elemento={efeito.elemento} />}

      {lendo ? (
        <PaginaRitual
          ritual={lendo}
          elemento={elementoDe(lendo)}
          conhece={conheceRitual(dados, lendo.id)}
          onAprender={() => aprender(lendo)}
          onVoltar={() => setLendo(null)}
        />
      ) : (
        <div className={styles.grimorio}>
          <div className={styles.alternar} role="group" aria-label="Mostrar">
            <button aria-pressed={!soMeus} onClick={() => setSoMeus(false)}>Todos os rituais</button>
            <span aria-hidden="true">·</span>
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
                {ROMANOS[c]} <em>{custo} PE</em>
              </button>
            ))}
          </div>

          <input
            className={styles.busca}
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Procurar no grimório…"
          />

          {/* Índice: nome ........ círculo, como num livro antigo */}
          <ul className={styles.lista}>
            {lista.map((r) => {
              const conhece = conheceRitual(dados, r.id);
              const varia = r.elementos.length > 1;

              return (
                <li
                  key={r.id}
                  className={`${styles.ritual} ${purificando === r.id ? styles.purificando : ''}`}
                  style={{ '--e': ELEMENTOS[r.elementos[0]].cor }}
                >
                  <button className={styles.ler} onClick={() => ler(r)} title={`Ler ${r.nome}`}>
                    <SigiloElemento elemento={r.elementos[0]} />
                    <span className={styles.texto}>
                      <span className={styles.linhaNome}>
                        <b>{r.nome}</b>
                        {varia && <small>varia</small>}
                        <i className={styles.pontilhado} aria-hidden="true" />
                        <span className={styles.romano} title={`${r.circulo}º círculo`}>{ROMANOS[r.circulo]}</span>
                      </span>
                      <span className={styles.resumo}>{r.resumo}</span>
                    </span>
                  </button>

                  {conhece ? (
                    <button
                      className={`${styles.conhece} ${confirmando === r.id ? styles.confirmar : ''}`}
                      onClick={() => purificar(r)}
                      onMouseLeave={() => confirmando === r.id && setConfirmando(null)}
                      onBlur={() => confirmando === r.id && setConfirmando(null)}
                      disabled={purificando === r.id}
                      title={confirmando === r.id ? 'Clique de novo para esquecer este ritual' : 'Você conhece este ritual (clique para purificar e esquecer)'}
                      aria-label={confirmando === r.id ? `Confirmar: purificar ${r.nome}` : `Purificar ${r.nome}`}
                    >
                      {confirmando === r.id ? 'Purificar?' : '✓'}
                    </button>
                  ) : (
                    <button
                      className={styles.aprender}
                      onClick={() => aprender(r)}
                      title="Aprender"
                      aria-label={`Aprender ${r.nome}`}
                    >
                      +
                    </button>
                  )}
                </li>
              );
            })}

            {lista.length === 0 && <li className={styles.vazio}>Nenhum ritual encontrado nestas páginas.</li>}
          </ul>

          <p className={`${styles.limite} ${aprendidos >= limite ? styles.cheio : ''}`}>
            <span>Aprendidos pelo poder Aprender Ritual: <b>{aprendidos} de {limite}</b> (Intelecto)</span>
            <span>Rituais de classe não contam</span>
          </p>
        </div>
      )}
    </Modal>
  );
}
