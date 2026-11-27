import { useEffect, useRef, useState } from 'react';
import { useRolagem } from '../../../../components/Dados/rolagem';
import styles from './AvisosDoCombate.module.scss';

const SEGUNDOS_DO_AVISO = 6;
const MAXIMO = 3;
// A virada de turno/rodada já tem a faixa que cruza a tela
const FORA = new Set(['rodada', 'turno']);
const ROTULO_CARIMBO = { acerto: 'Acerto', falha: 'Falha', critico: 'Crítico', sucesso: 'Sucesso', fracasso: 'Fracasso' };

/**
 * O que acabou de acontecer, em avisos no topo do campo: cada linha nova do Registro (a que esta tela
 * pode ver) aparece por alguns segundos e some sozinha; no máximo 3 empilhados, o mais novo em cima.
 * O dano (ou a queda) que vem de um ataque entra no aviso do ataque em vez de abrir outro.
 * log: o registro desta tela, do mais novo para o mais antigo ({ id, tipo, mostrar, carimbo, dados }).
 */
export default function AvisosDoCombate({ log, mirando = false }) {
  const vistos = useRef(new Set(log.map((e) => e.id)));
  const [avisos, setAvisos] = useState([]);

  useEffect(() => {
    const novas = log.filter((e) => !vistos.current.has(e.id)).reverse();   // na ordem em que aconteceram
    if (!novas.length) return;
    novas.forEach((e) => vistos.current.add(e.id));
    setAvisos((atuais) => {
      let lista = atuais;
      for (const e of novas) {
        if (FORA.has(e.tipo)) continue;
        const linha = { id: e.id, texto: e.mostrar, tipo: e.tipo, carimbo: e.carimbo };
        const ataque = continuacao(lista, e);
        lista = ataque
          ? lista.map((a) => (a === ataque ? { ...a, linhas: [...a.linhas, linha], ate: Date.now() + SEGUNDOS_DO_AVISO * 1000 } : a))
          : [...lista, { chave: e.id, ...linha, autor: e.dados?.autor, alvo: e.dados?.alvo, linhas: [], ate: Date.now() + SEGUNDOS_DO_AVISO * 1000 }];
      }
      return lista.slice(-MAXIMO);
    });
  }, [log]);

  // Com a mesa de dados na tela, o tempo para: quando ela fecha, os avisos recomeçam a contar
  // (senão o resumo do próprio ataque some enquanto os dados ainda estão rolando)
  const { aberta } = useRolagem();
  useEffect(() => {
    if (aberta) return;
    setAvisos((l) => (l.length ? l.map((a) => ({ ...a, ate: Date.now() + SEGUNDOS_DO_AVISO * 1000 })) : l));
  }, [aberta]);

  // Cada aviso some sozinho no fim do tempo dele (o dano que chega depois renova o do ataque)
  useEffect(() => {
    if (!avisos.length || aberta) return undefined;
    const proximo = Math.min(...avisos.map((a) => a.ate));
    const espera = setTimeout(() => setAvisos((l) => l.filter((a) => a.ate > Date.now() + 50)), Math.max(0, proximo - Date.now()));
    return () => clearTimeout(espera);
  }, [avisos, aberta]);

  if (!avisos.length) return null;
  return (
    <ol className={styles.avisos} data-mirando={mirando || undefined} data-pausado={aberta || undefined} aria-live="polite" aria-label="O que acabou de acontecer">
      {[...avisos].reverse().map((a) => (
        <li key={a.chave} className={styles.aviso} data-tipo={a.tipo} data-tom={a.carimbo ?? undefined}>
          <p>
            {a.texto}
            {a.carimbo && <em data-tom={a.carimbo}>{ROTULO_CARIMBO[a.carimbo]}</em>}
          </p>
          {a.linhas.map((l) => (
            <p key={l.id} className={styles.continua} data-tipo={l.tipo}>{l.texto}</p>
          ))}
          <i className={styles.tempo} style={{ '--duracao': `${SEGUNDOS_DO_AVISO}s` }} key={a.ate} aria-hidden="true" />
        </li>
      ))}
    </ol>
  );
}

// O aviso de ataque que esta linha continua: dano/cura no mesmo alvo vindo do mesmo autor, ou a queda do alvo
function continuacao(lista, e) {
  const d = e.dados;
  if (!d?.alvo) return null;
  const ataques = lista.filter((a) => a.tipo === 'ataque' && a.alvo === d.alvo);
  const ultimo = ataques[ataques.length - 1];
  if (!ultimo) return null;
  if (e.tipo === 'queda') return ultimo;
  if (['dano', 'cura'].includes(e.tipo) && d.autor && d.autor === ultimo.autor) return ultimo;
  return null;
}
