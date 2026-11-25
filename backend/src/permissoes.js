import { db } from './db.js';

/*
 * O que o JOGADOR pode ver e mexer (o mestre pode tudo na campanha dele).
 * req.papel vem do exigirCampanha (auth.js).
 */

export const ehMestre = (req) => req.papel === 'mestre';

/** Para rotas que o jogador não usa de jeito nenhum */
export function soMestre(req, res, next) {
  if (!ehMestre(req)) return res.status(403).json({ erro: 'Só o mestre pode fazer isso' });
  next();
}

/** Fichas que estão num combate em andamento (o jogador precisa delas para a luta) */
export async function fichasEmCombate(campanhaId) {
  const combates = await db.all('SELECT dados FROM combates WHERE campanha_id = ?', Number(campanhaId));
  const ids = new Set();
  for (const { dados } of combates) {
    try {
      const d = JSON.parse(dados || '{}');
      if (d.estado !== 'andamento') continue;
      for (const p of d.participantes ?? []) if (p.fichaId) ids.add(Number(p.fichaId));
    } catch { /* combate com dados quebrados: ignora */ }
  }
  return ids;
}

// O "básico" de um agente de outro jogador: nome, foto e a linha de resumo (classe, NEX, origem)
const CAMPOS_BASICOS = ['classe', 'nex', 'origem', 'trilha', 'jogador'];
export function fichaBasica(ficha) {
  const dados = Object.fromEntries(CAMPOS_BASICOS.filter((c) => ficha.dados?.[c] != null).map((c) => [c, ficha.dados[c]]));
  return {
    id: ficha.id, campanha_id: ficha.campanha_id, tipo: ficha.tipo, nome: ficha.nome, imagem: ficha.imagem,
    dono_id: ficha.dono_id, basica: true, dados,
  };
}

// Na arena, a ficha de quem não é dele: só o que as regras da luta usam (recursos, defesa, atributos).
// Sai o resto: história, anotações, inventário, rituais, ataques, perícias, dados.
const FORA_DA_LUTA = [
  'descricao', 'notas', 'inventario', 'rituais', 'ataques', 'kits', 'dado',
  'pericias', 'periciasOutros', 'proficiencias', 'proficienciasExtras',
];
export function fichaDaLuta(ficha) {
  const dados = Object.fromEntries(Object.entries(ficha.dados ?? {}).filter(([c]) => !FORA_DA_LUTA.includes(c)));
  return { ...ficha, dados, daLuta: true };
}

// Na luta o jogador mexe nos recursos de quem está no combate (dano nas ameaças, cura nos aliados)
const DADOS_DE_COMBATE = ['atuais', 'temporarios', 'contagens', 'pv', 'npc'];
export const soDadosDeCombate = (corpo) => {
  const chaves = Object.keys(corpo ?? {});
  const dados = corpo?.dados ?? {};
  return chaves.every((c) => c === 'dados') && Object.keys(dados).every((c) => DADOS_DE_COMBATE.includes(c));
};
