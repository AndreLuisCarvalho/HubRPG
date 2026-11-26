// Retrato: reduz uma foto escolhida pelo usuário para um quadrado pequeno em JPEG (data URL).
// A foto vai junto com a ficha no banco, então precisa ser leve (~20–40 KB):
// corta o centro em quadrado e redimensiona para `lado` pixels.
export function reduzirImagem(arquivo, lado = 320, qualidade = 0.85) {
  return recortar(arquivo, lado, lado, qualidade);
}

// Documento (pista, recorte, foto): mantém a proporção, sem cortar; o lado maior fica com até `maior` px
export function reduzirDocumento(arquivo, maior = 1600, qualidade = 0.85) {
  return new Promise((resolver, rejeitar) => {
    if (!arquivo?.type?.startsWith('image/')) return rejeitar(new Error('Escolha um arquivo de imagem'));
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, maior / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * escala);
      canvas.height = Math.round(img.naturalHeight * escala);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolver(canvas.toDataURL('image/jpeg', qualidade));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rejeitar(new Error('Não foi possível abrir essa imagem'));
    };
    img.src = url;
  });
}

// Fundo da campanha no menu: GIF vai como está (para continuar animado), até 3 MB, porque a
// requisição tem limite de ~4,5 MB e o texto em base64 fica 1/3 maior; foto vira JPEG de até 1920px.
export const FUNDO_GIF_MAXIMO = 3 * 1024 * 1024;

export function prepararFundo(arquivo) {
  if (arquivo?.type !== 'image/gif') return reduzirDocumento(arquivo, 1920, 0.82);
  if (arquivo.size > FUNDO_GIF_MAXIMO) {
    return Promise.reject(new Error('GIF grande demais: o limite é 3 MB'));
  }
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(leitor.result);
    leitor.onerror = () => rejeitar(new Error('Não foi possível abrir esse GIF'));
    leitor.readAsDataURL(arquivo);
  });
}

// Corta o centro da imagem na proporção pedida e redimensiona para largura × altura
function recortar(arquivo, largura, altura, qualidade) {
  return new Promise((resolver, rejeitar) => {
    if (!arquivo?.type?.startsWith('image/')) {
      rejeitar(new Error('Escolha um arquivo de imagem'));
      return;
    }

    const url = URL.createObjectURL(arquivo);
    const img = new Image();

    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const escala = Math.min(w / largura, h / altura);   // maior recorte que cabe na foto
      const cw = largura * escala;
      const ch = altura * escala;
      const canvas = document.createElement('canvas');
      canvas.width = largura;
      canvas.height = altura;
      canvas.getContext('2d').drawImage(img, (w - cw) / 2, (h - ch) / 2, cw, ch, 0, 0, largura, altura);
      URL.revokeObjectURL(url);
      resolver(canvas.toDataURL('image/jpeg', qualidade));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      rejeitar(new Error('Não foi possível abrir essa imagem'));
    };

    img.src = url;
  });
}
