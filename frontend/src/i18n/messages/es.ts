// Español. Términos ANNEX IV tomados literalmente de la versión española del
// Reglamento (UE) 2019/1148, anexo IV. Normas: véase en.ts.
import type { Messages } from './en.ts';

const es: Messages = {
  docTitle: 'Declaración de usuario final',
  docTitleCompany: (company) => `${company} — Declaración`,
  badge: 'Documento oficial',
  title: 'Declaración de usuario final',
  subtitle: 'Sustancias químicas — declaración de uso regulado',
  submittedTo: (company) => `Presentada a ${company}`,
  themeToggle: 'Claro u oscuro',

  language: 'Idioma',
  languageSearch: 'Buscar idioma',
  languageNone: 'Ningún idioma coincide',
  languageSuggested: 'Sugeridos',
  languageAll: 'Todos los idiomas',

  secBuyerType: 'Tipo de comprador',
  secContact: 'Datos de contacto',
  secCompany: 'Datos de la empresa',
  secAddress: 'Dirección',
  secSubstance: 'Información sobre la sustancia',
  secIdentity: 'Verificación de identidad',
  secTerms: 'Términos y condiciones',

  buyerTypeQuestion: '¿Hace el pedido como particular o en nombre de una empresa?',
  buyerIndividual: 'Particular',
  buyerCompany: 'Empresa',

  optional: '(opcional)',
  email: 'Correo electrónico',
  orderNumber: 'Número de pedido',
  firstName: 'Nombre',
  lastName: 'Apellidos',
  companyName: 'Nombre de la empresa',
  vatNumber: 'Número de IVA',
  vatHint: 'Necesario para la comprobación europea VIES, p. ej. ESX1234567X',
  street: 'Calle y número',
  zipCode: 'Código postal',
  place: 'Localidad',
  country: 'País',
  countrySelect: '— Seleccione —',
  substanceName: 'Nombre de la(s) sustancia(s)',
  casNo: 'N.º CAS',
  concentration: 'Concentración',
  concentrationHint: 'Tal como figura en la etiqueta, p. ej. 15 % p/p. De ella dependen los límites legales para los precursores.',
  intendedUse: 'Uso previsto',
  intendedUseHint: 'Describa para qué va a utilizar la sustancia.',

  idNote:
    'Didit, nuestro proveedor de verificación de identidad, comprueba su pasaporte o documento de identidad. '
    + 'Se abre una ventana segura en la que fotografía su documento y se hace un breve selfie. '
    + 'Las fotos se quedan en Didit: este formulario nunca las recibe ni las guarda. Solo se conservan '
    + 'el resultado y los datos impresos en su documento.',
  idUnavailableTitle: 'La verificación de identidad no está disponible temporalmente',
  idUnavailableNote: (seller) =>
    `Este formulario la exige, por lo que no se puede enviar ahora. Vuelva a intentarlo más tarde o póngase en contacto con ${seller ?? 'el vendedor'}.`,
  fillFirst: (list) => `Rellene primero el resto del formulario y después verifique su identidad. Falta: ${list}.`,
  verifyButton: 'Verificar mi identidad',
  verifyOpening: 'Abriendo la verificación segura…',
  verifyWaiting: 'Esperando a que termine la verificación…',
  verifyWaitingHint: 'Complete los pasos en la ventana de verificación y vuelva aquí. Esta página se actualiza sola.',
  verifyBlocked: 'Su navegador ha bloqueado la ventana de verificación.',
  verifyBlockedLink: 'Abrirla en una pestaña nueva',
  verifyRestart: '¿Se cerró la ventana? Empezar de nuevo',
  verified: 'Identidad verificada',
  verifyInReview: 'Su documento se está revisando manualmente. Ya puede enviar el formulario: el vendedor verá el resultado.',
  verifyFailedTitle: 'Verificación no superada',
  verifyFailedNote: 'Aun así puede enviar este formulario. El vendedor lo revisará manualmente.',
  verifyTryAgain: 'Intentarlo de nuevo',

  termsIntro: (seller) => seller ? `Términos y condiciones de ${seller}:` : 'Términos y condiciones del vendedor:',
  termsReadLink: (seller) => seller ? `Leer los términos y condiciones de ${seller}` : 'Leer los términos y condiciones del vendedor',
  termsAsWritten: (seller) => `Estos términos los establece ${seller ?? 'el vendedor'} y se muestran tal como se redactaron.`,
  agree: 'He leído y acepto los términos y condiciones anteriores',
  defaultTerms: `Por la presente confirmo que:
— Las sustancias, preparados y productos se utilizan únicamente de forma autorizada (de conformidad con la legislación europea y nacional) y solo con fines de investigación, científicos y educativos.

La(s) sustancia(s) pedida(s):
— No se utilizan para fabricar estupefacientes y/o sustancias psicotrópicas ni como componente o producto intermedio de estos.
— No se utilizan en medicamentos de uso humano o veterinario, en la agricultura, en alimentos ni en cosméticos, salvo como materia prima, material auxiliar o de proceso y/o como reactivo de investigación y análisis.
— No se utilizan para desarrollar o producir armas químicas.
— No se utilizarán con fines militares o ilegales.
— No se reexportan a terceros países sin el consentimiento previo de las autoridades de control de las exportaciones.
— No se reexportarán/exportarán, ni se revenderán en el ámbito nacional o internacional, ni se transferirán a un destino sujeto a un embargo de la UE, la ONU o los EE. UU., si ello contraviniera las condiciones de dicho embargo.
— Solo se suministran a clientes que también puedan presentar un certificado de uso final de este tipo. Conservaremos cuidadosamente todos los certificados recibidos y los presentaremos cuando se soliciten.
— Soy mayor de 18 años.`,

  requiredNote: 'Campos obligatorios',
  stillToComplete: (list) => `Falta por completar: ${list}.`,
  submitting: 'Enviando…',
  submit: 'Enviar declaración',
  footer: 'Este documento es jurídicamente vinculante. Toda la información facilitada puede ser verificada.',

  missing: {
    email: 'un correo electrónico válido',
    firstName: 'nombre',
    lastName: 'apellidos',
    orderNumber: 'número de pedido',
    buyerType: 'si es particular o empresa',
    companyName: 'nombre de la empresa',
    vatNumber: 'número de IVA',
    street: 'calle',
    zipCode: 'código postal',
    place: 'localidad',
    country: 'país',
    substance: 'nombre de la sustancia',
    cas: 'número CAS',
    concentration: 'concentración',
    intendedUse: 'uso previsto',
    identity: 'verificación de identidad',
    terms: 'aceptación de las condiciones',
    robot: 'la comprobación antirrobot',
  },

  successTitle: 'Declaración recibida',
  successBody: 'Su declaración de usuario final se ha enviado. Recibirá una confirmación por correo electrónico y otro mensaje cuando se haya revisado.',
  successNote: 'Conserve esta confirmación para sus archivos.',
  notFoundTitle: 'Formulario no encontrado',
  notFoundBody: 'No hay ningún formulario en esta dirección. Compruebe el enlace.',
  notReadyTitle: 'Formulario aún no disponible',
  notReadyBody: 'Este formulario todavía no acepta declaraciones. Vuelva a intentarlo más tarde.',
  contactSupplier: 'Si recibió este enlace de un proveedor, póngase en contacto con él.',

  errVerifyExpired: 'Su sesión de verificación ha caducado. Vuelva a iniciarla.',
  errVerifyStart: 'No se pudo iniciar la verificación de identidad. Inténtelo de nuevo.',
  errIncomplete: (list) => `Complete primero el formulario. Falta: ${list}.`,
  errIdUnavailable: 'La verificación de identidad no está disponible temporalmente, por lo que este formulario no se puede enviar ahora.',
  errRateLimited: 'Demasiados intentos desde esta conexión. Espere unos minutos y vuelva a intentarlo.',
  errGeneric: 'Algo ha salido mal. Inténtelo de nuevo.',

  server: {
    TERMS_REQUIRED: 'Debe aceptar los términos y condiciones.',
    FIELD_TOO_LONG: 'Uno de los campos es demasiado largo. Acórtelo e inténtelo de nuevo.',
    INVALID_EMAIL: 'Introduzca un correo electrónico válido.',
    FORM_NOT_OPEN: 'Este formulario todavía no acepta declaraciones.',
    FIELD_REQUIRED: 'Hay un campo obligatorio vacío. Rellene todos los campos marcados con *.',
    BUYER_TYPE_REQUIRED: 'Indique si es particular o empresa.',
    COMPANY_NAME_REQUIRED: 'Indique el nombre de su empresa.',
    VAT_REQUIRED: 'Indique su número de IVA.',
    ID_UNAVAILABLE: 'La verificación de identidad no está disponible temporalmente. Vuelva a intentarlo más tarde.',
    ID_REQUIRED: 'Complete primero la verificación de identidad.',
    ID_EXPIRED: 'Su verificación de identidad ha caducado o ya se ha utilizado. Vuelva a iniciarla.',
    ID_UNCONFIRMED: 'No se pudo confirmar su verificación de identidad. Inténtelo de nuevo.',
    ID_UNFINISHED: 'Su verificación de identidad aún no ha terminado. Complétela e inténtelo de nuevo.',
    ID_DOCUMENT_TYPE: 'Solo se aceptan pasaportes y documentos de identidad.',
    UNDER_AGE: 'Debe tener al menos 18 años para presentar una declaración de usuario final.',
    BOT_CHECK_MISSING: 'Complete la comprobación antirrobot e inténtelo de nuevo.',
    BOT_CHECK_ERROR: 'No se pudo completar la comprobación antirrobot. Inténtelo de nuevo.',
    BOT_CHECK_FAILED: 'No se ha superado la comprobación antirrobot. Inténtelo de nuevo.',
  },

  poweredBy: 'Con la tecnología de',
  howItWorksLink: '¿Cómo funciona?',

  vcDocTitle: 'Verificación completada',
  vcTitle: 'Verificación terminada',
  vcBody: 'Puede cerrar esta ventana y volver al formulario. Se actualiza solo.',
};

export default es;
