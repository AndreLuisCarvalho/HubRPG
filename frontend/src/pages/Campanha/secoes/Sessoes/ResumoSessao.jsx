import { useState } from 'react';
import { lerResumo, primeiraFrase } from './resumo';
import styles from './ResumoSessao.module.scss';

/**
 * Mostra o resumo de uma sessão já formatado (tópicos, termos e listas — veja resumo.js).
 * previa: na Visão geral, cada tópico começa fechado mostrando só a primeira frase,
 *         e um botão abre tudo de uma vez. Texto sem tópicos mostra as primeiras linhas.
 */
export default function ResumoSessao({ texto, previa = false }) {
  const { intro, topicos } = lerResumo(texto);
  const [abertos, setAbertos] = useState(() => new Set());
  const [inteiro, setInteiro] = useState(false);   // texto sem tópicos: "Ler mais"

  if (!intro.length && !topicos.length) return null;

  // Sem tópicos: um texto corrido; na prévia, corta nas primeiras linhas
  if (!topicos.length) {
    const cortado = previa && !inteiro;
    return (
      <div className={styles.resumo}>
        <div className={cortado ? styles.cortado : ''}><Blocos blocos={intro} /></div>
        {previa && (
          <button type="button" className={styles.alternar} onClick={() => setInteiro((v) => !v)}>
            {inteiro ? 'Mostrar menos' : 'Ler mais'}
          </button>
        )}
      </div>
    );
  }

  const todosAbertos = abertos.size === topicos.length;
  const alternar = (i) => setAbertos((atual) => {
    const novo = new Set(atual);
    if (novo.has(i)) novo.delete(i); else novo.add(i);
    return novo;
  });

  return (
    <div className={styles.resumo}>
      {intro.length > 0 && <div className={styles.intro}><Blocos blocos={intro} /></div>}

      <ol className={styles.topicos}>
        {topicos.map((t, i) => {
          const aberto = !previa || abertos.has(i);
          return (
            <li key={`${i}-${t.titulo}`} className={aberto ? styles.aberto : ''}>
              {previa ? (
                <button type="button" className={styles.cabeca} aria-expanded={aberto} onClick={() => alternar(i)}>
                  <Numero valor={t.numero ?? i + 1} />
                  <span className={styles.titulo}>{t.titulo}</span>
                  <span className={styles.seta} aria-hidden="true">{aberto ? '▴' : '▾'}</span>
                </button>
              ) : (
                <h3 className={styles.cabeca}>
                  <Numero valor={t.numero ?? i + 1} />
                  <span className={styles.titulo}>{t.titulo}</span>
                </h3>
              )}
              {aberto
                ? <div className={styles.corpo}><Blocos blocos={t.blocos} /></div>
                : <p className={styles.previa}>{primeiraFrase(t.blocos)}</p>}
            </li>
          );
        })}
      </ol>

      {previa && (
        <button
          type="button"
          className={styles.alternar}
          onClick={() => setAbertos(todosAbertos ? new Set() : new Set(topicos.map((_, i) => i)))}
        >
          {todosAbertos ? 'Recolher resumo' : 'Ler resumo completo'}
        </button>
      )}
    </div>
  );
}

const Numero = ({ valor }) => <span className={styles.numero}>{valor}</span>;

// Junta itens e termos seguidos numa lista só
function Blocos({ blocos }) {
  const grupos = [];
  for (const b of blocos) {
    const ultimo = grupos.at(-1);
    if (b.tipo !== 'paragrafo' && ultimo?.tipo === b.tipo) ultimo.itens.push(b);
    else grupos.push({ tipo: b.tipo, itens: [b] });
  }

  return grupos.map((g, i) => {
    if (g.tipo === 'item') {
      return <ul key={i} className={styles.lista}>{g.itens.map((b, j) => <li key={j}>{b.texto}</li>)}</ul>;
    }
    if (g.tipo === 'termo') {
      return (
        <dl key={i} className={styles.termos}>
          {g.itens.map((b, j) => (
            <div key={j}><dt>{b.termo}</dt><dd>{b.texto}</dd></div>
          ))}
        </dl>
      );
    }
    return <p key={i}>{g.itens[0].texto}</p>;
  });
}
