// Português. Termos ANNEX IV retirados literalmente da versão portuguesa do
// Regulamento (UE) 2019/1148, anexo IV. Regras: ver en.ts.
import type { Messages } from './en.ts';

const pt: Messages = {
  docTitle: 'Declaração de utilizador final',
  docTitleCompany: (company) => `${company} — Declaração`,
  badge: 'Documento oficial',
  title: 'Declaração de utilizador final',
  subtitle: 'Substâncias químicas — declaração de utilização regulamentada',
  submittedTo: (company) => `Apresentada a ${company}`,
  themeToggle: 'Claro ou escuro',

  language: 'Idioma',
  languageSearch: 'Pesquisar idioma',
  languageNone: 'Nenhum idioma encontrado',
  languageSuggested: 'Sugeridos',
  languageAll: 'Todos os idiomas',

  secBuyerType: 'Tipo de comprador',
  secContact: 'Dados de contacto',
  secCompany: 'Dados da empresa',
  secAddress: 'Morada',
  secSubstance: 'Informações sobre a substância',
  secIdentity: 'Verificação de identidade',
  secTerms: 'Termos e condições',

  buyerTypeQuestion: 'Está a encomendar como particular ou em nome de uma empresa?',
  buyerIndividual: 'Particular',
  buyerCompany: 'Empresa',

  optional: '(opcional)',
  email: 'E-mail',
  orderNumber: 'Número da encomenda',
  firstName: 'Nome próprio',
  lastName: 'Apelido',
  companyName: 'Nome da empresa',
  vatNumber: 'Número de IVA',
  vatHint: 'Necessário para a verificação europeia VIES, p. ex. PT123456789',
  street: 'Rua e número',
  zipCode: 'Código postal',
  place: 'Localidade',
  country: 'País',
  countrySelect: '— Selecione —',
  substanceName: 'Nome da(s) substância(s)',
  casNo: 'N.º CAS',
  concentration: 'Concentração',
  concentrationHint: 'Tal como indicada no rótulo, p. ex. 15 % m/m. Os limites legais para precursores dependem dela.',
  intendedUse: 'Utilização prevista',
  intendedUseHint: 'Descreva para que vai utilizar a substância.',

  idNote:
    'O seu passaporte ou cartão de identificação é verificado pela Didit, o nosso fornecedor de verificação de identidade. '
    + 'Abre-se uma janela segura onde fotografa o seu documento e tira uma breve selfie. '
    + 'As fotografias ficam na Didit — este formulário nunca as recebe nem guarda. Apenas o resultado '
    + 'e os dados impressos no seu documento são conservados.',
  idUnavailableTitle: 'A verificação de identidade está temporariamente indisponível',
  idUnavailableNote: (seller) =>
    `Este formulário exige-a, pelo que não pode ser enviado agora. Tente novamente mais tarde ou contacte ${seller ?? 'o vendedor'}.`,
  fillFirst: (list) => `Preencha primeiro o resto do formulário e depois verifique a sua identidade. Falta: ${list}.`,
  verifyButton: 'Verificar a minha identidade',
  verifyOpening: 'A abrir a verificação segura…',
  verifyWaiting: 'A aguardar que conclua a verificação…',
  verifyWaitingHint: 'Conclua os passos na janela de verificação e depois volte aqui. Esta página atualiza-se sozinha.',
  verifyBlocked: 'O seu navegador bloqueou a janela de verificação.',
  verifyBlockedLink: 'Abri-la num novo separador',
  verifyRestart: 'Janela fechada? Recomeçar',
  verified: 'Identidade verificada',
  verifyInReview: 'O seu documento está a ser verificado manualmente. Já pode enviar o formulário — o vendedor verá o resultado.',
  verifyFailedTitle: 'Verificação não aprovada',
  verifyFailedNote: 'Pode enviar este formulário na mesma. O vendedor irá analisá-lo manualmente.',
  verifyTryAgain: 'Tentar novamente',

  termsIntro: (seller) => seller ? `Termos e condições de ${seller}:` : 'Termos e condições do vendedor:',
  termsReadLink: (seller) => seller ? `Ler os termos e condições de ${seller}` : 'Ler os termos e condições do vendedor',
  termsAsWritten: (seller) => `Estes termos são definidos por ${seller ?? 'o vendedor'} e são apresentados tal como foram redigidos.`,
  agree: 'Li e aceito os termos e condições acima',
  defaultTerms: `Pela presente confirmo que:
— As substâncias, preparações e produtos são utilizados apenas de forma autorizada (em conformidade com a legislação europeia e nacional) e apenas para fins de investigação, científicos e educativos.

A(s) substância(s) encomendada(s):
— Não é/são utilizada(s) para fabricar estupefacientes e/ou substâncias psicotrópicas, nem como seu componente ou produto intermédio.
— Não é/são utilizada(s) em medicamentos para uso humano ou veterinário, na agricultura, em alimentos ou em cosméticos, exceto como matéria-prima, material auxiliar ou de processo e/ou como reagente de investigação e análise.
— Não é/são utilizada(s) para desenvolver ou produzir armas químicas.
— Não será/serão utilizada(s) para fins militares ou ilegais.
— Não é/são reexportada(s) para países terceiros sem o consentimento prévio das autoridades de controlo das exportações.
— Não será/serão reexportada(s)/exportada(s), nem revendida(s) a nível nacional ou internacional, nem transferida(s) para um destino sujeito a embargo da UE, da ONU ou dos EUA, se tal contrariar os termos desse embargo.
— Só é/são fornecida(s) a clientes que possam igualmente apresentar um certificado de utilização final deste tipo. Conservaremos cuidadosamente todos os certificados recebidos e apresentá-los-emos mediante pedido.
— Tenho mais de 18 anos.`,

  requiredNote: 'Campos obrigatórios',
  stillToComplete: (list) => `Ainda por preencher: ${list}.`,
  submitting: 'A enviar…',
  submit: 'Enviar declaração',
  footer: 'Este documento é juridicamente vinculativo. Todas as informações prestadas podem ser verificadas.',

  missing: {
    email: 'um e-mail válido',
    firstName: 'nome próprio',
    lastName: 'apelido',
    orderNumber: 'número da encomenda',
    buyerType: 'se é particular ou empresa',
    companyName: 'nome da empresa',
    vatNumber: 'número de IVA',
    street: 'rua',
    zipCode: 'código postal',
    place: 'localidade',
    country: 'país',
    substance: 'nome da substância',
    cas: 'número CAS',
    concentration: 'concentração',
    intendedUse: 'utilização prevista',
    identity: 'verificação de identidade',
    terms: 'aceitação dos termos',
    robot: 'a verificação anti-robô',
  },

  successTitle: 'Declaração recebida',
  successBody: 'A sua declaração de utilizador final foi enviada. Receberá uma confirmação por e-mail e outra mensagem quando tiver sido analisada.',
  successNote: 'Guarde esta confirmação nos seus registos.',
  notFoundTitle: 'Formulário não encontrado',
  notFoundBody: 'Não existe nenhum formulário neste endereço. Verifique a ligação.',
  notReadyTitle: 'Formulário ainda não disponível',
  notReadyBody: 'Este formulário ainda não aceita declarações. Tente novamente mais tarde.',
  contactSupplier: 'Se recebeu esta ligação de um fornecedor, contacte-o para obter ajuda.',

  errVerifyExpired: 'A sua sessão de verificação expirou. Inicie-a novamente.',
  errVerifyStart: 'Não foi possível iniciar a verificação de identidade. Tente novamente.',
  errIncomplete: (list) => `Preencha primeiro o formulário. Falta: ${list}.`,
  errIdUnavailable: 'A verificação de identidade está temporariamente indisponível, pelo que este formulário não pode ser enviado agora.',
  errRateLimited: 'Demasiadas tentativas a partir desta ligação. Aguarde alguns minutos e tente novamente.',
  errGeneric: 'Ocorreu um erro. Tente novamente.',

  server: {
    TERMS_REQUIRED: 'Tem de aceitar os termos e condições.',
    FIELD_TOO_LONG: 'Um dos campos é demasiado longo. Encurte-o e tente novamente.',
    INVALID_EMAIL: 'Introduza um e-mail válido.',
    FORM_NOT_OPEN: 'Este formulário ainda não aceita declarações.',
    FIELD_REQUIRED: 'Há um campo obrigatório vazio. Preencha todos os campos assinalados com *.',
    BUYER_TYPE_REQUIRED: 'Indique se é particular ou empresa.',
    COMPANY_NAME_REQUIRED: 'Indique o nome da sua empresa.',
    VAT_REQUIRED: 'Indique o seu número de IVA.',
    ID_UNAVAILABLE: 'A verificação de identidade está temporariamente indisponível. Tente novamente mais tarde.',
    ID_REQUIRED: 'Conclua primeiro a verificação de identidade.',
    ID_EXPIRED: 'A sua verificação de identidade expirou ou já foi utilizada. Inicie-a novamente.',
    ID_UNCONFIRMED: 'Não foi possível confirmar a sua verificação de identidade. Tente novamente.',
    ID_UNFINISHED: 'A sua verificação de identidade ainda não está concluída. Conclua-a e tente novamente.',
    ID_DOCUMENT_TYPE: 'Só são aceites passaportes e cartões de identificação.',
    UNDER_AGE: 'Tem de ter pelo menos 18 anos para apresentar uma declaração de utilizador final.',
    BOT_CHECK_MISSING: 'Conclua a verificação anti-robô e tente novamente.',
    BOT_CHECK_ERROR: 'Não foi possível concluir a verificação anti-robô. Tente novamente.',
    BOT_CHECK_FAILED: 'A verificação anti-robô não foi aprovada. Tente novamente.',
  },

  vcDocTitle: 'Verificação concluída',
  vcTitle: 'Verificação terminada',
  vcBody: 'Pode fechar esta janela e voltar ao formulário. Ele atualiza-se sozinho.',
};

export default pt;
