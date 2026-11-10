import { useEffect, useRef, useState } from 'react';
import styles from './Orbe.module.scss';

const DURACAO_EVENTO = 1100; // ms: tempo da animação de perda/ganho

// Desenhos de cada elemento (coordenadas de 0 a 100 dentro do líquido)
const VEIAS = [
  'M50 100 C48 80 40 70 30 58 M40 70 C46 60 44 50 50 40',
  'M62 100 C64 84 72 74 80 66 M70 76 C66 66 70 56 66 48',
  'M20 100 C24 90 18 82 10 76',
];
const RAIOS = [
  '8,10 26,34 20,46 38,64 32,76 50,96',
  '58,4 70,26 64,36 80,54 72,66 92,90',
  '28,92 42,78 38,70 56,60',
];
const RUNAS = [
  { simbolo: 'ᛟ', x: 22, y: 30 },
  { simbolo: 'ᚨ', x: 62, y: 50 },
  { simbolo: 'ᚱ', x: 40, y: 70 },
];
const GOTAS = [
  { x: 30, y: 30, tamanho: 6 },
  { x: 62, y: 22, tamanho: 4 },
  { x: 48, y: 14, tamanho: 5 },
];

// Efeito que aparece dentro do líquido só no momento da mudança
function EfeitoDoElemento({ elemento }) {
  if (elemento === 'sangue') {
    return (
      <svg className={styles.veias} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {VEIAS.map((d) => <path key={d} d={d} />)}
      </svg>
    );
  }

  if (elemento === 'energia') {
    return (
      <svg className={styles.raios} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {RAIOS.map((pontos) => <polyline key={pontos} points={pontos} />)}
      </svg>
    );
  }

  if (elemento === 'conhecimento') {
    return RUNAS.map((runa, i) => (
      <span
        key={runa.simbolo}
        className={styles.runa}
        style={{ left: `${runa.x}%`, top: `${runa.y}%`, animationDelay: `${i * 120}ms` }}
        aria-hidden="true"
      >
        {runa.simbolo}
      </span>
    ));
  }

  return null;
}

// Gotas de sangue espirrando quando a vida cai
function Gotas() {
  return GOTAS.map((gota, i) => (
    <span
      key={i}
      className={styles.gota}
      style={{
        left: `${gota.x}%`,
        top: `${gota.y}%`,
        width: gota.tamanho,
        height: gota.tamanho,
        animationDelay: `${i * 60}ms`,
      }}
      aria-hidden="true"
    />
  ));
}

// onMenos(qtd): perder · onMais(qtd): recuperar · onDigitar(valor): valor exato
// onTemporario(valor): pontos temporários · rodape: troca o nome (ex.: contagem de morrendo)
export default function Orbe({ recurso, passo = 1, onMenos, onMais, onDigitar, onTemporario, rodape }) {
  const { nome, atual, maximo, elemento, temporario = 0 } = recurso;
  const [digitando, setDigitando] = useState(false);
  const [editandoTemp, setEditandoTemp] = useState(false);
  const [evento, setEvento] = useState(null); // { tipo: 'perda' | 'ganho', valor, chave }

  // A animação olha o total (atual + temporários): perder só temporário também anima
  const total = atual + temporario;
  const anterior = useRef(total);

  // Compara com o valor anterior: se mudou, dispara a animação de perda ou ganho
  useEffect(() => {
    const diferenca = total - anterior.current;
    anterior.current = total;
    if (diferenca === 0) return;

    const tipo = diferenca < 0 ? 'perda' : 'ganho';
    // Cliques seguidos do mesmo tipo somam no número flutuante (−5, −10…)
    setEvento((ev) => ({
      tipo,
      valor: (ev?.tipo === tipo ? ev.valor : 0) + Math.abs(diferenca),
      chave: Date.now(),   // chave nova = animação recomeça
    }));

    const timer = setTimeout(() => setEvento(null), DURACAO_EVENTO);
    return () => clearTimeout(timer);
  }, [total]);

  const porcentagem = maximo > 0 ? Math.max(0, Math.min(100, (atual / maximo) * 100)) : 0;
  const critico = porcentagem > 0 && porcentagem <= 25;

  const classes = [
    styles.orbe,
    styles[elemento],
    critico && styles.critico,
    evento && styles[evento.tipo],
    temporario > 0 && styles.comTemporario,
  ].filter(Boolean).join(' ');

  function confirmar(e) {
    setDigitando(false);
    const valor = Math.max(0, Number(e.target.value) || 0);
    if (valor !== atual) onDigitar(valor);
  }

  function confirmarTemporario(e) {
    setEditandoTemp(false);
    const valor = Math.max(0, Number(e.target.value) || 0);
    if (valor !== temporario) onTemporario(valor);
  }

  // Enter confirma; Esc desfaz o que foi digitado
  const aoTeclar = (original) => (e) => {
    if (e.key === 'Enter') e.currentTarget.blur();
    if (e.key === 'Escape') {
      e.currentTarget.value = original;
      e.currentTarget.blur();
    }
  };

  return (
    <div className={classes} style={{ '--nivel': `${porcentagem}%` }}>
      <div className={styles.moldura}>
        {evento && (
          <span key={evento.chave} className={styles.flutuante} aria-hidden="true">
            {evento.tipo === 'perda' ? '−' : '+'}{evento.valor}
          </span>
        )}

        <div className={styles.esfera} role="meter" aria-label={nome} aria-valuemin={0} aria-valuemax={maximo} aria-valuenow={atual}>
          <div className={styles.liquido}>
            {evento && <EfeitoDoElemento key={evento.chave} elemento={elemento} />}
          </div>

          {evento?.tipo === 'perda' && elemento === 'sangue' && <Gotas key={evento.chave} />}

          <div className={styles.vidro} />

          {digitando ? (
            <input
              className={styles.entrada}
              type="number"
              min="0"
              autoFocus
              defaultValue={atual}
              onBlur={confirmar}
              onKeyDown={aoTeclar(atual)}
              aria-label={`Novo valor de ${nome}`}
            />
          ) : (
            <button className={styles.valor} onClick={() => setDigitando(true)} title="Clique para digitar o valor">
              {atual}
              <small>/{maximo}</small>
            </button>
          )}
        </div>

        {/* Pontos temporários: selo no alto da orbe (apagado quando é 0) */}
        {editandoTemp ? (
          <input
            className={`${styles.temporario} ${styles.entradaTemp}`}
            type="number"
            min="0"
            autoFocus
            defaultValue={temporario}
            onBlur={confirmarTemporario}
            onKeyDown={aoTeclar(temporario)}
            aria-label={`${nome} temporário`}
          />
        ) : (
          <button
            className={styles.temporario}
            onClick={() => setEditandoTemp(true)}
            title={temporario > 0
              ? `${temporario} ${nome} temporário: é gasto primeiro e pode passar do máximo`
              : `Adicionar ${nome} temporário`}
          >
            {temporario > 0 ? `+${temporario}` : 'T'}
          </button>
        )}

        <button
          className={`${styles.ajuste} ${styles.menos}`}
          onClick={() => onMenos(passo)}
          aria-label={`Diminuir ${passo} de ${nome}`}
          title={`−${passo}`}
        >
          −
        </button>
        <button
          className={`${styles.ajuste} ${styles.mais}`}
          onClick={() => onMais(passo)}
          aria-label={`Aumentar ${passo} de ${nome}`}
          title={`+${passo}`}
        >
          +
        </button>
      </div>

      {rodape ?? <span className={styles.nome}>{nome}</span>}
    </div>
  );
}