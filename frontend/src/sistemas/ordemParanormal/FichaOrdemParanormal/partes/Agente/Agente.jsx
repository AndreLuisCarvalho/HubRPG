import { useState } from 'react';
import EscolherFoto from '../../../../../components/EscolherFoto/EscolherFoto';
import Seletor from '../../../../../components/Seletor/Seletor';
import { trilhasDaClasse } from '../../../trilhas';
import { CLASSES, ESCUDO, NOMES_PROFICIENCIA, ORIGENS, PROTECOES } from '../../../modelo';
import {
  calcularBloqueio, calcularDefesa, calcularEsquiva,
  dadosDaOrigem, dadosDaTrilha, deslocamento, limitePePorTurno, periciasDaOrigem,
  proficiencias, protecaoVestida, rdDaProtecao, semProficienciaNaProtecao, usaEscudo,
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

export default function Agente({ ficha, onAlterarDados, onAlterarFicha, className = '' }) {
  const { dados } = ficha;
  const desl = deslocamento(dados);
  const defesa = dados.defesa ?? {};
  const [defesasAbertas, setDefesasAbertas] = useState(false);

  const trilha = dadosDaTrilha(dados);
  // Habilidades de trilha que acabaram de liberar ao subir o NEX: { itens, n } (n reinicia a animação)
  const [novidade, setNovidade] = useState(null);

  // Ao mudar o NEX: se passou de 10/40/65/99%, mostra o que a trilha liberou
  function mudarNex(nex) {
    const antes = dados.nex ?? 5;
    const novas = (trilha?.habilidades ?? []).filter((hab) => hab.nex > antes && hab.nex <= nex);
    if (novas.length) setNovidade((atual) => ({ itens: novas, n: (atual?.n ?? 0) + 1 }));
    onAlterarDados({ nex });
  }

  const vestida = protecaoVestida(dados);
  const escudo = usaEscudo(dados);
  const rd = rdDaProtecao(dados);
  const semProficiencia = semProficienciaNaProtecao(dados);
  const profsExtras = dados.proficienciasExtras ?? [];
  const profsDaClasse = proficiencias({ ...dados, proficienciasExtras: [] });

  // Uma linha com o que estiver preenchido, para ver de relance sem abrir
  const resumoDefesas = [
    [PROTECOES[vestida]?.nome, escudo && 'Escudo'].filter(Boolean).join(' + '),
    rd && `RD ${rd}`,
    dados.resistencias && `Resist. ${dados.resistencias}`,
  ].filter(Boolean).join(' · ');

  // Vestir uma proteção (ou tirar, clicando de novo na mesma)
  const vestir = (id) => onAlterarDados({ armadura: vestida === id ? '' : id });

  const alternarProficiencia = (id) => onAlterarDados({
    proficienciasExtras: profsExtras.includes(id) ? profsExtras.filter((p) => p !== id) : [...profsExtras, id],
  });

  const esquiva = calcularEsquiva(dados);
  const bloqueio = calcularBloqueio(dados);

  // null = reação indisponível (perícia não treinada): mostra "—" e fica apagada
  const combate = [
    { id: 'defesa', rotulo: 'Defesa', valor: calcularDefesa(dados), destaque: true, dica: 'Defesa = 10 + AGI + proteção + escudo + outros' },
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
    <Painel className={className} classeCorpo={styles.agente}>
      <header className={styles.credencial}>
        <span className={styles.selo}>Agente da Ordem</span>
        <EscolherFoto
          className={styles.avatar}
          imagem={ficha.imagem}
          inicial={ficha.nome.charAt(0)}
          onEscolher={(imagem) => onAlterarFicha?.({ imagem })}
        />
        <h1 className={styles.nome} title={ficha.nome}>{ficha.nome}</h1>

        <div className={styles.tags}>
          {/* Com trilha escolhida, a classe também fica fixa (a trilha pertence à classe) */}
          {trilha ? (
            <span className={`${styles.tag} ${styles.fixa}`} title="Classe definida junto com a trilha">
              {CLASSES[dados.classe]?.nome}
            </span>
          ) : (
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
          )}

          {/* Trilha: escolhida na criação (ou uma única vez aqui, em fichas antigas) e depois fixa.
              key={novidade.n}: a pílula "acende" de novo a cada habilidade liberada */}
          {trilha ? (
            <span
              key={novidade?.n ?? 0}
              className={`${styles.tag} ${styles.fixa} ${novidade ? styles.desperta : ''}`}
              title={trilha.descricao}
            >
              {trilha.nome}
            </span>
          ) : (
            <Seletor
              className={styles.seletorTrilha}
              classeBotao={`${styles.tag} ${styles.vazia}`}
              rotulo="Trilha (não pode ser trocada depois)"
              valor=""
              onMudar={(id) => onAlterarDados({ trilha: id })}
              placeholder="+ Trilha"
              opcoes={trilhasDaClasse(dados.classe).map((t) => ({ valor: t.id, rotulo: t.nome }))}
            />
          )}
        </div>

        {/* Subiu o NEX e a trilha liberou habilidade nova: cartão que "chega" carimbado */}
        {novidade && (
          <div key={novidade.n} className={styles.novidade} role="status">
            <button type="button" className={styles.fecharNovidade} onClick={() => setNovidade(null)} aria-label="Fechar">✕</button>
            <span className={styles.seloNovidade}>Nova habilidade de trilha</span>
            {novidade.itens.map((hab) => (
              <div key={hab.nome} className={styles.itemNovidade}>
                <b><small>NEX {hab.nex}%</small> {hab.nome}</b>
                <p>{hab.texto}</p>
              </div>
            ))}
          </div>
        )}
      </header>

      <CirculoAtributos
        atributos={dados.atributos}
        onAlterar={(atributos) => onAlterarDados({ atributos })}
        nex={dados.nex ?? 5}
        onAlterarNex={mudarNex}
      />

      {/* Origem e Jogador são definidos na criação e ficam fixos.
          Fichas antigas sem eles podem escolher uma única vez aqui. */}
      <div className={styles.dossie}>
        {dados.origem ? (
          <div title={origem ? `${origem.poder.nome}: ${origem.poder.descricao}` : 'Origem definida na criação'}>
            <span>Origem</span>
            <b>{origem?.nome ?? origemAntiga}</b>
            {origem && <small className={styles.poder}>✦ {origem.poder.nome}</small>}
          </div>
        ) : (
          <label title="Escolha a origem do agente (não pode ser trocada depois)">
            <span>Origem</span>
            <select value="" onChange={(e) => trocarOrigem(e.target.value)}>
              <option value="">Escolher…</option>
              {LISTA_ORIGENS.map(([id, o]) => (
                <option key={id} value={id}>{o.nome}</option>
              ))}
            </select>
          </label>
        )}

        {dados.jogador ? (
          <div title="Jogador definido na criação">
            <span>Jogador</span>
            <b>{dados.jogador}</b>
          </div>
        ) : (
          <label title="Quem joga com este agente (não pode ser trocado depois)">
            <span>Jogador</span>
            <input placeholder="Escrever…" onBlur={salvarTexto('jogador')} onKeyDown={sairNoEnter} />
          </label>
        )}
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
            {/* Proteção: escolhe e a Defesa (e a RD/penalidade da pesada) já entram na ficha */}
            <div className={styles.grupo}>
              <span className={styles.rotuloGrupo}>Proteção</span>
              <div className={styles.opcoesProtecao} role="group" aria-label="Proteção vestida">
                {Object.entries(PROTECOES).map(([id, p]) => (
                  <button key={id} type="button" aria-pressed={vestida === id} onClick={() => vestir(id)} title={p.descricao}>
                    {id === 'leve' ? 'Leve' : 'Pesada'} <b>+{p.defesa}</b>
                  </button>
                ))}
                <button type="button" aria-pressed={escudo} onClick={() => onAlterarDados({ escudo: !escudo })} title={ESCUDO.descricao}>
                  Escudo <b>+{ESCUDO.defesa}</b>
                </button>
              </div>
              {vestida === 'pesada' && (
                <small className={styles.nota}>RD 2 a balístico, corte, impacto e perfuração · −5 em Acrobacia, Crime e Furtividade</small>
              )}
              {semProficiencia && (
                <small className={`${styles.nota} ${styles.alerta}`}>
                  Sem proficiência: −2d20 em testes de Força e Agilidade
                </small>
              )}
            </div>

            <CampoLinha rotulo="Resist." valor={dados.resistencias} placeholder="Ex.: Sangue 5, Mental 2"
              onSalvar={(resistencias) => onAlterarDados({ resistencias })} />

            {/* Proficiências: as da classe vêm prontas; poderes podem dar outras */}
            <div className={styles.grupo}>
              <span className={styles.rotuloGrupo}>Proficiências</span>
              <div className={styles.opcoesProtecao} role="group" aria-label="Proficiências">
                {Object.entries(NOMES_PROFICIENCIA).map(([id, nome]) => {
                  const daClasse = profsDaClasse.includes(id);
                  const tem = daClasse || profsExtras.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={tem}
                      disabled={daClasse}
                      onClick={() => alternarProficiencia(id)}
                      title={daClasse ? 'Vem da classe' : 'Marque se um poder deu esta proficiência'}
                    >
                      {nome}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.numeros}>
              {/* Campo antigo, digitado à mão: só aparece se a ficha ainda tiver valor nele */}
              {defesa.equipamento > 0 && (
                <CampoLinha tipo="number" layout="centro" rotulo="Def. equip." valor={defesa.equipamento}
                  onSalvar={(v) => onAlterarDados({ defesa: { ...defesa, equipamento: v } })} />
              )}
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