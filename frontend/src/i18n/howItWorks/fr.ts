import type { HowItWorks } from './en.ts';

const fr: HowItWorks = {
  docTitle: 'Comment cela fonctionne',
  badge: 'Pour les acheteurs',
  title: 'Comment cela fonctionne',
  lede: 'On vous a demandé de remplir une déclaration d’utilisateur final avant d’acheter un produit chimique. Cette page explique pourquoi, ce qu’il advient de vos informations et ce que vous pouvez faire.',
  sentBy: (seller) => `Vous arrivez depuis le formulaire de ${seller}.`,
  backToForm: 'Retour au formulaire',
  contents: 'Sur cette page',

  shortTitle: 'En bref',
  short: [
    'Le vendeur doit vérifier qui achète certains produits chimiques et dans quel but. C’est la loi, pas un choix de la boutique.',
    'Votre pièce d’identité est vérifiée par Didit. Les photos ne parviennent jamais au vendeur ni à nous.',
    'L’équipe du vendeur lit votre déclaration. Votre numéro de document reste caché tant que personne ne le consulte délibérément, et chaque consultation est enregistrée.',
    'Tout est supprimé automatiquement après 18 mois.',
  ],

  whyTitle: 'Pourquoi me demande-t-on cela ?',
  why: [
    'Certains produits chimiques peuvent être détournés pour fabriquer des explosifs, des drogues ou des armes. Des règles européennes — dont le règlement (UE) 2019/1148 relatif aux précurseurs d’explosifs — obligent les vendeurs à savoir à qui ils vendent ces substances et pour quel usage, à en garder une trace et à signaler les transactions suspectes.',
    'La déclaration que vous remplissez est cette trace. eustatement est le service que le vendeur utilise pour la recueillir.',
  ],

  idTitle: 'Qu’advient-il de ma pièce d’identité ?',
  id: [
    'Si le vendeur demande une vérification d’identité, une fenêtre sécurisée de Didit, notre prestataire de vérification d’identité, s’ouvre. Vous photographiez votre passeport ou votre carte d’identité et prenez un court selfie. Didit vérifie que le document est authentique et qu’il vous appartient.',
    'Les photos ne vont qu’à Didit — elles ne parviennent jamais au vendeur ni à nous. Dès que le résultat est enregistré, la vérification chez Didit, photos comprises, est supprimée.',
    'Ce qui est conservé, c’est le résultat et ce qui est imprimé sur le document : votre nom, le type de document et son numéro. Votre date de naissance sert une seule fois, à vérifier que vous avez au moins 18 ans, et n’est pas conservée.',
  ],

  storedTitle: 'Qu’est-ce qui est conservé, et qui peut le voir ?',
  stored: [
    'Les informations que vous saisissez dans le formulaire, le résultat de la vérification d’identité et celui des contrôles automatiques de la substance. Vos données personnelles sont conservées chiffrées, sur des serveurs situés dans l’UE.',
    'Aucun autre vendeur ne peut voir votre déclaration — seuls le vendeur auprès duquel vous achetez et son équipe. Votre numéro de document reste caché même pour eux : un membre de l’équipe doit confirmer par une seconde étape de connexion pour le voir, et chaque consultation est enregistrée.',
    'Notre propre personnel peut ouvrir des déclarations lorsque c’est nécessaire au fonctionnement et à l’assistance du service. Lui aussi ne voit un numéro de document qu’en le consultant délibérément, et cette consultation apparaît dans le registre du vendeur.',
  ],

  decideTitle: 'Qui décide ?',
  decide: [
    'Une personne chez le vendeur lit chaque déclaration et décide. Les contrôles automatiques — la substance figure-t-elle sur une liste restreinte, l’usage indiqué contient-il des signaux d’alerte, le numéro de TVA d’une entreprise est-il valide — ne font que signaler à la personne chargée de l’examen ce qui mérite un second regard. Ils n’approuvent ni ne refusent jamais rien d’eux-mêmes.',
    'La seule exception est l’âge : si votre document indique que vous avez moins de 18 ans, la déclaration ne peut pas être envoyée.',
    'Si votre déclaration n’est ni en anglais ni en néerlandais, elle peut être traduite automatiquement pour la personne chargée de l’examen. Cela se fait sur notre propre serveur ; votre texte n’est envoyé à aucun service de traduction.',
  ],

  keptTitle: 'Combien de temps est-ce conservé ?',
  kept: [
    '18 mois à compter du jour de l’envoi. Ensuite, la déclaration est supprimée automatiquement, avec tout ce qui est décrit ci-dessus. Si le vendeur ferme son compte plus tôt, elle est supprimée 30 jours après.',
  ],

  othersTitle: 'Qui d’autre intervient ?',
  othersIntro: 'Outre le vendeur et nous, ces acteurs interviennent :',
  others: [
    ['Didit', 'vérifie votre pièce d’identité — uniquement si le vendeur le demande.'],
    ['La Commission européenne (VIES)', 'vérifie le numéro de TVA — uniquement si vous commandez pour une entreprise.'],
    ['PubChem et Wikidata', 'aident à identifier la substance. Ils reçoivent le nom de la substance et le numéro CAS, jamais rien vous concernant.'],
    ['Notre fournisseur d’e-mail', 'achemine la confirmation et la décision dans votre boîte de réception.'],
    ['Cloudflare', 'protège le site contre les attaques et voit votre adresse IP au passage du trafic.'],
    ['Hetzner', 'héberge nos serveurs dans l’UE.'],
  ],
  othersMore: 'La liste complète, avec les pays d’établissement, figure dans notre politique de confidentialité (en anglais).',

  rightsTitle: 'Quels sont mes droits ?',
  rights: [
    'Vous pouvez demander à consulter les données vous concernant, à les faire rectifier ou à les faire effacer lorsque la loi le permet — le vendeur peut être tenu de conserver la trace aussi longtemps que les règles l’exigent.',
  ],
  controller: (seller) => seller
    ? `${seller} est responsable de vos données (le « responsable du traitement ») ; eustatement les traite pour son compte. Adressez votre demande à ${seller}.`
    : 'Le vendeur est responsable de vos données (le « responsable du traitement ») ; eustatement les traite pour son compte. Adressez votre demande au vendeur.',
  fallback: (email) => `Si vous ne parvenez pas à le joindre, écrivez à ${email} ; nous transmettrons votre demande.`,
  complaint: 'Vous pouvez également introduire une réclamation auprès de l’autorité de protection des données de votre pays.',

  questionsTitle: 'Des questions ?',
  questionsOrder: 'Concernant votre commande ou la décision : contactez le vendeur.',
  questionsData: (email) => `Concernant cette page ou le traitement de vos données : ${email}.`,

  lastUpdated: (date) => `Dernière mise à jour : ${date}`,
  privacyPolicy: 'Politique de confidentialité',
};

export default fr;
