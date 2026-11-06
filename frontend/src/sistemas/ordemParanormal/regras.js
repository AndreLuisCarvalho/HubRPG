// Como o sistema CALCULA. Funções puras: recebem dados, devolvem resultado.
import { CLASSES, GRAUS, NEX, PERICIAS, RECURSOS } from './modelo';

export function fichaInicial() {
  return {
    classe: 'combatente',
    nex: 5,
    atributos: { agi: 1, for: 1, int: 1, pre: 1, vig: 1 },
    pericias: {},
    atuais: {},
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

export const calcularDefesa = (dados) => 10 + (dados.atributos?.agi ?? 0);

export const limitePePorTurno = (dados) => Math.floor((dados.nex ?? 5) / 5);

export function bonusPericia(dados, periciaId) {
  const grau = dados.pericias?.[periciaId] ?? 'destreinado';
  return GRAUS[grau]?.bonus ?? 0;
}

// Ex.: "3d20+5". Atributo 0 rola 2d20 e fica com o menor (↓)
export function dadosDoTeste(dados, periciaId) {
  const pericia = PERICIAS.find((p) => p.id === periciaId);
  const valor = dados.atributos?.[pericia.atributo] ?? 0;
  const bonus = bonusPericia(dados, periciaId);
  const base = valor === 0 ? '2d20↓' : `${valor}d20`;
  return bonus ? `${base}+${bonus}` : base;
}

export function resumo(dados) {
  const classe = CLASSES[dados.classe];
  return `${classe?.nome ?? 'Sem classe'} · NEX ${dados.nex ?? 5}%`;
}