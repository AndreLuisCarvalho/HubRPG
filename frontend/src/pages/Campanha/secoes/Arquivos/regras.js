/*
 * Regras dos arquivos da campanha.
 * dados: { tipo, resumo, caso, liberado, senha, dica, destrancado, sessaoId, notaMestre, url, nomeArquivo }
 *  - liberado = false: oculto (os jogadores nem sabem que existe)
 *  - liberado com senha e ainda não destrancado: aparece trancado, pede a senha no terminal
 *  - destrancado (ou sem senha): fica aberto no armazém do caso
 */

export const TIPOS = {
  texto: { nome: 'Texto', icone: '¶' },
  imagem: { nome: 'Imagem', icone: '◩' },
  pdf: { nome: 'PDF', icone: '▤' },
  link: { nome: 'Link', icone: '↗' },
};

export const ARQUIVO_NOVO = {
  titulo: '',
  conteudo: '',
  dados: {
    tipo: 'texto', resumo: '', caso: '', liberado: false, senha: '', dica: '', destrancado: false,
    sessaoId: null, notaMestre: '', url: '', nomeArquivo: '',
  },
};

export const PDF_MAXIMO = 2 * 1024 * 1024;   // 2 MB (a requisição tem limite de 4 MB)

/** 'oculto' | 'trancado' | 'aberto' */
export function estadoDo(arquivo) {
  const { liberado, senha, destrancado } = arquivo.dados;
  if (!liberado) return 'oculto';
  return senha && !destrancado ? 'trancado' : 'aberto';
}

// "Hospital  São Lucas" = "hospital sao lucas": sem diferença de maiúscula, acento e espaços
const normalizar = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
export const senhaConfere = (digitada, senha) => normalizar(digitada) === normalizar(senha);

/** Agrupa por caso, na ordem em que cada caso apareceu. Sem caso vai por último. */
export function porCaso(arquivos) {
  const grupos = new Map();
  for (const a of arquivos) {
    const caso = a.dados.caso?.trim() || '';
    if (!grupos.has(caso)) grupos.set(caso, []);
    grupos.get(caso).push(a);
  }
  return [...grupos].sort(([a], [b]) => (a === '') - (b === ''));
}

/** PDF escolhido → data URL (sem reduzir: só confere o tamanho) */
export function lerPdf(arquivo) {
  return new Promise((resolver, rejeitar) => {
    if (arquivo.type !== 'application/pdf') return rejeitar(new Error('Escolha um arquivo PDF'));
    if (arquivo.size > PDF_MAXIMO) return rejeitar(new Error('PDF grande demais: o limite é 2 MB'));
    const leitor = new FileReader();
    leitor.onload = () => resolver(leitor.result);
    leitor.onerror = () => rejeitar(new Error('Não foi possível ler o PDF'));
    leitor.readAsDataURL(arquivo);
  });
}

/** Texto do documento em pedaços: [[assim]] vira tarja preta (censurado) */
export function trechosDoTexto(texto) {
  return String(texto ?? '').split(/(\[\[[^\]]*\]\])/g).map((t) => (
    t.startsWith('[[') && t.endsWith(']]') ? { tarja: t.slice(2, -2) } : { texto: t }
  ));
}
