import type { HowItWorks } from './en.ts';

const pt: HowItWorks = {
  docTitle: 'Como funciona',
  badge: 'Para compradores',
  title: 'Como funciona',
  lede: 'Foi-lhe pedido que preenchesse uma declaração de utilizador final antes de comprar um produto químico. Esta página explica porquê, o que acontece aos seus dados e o que pode fazer.',
  sentBy: (seller) => `Chegou aqui a partir do formulário de ${seller}.`,
  backToForm: 'Voltar ao formulário',
  contents: 'Nesta página',

  shortTitle: 'Em resumo',
  short: [
    'O vendedor tem de verificar quem compra determinados produtos químicos e para quê. É a lei, não uma escolha da loja.',
    'O seu documento de identificação é verificado pela Didit. As fotografias nunca chegam ao vendedor nem a nós.',
    'A equipa do vendedor lê a sua declaração. O número do documento permanece oculto a menos que alguém o consulte deliberadamente, e cada consulta fica registada.',
    'Tudo é apagado automaticamente ao fim de 18 meses.',
  ],

  whyTitle: 'Porque me pedem isto?',
  why: [
    'Alguns produtos químicos podem ser utilizados indevidamente para fabricar explosivos, drogas ou armas. As regras da UE — entre elas o Regulamento (UE) 2019/1148 relativo aos precursores de explosivos — obrigam os vendedores a saber a quem vendem estas substâncias e para que fim, a manter um registo e a comunicar transações suspeitas.',
    'A declaração que preenche é esse registo. A eustatement é o serviço que o vendedor utiliza para a recolher.',
  ],

  idTitle: 'O que acontece ao meu documento de identificação?',
  id: [
    'Se o vendedor pedir uma verificação de identidade, abre-se uma janela segura da Didit, o nosso fornecedor de verificação de identidade. Fotografa o seu passaporte ou cartão de identificação e tira uma breve selfie. A Didit verifica se o documento é autêntico e se lhe pertence.',
    'As fotografias vão apenas para a Didit — nunca chegam ao vendedor nem a nós. Assim que o resultado é guardado, a verificação na Didit, incluindo as fotografias, é apagada.',
    'Fica guardado o resultado e o que está impresso no documento: o seu nome, o tipo de documento e o respetivo número. A sua data de nascimento é usada uma única vez, para verificar que tem 18 anos ou mais, e não é guardada.',
  ],

  storedTitle: 'O que é guardado, e quem o pode ver?',
  stored: [
    'Os dados que introduz no formulário, o resultado da verificação de identidade e o resultado das verificações automáticas da substância. Os seus dados pessoais são guardados cifrados, em servidores na UE.',
    'Nenhum outro vendedor pode ver a sua declaração — apenas o vendedor a quem compra e a respetiva equipa. O número do documento permanece oculto até para eles: um membro da equipa tem de confirmar com um segundo passo de início de sessão para o ver, e cada vez que isso acontece fica registado.',
    'O nosso próprio pessoal pode abrir declarações quando isso é necessário para o funcionamento e o apoio do serviço. Também só vê um número de documento se o consultar deliberadamente, e essa consulta aparece no registo do vendedor.',
  ],

  decideTitle: 'Quem decide?',
  decide: [
    'Uma pessoa do vendedor lê cada declaração e decide. As verificações automáticas — se a substância consta de uma lista restrita, se a utilização indicada contém sinais de alerta, se o número de IVA de uma empresa é válido — apenas indicam a quem analisa o que merece um segundo olhar. Nunca aprovam nem recusam nada por si próprias.',
    'A única exceção é a idade: se o seu documento mostrar que tem menos de 18 anos, a declaração não pode ser enviada.',
    'Se a sua declaração não estiver em inglês nem em neerlandês, pode ser traduzida automaticamente para quem a analisa. Isso acontece no nosso próprio servidor; o seu texto não é enviado a nenhum serviço de tradução.',
  ],

  keptTitle: 'Durante quanto tempo é guardado?',
  kept: [
    '18 meses a contar do dia do envio. Depois, é apagada automaticamente, com tudo o que está descrito acima. Se o vendedor encerrar a sua conta mais cedo, é apagada 30 dias depois.',
  ],

  othersTitle: 'Quem mais está envolvido?',
  othersIntro: 'Além do vendedor e de nós, estas entidades têm um papel:',
  others: [
    ['Didit', 'verifica o seu documento de identificação — apenas se o vendedor o pedir.'],
    ['A Comissão Europeia (VIES)', 'verifica o número de IVA — apenas se encomendar para uma empresa.'],
    ['PubChem e Wikidata', 'ajudam a identificar a substância. Recebem o nome da substância e o número CAS, nunca nada sobre si.'],
    ['O nosso fornecedor de e-mail', 'entrega a confirmação e a decisão na sua caixa de correio.'],
    ['Cloudflare', 'protege o site contra ataques e vê o seu endereço IP quando o tráfego passa.'],
    ['Hetzner', 'aloja os nossos servidores na UE.'],
  ],
  othersMore: 'A lista completa, com as localizações, consta da nossa política de privacidade (em inglês).',

  rightsTitle: 'Quais são os meus direitos?',
  rights: [
    'Pode pedir para ver os dados que lhe dizem respeito, para os corrigir ou para os apagar quando a lei o permitir — o vendedor pode ser obrigado a manter o registo enquanto as regras o exigirem.',
  ],
  controller: (seller) => seller
    ? `${seller} é responsável pelos seus dados (o «responsável pelo tratamento»); a eustatement trata-os por conta dele. Envie o seu pedido a ${seller}.`
    : 'O vendedor é responsável pelos seus dados (o «responsável pelo tratamento»); a eustatement trata-os por conta dele. Envie o seu pedido ao vendedor.',
  fallback: (email) => `Se não conseguir contactá-lo, escreva para ${email}; faremos chegar o seu pedido.`,
  complaint: 'Pode também apresentar uma reclamação à autoridade de proteção de dados do seu país.',

  questionsTitle: 'Dúvidas?',
  questionsOrder: 'Sobre a sua encomenda ou a decisão: contacte o vendedor.',
  questionsData: (email) => `Sobre esta página ou o tratamento dos seus dados: ${email}.`,

  lastUpdated: (date) => `Última atualização: ${date}`,
  privacyPolicy: 'Política de privacidade',
};

export default pt;
