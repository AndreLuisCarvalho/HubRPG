// Reduz uma foto escolhida pelo usuário para um quadrado pequeno em JPEG (data URL).
// A foto vai junto com a ficha no banco, então precisa ser leve (~20–40 KB):
// corta o centro em quadrado e redimensiona para `lado` pixels.
export function reduzirImagem(arquivo, lado = 320, qualidade = 0.85) {
  return new Promise((resolver, rejeitar) => {
    if (!arquivo?.type?.startsWith('image/')) {
      rejeitar(new Error('Escolha um arquivo de imagem'));
      return;
    }

    const url = URL.createObjectURL(arquivo);
    const img = new Image();

    img.onload = () => {
      const menor = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = lado;
      canvas.height = lado;
      canvas.getContext('2d').drawImage(
        img,
        (img.naturalWidth - menor) / 2, (img.naturalHeight - menor) / 2, menor, menor,
        0, 0, lado, lado,
      );
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
