import { useState } from 'react';
import { CLASSES, ORIGENS } from '../../../modelo';
import {
  calcularBloqueio, calcularDefesa, calcularEsquiva,
  dadosDaOrigem, deslocamento, limitePePorTurno, periciasDaOrigem,
} from '../../../regras';
import CampoLinha from '../CampoLinha/CampoLinha';
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

// Origens em ordem alfabética para o seletor
const LISTA_ORIGENS = Object.entries(ORIGENS)
  .sort(([, a], [, b]) => a.nome.localeCompare(b.nome, 'pt-BR'));

// Cards de combate que, ao clicar, abrem os campos de defesa e deslocamento
const EDITAVEIS = ['defesa', 'deslocamento'];

export default function Agente({ ficha, onAlterarDados, className = '' }) {
  const { dados } = ficha;
  const desl = deslocamento(dados);
  const defesa = dados.defesa ?? {};
  const [defesasAbertas, setDefesasAbertas] = useState(false);

  // Uma linha com o que estiver preenchido, para ver de relance sem abrir
  const resumoDefesas = [
    dados.protecao,
    dados.resistencias && `Resist. ${dados.resistencias}`,
    dados.proficiencias && `Profic. ${dados.proficiencias}`,
  ].filter(Boolean).join(' · ');

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

  const origem = dadosDaOrigem(dados);
  // Texto livre de fichas antigas (antes do seletor): continua aparecendo até trocar
  const origemAntiga = !origem && dados.origem ? dados.origem : null;

  // Trocar a origem também troca as perícias treinadas por ela
  function trocarOrigem(id) {
    onAlterarDados({
      origem: id,
      pericias: periciasDaOrigem(dados.pericias ?? {}, dados.origem, id),
    });
  }

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
        <label title={origem ? `${origem.poder.nome}: ${origem.poder.descricao}` : 'Escolha a origem do agente'}>
          <span>Origem</span>
          <select value={dados.origem ?? ''} onChange={(e) => trocarOrigem(e.target.value)}>
            <option value="">—</option>
            {origemAntiga && <option value={origemAntiga}>{origemAntiga}</option>}
            {LISTA_ORIGENS.map(([id, o]) => (
              <option key={id} value={id}>{o.nome}</option>
            ))}
          </select>
          {origem && <small className={styles.poder}>✦ {origem.poder.nome}</small>}
        </label>
        <label>
          <span>Jogador</span>
          <input defaultValue={dados.jogador ?? ''} placeholder="—" onBlur={salvarTexto('jogador')} onKeyDown={sairNoEnter} />
        </label>
      </div>

      <div className={styles.combate}>
        {combate.map((c) => {
          const classes = `${styles.atributo} ${c.destaque ? styles.destaque : ''} ${c.valor === null ? styles.inativo : ''}`;
          const conteudo = (
            <>
              <svg viewBox="0 0 24 24" aria-hidden="true">{ICONES[c.id]}</svg>
              <b>{c.valor ?? '—'}</b>
              <span>{c.rotulo}</span>
            </>
          );

          // Defesa e Deslocamento abrem os campos que alteram esses valores
          return EDITAVEIS.includes(c.id) ? (
            <button
              key={c.id}
              type="button"
              className={`${classes} ${styles.editavel}`}
              title={`${c.dica} (clique para editar)`}
              aria-expanded={defesasAbertas}
              aria-controls="defesas-agente"
              onClick={() => setDefesasAbertas((a) => !a)}
            >
              {conteudo}
            </button>
          ) : (
            <div key={c.id} className={classes} title={c.dica}>{conteudo}</div>
          );
        })}
      </div>

      <div className={styles.defesas}>
        <button
          type="button"
          className={styles.resumo}
          aria-expanded={defesasAbertas}
          aria-controls="defesas-agente"
          onClick={() => setDefesasAbertas((a) => !a)}
        >
          <span className={resumoDefesas ? '' : styles.semResumo}>
            {resumoDefesas || 'Proteção e resistências'}
          </span>
          <span aria-hidden="true">{defesasAbertas ? '▴' : '▾'}</span>
        </button>

        {defesasAbertas && (
          <div id="defesas-agente" className={styles.camposDefesa}>
            <CampoLinha rotulo="Proteção" valor={dados.protecao} placeholder="Ex.: Proteção leve"
              onSalvar={(protecao) => onAlterarDados({ protecao })} />
            <CampoLinha rotulo="Resist." valor={dados.resistencias} placeholder="Ex.: Sangue 5"
              onSalvar={(resistencias) => onAlterarDados({ resistencias })} />
            <CampoLinha rotulo="Profic." valor={dados.proficiencias} placeholder="Ex.: Armas simples"
              onSalvar={(proficiencias) => onAlterarDados({ proficiencias })} />

            <div className={styles.numeros}>
              <CampoLinha tipo="number" layout="centro" rotulo="Def. equip." valor={defesa.equipamento}
                onSalvar={(v) => onAlterarDados({ defesa: { ...defesa, equipamento: v } })} />
              <CampoLinha tipo="number" layout="centro" rotulo="Def. outros" valor={defesa.outros}
                onSalvar={(v) => onAlterarDados({ defesa: { ...defesa, outros: v } })} />
              <CampoLinha tipo="number" layout="centro" step="1.5" rotulo="Desl. (m)" valor={desl.metros}
                onSalvar={(deslocamento) => onAlterarDados({ deslocamento })} />
            </div>
          </div>
        )}
      </div>
    </Painel>
  );
}