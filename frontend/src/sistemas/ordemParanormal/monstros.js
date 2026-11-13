// Catálogo de ameaças oficiais (cap. 7 do livro). Os números vêm das fichas do livro; as descrições
// e habilidades são resumos com as nossas palavras — o texto completo está na página indicada.
// Ao importar, o monstro vira uma ficha da campanha (editável); este catálogo não muda.
//
// Testes no formato do livro: "3d20+10" = rola 3d20, fica com o maior e soma 10.
// elemento: con | ene | mor | san | med | '' (mundano) · tamanho: minusculo … colossal

const atq = (nome, alcance, teste, dano) => ({ nome, alcance, teste, dano });
const acao = (tipo, nome, texto) => ({ tipo, nome, texto });
const hab = (nome, texto) => ({ nome, texto });
const attr = (agi, forca, int, pre, vig) => ({ agi, for: forca, int, pre, vig });

export const MONSTROS = [
  /* ======================= Sangue ======================= */
  {
    id: 'aberracao-de-carne', nome: 'Aberração de Carne', pagina: 182, vd: 40,
    elemento: 'san', descritores: [], tipo: 'Criatura', tamanho: 'grande',
    descricao: 'Experimento fracassado que fundiu dois corpos num só. Quatro braços, quatro pernas e uma boca enorme no peito que engole quem ela agarra.',
    presenca: { dt: 15, dano: '3d6', nex: '30%' },
    sentidos: { percepcao: '1d20+5', iniciativa: '1d20', extra: 'Percepção às cegas' },
    defesa: 19, fortitude: '3d20+10', reflexos: '1d20', vontade: '1d20',
    pv: 70, resistencias: 'Balístico, impacto e perfuração 5; Sangue 10', vulnerabilidades: 'Morte', imunidades: '',
    atributos: attr(1, 3, 0, 1, 3), pericias: '', deslocamento: '9m (6q)',
    habilidades: [],
    ataques: [atq('Pancada', 'Corpo a corpo ×2', '3d20+10', '2d6+6 impacto')],
    acoes: [
      acao('Reação', 'Agarrão', 'Ao acertar uma pancada, pode agarrar o alvo (teste 3d20+12). Segura até dois de uma vez.'),
      acao('Movimento', 'Abocanhar', 'Põe até dois agarrados dentro da boca. No início de cada turno deles: 3d6 de perfuração (Fortitude DT 15 reduz à metade). Um aliado adjacente pode gastar uma ação padrão num teste de Atletismo (DT 20) para tirar alguém.'),
    ],
    enigma: '',
  },
  {
    id: 'aniquilacao', nome: 'Aniquilação', pagina: 186, vd: 380,
    elemento: 'san', descritores: ['med'], tipo: 'Criatura', tamanho: 'colossal',
    descricao: 'A maior criatura já registrada: um apocalipse paranormal de mais de dez metros, coberto de braços, espinhos e uma bocarra central. Nunca foi derrotada.',
    presenca: { dt: 45, dano: '9d8', nex: '' },
    sentidos: { percepcao: '4d20+20', iniciativa: '4d20+20', extra: 'Percepção às cegas' },
    defesa: 58, fortitude: '5d20+30', reflexos: '4d20+25', vontade: '4d20+20',
    pv: 1200, resistencias: 'Dano 50', vulnerabilidades: 'Morte', imunidades: '',
    atributos: attr(4, 5, 3, 4, 5), pericias: 'Atletismo 5d20+20', deslocamento: '15m (10q)',
    habilidades: [],
    ataques: [
      atq('Garras', 'Corpo a corpo ×2', '5d20+40', '4d10+30 Sangue'),
      atq('Tentáculos espinhentos', 'Corpo a corpo ×2', '5d20+40', '2d12+30 Sangue'),
      atq('Disparo de espinhos (outra ação Agredir)', 'Distância ×3 (médio)', '4d20+40', '2d10+20 Sangue'),
    ],
    acoes: [
      acao('Reação', 'Agarrão', 'Ao acertar os tentáculos, pode agarrar (teste 5d20+50). Segura até quatro.'),
      acao('Reação', 'Instinto aniquilador', 'Quando alguém em alcance curto se move mais de 3m, faz um ataque de tentáculos contra ele.'),
      acao('Livre', 'Apertar e destruir', 'No início do turno, os agarrados sofrem 40 de Sangue.'),
      acao('Movimento', 'Bater as asas', 'Todos em alcance longo sofrem 8d6 mental, são empurrados 6m e ficam atordoados por uma rodada (Fortitude DT 40 reduz à metade e evita os efeitos).'),
      acao('Movimento', 'Estrangulamento final', 'Desloca 15m; quem ficar adjacente no caminho fica agarrado e asfixiado (Reflexos DT 30 evita). Escapar: ação padrão e Reflexos DT 30.'),
      acao('Completa', 'Tempestade de espinhos', 'Todos em alcance médio sofrem 20d6+20 de Sangue (Reflexos DT 40 reduz à metade). Uma vez por cena; depois perde o disparo de espinhos até o fim da cena.'),
    ],
    enigma: 'Desconhecido. Se for resolvido, ela perde a resistência a dano e a Tempestade de espinhos.',
  },
  {
    id: 'carente', nome: 'Carente', pagina: 188, vd: 300,
    elemento: 'san', descritores: ['mor'], tipo: 'Criatura', tamanho: 'grande',
    descricao: 'Nasceu da inveja de quem nunca foi amado: finge ser uma criança batendo à porta procurando a mãe. Quem abre libera uma criatura de três metros que devora órgãos.',
    presenca: { dt: 35, dano: '7d8', nex: '90%' },
    sentidos: { percepcao: '3d20+10', iniciativa: '4d20+15', extra: 'Percepção às cegas' },
    defesa: 40, fortitude: '4d20+25', reflexos: '4d20+25', vontade: '3d20+15',
    pv: 700, resistencias: 'Balístico, impacto, perfuração e Sangue 20', vulnerabilidades: 'Morte', imunidades: '',
    atributos: attr(4, 4, 2, 3, 4), pericias: 'Atletismo 4d20+20, Enganação 3d20+15', deslocamento: '12m (8q)',
    habilidades: [
      hab('Carência', 'Quem já gestou outro ser ganha +1d20 nos ataques contra o carente — e o carente também ganha +1d20 contra essa pessoa.'),
      hab('Regeneração de Sangue', 'Cura Acelerada 20. Para de funcionar até o fim da cena se ele ficar inconsciente ou sofrer dano de Energia.'),
    ],
    ataques: [
      atq('Garras de sangue', 'Corpo a corpo ×2', '4d20+35', '2d8+20 Sangue'),
      atq('Ferrão de sangue', 'Corpo a corpo', '4d20+35', '2d12+20 Sangue'),
      atq('Tentáculo', 'Corpo a corpo', '4d20+35', '2d8+20 Sangue'),
    ],
    acoes: [
      acao('Movimento', 'Forma infantil', 'Volta ao corpo de criança para passar por espaços pequenos. Não consegue abrir sozinho a primeira porta de um lugar; depois que alguém abre, pode ignorar isso.'),
      acao('Reação', 'Rasteira de tentáculo', 'Uma vez por rodada, adjacente a dois ou mais seres, faz um ataque de tentáculo; se acertar, a vítima fica caída e é empurrada 6m.'),
      acao('Livre', 'Sugada mortal', 'Quem é atingido pelo ferrão fica debilitado e enjoado até o fim da cena (Fortitude DT 35 evita).'),
      acao('Movimento', 'Você é minha mamãe?', 'Abraça um ser adjacente, que fica paralisado até ser solto (Reflexos DT 25 evita). Mantém o abraço indefinidamente, mas solta se sofrer dano de Energia.'),
    ],
    enigma: '',
  },
  {
    id: 'dama-de-sangue', nome: 'Dama de Sangue', pagina: 190, vd: 60,
    elemento: 'san', descritores: ['med', 'mor'], tipo: 'Criatura', tamanho: 'enorme',
    descricao: 'Corpo humano partido ao meio de onde brotam tentáculos com sete flores. Nasce quando sementes de orquídea de Sangue consomem um hospedeiro num ritual.',
    presenca: { dt: 20, dano: '3d6', nex: '35%' },
    sentidos: { percepcao: '2d20+10', iniciativa: '2d20', extra: 'Percepção às cegas' },
    defesa: 20, fortitude: '2d20+10', reflexos: '2d20+5', vontade: '2d20',
    pv: 105, resistencias: 'Balístico, impacto e perfuração 10; Sangue 20', vulnerabilidades: 'Morte', imunidades: '',
    atributos: attr(2, 3, 1, 2, 2), pericias: '', deslocamento: '12m (8q)',
    habilidades: [
      hab('Consumir', 'Começa sem as habilidades das flores. Cada corpo consumido (adjacente a um cadáver, ação padrão) libera a próxima, na ordem da ficha. Enquanto não tiver consumido sete corpos, gasta suas ações indo atrás de cadáveres.'),
    ],
    ataques: [atq('Tentáculo', 'Corpo a corpo ×2', '3d20+10', '2d6+5 impacto')],
    acoes: [
      acao('Movimento', 'Arremessar (flor rosa)', 'Ergue alguém em alcance curto e o arremessa: 2d6 de impacto e caído (Reflexos DT 15 evita). Murcha com fertilizante: perde a habilidade e sofre −1d20 em Luta.'),
      acao('Movimento', 'Chuva de ácido (flor vermelha)', 'Todos em alcance curto: 4d4 químico (Fortitude DT 15 reduz à metade). Murcha com agrotóxico: perde a habilidade e as resistências caem 5.'),
      acao('Movimento', 'Espinhos (flor amarela)', 'Até três alvos em alcance médio: 2d8 de perfuração (Reflexos DT 15 reduz à metade). Murcha ao sofrer 10 de fogo num só efeito: perde a habilidade e sofre −1d20 em Reflexos.'),
      acao('Movimento', 'Grito devastador (flor roxa)', 'Todos em alcance curto ficam confusos (Vontade DT 15 evita; repete no fim do turno). Murcha com bulbo de bravo purpúlis: perde a habilidade e sofre −1d20 em Vontade.'),
      acao('Padrão', 'Miasma fétido (flor azul)', 'Todos em alcance curto ficam enjoados por 1d4+1 rodadas (Fortitude DT 15 reduz a 1 rodada). Murcha ao sofrer dano de eletricidade ou Energia: deslocamento cai para 6m.'),
      acao('Padrão', 'Prisão de tentáculos (flor verde)', 'Um alvo em alcance curto fica agarrado até os tentáculos serem destruídos (acertados automaticamente, 20 PV). Murcha se molhada com água corrente: Defesa −5.'),
      acao('Movimento', 'Visão macabra (flor laranja)', 'Todos em alcance médio: 1d6 mental (Vontade DT 15 reduz à metade). Murcha ao sofrer 10 de corte num só efeito: PV totais −20.'),
    ],
    enigma: 'Invocada por um ritual que sacrifica sete pessoas para desabrochar sete flores. Cada flor tem uma fraqueza (veja as ações).',
  },
  {
    id: 'enpap-x', nome: 'Enpap-X', pagina: 192, vd: 180,
    elemento: 'san', descritores: ['con'], tipo: 'Criatura', tamanho: 'grande',
    descricao: 'Lenda suméria de um prisioneiro torturado, obrigado a marcar na pele as atrocidades do seu soberano. Libertado das correntes, vira um monstro de quatro braços em busca de vingança.',
    presenca: { dt: 25, dano: '6d6', nex: '60%' },
    sentidos: { percepcao: '2d20+10', iniciativa: '2d20+10', extra: 'Percepção às cegas' },
    defesa: 36, fortitude: '3d20+15', reflexos: '2d20+15', vontade: '2d20+10',
    pv: 360, resistencias: 'Balístico, impacto e perfuração 10; Sangue 20', vulnerabilidades: 'Morte', imunidades: '',
    atributos: attr(2, 4, 1, 2, 3), pericias: '', deslocamento: '12m (8q)',
    habilidades: [
      hab('Transformação', 'Começa o combate como um existido comum (ficha da p. 240). Ao chegar a 0 PV não morre: passa a usar esta ficha (inclusive a Presença Perturbadora) e volta com 360 PV.'),
    ],
    ataques: [
      atq('Socão', 'Corpo a corpo ×4', '4d20+20', '2d10+10 impacto'),
      atq('Correntes (outra ação Agredir)', 'Distância ×3 (curto)', '2d20+15', '2d8+10 impacto'),
    ],
    acoes: [
      acao('Livre', 'Acorrentar', 'Ao acertar as correntes num ser Médio ou menor, pode agarrá-lo à distância (teste 2d20+17). No início do turno, cada agarrado sofre 4d6 de impacto. Segura até dois.'),
      acao('Reação', 'Forma desencadeada', 'Num acerto crítico com socão ou corrente, pode derrubar o alvo ou empurrá-lo 3m.'),
      acao('Reação', 'Crescer', 'Cada socão que acerta dá dano extra cumulativo aos próximos no mesmo turno: o 2º recebe +1d6, o 3º +2d6 e o 4º +3d6.'),
      acao('Movimento', 'Marcas do terror', 'As marcas brilham: todos em alcance curto sofrem 4d6 mental (Vontade DT 25 reduz à metade). Quem passar fica imune até o fim da cena.'),
    ],
    enigma: '',
  },
  {
    id: 'kerberos', nome: 'Kerberos', pagina: 194, vd: 340,
    elemento: 'san', descritores: [], tipo: 'Criatura', tamanho: 'enorme',
    descricao: 'O cão de três cabeças, guardião do portão. Só se manifesta num "inferno" tomado pelo Sangue e protege a origem da distorção daquela região.',
    presenca: { dt: 35, dano: '10d6', nex: '99%' },
    sentidos: { percepcao: '3d20+20', iniciativa: '4d20+15', extra: 'Percepção às cegas' },
    defesa: 46, fortitude: '5d20+25', reflexos: '4d20+20', vontade: '3d20+15',
    pv: 1150, resistencias: 'Balístico, impacto, perfuração e Sangue 20', vulnerabilidades: 'Morte', imunidades: '',
    atributos: attr(4, 5, 0, 3, 5), pericias: 'Atletismo 5d20+25', deslocamento: '18m (12q)',
    habilidades: [
      hab('Ataque flexível', 'Pode fazer até quatro ataques por rodada, misturando corpo a corpo e distância, mas nunca o mesmo ataque mais de três vezes.'),
    ],
    ataques: [
      atq('Mordida', 'Corpo a corpo', '5d20+40', '4d12+30 Sangue'),
      atq('Disparo de espinhos', 'Distância (médio)', '4d20+35', '4d8+20 Sangue'),
    ],
    acoes: [
      acao('Livre', 'Devorar', 'Uma vez por cena, ao levar alguém a 0 PV com a mordida, devora a vítima: morte instantânea, e ele recupera metade dos PV totais dela (Fortitude DT 40 evita).'),
      acao('Completa', 'Derrubar e devorar', 'Manobra derrubar contra alguém a até 3m (teste 5d20+45). Se vencer, faz três mordidas nele, com dano 4d12+40.'),
    ],
    enigma: '',
  },
  {
    id: 'minotauro', nome: 'Minotauro', pagina: 196, vd: 280,
    elemento: 'san', descritores: [], tipo: 'Criatura', tamanho: 'grande',
    descricao: 'Bípede bestial de três metros, coberto de pústulas de Sangue, com um machado de lâmina dupla fundido ao braço. Caça vítimas dentro de labirintos.',
    presenca: { dt: 35, dano: '8d6', nex: '80%' },
    sentidos: { percepcao: '3d20+20', iniciativa: '4d20+15', extra: 'Percepção às cegas' },
    defesa: 44, fortitude: '5d20+20', reflexos: '4d20+15', vontade: '3d20+10',
    pv: 750, resistencias: 'Balístico, impacto, perfuração e Sangue 20', vulnerabilidades: 'Morte', imunidades: '',
    atributos: attr(4, 5, 1, 3, 5), pericias: 'Atletismo 5d20+20', deslocamento: '12m (8q)',
    habilidades: [],
    ataques: [
      atq('Chifres', 'Corpo a corpo', '5d20+30', '6d12+20 perfuração'),
      atq('Machado', 'Corpo a corpo ×2', '5d20+32', '4d12+20 corte'),
    ],
    acoes: [
      acao('Livre', 'Cravar chifres', 'Se acertar uma investida com os chifres, o alvo fica agarrado (e o minotauro não ataca com os chifres enquanto o segura). No fim de cada turno da vítima ainda presa: 4d12+20 de Sangue.'),
    ],
    enigma: '',
  },
  {
    id: 'mulher-afogada', nome: 'Mulher Afogada', pagina: 198, vd: 140,
    elemento: 'san', descritores: ['ene', 'med'], tipo: 'Criatura', tamanho: 'grande',
    descricao: 'Lenda urbana de quem desperdiça água. Ligada a mulheres mortas afogadas, anda pelos canos como Sangue líquido e puxa as vítimas para dentro do encanamento.',
    presenca: { dt: 25, dano: '4d8', nex: '50%' },
    sentidos: { percepcao: '2d20+5', iniciativa: '4d20+10', extra: 'Percepção às cegas' },
    defesa: 28, fortitude: '3d20+10', reflexos: '4d20+10', vontade: '2d20+5',
    pv: 240, resistencias: 'Balístico, Energia, impacto e perfuração 10; Sangue 20', vulnerabilidades: 'Morte', imunidades: '',
    atributos: attr(4, 3, 2, 2, 3), pericias: '', deslocamento: '9m (6q) · forma líquida 36m (24q)',
    habilidades: [
      hab('Forma de Sangue', 'Por padrão está em forma líquida: resistência 20 a balístico, corte, impacto, perfuração e Sangue; deslocamento 36m; passa por canos, frestas e orifícios; e ganha as ações da forma de Sangue. Perde tudo isso quando é forçada à forma física (depois do Enigma de Medo).'),
    ],
    ataques: [
      atq('Mordida', 'Corpo a corpo', '3d20+15', '4d8+8 perfuração'),
      atq('Garras', 'Corpo a corpo ×2', '3d20+15', '4d6+6 corte'),
      atq('Jato de sangue (outra ação Agredir)', 'Distância (curto)', '4d20+10', '4d8+8 Sangue'),
    ],
    acoes: [
      acao('Movimento', 'Sugar sangue', 'Devora o corpo de alguém adjacente que morreu nesta cena e recupera 40 PV.'),
      acao('Padrão', 'Afogar em sangue (forma de Sangue)', 'Invade nariz e boca de alguém em alcance curto, que fica asfixiado. No início de cada turno a vítima faz Fortitude DT 24: se passar, encerra e expele a criatura para um espaço adjacente.'),
      acao('Reação', 'Arrancar sangue (forma de Sangue)', 'Quando é arrancada de quem está asfixiando, leva sangue junto: 6d6 de Sangue e a vítima fica fraca.'),
      acao('Movimento', 'Invadir órgãos (forma de Sangue)', 'Invade os órgãos de quem está asfixiando: 6d6 de Sangue e a vítima fica enjoada.'),
    ],
    enigma: 'Toda fonte de água do lugar vira ponto de invocação; enfrentá-la direto é inútil, porque ela foge e se recupera pelos canos. Para derrotá-la: bloquear as saídas de água, fechar o registro e abrir todas as torneiras, forçando a forma física sem ter para onde fugir.',
  },
];
