// Français. Termes ANNEX IV repris tels quels de la version française du
// règlement (UE) 2019/1148, annexe IV. Règles : voir en.ts.
import type { Messages } from './en.ts';

const fr: Messages = {
  docTitle: 'Déclaration d’utilisateur final',
  docTitleCompany: (company) => `${company} — Déclaration`,
  badge: 'Document officiel',
  title: 'Déclaration d’utilisateur final',
  subtitle: 'Substances chimiques — déclaration d’utilisation réglementée',
  submittedTo: (company) => `Adressée à ${company}`,
  themeToggle: 'Clair ou sombre',

  language: 'Langue',
  languageSearch: 'Rechercher une langue',
  languageNone: 'Aucune langue trouvée',
  languageSuggested: 'Suggérées',
  languageAll: 'Toutes les langues',

  secBuyerType: 'Type d’acheteur',
  secContact: 'Coordonnées',
  secCompany: 'Informations sur l’entreprise',
  secAddress: 'Adresse',
  secSubstance: 'Informations sur la substance',
  secIdentity: 'Vérification d’identité',
  secTerms: 'Conditions générales',

  buyerTypeQuestion: 'Commandez-vous en tant que particulier ou pour le compte d’une entreprise ?',
  buyerIndividual: 'Particulier',
  buyerCompany: 'Entreprise',

  optional: '(facultatif)',
  email: 'E-mail',
  orderNumber: 'Numéro de commande',
  firstName: 'Prénom',
  lastName: 'Nom',
  companyName: 'Nom de l’entreprise',
  vatNumber: 'Numéro de TVA',
  vatHint: 'Nécessaire pour la vérification européenne VIES, p. ex. FR12345678901',
  street: 'Rue et numéro',
  zipCode: 'Code postal',
  place: 'Ville',
  country: 'Pays',
  countrySelect: '— Choisir —',
  substanceName: 'Nom de la ou des substances',
  casNo: 'N° CAS',
  concentration: 'Concentration',
  concentrationHint: 'Telle qu’indiquée sur l’étiquette, p. ex. 15 % m/m. Les limites légales applicables aux précurseurs en dépendent.',
  intendedUse: 'Usage prévu',
  intendedUseHint: 'Décrivez l’usage que vous ferez de la substance.',

  idNote:
    'Votre passeport ou votre carte d’identité est vérifié par Didit, notre prestataire de vérification d’identité. '
    + 'Une fenêtre sécurisée s’ouvre, dans laquelle vous photographiez votre document et prenez un court selfie. '
    + 'Les photos restent chez Didit — ce formulaire ne les reçoit ni ne les conserve jamais. Seuls le résultat '
    + 'et les informations imprimées sur votre document sont conservés.',
  idUnavailableTitle: 'La vérification d’identité est temporairement indisponible',
  idUnavailableNote: (seller) =>
    `Ce formulaire l’exige ; il ne peut donc pas être envoyé pour le moment. Veuillez réessayer plus tard ou contacter ${seller ?? 'le vendeur'}.`,
  fillFirst: (list) => `Remplissez d’abord le reste du formulaire, puis vérifiez votre identité. Il manque encore : ${list}.`,
  verifyButton: 'Vérifier mon identité',
  verifyOpening: 'Ouverture de la vérification sécurisée…',
  verifyWaiting: 'En attente de la fin de votre vérification…',
  verifyWaitingHint: 'Suivez les étapes dans la fenêtre de vérification, puis revenez ici. Cette page se met à jour toute seule.',
  verifyBlocked: 'Votre navigateur a bloqué la fenêtre de vérification.',
  verifyBlockedLink: 'L’ouvrir dans un nouvel onglet',
  verifyRestart: 'Fenêtre fermée ? Recommencer',
  verified: 'Identité vérifiée',
  verifyInReview: 'Votre document est vérifié manuellement. Vous pouvez déjà envoyer le formulaire — le vendeur verra le résultat.',
  verifyFailedTitle: 'Vérification non réussie',
  verifyFailedNote: 'Vous pouvez tout de même envoyer ce formulaire. Le vendeur l’examinera manuellement.',
  verifyTryAgain: 'Réessayer',

  termsIntro: (seller) => seller ? `Conditions générales de ${seller} :` : 'Conditions générales du vendeur :',
  termsReadLink: (seller) => seller ? `Lire les conditions générales de ${seller}` : 'Lire les conditions générales du vendeur',
  termsAsWritten: (seller) => `Ces conditions sont fixées par ${seller ?? 'le vendeur'} et sont affichées telles qu’elles ont été rédigées.`,
  agree: 'J’ai lu les conditions générales ci-dessus et je les accepte',
  defaultTerms: `Je confirme par la présente que :
— Les substances, préparations et produits sont utilisés uniquement de manière autorisée (conformément à la législation européenne et nationale), et uniquement à des fins de recherche, scientifiques et éducatives.

La ou les substances commandées :
— Ne sont pas utilisées pour fabriquer des stupéfiants et/ou des substances psychotropes, ni comme constituant ou intermédiaire de ceux-ci.
— Ne sont pas utilisées dans des médicaments à usage humain ou vétérinaire, dans l’agriculture, les denrées alimentaires ou les cosmétiques, sauf comme matière première, auxiliaire ou matière de fonctionnement et/ou comme réactif de recherche et d’analyse.
— Ne sont pas utilisées pour développer ou produire des armes chimiques.
— Ne seront pas utilisées à des fins militaires ou illégales.
— Ne sont pas réexportées vers des pays tiers sans l’accord préalable des autorités de contrôle des exportations.
— Ne seront pas réexportées/exportées, ni revendues sur le plan national ou international, ni transférées vers une destination soumise à un embargo de l’UE, de l’ONU ou des États-Unis, si cela devait contrevenir aux conditions de cet embargo.
— Ne sont fournies qu’à des clients qui peuvent également présenter un tel certificat d’utilisation finale. Nous conservons soigneusement tous les certificats reçus et les présentons sur demande.
— J’ai plus de 18 ans.`,

  requiredNote: 'Champs obligatoires',
  stillToComplete: (list) => `Reste à remplir : ${list}.`,
  submitting: 'Envoi en cours…',
  submit: 'Envoyer la déclaration',
  footer: 'Ce document est juridiquement contraignant. Toutes les informations fournies peuvent faire l’objet d’une vérification.',

  missing: {
    email: 'une adresse e-mail valide',
    firstName: 'prénom',
    lastName: 'nom',
    orderNumber: 'numéro de commande',
    buyerType: 'si vous êtes un particulier ou une entreprise',
    companyName: 'nom de l’entreprise',
    vatNumber: 'numéro de TVA',
    street: 'rue',
    zipCode: 'code postal',
    place: 'ville',
    country: 'pays',
    substance: 'nom de la substance',
    cas: 'numéro CAS',
    concentration: 'concentration',
    intendedUse: 'usage prévu',
    identity: 'vérification d’identité',
    terms: 'acceptation des conditions',
    robot: 'la vérification anti-robot',
  },

  successTitle: 'Déclaration reçue',
  successBody: 'Votre déclaration d’utilisateur final a été envoyée. Vous recevrez une confirmation par e-mail, puis un autre message une fois qu’elle aura été examinée.',
  successNote: 'Conservez cette confirmation pour vos dossiers.',
  notFoundTitle: 'Formulaire introuvable',
  notFoundBody: 'Il n’y a pas de formulaire à cette adresse. Veuillez vérifier le lien.',
  notReadyTitle: 'Formulaire pas encore disponible',
  notReadyBody: 'Ce formulaire n’accepte pas encore de déclarations. Veuillez réessayer plus tard.',
  contactSupplier: 'Si vous avez reçu ce lien d’un fournisseur, contactez-le pour obtenir de l’aide.',

  errVerifyExpired: 'Votre session de vérification a expiré. Veuillez la recommencer.',
  errVerifyStart: 'La vérification d’identité n’a pas pu démarrer. Veuillez réessayer.',
  errIncomplete: (list) => `Veuillez d’abord remplir le formulaire. Il manque encore : ${list}.`,
  errIdUnavailable: 'La vérification d’identité est temporairement indisponible ; ce formulaire ne peut donc pas être envoyé pour le moment.',
  errRateLimited: 'Trop de tentatives depuis cette connexion. Veuillez patienter quelques minutes et réessayer.',
  errGeneric: 'Une erreur s’est produite. Veuillez réessayer.',

  server: {
    TERMS_REQUIRED: 'Vous devez accepter les conditions générales.',
    FIELD_TOO_LONG: 'L’un des champs est trop long. Veuillez le raccourcir et réessayer.',
    INVALID_EMAIL: 'Veuillez saisir une adresse e-mail valide.',
    FORM_NOT_OPEN: 'Ce formulaire n’accepte pas encore de déclarations.',
    FIELD_REQUIRED: 'Un champ obligatoire est vide. Veuillez remplir tous les champs marqués d’un *.',
    BUYER_TYPE_REQUIRED: 'Veuillez indiquer si vous êtes un particulier ou une entreprise.',
    COMPANY_NAME_REQUIRED: 'Veuillez indiquer le nom de votre entreprise.',
    VAT_REQUIRED: 'Veuillez indiquer votre numéro de TVA.',
    ID_UNAVAILABLE: 'La vérification d’identité est temporairement indisponible. Veuillez réessayer plus tard.',
    ID_REQUIRED: 'Veuillez d’abord terminer la vérification d’identité.',
    ID_EXPIRED: 'Votre vérification d’identité a expiré ou a déjà été utilisée. Veuillez la recommencer.',
    ID_UNCONFIRMED: 'Votre vérification d’identité n’a pas pu être confirmée. Veuillez réessayer.',
    ID_UNFINISHED: 'Votre vérification d’identité n’est pas encore terminée. Veuillez la terminer et réessayer.',
    ID_DOCUMENT_TYPE: 'Seuls les passeports et les cartes d’identité sont acceptés.',
    UNDER_AGE: 'Vous devez avoir au moins 18 ans pour soumettre une déclaration d’utilisateur final.',
    BOT_CHECK_MISSING: 'Veuillez terminer la vérification anti-robot et réessayer.',
    BOT_CHECK_ERROR: 'La vérification anti-robot n’a pas pu aboutir. Veuillez réessayer.',
    BOT_CHECK_FAILED: 'La vérification anti-robot a échoué. Veuillez réessayer.',
  },

  poweredBy: 'Propulsé par',
  howItWorksLink: 'Comment cela fonctionne-t-il ?',

  vcDocTitle: 'Vérification terminée',
  vcTitle: 'Vérification terminée',
  vcBody: 'Vous pouvez fermer cette fenêtre et revenir au formulaire. Il se met à jour tout seul.',
};

export default fr;
