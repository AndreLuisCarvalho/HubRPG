// Retrato: reduz uma foto escolhida pelo usuário para um quadrado pequeno em JPEG (data URL).
// A foto vai junto com a ficha no banco, então precisa ser leve (~20–40 KB):
// corta o centro em quadrado e redimensiona para `lado` pixels.
export function reduzirImagem(arquivo, lado = 320, qualidade = 0.85) {
  return recortar(arquivo, lado, lado, qualidade);
}

// Banner da campanha: faixa larga (3:1) com 1200px de largura, ~100–200 KB.
// Cabe folgado no limite de 1 MB da API.
export function reduzirBanner(arquivo, largura = 1200, proporcao = 3, qualidade = 0.8) {
  return recortar(arquivo, largura, Math.round(largura / proporcao), qualidade);
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
