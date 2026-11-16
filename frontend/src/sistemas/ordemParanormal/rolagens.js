// Monta os pedidos da mesa de dados (useRolagem) a partir do que está escrito na ficha
import { lerCritico, lerFormula } from '../../components/Dados/formula';
import { ATRIBUTOS, PERICIAS } from './modelo';
import { dadosDoTeste } from './regras';

const normalizar = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function pedidoPericia(dados, id) {
  const pericia = PERICIAS.find((p) => p.id === id);
  return { titulo: pericia?.nome ?? id, subtitulo: 'Teste de perícia', formula: dadosDoTeste(dados, id), tipo: 'teste' };
}

// Atributo 0: 2d20 ficando com o menor
export const formulaDoAtributo = (valor = 0) => (valor === 0 ? '2d20↓' : `${valor}d20`);

export function pedidoAtributo(id, valor) {
  const nome = ATRIBUTOS.find((a) => a.id === id)?.nome ?? id.toUpperCase();
  return { titulo: nome, subtitulo: 'Teste de atributo', formula: formulaDoAtributo(valor), tipo: 'teste' };
}

/** Teste escrito à mão ("3d20+5", "+5") pronto para rolar; null se não der para ler */
export function pedidoTeste(titulo, subtitulo, formula) {
  return lerFormula(formula) ? { titulo, subtitulo, formula, tipo: 'teste' } : null;
}

/**
 * O campo "teste" de um ataque pode ter a fórmula ("3d20+5", "+5") ou o nome da perícia
 * ("Pontaria", "Luta +2"): nesse caso usa os dados daquela perícia na ficha.
 */
export function formulaDoTeste(teste, dados) {
  const texto = String(teste ?? '').trim();
  if (!texto) return null;
  if (lerFormula(texto)) return texto;
  if (!dados) return null;
  const alvo = normalizar(texto);
  const pericia = PERICIAS.find((p) => alvo.startsWith(normalizar(p.nome)));
  if (!pericia) return null;
  const base = dadosDoTeste(dados, pericia.id);
  const extra = lerFormula(texto.slice(pericia.nome.length).trim())?.bonus ?? 0;
  if (!extra) return base;
  return `${base}${extra > 0 ? '+' : ''}${extra}`;
}

/** Ataque: rola o teste e oferece o dano (multiplicado no crítico) */
export function pedidoAtaque({ nome, teste, dano, especial, critico }, dados) {
  const formula = formulaDoTeste(teste, dados);
  if (!formula) return null;
  return {
    titulo: nome || 'Ataque',
    subtitulo: 'Teste de ataque',
    formula,
    tipo: 'teste',
    ataque: { dano: lerFormula(dano) ? dano : null, critico: lerCritico(critico ?? especial) },
  };
}

export function pedidoDano({ nome, dano }) {
  return lerFormula(dano) ? { titulo: nome || 'Ataque', subtitulo: 'Dano', formula: dano, tipo: 'dano' } : null;
}

/** "Atletismo 5d20+20, Furtividade 2d20+5" → [{ nome: 'Atletismo', formula: '5d20+20' }, …] */
export function lerListaDeTestes(texto) {
  return String(texto ?? '')
    .split(/[,;\n]/)
    .map((parte) => parte.trim())
    .flatMap((parte) => {
      const achado = parte.match(/^(.*?)\s*((?:\d*d\d+|[+\-−]\s*\d+).*)$/i);
      return achado && achado[1] ? [{ nome: achado[1], formula: achado[2] }] : [];
    });
}
