import { useCallback, useEffect, useRef, useState } from 'react';
import Dado3D from '../../../../components/Dados/Dado3D';
import Dados3D from '../../../../components/Dados/Dados3D';
import { temWebGL } from '../../../../components/Dados/dadoWebGL';
import { comLancamento } from '../../../../components/Dados/formula';
import styles from './RolagemIniciativa.module.scss';

const DURACAO = 1900;   // arremesso de cada dado (o mesmo da mesa de dados)
const INTERVALO = 180;  // um dado sai depois do outro
const ESPERA = 2200;    // tempo com tudo parado antes de sumir

const sorteio = () => 1 + Math.floor(Math.random() * 20);

function tamanhoDosDados(qtd) {
  const celular = window.innerWidth <= 800 ? 0.75 : 1;
  if (qtd <= 4) return 104 * celular;
  if (qtd <= 8) return 80 * celular;
  return 60 * celular;
}

/**
 * Abertura da luta na tela dos Jogadores (só visual): os dados 3D da mesa, um d20 por participante à
 * vista, já na ordem do turno. O dado do agente cai no d20 que ele tirou e mostra a iniciativa;
 * o da ameaça cai numa face qualquer e mostra só a posição (o número dela é segredo).
 */
export default function RolagemIniciativa({ participantes, onFim }) {
  // Os dados são sorteados uma vez só (o desenho da arena não pode rolar de novo)
  const [dados] = useState(() => comLancamento(participantes.map((p) => ({
    lados: 20,
    valor: p.lado === 'agentes' ? p.iniRolagem?.natural ?? sorteio() : sorteio(),
    usado: true,
  }))).map((d, i) => ({ ...d, atraso: i * INTERVALO })));
  const [quem] = useState(participantes);
  const [parou, setParou] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [webgl, setWebgl] = useState(temWebGL);
  const semWebGL = useCallback(() => setWebgl(false), []);
  const avisar = useRef(onFim);
  useEffect(() => { avisar.current = onFim; });

  useEffect(() => {
    const calmo = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const parada = calmo ? 60 : DURACAO + (dados.length - 1) * INTERVALO;
    const relogios = [
      setTimeout(() => setParou(true), parada),
      setTimeout(() => setSaindo(true), parada + ESPERA - 400),
      setTimeout(() => avisar.current(), parada + ESPERA),
    ];
    return () => relogios.forEach(clearTimeout);
  }, [dados]);

  const tamanho = tamanhoDosDados(dados.length);
  const etiqueta = (_d, i) => {
    const p = quem[i];
    const agente = p.lado === 'agentes';
    return (
      <span className={styles.etiqueta} data-lado={p.lado} data-parou={parou || undefined} style={{ transitionDelay: parou ? `${i * 60}ms` : '0ms' }}>
        <em>{i + 1}º</em>
        <b>{p.ver.nome}</b>
        {agente && <strong>{p.iniciativa ?? '—'}</strong>}
      </span>
    );
  };

  return (
    <div className={styles.rolagem} data-saindo={saindo || undefined} role="status" aria-label="Rolando a iniciativa">
      <h2>Iniciativa</h2>
      {webgl ? (
        <div className={styles.palco} style={{ '--tam': `${tamanho}px` }}>
          <Dados3D dados={dados} rodada={1} tamanho={tamanho} duracao={DURACAO} etiqueta={etiqueta} onFalha={semWebGL} estilo={null} />
        </div>
      ) : (
        <div className={styles.palcoCss} style={{ '--tam': `${tamanho}px` }}>
          {dados.map((d, i) => (
            <div key={i} className={styles.vaga}>
              <Dado3D lados={20} valor={d.valor} tamanho={tamanho} lancamento={d} />
              {etiqueta(d, i)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
