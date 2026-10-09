import type { HowItWorks } from './en.ts';

const es: HowItWorks = {
  docTitle: 'Cómo funciona',
  badge: 'Para compradores',
  title: 'Cómo funciona',
  lede: 'Se le ha pedido que rellene una declaración de usuario final antes de comprar un producto químico. Esta página explica por qué, qué ocurre con sus datos y qué puede hacer usted.',
  sentBy: (seller) => `Ha llegado aquí desde el formulario de ${seller}.`,
  backToForm: 'Volver al formulario',
  contents: 'En esta página',

  shortTitle: 'En resumen',
  short: [
    'El vendedor debe comprobar quién compra determinados productos químicos y para qué. Lo exige la ley, no es una decisión de la tienda.',
    'Su documento de identidad lo comprueba Didit. Las fotos nunca llegan al vendedor ni a nosotros.',
    'El equipo del vendedor lee su declaración. Su número de documento permanece oculto salvo que alguien lo consulte deliberadamente, y cada consulta queda registrada.',
    'Todo se elimina automáticamente a los 18 meses.',
  ],

  whyTitle: '¿Por qué se me pide esto?',
  why: [
    'Algunos productos químicos pueden utilizarse indebidamente para fabricar explosivos, drogas o armas. Las normas de la UE — entre ellas el Reglamento (UE) 2019/1148 sobre precursores de explosivos — obligan a los vendedores a saber a quién venden estas sustancias y con qué fin, a dejar constancia de ello y a comunicar las transacciones sospechosas.',
    'La declaración que usted rellena es esa constancia. eustatement es el servicio que el vendedor utiliza para recogerla.',
  ],

  idTitle: '¿Qué ocurre con mi documento de identidad?',
  id: [
    'Si el vendedor solicita una verificación de identidad, se abre una ventana segura de Didit, nuestro proveedor de verificación de identidad. Usted fotografía su pasaporte o documento de identidad y se hace un breve selfie. Didit comprueba que el documento es auténtico y que le pertenece.',
    'Las fotos van solo a Didit: nunca llegan al vendedor ni a nosotros. En cuanto se guarda el resultado, la verificación en Didit, fotos incluidas, se elimina.',
    'Se conserva el resultado y lo que figura impreso en el documento: su nombre, el tipo de documento y su número. Su fecha de nacimiento se usa una sola vez, para comprobar que tiene 18 años o más, y no se conserva.',
  ],

  storedTitle: '¿Qué se guarda y quién puede verlo?',
  stored: [
    'Los datos que usted introduce en el formulario, el resultado de la verificación de identidad y el de las comprobaciones automáticas de la sustancia. Sus datos personales se guardan cifrados, en servidores situados en la UE.',
    'Ningún otro vendedor puede ver su declaración: solo el vendedor al que compra y su equipo. Su número de documento permanece oculto incluso para ellos: un miembro del equipo debe confirmarlo con un segundo paso de inicio de sesión para verlo, y cada vez que esto ocurre queda registrado.',
    'Nuestro propio personal puede abrir declaraciones cuando es necesario para el funcionamiento y el soporte del servicio. También ellos solo ven un número de documento si lo consultan deliberadamente, y esa consulta aparece en el registro del vendedor.',
  ],

  decideTitle: '¿Quién decide?',
  decide: [
    'Una persona del vendedor lee cada declaración y decide. Las comprobaciones automáticas — si la sustancia figura en una lista restringida, si el uso indicado contiene señales de alerta, si el número de IVA de una empresa es válido — solo indican a quien revisa qué merece una segunda mirada. Nunca aprueban ni rechazan nada por sí solas.',
    'La única excepción es la edad: si su documento muestra que tiene menos de 18 años, la declaración no puede enviarse.',
    'Si su declaración no está en inglés ni en neerlandés, puede traducirse automáticamente para quien la revisa. Eso ocurre en nuestro propio servidor; su texto no se envía a ningún servicio de traducción.',
  ],

  keptTitle: '¿Cuánto tiempo se conserva?',
  kept: [
    '18 meses desde el día en que la envía. Después se elimina automáticamente, junto con todo lo descrito arriba. Si el vendedor cierra su cuenta antes, se elimina 30 días después.',
  ],

  othersTitle: '¿Quién más interviene?',
  othersIntro: 'Además del vendedor y de nosotros, intervienen estas partes:',
  others: [
    ['Didit', 'comprueba su documento de identidad, solo si el vendedor lo solicita.'],
    ['La Comisión Europea (VIES)', 'comprueba el número de IVA, solo si compra para una empresa.'],
    ['PubChem y Wikidata', 'ayudan a identificar la sustancia. Reciben el nombre de la sustancia y el número CAS, nunca nada sobre usted.'],
    ['Nuestro proveedor de correo electrónico', 'entrega la confirmación y la decisión en su buzón.'],
    ['Cloudflare', 'protege el sitio web frente a ataques y ve su dirección IP cuando pasa el tráfico.'],
    ['Hetzner', 'aloja nuestros servidores en la UE.'],
  ],
  othersMore: 'La lista completa, con su ubicación, figura en nuestra política de privacidad (en inglés).',

  rightsTitle: '¿Cuáles son mis derechos?',
  rights: [
    'Puede solicitar ver los datos que se conservan sobre usted, que se corrijan o que se supriman cuando la ley lo permita; el vendedor puede estar obligado a conservar la constancia mientras las normas lo exijan.',
  ],
  controller: (seller) => seller
    ? `${seller} es responsable de sus datos (el «responsable del tratamiento»); eustatement los trata por su cuenta. Envíe su solicitud a ${seller}.`
    : 'El vendedor es responsable de sus datos (el «responsable del tratamiento»); eustatement los trata por su cuenta. Envíe su solicitud al vendedor.',
  fallback: (email) => `Si no consigue contactar con él, escriba a ${email} y le haremos llegar su solicitud.`,
  complaint: 'También puede presentar una reclamación ante la autoridad de protección de datos de su país.',

  questionsTitle: '¿Preguntas?',
  questionsOrder: 'Sobre su pedido o la decisión: póngase en contacto con el vendedor.',
  questionsData: (email) => `Sobre esta página o el tratamiento de sus datos: ${email}.`,

  lastUpdated: (date) => `Última actualización: ${date}`,
  privacyPolicy: 'Política de privacidad',
};

export default es;
