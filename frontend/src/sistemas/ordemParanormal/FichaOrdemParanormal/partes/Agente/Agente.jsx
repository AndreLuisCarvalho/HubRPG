import { CLASSES } from '../../../modelo';
import {
  calcularBloqueio, calcularDefesa, calcularEsquiva,
  deslocamento, limitePePorTurno,
} from '../../../regras';
import CirculoAtributos from '../CirculoAtributos/CirculoAtributos';
import Painel from '../Painel/Painel';
import styles from './Agente.module.scss';

// Ícones dos atributos de combate (desenhados para o HubRPG)
const ICONES = {
  defesa: <path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Z" />,
  esquiva: (
    <>
      <path d="M4 16c4 0 6-2 8-5s4-5 8-5" />
      <path d="M16 4l4 2-2 4" />
      <path d="M4 20h6" />
    </>
  ),
  bloqueio: (
    <>
      <path d="M5 5h14v14H5z" />
      <path d="M5 12h14M12 5v14" />
    </>
  ),
  esforco: <path d="M12 3c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8z" />,
  deslocamento: <path d="M8 4c2 0 3 2 3 5s-1 4-3 4-3-1-3-4 1-5 3-5zM15 11c2 0 3 2 3 5s-1 4-3 4-3-1-3-4 1-5 3-5z" />,
};

export default function Agente({ ficha, onAlterarDados, className = '' }) {
  const { dados } = ficha;
  const desl = deslocamento(dados);

  const esquiva = calcularEsquiva(dados);
  const bloqueio = calcularBloqueio(dados);

  // null = reação indisponível (perícia não treinada): mostra "—" e fica apagada
  const combate = [
    { id: 'defesa', rotulo: 'Defesa', valor: calcularDefesa(dados), destaque: true, dica: 'Defesa = 10 + AGI + equipamento + outros' },
    {
      id: 'esquiva', rotulo: 'Esquiva', valor: esquiva,
      dica: esquiva === null ? 'Precisa de Reflexos treinado' : 'Reação: Defesa + bônus de Reflexos contra um ataque',
    },
    {
      id: 'bloqueio', rotulo: 'Bloqueio', valor: bloqueio === null ? null : <><small>RD</small>{bloqueio}</>,
      dica: bloqueio === null ? 'Precisa de Fortitude treinado' : 'Reação contra corpo a corpo: reduz o dano no bônus de Fortitude',
    },
    { id: 'esforco', rotulo: 'PE/turno', valor: limitePePorTurno(dados), dica: 'Limite de PE gastos por turno' },
    { id: 'deslocamento', rotulo: 'Desloc.', valor: `${desl.metros}m`, dica: `${desl.quadrados} quadrados` },
  ];

  // Cria a função "salvar ao sair do campo" para um campo de texto
  const salvarTexto = (campo) => (e) => {
    const valor = e.target.value.trim();
    if (valor !== (dados[campo] ?? '')) onAlterarDados({ [campo]: valor });
  };
  const sairNoEnter = (e) => e.key === 'Enter' && e.currentTarget.blur();

  return (
    <Painel className={`${styles.agente} ${className}`}>
      <header className={styles.credencial}>
        <span className={styles.selo}>Agente da Ordem</span>
        <span className={styles.avatar} aria-hidden="true">{ficha.nome.charAt(0)}</span>
        <h1 className={styles.nome} title={ficha.nome}>{ficha.nome}</h1>

        <div className={styles.tags}>
          <select
            className={styles.tag}
            value={dados.classe ?? ''}
            onChange={(e) => onAlterarDados({ classe: e.target.value })}
            aria-label="Classe"
          >
            {Object.entries(CLASSES).map(([id, classe]) => (
              <option key={id} value={id}>{classe.nome}</option>
            ))}
          </select>
          <input
            className={`${styles.tag} ${dados.trilha ? '' : styles.vazia}`}
            defaultValue={dados.trilha ?? ''}
            placeholder="+ Trilha"
            onBlur={salvarTexto('trilha')}
            onKeyDown={sairNoEnter}
            aria-label="Trilha"
          />
        </div>
      </header>

      <CirculoAtributos
        atributos={dados.atributos}
        onAlterar={(atributos) => onAlterarDados({ atributos })}
        nex={dados.nex ?? 5}
        onAlterarNex={(nex) => onAlterarDados({ nex })}
      />

      <div className={styles.dossie}>
        <label>
          <span>Origem</span>
          <input defaultValue={dados.origem ?? ''} placeholder="—" onBlur={salvarTexto('origem')} onKeyDown={sairNoEnter} />
        </label>
        <label>
          <span>Jogador</span>
          <input defaultValue={dados.jogador ?? ''} placeholder="—" onBlur={salvarTexto('jogador')} onKeyDown={sairNoEnter} />
        </label>
      </div>

      <div className={styles.combate}>
        {combate.map((c) => (
          <div
            key={c.id}
            className={`${styles.atributo} ${c.destaque ? styles.destaque : ''} ${c.valor === null ? styles.inativo : ''}`}
            title={c.dica}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">{ICONES[c.id]}</svg>
            <b>{c.valor ?? '—'}</b>
            <span>{c.rotulo}</span>
          </div>
        ))}
      </div>
    </Painel>
  );
}