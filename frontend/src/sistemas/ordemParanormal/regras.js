// Como o sistema CALCULA. Funções puras: recebem dados, devolvem resultado.
import { CLASSES, GRAUS, NEX, PERICIAS, RECURSOS } from './modelo';

export function fichaInicial() {
  return {
    classe: 'combatente',
    nex: 5,
    origem: '',
    jogador: '',
    atributos: { agi: 1, for: 1, int: 1, pre: 1, vig: 1 },
    pericias: {},
    periciasOutros: {},
    atuais: {},
    defesa: { equipamento: 0, outros: 0 },
    deslocamento: 9,
    protecao: '',
    resistencias: '',
    proficiencias: '',
    descricao: '',
  };
}

// NEX 5% = 0 níveis extras, 10% = 1, ..., 99% = 19
const niveisExtras = (nex) => Math.max(NEX.indexOf(nex), 0);

export function calcularMaximos(dados) {
  const classe = CLASSES[dados.classe] ?? CLASSES.combatente;
  const { vig = 0, pre = 0 } = dados.atributos ?? {};
  const extras = niveisExtras(dados.nex);

  return {
    pv: classe.pv.inicial + vig + extras * (classe.pv.porNex + vig),
    pe: classe.pe.inicial + pre + extras * (classe.pe.porNex + pre),
    san: classe.san.inicial + extras * classe.san.porNex,
  };
}

// Valor atual de cada recurso; se nunca foi mexido, começa cheio
export function calcularAtuais(dados) {
  const maximos = calcularMaximos(dados);
  return Object.fromEntries(
    Object.entries(maximos).map(([id, max]) => [id, Math.min(dados.atuais?.[id] ?? max, max)])
  );
}

// Formato comum a todos os sistemas: lista de recursos prontos para desenhar
export function recursos(dados) {
  const maximos = calcularMaximos(dados);
  const atuais = calcularAtuais(dados);
  return RECURSOS.map((r) => ({ ...r, atual: atuais[r.id], maximo: maximos[r.id] }));
}

export const limitePePorTurno = (dados) => Math.floor((dados.nex ?? 5) / 5);

export function deslocamento(dados) {
  const metros = dados.deslocamento ?? 9;
  return { metros, quadrados: Math.floor(metros / 1.5) };
}

/* ---------- Perícias ---------- */
export const grauDaPericia = (dados, id) => dados.pericias?.[id] ?? 'destreinado';

export function bonusPericia(dados, id) {
  const treino = GRAUS[grauDaPericia(dados, id)]?.bonus ?? 0;
  const outros = dados.periciasOutros?.[id] ?? 0;
  return treino + outros;
}

// Atributo 0 rola 2d20 e fica com o menor (↓)
export function dadosDoAtributo(dados, atributoId) {
  const valor = dados.atributos?.[atributoId] ?? 0;
  return valor === 0 ? '2d20↓' : `${valor}d20`;
}

// Ex.: "3d20+5" (vai ser usado pelo rolador de dados)
export function dadosDoTeste(dados, periciaId) {
  const pericia = PERICIAS.find((p) => p.id === periciaId);
  const bonus = bonusPericia(dados, periciaId);
  const base = dadosDoAtributo(dados, pericia.atributo);
  return bonus ? `${base}+${bonus}` : base;
}

/* ---------- Defesa ---------- */
export function calcularDefesa(dados) {
  const { equipamento = 0, outros = 0 } = dados.defesa ?? {};
  return 10 + (dados.atributos?.agi ?? 0) + equipamento + outros;
}

// Esquiva: Defesa + bônus de Reflexos · Bloqueio: redução igual ao bônus de Fortitude
export const calcularEsquiva = (dados) => calcularDefesa(dados) + bonusPericia(dados, 'reflexos');
export const calcularBloqueio = (dados) => bonusPericia(dados, 'fortitude');

export function resumo(dados) {
  const classe = CLASSES[dados.classe];
  return `${classe?.nome ?? 'Sem classe'} · NEX ${dados.nex ?? 5}%`;
}