// Rituais de Ordem Paranormal (livro p. 122–143). Separado do modelo.js por tamanho; o modelo reexporta.
// Os textos são resumos escritos por nós (a mecânica — dados, alcance, DT — segue o livro).
//
// Cada ritual:
//   elementos   em geral um só; "Amaldiçoar Arma" deixa escolher ao aprender
//   circulo     1 a 4 (o custo em PE está em CUSTO_POR_CIRCULO, no modelo.js)
//   resumo      uma linha, para listas
//   execucao, alcance, alvo, duracao, resistencia (null = não tem)
//   tipoAlvo    'Alvo' (padrão), 'Área' ou 'Efeito' — só muda o rótulo
//   dano        dano da forma básica, quando tem (ex.: '3d6 de eletricidade')
//   efeito      o que acontece, com números e condições
//   discente / verdadeiro   { pe: custo extra, texto, requisito }
 
const forma = (pe, texto, requisito = null) => ({ pe, texto, requisito });
 
const r = (id, nome, elementos, circulo, resumo, d) => ({
  id,
  nome,
  elementos: [].concat(elementos),
  circulo,
  resumo,
  execucao: d.execucao,
  alcance: d.alcance,
  tipoAlvo: d.tipoAlvo ?? 'Alvo',
  alvo: d.alvo,
  duracao: d.duracao,
  resistencia: d.resistencia ?? null,
  dano: d.dano ?? null,
  efeito: d.efeito,
  discente: d.discente ? forma(...d.discente) : null,
  verdadeiro: d.verdadeiro ? forma(...d.verdadeiro) : null,
});
 
