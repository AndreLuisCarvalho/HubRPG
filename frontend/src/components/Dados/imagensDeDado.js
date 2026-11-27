/*
 * Imagens próprias dos dados (fundo das faces). A peça do kit guarda só { imagem: id, ficha: id };
 * a imagem vem do servidor uma vez e fica guardada aqui (decodificada, pronta para o canvas).
 * Enquanto carrega, o dado sai com a cor; quando chega, quem usa useVersaoDasImagens() redesenha.
 */
import { useEffect, useState } from 'react';
import { api } from '../../services/api';

const cache = new Map();   // "ficha:id" → { img, pronto, falhou }
const ouvintes = new Set();

const avisar = () => ouvintes.forEach((f) => f());

function carregar(ficha, id) {
  const chave = `${ficha}:${id}`;
  const entrada = { img: null, pronto: false, falhou: false };
  entrada.promessa = api.imagemDado(ficha, id)
    .then(({ imagem }) => new Promise((resolver) => {
      const img = new Image();
      img.onload = () => { entrada.img = img; entrada.pronto = true; avisar(); resolver(); };
      img.onerror = () => { entrada.falhou = true; resolver(); };
      img.src = imagem;
    }))
    .catch(() => { entrada.falhou = true; });
  cache.set(chave, entrada);
  return entrada;
}

/**
 * Espera as imagens próprias do kit carregarem (até "limite" ms) antes de montar os dados da mesa:
 * assim o arremesso já sai com a foto (sem trocar no meio do giro).
 */
export function esperarImagens(estilo, limite = 700) {
  const pecas = Object.values(estilo?.kit ?? {}).filter((p) => p?.imagem && p.ficha);
  if (!pecas.length) return Promise.resolve();
  const promessas = pecas.map((p) => (cache.get(`${p.ficha}:${p.imagem}`) ?? carregar(p.ficha, p.imagem)).promessa);
  return Promise.race([Promise.all(promessas), new Promise((r) => setTimeout(r, limite))]);
}

/** A imagem pronta para desenhar, ou null (e começa a buscar, se ainda não buscou) */
export function imagemDoDado(ficha, id) {
  if (!ficha || !id) return null;
  const entrada = cache.get(`${ficha}:${id}`);
  if (!entrada) carregar(ficha, id);
  return entrada?.pronto ? entrada.img : null;
}

/** Guarda uma imagem recém-enviada (já em data URL) sem buscar de novo */
export function guardarImagemDoDado(ficha, id, dataUrl) {
  const entrada = { img: null, pronto: false, falhou: false };
  entrada.promessa = new Promise((resolver) => {
    const img = new Image();
    img.onload = () => { entrada.img = img; entrada.pronto = true; avisar(); resolver(); };
    img.onerror = () => { entrada.falhou = true; resolver(); };
    img.src = dataUrl;
  });
  cache.set(`${ficha}:${id}`, entrada);
}

/** Um número que muda quando alguma imagem termina de carregar (para redesenhar os dados) */
export function useVersaoDasImagens() {
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    const ouvir = () => setVersao((v) => v + 1);
    ouvintes.add(ouvir);
    return () => ouvintes.delete(ouvir);
  }, []);
  return versao;
}