export const RITUAIS = [
  /* =================== 1º CÍRCULO =================== */
  r('amaldicoarArma', 'Amaldiçoar Arma', ['con', 'ene', 'mor', 'san'], 1, 'A arma causa dano extra do elemento escolhido.', {
    execucao: 'Padrão', alcance: 'Toque', alvo: '1 arma corpo a corpo ou pacote de munição', duracao: 'Cena',
    dano: '+1d6 do elemento',
    efeito: 'Ao aprender, escolha Conhecimento, Energia, Morte ou Sangue: o ritual passa a ser desse elemento. A arma (ou munição) causa +1d6 de dano do elemento.',
    discente: [2, 'Dano extra vira +2d6.', '2º círculo'],
    verdadeiro: [5, 'Dano extra vira +4d6.', '3º círculo e afinidade'],
  }),
  r('compreensaoParanormal', 'Compreensão Paranormal', 'con', 1, 'Entende qualquer idioma, falado ou escrito.', {
    execucao: 'Padrão', alcance: 'Toque', alvo: '1 ser ou objeto', duracao: 'Cena', resistencia: 'Vontade anula (involuntário)',
    efeito: 'Tocando um objeto com informação (livro, gravação…), entende as palavras de qualquer idioma humano (não sigilos paranormais). Tocando uma pessoa, conversa como se falassem a mesma língua. Em um ser não inteligente, percebe sentimentos básicos.',
    discente: [2, 'Alcance curto e alvos escolhidos; entende todos eles.', '2º círculo'],
    verdadeiro: [5, 'Pessoal: você fala, entende e escreve qualquer idioma humano.', '3º círculo'],
  }),
  r('enfeiticar', 'Enfeitiçar', 'con', 1, 'Deixa o alvo prestativo com você.', {
    execucao: 'Padrão', alcance: 'Curto', alvo: '1 pessoa', duracao: 'Cena', resistencia: 'Vontade anula',
    efeito: 'O alvo fica prestativo (não é controlado) e você recebe +10 em Diplomacia com ele. Alvo hostil ou em combate recebe +5 na resistência. Qualquer ação hostil sua ou dos aliados contra ele dissipa o efeito.',
    discente: [2, 'Em vez disso, você sugere uma ação aceitável e o alvo obedece (pode ter uma condição, ex.: "prenda o próximo de casaco verde").', '2º círculo'],
    verdadeiro: [5, 'Afeta todos os alvos dentro do alcance.', '3º círculo'],
  }),
  r('perturbacao', 'Perturbação', 'con', 1, 'Obriga o alvo a cumprir uma ordem.', {
    execucao: 'Padrão', alcance: 'Curto', alvo: '1 pessoa', duracao: '1 rodada', resistencia: 'Vontade anula',
    efeito: 'O alvo cumpre uma ordem no turno dele: Fuja (usa o turno para se afastar), Largue (solta o que segura até o próximo turno), Pare (fica pasmo), Sente-se (vai ao chão até o próximo turno) ou Venha (se aproxima de você).',
    discente: [2, 'Alvo vira 1 ser e ganha a ordem "Sofra": 3d8 de dano de Conhecimento e abalado por 1 rodada.'],
    verdadeiro: [5, 'Até 5 seres, ou a ordem "Ataque": o alvo agride outro alvo, à sua escolha, em alcance médio.', '3º círculo e afinidade'],
  }),
  r('ouvirOsSussurros', 'Ouvir os Sussurros', 'con', 1, 'Consulta vozes do Outro Lado em busca de respostas.', {
    execucao: 'Completa', alcance: 'Pessoal', alvo: 'você', duracao: 'Instantânea',
    efeito: 'Faça uma pergunta de sim/não sobre algo que vai fazer nesta cena. O mestre rola 1d6 em segredo: 2 a 6 traz a resposta ("sim", "não" ou "sim e não"); 1 falha e responde "não". Repetir a pergunta dá sempre o primeiro resultado.',
    discente: [2, 'Execução 1 minuto: pergunta sobre algo até 1 dia no futuro; a resposta pode ser uma frase, profecia ou enigma. No 1, não há resposta.', '2º círculo'],
    verdadeiro: [5, 'Execução 10 minutos, dura 5 rodadas: uma pergunta por rodada (sim, não ou "ninguém sabe").', '3º círculo'],
  }),
  r('tecerIlusao', 'Tecer Ilusão', 'con', 1, 'Cria uma ilusão de imagem ou de som.', {
    execucao: 'Padrão', alcance: 'Médio', tipoAlvo: 'Efeito', alvo: 'ilusão de até 4 cubos de 1,5m', duracao: 'Cena', resistencia: 'Vontade desacredita',
    efeito: 'Ilusão simples visual (pessoa, parede…) ou sonora (grito, uivo). Sem cheiro, textura, temperatura ou sons complexos. Pode ser atravessada sem dano. Some se você sair do alcance.',
    discente: [2, 'Até 8 cubos e sustentada: imagem e som juntos, sons complexos, odores e sensações. Atravessar exige teste de Vontade. Ação livre por rodada para mover ou alterar a ilusão.', '2º círculo'],
    verdadeiro: [5, 'Ilusão de perigo mortal: ao conjurar e no início de cada turno seu, quem interage faz Vontade; se falhar, sofre 6d6 de dano de Conhecimento. Passar 2 testes seguidos anula para ele.', '3º círculo'],
  }),
  r('terceiroOlho', 'Terceiro Olho', 'con', 1, 'Permite enxergar auras paranormais.', {
    execucao: 'Padrão', alcance: 'Pessoal', alvo: 'você', duracao: 'Cena',
    efeito: 'Vê auras paranormais em alcance longo, sabendo o elemento e a força: fraca (1º círculo, VD até 80), moderada (2º–3º círculo, VD 81–280) ou poderosa (4º círculo, VD 281+). Ação de movimento: descobre se um ser em alcance médio tem poderes paranormais ou conjura rituais, e de quais elementos.',
    discente: [2, 'Duração 1 dia.'],
    verdadeiro: [5, 'Também enxerga seres e objetos invisíveis, como formas translúcidas.'],
  }),
  r('amaldicoarTecnologia', 'Amaldiçoar Tecnologia', 'ene', 1, 'Dá uma modificação a um item.', {
    execucao: 'Padrão', alcance: 'Toque', alvo: '1 acessório ou arma de fogo', duracao: 'Cena',
    efeito: 'O item funciona acima da capacidade: recebe 1 modificação à sua escolha.',
    discente: [2, 'Duas modificações.', '2º círculo'],
    verdadeiro: [5, 'Três modificações.', '3º círculo e afinidade'],
  }),
  r('coincidenciaForcada', 'Coincidência Forçada', 'ene', 1, 'Dá bônus em testes de perícia.', {
    execucao: 'Padrão', alcance: 'Curto', alvo: '1 ser', duracao: 'Cena',
    efeito: 'O alvo recebe +2 em testes de perícias.',
    discente: [2, 'Alvos: aliados à sua escolha.', '2º círculo'],
    verdadeiro: [5, 'Aliados à sua escolha e bônus de +5.', '3º círculo e afinidade'],
  }),
  r('eletrocussao', 'Eletrocussão', 'ene', 1, 'Descarga elétrica atinge o alvo.', {
    execucao: 'Padrão', alcance: 'Curto', alvo: '1 ser ou objeto', duracao: 'Instantânea', resistencia: 'Fortitude parcial',
    dano: '3d6 de eletricidade',
    efeito: 'O alvo sofre 3d6 de eletricidade e fica vulnerável por 1 rodada. Se passar: metade do dano e sem a condição. Contra objetos eletrônicos: dano dobrado e ignora resistência.',
    discente: [2, 'Área em linha de 30m: 6d6 de Energia em todos os seres e objetos livres.', '2º círculo'],
    verdadeiro: [5, 'Alvos escolhidos: um relâmpago para cada, 8d6 de Energia em cada um.', '3º círculo'],
  }),
  r('embaralhar', 'Embaralhar', 'ene', 1, 'Cópias suas confundem os inimigos e dão Defesa.', {
    execucao: 'Padrão', alcance: 'Pessoal', alvo: 'você', duracao: 'Cena',
    efeito: '3 cópias ilusórias: +6 na Defesa. Cada ataque que erra você destrói uma cópia e o bônus cai 2. Só funciona se o atacante enxergar as cópias.',
    discente: [2, '5 cópias (+10 na Defesa).', '2º círculo'],
    verdadeiro: [5, '8 cópias (+16 na Defesa); cada cópia destruída deixa quem a destruiu ofuscado por 1 rodada.', '3º círculo'],
  }),
  r('luz', 'Luz', 'ene', 1, 'Faz um objeto brilhar como uma lâmpada.', {
    execucao: 'Padrão', alcance: 'Curto', alvo: '1 objeto', duracao: 'Cena', resistencia: 'Vontade anula (objeto de alguém involuntário)',
    efeito: 'O objeto ilumina 9m de raio com cores alternadas, sem calor. Guardá-lo (num bolso, por exemplo) interrompe a luz.',
    discente: [2, 'Alcance longo: 4 esferas de luz (6m de raio cada), movidas por ação livre 1×/rodada. Esfera no espaço de um ser o deixa ofuscado e visível (sem camuflagem).', '2º círculo'],
    verdadeiro: [5, 'Luz cálida como a do sol: aliados na área recebem +1 dado em Vontade e inimigos ficam ofuscados.', '3º círculo'],
  }),
  r('polarizacaoCaotica', 'Polarização Caótica', 'ene', 1, 'Atrai ou repele objetos de metal.', {
    execucao: 'Padrão', alcance: 'Curto', alvo: 'você', duracao: 'Sustentada', resistencia: 'Vontade anula',
    efeito: 'Escolha: Atrair (ação de movimento puxa um objeto metálico de espaço 2 ou menor para suas mãos ou pés) ou Repelir (resistência 5 a balístico, corte, impacto e perfuração).',
    discente: [2, 'Arremessa de uma vez até 10 objetos (10 espaços) a até 3m entre si: 1 (macio) a 1d6 (duro ou afiado) de impacto por espaço em quem estiver no caminho (Reflexos reduz à metade). Seres podem ser arremessados (Vontade evita) e sofrem 1d6 a cada 3m ao bater.'],
    verdadeiro: [5, 'Alcance médio: ação de movimento levita e move um ser ou objeto de espaço 10 ou menor por até 9m (Vontade anula).'],
  }),
  r('cicatrizacao', 'Cicatrização', 'mor', 1, 'Acelera a cura de um ferimento.', {
    execucao: 'Padrão', alcance: 'Toque', alvo: '1 ser', duracao: 'Instantânea',
    dano: 'cura 3d8+3 PV',
    efeito: 'O alvo recupera 3d8+3 PV, mas envelhece 1 ano.',
    discente: [2, 'Cura 5d8+5 PV.', '2º círculo'],
    verdadeiro: [9, 'Alcance curto, seres escolhidos, cura 7d8+7 PV.', '4º círculo e afinidade com Morte'],
  }),
  r('consumirManancial', 'Consumir Manancial', 'mor', 1, 'Rouba vida ao redor e vira PV temporário.', {
    execucao: 'Padrão', alcance: 'Pessoal', alvo: 'você', duracao: 'Instantânea',
    dano: '3d6 PV temporários',
    efeito: 'Suga o tempo de vida de plantas e insetos ao redor: recebe 3d6 PV temporários até o fim da cena.',
    discente: [2, '6d6 PV temporários.', '2º círculo'],
    verdadeiro: [5, 'Esfera de 6m centrada em você (Fortitude reduz à metade): 3d6 de dano de Morte em cada ser vivo; você recebe PV temporários iguais ao dano total causado.', '3º círculo e afinidade'],
  }),
  r('decadencia', 'Decadência', 'mor', 1, 'Espirais de trevas definham o alvo.', {
    execucao: 'Padrão', alcance: 'Toque', alvo: '1 ser', duracao: 'Instantânea', resistencia: 'Fortitude reduz à metade',
    dano: '2d8+2 de Morte',
    efeito: 'O alvo sofre 2d8+2 de dano de Morte.',
    discente: [2, 'Sem resistência e 3d8+3. As espirais vão para uma arma: faça um ataque corpo a corpo; se acertar, soma o dano da arma e do ritual.'],
    verdadeiro: [5, 'Pessoal, explosão de 6m de raio: 8d8+8 em todos os seres na área.', '3º círculo'],
  }),
  r('definhar', 'Definhar', 'mor', 1, 'Deixa o alvo fatigado ou vulnerável.', {
    execucao: 'Padrão', alcance: 'Curto', alvo: '1 ser', duracao: 'Cena', resistencia: 'Fortitude parcial',
    efeito: 'O alvo fica fatigado. Se passar na resistência, fica vulnerável.',
    discente: [2, 'Fica exausto; se passar, fatigado.', '2º círculo'],
    verdadeiro: [5, 'Como discente, em até 5 seres.', '3º círculo e afinidade com Morte'],
  }),
  r('espiraisDaPerdicao', 'Espirais da Perdição', 'mor', 1, 'Inimigo perde dados nos ataques.', {
    execucao: 'Padrão', alcance: 'Curto', alvo: '1 ser', duracao: 'Cena',
    efeito: 'O alvo sofre −1 dado em testes de ataque.',
    discente: [2, 'Penalidade de −2 dados.', '2º círculo'],
    verdadeiro: [8, 'Penalidade de −2 dados em seres escolhidos.', '3º círculo'],
  }),
  r('nuvemDeCinzas', 'Nuvem de Cinzas', 'mor', 1, 'Nuvem de fuligem que dá camuflagem.', {
    execucao: 'Padrão', alcance: 'Curto', tipoAlvo: 'Efeito', alvo: 'nuvem de 6m de raio e 6m de altura', duracao: 'Cena',
    efeito: 'Seres a 1,5m têm camuflagem; a partir de 3m, camuflagem total. Vento forte dispersa em 4 rodadas; vendaval, em 1. Não funciona debaixo d’água.',
    discente: [2, 'Seres escolhidos ao conjurar enxergam através da nuvem.', '2º círculo'],
    verdadeiro: [5, 'Nuvem quase sólida: dentro dela o deslocamento cai para 3m e há −2 em testes de ataque.', '3º círculo'],
  }),
  r('armaAtroz', 'Arma Atroz', 'san', 1, 'Arma corpo a corpo ganha ataque e margem de ameaça.', {
    execucao: 'Padrão', alcance: 'Toque', alvo: '1 arma corpo a corpo', duracao: 'Sustentada',
    efeito: 'A arma fornece +2 em testes de ataque e +1 na margem de ameaça.',
    discente: [2, '+5 em testes de ataque.', '2º círculo'],
    verdadeiro: [5, '+5 em ataque, +2 na margem de ameaça e +1 no multiplicador de crítico.', '3º círculo e afinidade'],
  }),
  r('armaduraDeSangue', 'Armadura de Sangue', 'san', 1, 'Placas de sangue endurecido cobrem o corpo.', {
    execucao: 'Padrão', alcance: 'Pessoal', alvo: 'você', duracao: 'Cena',
    efeito: '+5 na Defesa (acumula com outros rituais, mas não com equipamento).',
    discente: [5, '+10 na Defesa e resistência 5 a balístico, corte, impacto e perfuração.', '3º círculo'],
    verdadeiro: [9, '+15 na Defesa e resistência 10 a balístico, corte, impacto e perfuração.', '4º círculo e afinidade'],
  }),
  r('corpoAdaptado', 'Corpo Adaptado', 'san', 1, 'Ignora frio e calor e respira debaixo d’água.', {
    execucao: 'Padrão', alcance: 'Toque', alvo: '1 pessoa ou animal', duracao: 'Cena',
    efeito: 'Imune a calor e frio extremos, respira na água (ou no ar, se for aquático) e não sufoca em fumaça densa.',
    discente: [2, 'Duração 1 dia.'],
    verdadeiro: [5, 'Alcance curto, pessoas ou animais escolhidos.'],
  }),
  r('distorcerAparencia', 'Distorcer Aparência', 'san', 1, 'Altera sua aparência por completo.', {
    execucao: 'Padrão', alcance: 'Pessoal', alvo: 'você', duracao: 'Cena', resistencia: 'Vontade desacredita',
    efeito: 'Você parece outra pessoa (altura, pele, voz, digital…) e recebe +10 em Enganação para disfarce. Não ganha habilidades nem estatísticas da nova forma.',
    discente: [2, 'Alcance curto, 1 ser (involuntário: Vontade anula).'],
    verdadeiro: [5, 'Como discente, em seres escolhidos.', '3º círculo'],
  }),
  r('fortalecimentoSensorial', 'Fortalecimento Sensorial', 'san', 1, 'Aguça os sentidos e a percepção.', {
    execucao: 'Padrão', alcance: 'Pessoal', alvo: 'você', duracao: 'Cena',
    efeito: '+1 dado em Investigação, Luta, Percepção e Pontaria.',
    discente: [2, 'Além disso, inimigos sofrem −1 dado em ataques contra você.', '2º círculo'],
    verdadeiro: [5, 'Além disso, imune a surpreendido e desprevenido e +10 em Defesa e Reflexos.', '4º círculo e afinidade'],
  }),
  r('odioIncontrolavel', 'Ódio Incontrolável', 'san', 1, 'Frenesi: mais ataque, dano e resistência.', {
    execucao: 'Padrão', alcance: 'Toque', alvo: '1 pessoa', duracao: 'Cena',
    efeito: '+2 em ataque e dano corpo a corpo e resistência 5 a balístico, corte, impacto e perfuração. Não pode fazer ações de calma (Furtividade, conjurar rituais) e precisa atacar toda rodada, mesmo um aliado.',
    discente: [2, 'Ao usar a ação agredir, faz um ataque corpo a corpo adicional no mesmo alvo.'],
    verdadeiro: [5, 'Bônus de +5 e sofre só metade do dano balístico, de corte, impacto e perfuração.', '3º círculo e afinidade'],
  }),
  r('cineraria', 'Cinerária', 'med', 1, 'Névoa que fortalece rituais conjurados nela.', {
    execucao: 'Padrão', alcance: 'Curto', tipoAlvo: 'Área', alvo: 'nuvem de 6m de raio', duracao: 'Cena',
    efeito: 'Rituais conjurados dentro da névoa têm a DT aumentada em +5.',
    discente: [2, 'Além disso, rituais conjurados nela custam −2 PE.'],
    verdadeiro: [5, 'Além disso, rituais conjurados nela causam dano maximizado.'],
  }),
 
  /* =================== 2º CÍRCULO =================== */
  r('aprimorarMente', 'Aprimorar Mente', 'con', 2, 'Bônus em Intelecto ou Presença.', {
    execucao: 'Padrão', alcance: 'Toque', alvo: '1 ser', duracao: 'Cena',
    efeito: '+1 em Intelecto ou Presença, à escolha do alvo (não dá PE nem perícias treinadas).',
    discente: [3, 'Bônus de +2.', '3º círculo'],
    verdadeiro: [7, 'Bônus de +3.', '4º círculo e afinidade'],
  }),
  r('deteccaoDeAmeacas', 'Detecção de Ameaças', 'con', 2, 'Sente inimigos e armadilhas por perto.', {
    execucao: 'Padrão', alcance: 'Pessoal', tipoAlvo: 'Área', alvo: 'esfera de 18m de raio', duracao: 'Cena',
    efeito: 'Quando um ser hostil ou armadilha entra na área, você sente o perigo e pode gastar uma ação de movimento num teste de Percepção (DT 20) para saber direção e distância.',
    discente: [3, 'Além disso, não fica desprevenido contra perigos detectados e recebe +5 em resistência contra armadilhas.', '3º círculo'],
    verdadeiro: [5, 'Duração 1 dia, com os benefícios do discente.', '4º círculo'],
  }),
  r('esconderDosOlhos', 'Esconder dos Olhos', 'con', 2, 'Fica invisível por um instante.', {
    execucao: 'Livre', alcance: 'Pessoal', alvo: 'você', duracao: '1 rodada',
    efeito: 'Invisível com o equipamento: camuflagem total e +15 em Furtividade; quem não o vê fica desprevenido contra seus ataques. Termina se você atacar ou usar habilidade hostil.',
    discente: [3, 'Sustentada: esfera de invisibilidade em você e aliados a até 3m (quem fizer ação hostil aparece).', '3º círculo'],
    verdadeiro: [7, 'Execução padrão, toque, 1 ser, sustentada; não é dissipado por ataques nem ações hostis.', '4º círculo e afinidade'],
  }),
  r('invadirMente', 'Invadir Mente', 'con', 2, 'Rajada mental ou ligação telepática.', {
    execucao: 'Padrão', alcance: 'Médio ou toque', alvo: '1 ser ou 2 pessoas voluntárias', duracao: 'Instantânea ou 1 dia', resistencia: 'Vontade parcial ou nenhuma',
    dano: '6d6 de Conhecimento (rajada)',
    efeito: 'Escolha: Rajada Mental (médio, 1 ser): 6d6 de Conhecimento e atordoado 1 rodada; se passar, metade e sem atordoar (1×/cena por alvo). Ligação Telepática (toque, 2 pessoas, 1 dia): elas se comunicam a qualquer distância.',
    discente: [3, 'Rajada: 10d6. Ligação: ação de movimento para ver e ouvir pelos sentidos do alvo (involuntário pode suprimir por 1 hora com Vontade).', '3º círculo'],
    verdadeiro: [7, 'Rajada: 10d6 em seres escolhidos. Ligação: até 5 pessoas.', '4º círculo'],
  }),
  r('localizacao', 'Localização', 'con', 2, 'Indica a direção de um objeto ou ser.', {
    execucao: 'Padrão', alcance: 'Pessoal', tipoAlvo: 'Área', alvo: 'círculo de 90m de raio', duracao: 'Cena',
    efeito: 'Indica direção e distância da pessoa ou objeto mais próximo do tipo pensado ("um policial", "uma pistola"). Algo muito específico exige uma imagem precisa; se errada, falha e gasta os PE. Chumbo bloqueia.',
    discente: [3, 'Toque, 1 pessoa, 1 hora: ela sabe o caminho mais direto para entrar ou sair de um lugar.'],
    verdadeiro: [7, 'Área de 1 km de raio.', '4º círculo'],
  }),
  r('chamasDoCaos', 'Chamas do Caos', 'ene', 2, 'Controla o calor e o fogo.', {
    execucao: 'Padrão', alcance: 'Curto', alvo: 'veja o efeito', duracao: 'Cena',
    dano: '1d6 a 3d6 de fogo',
    efeito: 'Escolha: Chamejar (arma corpo a corpo causa +1d6 de fogo); Esquentar (objeto causa 1d6 de fogo por rodada a quem o segura; ação completa para resfriar); Extinguir (apaga chama até Grande e cria fumaça de 3m que dá camuflagem); Modelar (move chama até Grande 9m por ação livre; 3d6 de fogo em quem ela atravessar, 1×/rodada).',
    discente: [3, 'Sustentada: 1×/rodada, ação de movimento lança labareda em alcance curto, 4d6 de Energia (Reflexos reduz à metade).'],
    verdadeiro: [7, 'Como discente, com 8d6.', '3º círculo'],
  }),
  r('contencaoFantasmagorica', 'Contenção Fantasmagórica', 'ene', 2, 'Laços de energia prendem o alvo.', {
    execucao: 'Padrão', alcance: 'Médio', alvo: '1 ser', duracao: 'Cena', resistencia: 'Reflexos anula',
    efeito: '3 laços deixam o alvo agarrado. Ação padrão + Atletismo (DT do ritual) destrói 1 laço, e mais 1 a cada 5 acima da DT. Laços: Defesa 10, 10 PV, RD 5, imunes a Energia; afetam incorpóreos. Todos destruídos = fim.',
    discente: [3, '6 laços divididos entre alvos (mínimo 2 por alvo).', '3º círculo'],
    verdadeiro: [5, 'Como discente, e cada laço destruído causa 2d6+2 de Energia no alvo agarrado.', '3º círculo e afinidade'],
  }),
  r('dissonanciaAcustica', 'Dissonância Acústica', 'ene', 2, 'Área onde ninguém ouve nem conjura.', {
    execucao: 'Padrão', alcance: 'Médio', tipoAlvo: 'Área', alvo: 'esfera de 6m de raio', duracao: 'Sustentada',
    efeito: 'Seres na área ficam surdos e não podem conjurar rituais.',
    discente: [1, 'Alvo: 1 objeto, que emana silêncio em 3m de raio (de ser involuntário: Vontade anula).'],
    verdadeiro: [3, 'Duração cena: nenhum som sai da área, mas dentro dela todos falam, ouvem e conjuram.', '3º círculo'],
  }),
  r('soproDoCaos', 'Sopro do Caos', 'ene', 2, 'Move o ar de formas impossíveis.', {
    execucao: 'Padrão', alcance: 'Médio', tipoAlvo: 'Área', alvo: 'varia', duracao: 'Sustentada', resistencia: 'veja o efeito',
    efeito: 'Escolha: Ascender (ser ou objeto Médio sobe ou desce 6m por ação de movimento, até 30m; fica vulnerável; involuntário faz Fortitude a cada turno); Sopro (cone de 4,5m: manobra empurrar com Ocultismo; ação padrão para manter); Vento (vento forte na área; ação de movimento para manter).',
    discente: [3, 'Afeta alvos Grandes.'],
    verdadeiro: [9, 'Afeta alvos Enormes.'],
  }),
  r('telaDeRuido', 'Tela de Ruído', 'ene', 2, 'Película que absorve dano físico.', {
    execucao: 'Padrão', alcance: 'Pessoal', alvo: 'você', duracao: 'Cena',
    efeito: '30 PV temporários só contra dano balístico, de corte, impacto e perfuração. Ou, como reação ao sofrer dano, resistência 15 contra esse dano.',
    discente: [3, '60 PV temporários ou resistência 30.'],
    verdadeiro: [7, 'Alcance curto, 1 ser ou objeto até Enorme: esfera imóvel que nada atravessa (Reflexos evita ser preso).', '4º círculo'],
  }),
  r('desacelerarImpacto', 'Desacelerar Impacto', 'mor', 2, 'Reduz dano de queda e de projéteis.', {
    execucao: 'Reação', alcance: 'Curto', alvo: '1 ser ou objetos até 10 espaços', duracao: 'Até chegar ao solo ou cena',
    efeito: 'O alvo cai a 18m por rodada, sem dano de queda. Projéteis afetados causam metade do dano. Só funciona em queda livre.',
    discente: [3, 'Seres ou objetos somando até 100 espaços.'],
  }),
  r('ecoEspiral', 'Eco Espiral', 'mor', 2, 'Devolve ao alvo o dano que ele sofreu.', {
    execucao: 'Padrão', alcance: 'Curto', alvo: '1 ser', duracao: '2 rodadas', resistencia: 'Fortitude reduz à metade',
    efeito: 'No próximo turno, ação padrão para se concentrar no alvo; no seguinte, ação padrão para descarregar: ele sofre dano de Morte igual ao que sofreu na rodada concentrada. Sem as ações, nada acontece.',
    discente: [3, 'Até 5 seres.'],
    verdadeiro: [7, 'Até 3 rodadas: concentra nas 2 primeiras e descarrega na 3ª.', '4º círculo e afinidade'],
  }),
  r('paradoxo', 'Paradoxo', 'mor', 2, 'Implosão temporal na área.', {
    execucao: 'Padrão', alcance: 'Médio', tipoAlvo: 'Área', alvo: 'esfera de 6m de raio', duracao: 'Instantânea', resistencia: 'Fortitude reduz à metade',
    dano: '6d6 de Morte',
    efeito: '6d6 de dano de Morte em todos os seres na área.',
    discente: [3, 'Esfera Média por uma cena: 4d6 de Morte em quem estiver no espaço dela (1×/rodada); ação de movimento a move 9m.'],
    verdadeiro: [7, '13d6. Quem chegar a 0 PV por ele faz Fortitude; se falhar, vira cinzas.', '4º círculo'],
  }),
  r('miasmaEntropico', 'Miasma Entrópico', 'mor', 2, 'Nuvem tóxica que enjoa e fere.', {
    execucao: 'Padrão', alcance: 'Médio', tipoAlvo: 'Área', alvo: 'nuvem de 6m de raio', duracao: 'Instantânea', resistencia: 'Fortitude parcial',
    dano: '4d8 químico',
    efeito: '4d8 de dano químico e enjoado por 1 rodada. Se passar: metade e sem enjoar.',
    discente: [3, 'Dano vira 6d8 de Morte.'],
    verdadeiro: [7, 'Dura 3 rodadas: quem começar o turno na área sofre de novo.', '3º círculo'],
  }),
  r('velocidadeMortal', 'Velocidade Mortal', 'mor', 2, 'Acelera o alvo no tempo.', {
    execucao: 'Padrão', alcance: 'Curto', alvo: '1 ser', duracao: 'Sustentada',
    efeito: 'O alvo ganha uma ação de movimento extra por turno (não serve para conjurar rituais).',
    discente: [3, 'Uma ação padrão extra por turno, em vez da de movimento.'],
    verdadeiro: [7, 'Alvos escolhidos.', '4º círculo e afinidade'],
  }),
  r('aprimorarFisico', 'Aprimorar Físico', 'san', 2, 'Bônus em Agilidade ou Força.', {
    execucao: 'Padrão', alcance: 'Toque', alvo: '1 ser', duracao: 'Cena',
    efeito: '+1 em Agilidade ou Força, à escolha do alvo.',
    discente: [3, 'Bônus de +2.', '3º círculo'],
    verdadeiro: [7, 'Bônus de +3.', '4º círculo e afinidade'],
  }),
  r('descarnar', 'Descarnar', 'san', 2, 'Cortes profundos e hemorragia.', {
    execucao: 'Padrão', alcance: 'Toque', alvo: '1 ser', duracao: 'Instantânea', resistencia: 'Fortitude parcial',
    dano: '6d8 (corte + Sangue)',
    efeito: '6d8 de dano (metade corte, metade Sangue) e hemorragia: no início de cada turno, Fortitude ou sofre 2d8 de Sangue; passar 2 seguidos estanca. Se passar no teste inicial: metade do dano e sem hemorragia.',
    discente: [3, '10d8 de dano e hemorragia de 4d8.', '3º círculo'],
    verdadeiro: [7, 'Em você, sustentada: seus ataques corpo a corpo causam +4d8 de Sangue e hemorragia automática.', '3º círculo e afinidade'],
  }),
  r('flageloDeSangue', 'Flagelo de Sangue', 'san', 2, 'Marca que pune quem desobedece uma ordem.', {
    execucao: 'Padrão', alcance: 'Toque', alvo: '1 pessoa', duracao: 'Cena', resistencia: 'Fortitude parcial',
    dano: '10d6 de Sangue por desobediência',
    efeito: 'Grava uma ordem ("não ataque a mim", "siga-me"). Cada rodada que desobedecer: 10d6 de Sangue e enjoado (Fortitude reduz à metade e evita a condição). Passar 2 turnos seguidos apaga a marca.',
    discente: [3, 'Alvo: 1 ser (exceto criaturas de Sangue).', '3º círculo'],
    verdadeiro: [7, 'Como discente, com duração de 1 dia.', '4º círculo e afinidade'],
  }),
  r('hemofagia', 'Hemofagia', 'san', 2, 'Drena o sangue do alvo e cura você.', {
    execucao: 'Padrão', alcance: 'Toque', alvo: '1 ser', duracao: 'Instantânea', resistencia: 'Fortitude reduz à metade',
    dano: '6d6 de Sangue',
    efeito: '6d6 de dano de Sangue; você recupera PV iguais à metade do dano causado.',
    discente: [3, 'Sem resistência: faça um ataque corpo a corpo; se acertar, causa o dano do ataque + ritual e recupera metade do total.'],
    verdadeiro: [7, 'Em você, por uma cena: 1×/rodada, ação padrão para tocar 1 ser e causar 4d6 de Sangue, recuperando metade.', '4º círculo'],
  }),
  r('transfusaoVital', 'Transfusão Vital', 'san', 2, 'Passa sua vida para curar outro.', {
    execucao: 'Padrão', alcance: 'Toque', alvo: '1 ser', duracao: 'Instantânea',
    efeito: 'Você sofre até 30 de dano de Sangue e o alvo recupera a mesma quantidade em PV. Não pode ficar abaixo de 1 PV por isso.',
    discente: [3, 'Até 50 pontos.', '3º círculo'],
    verdadeiro: [7, 'Até 100 pontos.', '4º círculo'],
  }),
  r('protecaoContraRituais', 'Proteção contra Rituais', 'med', 2, 'Proteção contra efeitos paranormais.', {
    execucao: 'Padrão', alcance: 'Toque', alvo: '1 ser', duracao: 'Cena',
    efeito: 'Resistência a dano paranormal 5 e +5 em testes de resistência contra rituais e habilidades de criaturas paranormais.',
    discente: [3, 'Até 5 seres tocados.', '3º círculo'],
    verdadeiro: [6, 'Até 5 seres tocados, resistência 10 e +10.', '4º círculo'],
  }),
  r('rejeitarNevoa', 'Rejeitar Névoa', 'med', 2, 'Névoa que atrapalha rituais na área.', {
    execucao: 'Padrão', alcance: 'Curto', tipoAlvo: 'Área', alvo: 'nuvem de 6m de raio', duracao: 'Cena',
    efeito: 'Rituais conjurados na área custam +2 PE por círculo e a execução sobe um passo (livre → movimento → padrão → completa → 2 rodadas). Anula Cinerária, salvo se o conjurador dela gastar uma ação completa por rodada.',
    discente: [2, 'Além disso, a DT de resistência contra rituais na área cai 5.'],
    verdadeiro: [5, 'Como discente, e o dano de rituais na névoa é sempre o mínimo.'],
  }),
 
  /* =================== 3º CÍRCULO =================== */
  r('alterarMemoria', 'Alterar Memória', 'con', 3, 'Apaga ou muda memórias recentes.', {
    execucao: 'Padrão', alcance: 'Toque', alvo: '1 pessoa', duracao: 'Instantânea', resistencia: 'Vontade anula',
    efeito: 'Apaga ou altera detalhes de memórias de até 1 hora atrás (sem reescrever eventos inteiros). O alvo recupera as memórias em 1d4 dias.',
    verdadeiro: [4, 'Memórias de até 24 horas atrás.', '4º círculo'],
  }),
  r('contatoParanormal', 'Contato Paranormal', 'con', 3, 'Barganha ajuda com o Outro Lado.', {
    execucao: 'Completa', alcance: 'Pessoal', alvo: 'você', duracao: '1 dia',
    efeito: 'Recebe 6d6 de auxílio: em um teste de perícia, gaste um dado, role e some. Cada 6 rolado custa 2 de Sanidade. Acaba sem dados ou com SAN 0.',
    discente: [4, 'Dados de auxílio viram d8; cada 8 custa 3 SAN.', '4º círculo'],
    verdadeiro: [9, 'Dados de auxílio viram d12; cada 12 custa 5 SAN.', '4º círculo e afinidade'],
  }),
  r('mergulhoMental', 'Mergulho Mental', 'con', 3, 'Vasculha os pensamentos do alvo.', {
    execucao: 'Padrão', alcance: 'Toque', alvo: '1 pessoa', duracao: 'Sustentada', resistencia: 'Vontade parcial',
    efeito: 'Você fica desprevenido. No início de cada turno sustentando e tocando, o alvo faz Vontade: se falhar, responde uma pergunta de sim/não sem poder mentir.',
    verdadeiro: [4, 'Execução 1 dia e alcance ilimitado, com cuba de ouro com água e máscara (categoria II) e algo do alvo (nome completo, foto, objeto).', '4º círculo'],
  }),
  r('videncia', 'Vidência', 'con', 3, 'Vê e ouve um alvo à distância.', {
    execucao: 'Completa', alcance: 'Ilimitado', alvo: '1 ser', duracao: '5 rodadas', resistencia: 'Vontade anula',
    efeito: 'Por uma superfície reflexiva, vê e ouve o alvo e 6m ao redor. Ele testa no início de cada turno seu; passar 2 seguidos encerra e o deixa imune por 1 semana. Bônus do alvo: sabe o mínimo +10, algumas informações +5, conhece bem 0, pertence pessoal −5, parte do corpo −10.',
  }),
  r('convocacaoInstantanea', 'Convocação Instantânea', 'ene', 3, 'Traz para sua mão um objeto marcado.', {
    execucao: 'Padrão', alcance: 'Ilimitado', alvo: '1 objeto de até 2 espaços', duracao: 'Instantânea', resistencia: 'Vontade anula',
    efeito: 'Invoca um objeto previamente marcado com o símbolo do ritual. Se alguém o empunha, Vontade nega (mas você sabe onde está e com quem). Até 1 hora depois, ação de movimento o devolve.',
    discente: [4, 'Objeto de até 10 espaços.'],
    verdadeiro: [9, 'Recipiente Médio com até 10 espaços, escondido no Outro Lado para sempre; ação padrão o traz ou devolve. Exige miniatura (utensílio categoria II) e custa 1 PE permanente.'],
  }),
  r('saltoFantasma', 'Salto Fantasma', 'ene', 3, 'Teleporta você para um ponto conhecido.', {
    execucao: 'Padrão', alcance: 'Médio', alvo: 'você', duracao: 'Instantânea',
    efeito: 'Vira energia e reaparece num ponto que já viu de alguma forma (até por foto), sem precisar de linha de efeito. Não age mais naquele turno.',
    discente: [2, 'Reação: salta 1,5m e recebe +10 em Defesa e Reflexos contra um ataque ou efeito.'],
    verdadeiro: [4, 'Alcance longo, você e até 2 seres voluntários que esteja tocando.'],
  }),
  r('transfigurarAgua', 'Transfigurar Água', 'ene', 3, 'Água e gelo agem de forma caótica.', {
    execucao: 'Padrão', alcance: 'Longo', tipoAlvo: 'Área', alvo: 'esfera de 30m de raio', duracao: 'Cena', resistencia: 'veja o efeito',
    dano: '5d8 de Energia (evaporar)',
    efeito: 'Escolha: Congelar (quem nada fica imóvel; Atletismo DT do ritual para escapar); Derreter; Enchente (+4,5m de nível, ou embarcação com +6m de deslocamento); Evaporar (5d8 de Energia em seres vivos, Fortitude reduz à metade; criaturas de Morte sofrem o dobro); Partir (baixa 4,5m: caminho seco ou redemoinho).',
    verdadeiro: [5, 'Enchente dá +12m e evaporar causa 10d8.'],
  }),
  r('transfigurarTerra', 'Transfigurar Terra', 'ene', 3, 'Rocha, lama e areia agem de forma caótica.', {
    execucao: 'Padrão', alcance: 'Longo', tipoAlvo: 'Área', alvo: '9 cubos de 1,5m', duracao: 'Instantânea', resistencia: 'veja o efeito',
    dano: '10d6 de impacto (desabamento)',
    efeito: 'Escolha: Amolecer (teto ou suporte desaba: 10d6 de impacto, Reflexos reduz à metade; piso vira terreno difícil); Modelar (objetos simples até Enorme, ou paredes com cobertura total, RD 8 e 50 PV a cada 3m); Solidificar (lama vira pedra; quem pisa fica agarrado, ação padrão + Atletismo para soltar).',
    discente: [3, '15 cubos.'],
    verdadeiro: [7, 'Afeta também minerais e metais.', '4º círculo'],
  }),
  r('ancoraTemporal', 'Âncora Temporal', 'mor', 3, 'Impede o alvo de se afastar.', {
    execucao: 'Padrão', alcance: 'Curto', alvo: '1 ser', duracao: 'Cena', resistencia: 'Vontade parcial',
    efeito: 'No início de cada turno, o alvo faz Vontade: se falhar, não pode se deslocar naquele turno (ainda age). Passar 2 turnos seguidos encerra.',
    verdadeiro: [4, 'Seres à sua escolha.', '4º círculo'],
  }),
  r('poeiraDaPodridao', 'Poeira da Podridão', 'mor', 3, 'Poeira que apodrece tudo o que toca.', {
    execucao: 'Padrão', alcance: 'Médio', tipoAlvo: 'Área', alvo: 'nuvem de 6m de raio', duracao: 'Sustentada', resistencia: 'Fortitude reduz à metade',
    dano: '4d8 de Morte por turno',
    efeito: 'Ao conjurar e no início de cada turno seu: 4d8 de Morte em seres e objetos na área. Quem falhar não recupera PV de forma alguma por 1 rodada.',
    verdadeiro: [4, 'Dano vira 4d8+16.'],
  }),
  r('tentaculosDeLodo', 'Tentáculos de Lodo', 'mor', 3, 'Tentáculos agarram e esmagam na área.', {
    execucao: 'Padrão', alcance: 'Médio', tipoAlvo: 'Área', alvo: 'círculo de 6m de raio', duracao: 'Cena',
    dano: '4d6 (impacto + Morte)',
    efeito: 'Ao conjurar e no início de cada turno seu, faça a manobra agarrar (com Ocultismo) contra cada alvo na área; quem já estava agarrado é esmagado: 4d6 (metade impacto, metade Morte). A área é terreno difícil; tentáculos são imunes a dano.',
    verdadeiro: [5, 'Raio de 9m e dano de 6d6.'],
  }),
  r('zerarEntropia', 'Zerar Entropia', 'mor', 3, 'Deixa o alvo paralisado ou lento.', {
    execucao: 'Padrão', alcance: 'Curto', alvo: '1 pessoa', duracao: 'Cena', resistencia: 'Vontade parcial',
    efeito: 'O alvo fica paralisado; se passar, lento. No início de cada turno, pode gastar uma ação completa para testar Vontade de novo e encerrar.',
    discente: [4, 'Alvo: 1 ser.', '4º círculo'],
    verdadeiro: [11, 'Seres escolhidos.', '4º círculo e afinidade'],
  }),
  r('ferverSangue', 'Ferver Sangue', 'san', 3, 'Ferve o sangue do alvo.', {
    execucao: 'Padrão', alcance: 'Curto', alvo: '1 ser', duracao: 'Sustentada', resistencia: 'Fortitude parcial',
    dano: '4d8 de Sangue por turno',
    efeito: 'Ao conjurar e no início de cada turno do alvo: Fortitude; se falhar, 4d8 de Sangue e fraco; se passar, metade e sem fraqueza. Passar 2 turnos seguidos encerra.',
    verdadeiro: [4, 'Seres escolhidos.', '4º círculo e afinidade'],
  }),
  r('formaMonstruosa', 'Forma Monstruosa', 'san', 3, 'Você vira uma criatura de Sangue.', {
    execucao: 'Padrão', alcance: 'Pessoal', alvo: 'você', duracao: 'Cena',
    efeito: 'Tamanho Grande, +5 em ataque e dano corpo a corpo e 30 PV temporários; equipamento fica inacessível (bônus mantidos). Em fúria: não fala, não conjura e ataca o ser mais próximo toda rodada (se for aliado, Vontade DT do ritual para escolher outro).',
    discente: [3, 'Além disso, imune a atordoamento, fadiga, sangramento, sono e veneno.'],
    verdadeiro: [9, '+10 em ataque e dano e 50 PV temporários.', '4º círculo e afinidade'],
  }),
  r('purgatorio', 'Purgatório', 'san', 3, 'Poça de sangue que prende e enfraquece.', {
    execucao: 'Padrão', alcance: 'Curto', tipoAlvo: 'Área', alvo: '6m de raio', duracao: 'Sustentada', resistencia: 'Fortitude parcial',
    dano: '6d6 de Sangue ao tentar sair',
    efeito: 'Inimigos na área ficam vulneráveis a balístico, corte, impacto e perfuração. Quem tenta sair sofre 6d6 de Sangue e faz Fortitude: se falhar, não sai e perde a ação de movimento.',
  }),
  r('vomitarPestes', 'Vomitar Pestes', 'san', 3, 'Enxame de criaturas de Sangue.', {
    execucao: 'Padrão', alcance: 'Médio', tipoAlvo: 'Efeito', alvo: '1 enxame Grande (quadrado de 3m)', duracao: 'Sustentada', resistencia: 'Reflexos reduz à metade',
    dano: '5d12 de Sangue por turno',
    efeito: 'No fim de cada turno seu, o enxame causa 5d12 de Sangue a quem estiver no espaço dele. Ação de movimento o move 12m; ele atravessa seres.',
    discente: [2, 'Quem falhar no Reflexos fica agarrado (ação padrão + Acrobacia ou Atletismo para escapar).'],
    verdadeiro: [5, 'Enxame Enorme (6m) com voo de 18m.'],
  }),
  r('dissiparRitual', 'Dissipar Ritual', 'med', 3, 'Cancela rituais em um alvo ou área.', {
    execucao: 'Padrão', alcance: 'Médio', alvo: '1 ser ou objeto, ou esfera de 3m de raio', duracao: 'Instantânea',
    efeito: 'Faça um teste de Ocultismo: anula rituais ativos com DT igual ou menor ao resultado (instantâneos não). Em item amaldiçoado, ele vira mundano por 1 dia (portador: Vontade nega).',
  }),
 
  /* =================== 4º CÍRCULO =================== */
  r('controleMental', 'Controle Mental', 'con', 4, 'Domina a mente do alvo.', {
    execucao: 'Padrão', alcance: 'Médio', alvo: '1 pessoa ou animal', duracao: 'Sustentada', resistencia: 'Vontade parcial',
    efeito: 'O alvo obedece todos os comandos, exceto suicidas. Testa Vontade no fim de cada turno para se livrar; quem passa fica pasmo por 1 rodada (1×/cena).',
    discente: [5, 'Até 5 pessoas ou animais.'],
    verdadeiro: [10, 'Até 10 pessoas ou animais.', 'afinidade com Conhecimento'],
  }),
  r('inexistir', 'Inexistir', 'con', 4, 'Apaga o alvo da existência.', {
    execucao: 'Padrão', alcance: 'Toque', alvo: '1 ser', duracao: 'Instantânea', resistencia: 'Vontade parcial',
    dano: '10d12+10 de Conhecimento',
    efeito: '10d12+10 de Conhecimento. Se passar: 2d12 e debilitado por 1 rodada. Se os PV chegarem a 0, o alvo é apagado da existência.',
    discente: [5, '15d12+15 (passou: 3d12).'],
    verdadeiro: [10, '20d12+20 (passou: 4d12).', 'afinidade'],
  }),
  r('possessao', 'Possessão', 'con', 4, 'Você assume o corpo do alvo.', {
    execucao: 'Padrão', alcance: 'Longo', alvo: '1 pessoa viva ou morta', duracao: '1 dia', resistencia: 'Vontade anula',
    efeito: 'Controla o corpo do alvo (se vivo, a mente dele vai para o seu). Use sua ficha com Agilidade, Força, Vigor e deslocamento do alvo. Se passar, ele percebe e fica imune por 1 dia. Se um dos corpos morrer, a mente fica presa no outro. Voltar é ação livre.',
  }),
  r('alterarDestino', 'Alterar Destino', 'ene', 4, 'Muda o resultado de um teste.', {
    execucao: 'Reação', alcance: 'Pessoal', alvo: 'você', duracao: 'Instantânea',
    efeito: '+15 em um teste de resistência ou na Defesa contra um ataque.',
    verdadeiro: [5, 'Alcance curto e alvo: um aliado à sua escolha.'],
  }),
  r('deflagracaoDeEnergia', 'Deflagração de Energia', 'ene', 4, 'Explosão de energia bruta.', {
    execucao: 'Completa', alcance: 'Pessoal', tipoAlvo: 'Área', alvo: 'explosão de 15m de raio', duracao: 'Instantânea', resistencia: 'Fortitude parcial',
    dano: '3d10×10 de Energia',
    efeito: '3d10×10 de Energia em todos na área, e itens tecnológicos param de funcionar. Você não é afetado. Se passar: metade do dano e os itens voltam em 1d4 rodadas.',
    verdadeiro: [5, 'Afeta só alvos à sua escolha.'],
  }),
  r('teletransporte', 'Teletransporte', 'ene', 4, 'Leva o grupo a até 1.000 km.', {
    execucao: 'Padrão', alcance: 'Toque', alvo: 'até 5 seres voluntários', duracao: 'Instantânea',
    efeito: 'Teste de Ocultismo: DT 25 (lugar frequente), 30 (visitou uma vez) ou 35 (só por descrição). Falhou: lugar parecido ou distante (1d10×10 km). Falhou por 5 ou mais: não vai, gasta os PE e fica atordoado 1d4 rodadas.',
    verdadeiro: [5, 'Qualquer lugar na Terra.'],
  }),
  r('convocarOAlgoz', 'Convocar o Algoz', 'mor', 4, 'Um algoz cadavérico caça o alvo.', {
    execucao: 'Padrão', alcance: '1,5m', alvo: '1 pessoa', duracao: 'Sustentada', resistencia: 'Vontade e Fortitude parcial',
    dano: '6d6 de Morte (ou 0 PV)',
    efeito: 'O algoz voa 12m por turno até a vítima. Termina o turno em alcance curto: Vontade ou abalada. Termina adjacente: Fortitude; se falhar, 0 PV; se passar, 6d6 de Morte (não baixa de 1 PV). Incorpóreo e imune a dano; some se deixar a vítima morrendo ou for dissipado.',
  }),
  r('distorcaoTemporal', 'Distorção Temporal', 'mor', 4, 'Você age livremente por 3 rodadas.', {
    execucao: 'Padrão', alcance: 'Pessoal', alvo: 'veja o efeito', duracao: '3 rodadas',
    efeito: 'Bolsão temporal: você age, mas não se desloca nem interage com seres e objetos. Efeitos contínuos não o afetam e os seus não afetam ao redor; efeitos de área mais longos funcionam depois.',
  }),
  r('fimInevitavel', 'Fim Inevitável', 'mor', 4, 'Abre um vácuo que suga tudo ao redor.', {
    execucao: 'Completa', alcance: 'Extremo', tipoAlvo: 'Efeito', alvo: 'buraco negro de 1,5m de diâmetro', duracao: '4 rodadas', resistencia: 'Fortitude parcial',
    dano: '100 de Morte por rodada',
    efeito: 'No início de cada um dos seus 4 turnos, todos a até 90m (você incluso) fazem Fortitude: se falharem, caem e são puxados 30m. Ação de movimento para se segurar dá +5. Quem começa o turno tocando o vácuo sofre 100 de Morte.',
    discente: [5, '5 rodadas e você não é afetado.', 'afinidade'],
    verdadeiro: [10, '6 rodadas e seres escolhidos no alcance não são afetados.', 'afinidade'],
  }),
  r('capturarOCoracao', 'Capturar o Coração', 'san', 4, 'Faz do alvo um aliado obcecado.', {
    execucao: 'Padrão', alcance: 'Curto', alvo: '1 pessoa', duracao: 'Cena', resistencia: 'Vontade parcial',
    efeito: 'O alvo quer agradá-lo a todo custo. No início de cada turno, Vontade: se falhar, age para ajudá-lo naquele turno. Passar 2 turnos seguidos encerra.',
  }),
  r('involucroDeCarne', 'Invólucro de Carne', 'san', 4, 'Cria um clone de carne seu.', {
    execucao: 'Padrão', alcance: 'Curto', tipoAlvo: 'Efeito', alvo: '1 clone seu', duracao: 'Cena',
    efeito: 'Cópia com suas estatísticas e equipamento mundano, sem Intelecto e Presença. Ação de movimento dá uma ordem, cumprida no fim de cada turno seu; ou, no início do turno, você a controla em transe. Percepção (DT do ritual) revela. Desfaz com 0 PV ou fora do alcance.',
  }),
  r('vinculoDeSangue', 'Vínculo de Sangue', 'san', 4, 'O alvo divide o dano que você sofre.', {
    execucao: 'Padrão', alcance: 'Curto', alvo: '1 ser', duracao: 'Cena', resistencia: 'Fortitude anula',
    efeito: 'Sempre que você sofrer dano, o alvo faz Fortitude: se falhar, você sofre metade e ele a outra metade. No modo inverso, você recebe metade do dano dele (voluntários não testam).',
  }),
  r('canalizarOMedo', 'Canalizar o Medo', 'med', 4, 'Empresta um ritual seu a outra pessoa.', {
    execucao: 'Padrão', alcance: 'Toque', alvo: '1 pessoa', duracao: 'Até ser descarregado',
    efeito: 'Transfere um ritual seu de até 3º círculo: o alvo pode conjurar a forma básica uma vez sem pagar PE (formas avançadas com os PE dele). Até lá, seus PE máximos caem no custo desse ritual.',
  }),
  r('conhecendoOMedo', 'Conhecendo o Medo', 'med', 4, 'O Medo absoluto toma a mente do alvo.', {
    execucao: 'Padrão', alcance: 'Toque', alvo: '1 pessoa', duracao: 'Instantânea', resistencia: 'Vontade parcial',
    dano: 'SAN 0 ou 10d6 mental',
    efeito: 'Se falhar, a Sanidade do alvo vai a 0 e ele fica enlouquecendo. Se passar, sofre 10d6 de dano mental e fica apavorado por 1 rodada. Quem enlouquece por este ritual vira criatura paranormal (mestre decide).',
  }),
  r('laminaDoMedo', 'Lâmina do Medo', 'med', 4, 'Golpe com uma fenda na Realidade.', {
    execucao: 'Padrão', alcance: 'Toque', alvo: '1 ser', duracao: 'Instantânea', resistencia: 'Fortitude parcial',
    dano: '0 PV ou 10d8 de Medo',
    efeito: 'Se falhar, os PV do alvo vão a 0 e ele fica morrendo. Se passar, 10d8 de dano de Medo (ignora resistências) e apavorado por 1 rodada. Quem sobrevive fica com uma ferida que nunca cicatriza. Aprender exige um poder de trilha específico.',
  }),
  r('medoTangivel', 'Medo Tangível', 'med', 4, 'Seu corpo se torna imune ao mundano.', {
    execucao: 'Padrão', alcance: 'Pessoal', alvo: 'você', duracao: 'Cena',
    efeito: 'Imune a atordoado, cego, debilitado, enjoado, envenenado, exausto, fatigado, fraco, lento, ofuscado e paralisado, a doenças e venenos, e a dano extra de crítico e furtivo. Balístico, corte, impacto e perfuração não o deixam com menos de 1 PV.',
  }),
  r('presencaDoMedo', 'Presença do Medo', 'med', 4, 'Você emana ondas de pavor.', {
    execucao: 'Padrão', alcance: 'Pessoal', tipoAlvo: 'Área', alvo: 'emanação de 9m de raio', duracao: 'Sustentada', resistencia: 'Vontade reduz à metade',
    dano: '5d8 mental + 5d8 de Medo',
    efeito: 'Ao conjurar e no início de cada turno seu, quem estiver na área sofre 5d8 de dano mental e 5d8 de Medo (Vontade reduz ambos à metade). Quem falhar fica atordoado por 1 rodada (1×/cena).',
  }),
];