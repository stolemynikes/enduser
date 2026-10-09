// Deutsch. ANNEX-IV-Begriffe wörtlich aus der deutschen Fassung von
// Verordnung (EU) 2019/1148, Anhang IV. Regeln siehe en.ts.
import type { Messages } from './en.ts';

const de: Messages = {
  docTitle: 'Endverbleibserklärung',
  docTitleCompany: (company) => `${company} — Erklärung`,
  badge: 'Amtliches Dokument',
  title: 'Endverbleibserklärung',
  subtitle: 'Chemische Stoffe — Erklärung über die regulierte Verwendung',
  submittedTo: (company) => `Eingereicht bei ${company}`,
  themeToggle: 'Hell oder dunkel',

  language: 'Sprache',
  languageSearch: 'Sprache suchen',
  languageNone: 'Keine Sprache gefunden',
  languageSuggested: 'Vorgeschlagen',
  languageAll: 'Alle Sprachen',

  secBuyerType: 'Art des Käufers',
  secContact: 'Kontaktdaten',
  secCompany: 'Unternehmensdaten',
  secAddress: 'Anschrift',
  secSubstance: 'Angaben zum Stoff',
  secIdentity: 'Identitätsprüfung',
  secTerms: 'Geschäftsbedingungen',

  buyerTypeQuestion: 'Bestellen Sie als Privatperson oder im Namen eines Unternehmens?',
  buyerIndividual: 'Privatperson',
  buyerCompany: 'Unternehmen',

  optional: '(optional)',
  email: 'E-Mail',
  orderNumber: 'Bestellnummer',
  firstName: 'Vorname',
  lastName: 'Nachname',
  companyName: 'Name des Unternehmens',
  vatNumber: 'USt-IdNr.',
  vatHint: 'Erforderlich für die EU-Prüfung über VIES, z. B. DE123456789',
  street: 'Straße und Hausnummer',
  zipCode: 'Postleitzahl',
  place: 'Ort',
  country: 'Land',
  countrySelect: '— Bitte wählen —',
  substanceName: 'Name des Stoffes / der Stoffe',
  casNo: 'CAS-Nummer',
  concentration: 'Konzentration',
  concentrationHint: 'Wie auf dem Etikett angegeben, z. B. 15 % w/w. Davon hängen die gesetzlichen Grenzwerte für Ausgangsstoffe ab.',
  intendedUse: 'Beabsichtigte Verwendung',
  intendedUseHint: 'Beschreiben Sie, wofür Sie den Stoff verwenden werden.',

  idNote:
    'Ihr Reisepass oder Personalausweis wird von Didit geprüft, unserem Anbieter für Identitätsprüfungen. '
    + 'Es öffnet sich ein sicheres Fenster, in dem Sie Ihr Dokument fotografieren und ein kurzes Selfie aufnehmen. '
    + 'Die Fotos verbleiben bei Didit — dieses Formular erhält oder speichert sie nie. Gespeichert werden nur '
    + 'das Ergebnis und die auf Ihrem Dokument gedruckten Angaben.',
  idUnavailableTitle: 'Die Identitätsprüfung ist vorübergehend nicht verfügbar',
  idUnavailableNote: (seller) =>
    `Dieses Formular setzt sie voraus und kann deshalb gerade nicht gesendet werden. Bitte versuchen Sie es später erneut oder wenden Sie sich an ${seller ?? 'den Verkäufer'}.`,
  fillFirst: (list) => `Füllen Sie zuerst den Rest des Formulars aus und bestätigen Sie dann Ihre Identität. Noch offen: ${list}.`,
  verifyButton: 'Meine Identität bestätigen',
  verifyOpening: 'Sichere Prüfung wird geöffnet…',
  verifyWaiting: 'Warten auf den Abschluss der Prüfung…',
  verifyWaitingHint: 'Führen Sie die Schritte im Prüffenster aus und kehren Sie dann hierher zurück. Diese Seite aktualisiert sich selbst.',
  verifyBlocked: 'Ihr Browser hat das Prüffenster blockiert.',
  verifyBlockedLink: 'In einem neuen Tab öffnen',
  verifyRestart: 'Fenster geschlossen? Neu beginnen',
  verified: 'Identität bestätigt',
  verifyInReview: 'Ihr Dokument wird manuell geprüft. Sie können das Formular jetzt schon senden — der Verkäufer sieht das Ergebnis.',
  verifyFailedTitle: 'Prüfung nicht bestanden',
  verifyFailedNote: 'Sie können dieses Formular trotzdem senden. Der Verkäufer prüft es dann manuell.',
  verifyTryAgain: 'Erneut versuchen',

  termsIntro: (seller) => seller ? `Geschäftsbedingungen von ${seller}:` : 'Geschäftsbedingungen des Verkäufers:',
  termsReadLink: (seller) => seller ? `Geschäftsbedingungen von ${seller} lesen` : 'Geschäftsbedingungen des Verkäufers lesen',
  termsAsWritten: (seller) => `Diese Bedingungen stammen von ${seller ?? 'dem Verkäufer'} und werden so angezeigt, wie sie verfasst wurden.`,
  agree: 'Ich habe die obenstehenden Geschäftsbedingungen gelesen und stimme ihnen zu',
  defaultTerms: `Hiermit bestätige ich, dass:
— Die Stoffe, Zubereitungen und Produkte nur in zulässiger Weise (im Einklang mit europäischem und nationalem Recht) und ausschließlich für Forschungs-, Wissenschafts- und Bildungszwecke verwendet werden.

Der/die bestellte(n) Stoff(e):
— Nicht zur Herstellung von Betäubungsmitteln und/oder psychotropen Stoffen oder als deren Bestandteil oder Zwischenprodukt verwendet werden.
— Nicht in Arzneimitteln für Mensch oder Tier, in der Landwirtschaft, in Lebensmitteln oder in Kosmetika verwendet werden, außer als Rohstoff, Hilfs- oder Betriebsstoff und/oder als Forschungs- und Analysereagenz.
— Nicht zur Entwicklung oder Herstellung chemischer Waffen verwendet werden.
— Nicht für militärische oder rechtswidrige Zwecke verwendet werden.
— Ohne vorherige Zustimmung der Ausfuhrkontrollbehörden nicht in Drittländer wiederausgeführt werden.
— Nicht wiederausgeführt/ausgeführt oder anderweitig national oder international weiterverkauft oder an ein Ziel übertragen werden, das einem Embargo der EU, der VN oder der USA unterliegt, wenn dies den Bestimmungen dieses Embargos widersprechen würde.
— Nur an Kunden geliefert werden, die ebenfalls eine solche Endverbleibserklärung vorlegen können. Wir bewahren alle erhaltenen Erklärungen sorgfältig auf und legen sie auf Anfrage vor.
— Ich mindestens 18 Jahre alt bin.`,

  requiredNote: 'Pflichtfelder',
  stillToComplete: (list) => `Noch auszufüllen: ${list}.`,
  submitting: 'Wird gesendet…',
  submit: 'Erklärung senden',
  footer: 'Dieses Dokument ist rechtsverbindlich. Alle Angaben können überprüft werden.',

  missing: {
    email: 'eine gültige E-Mail-Adresse',
    firstName: 'Vorname',
    lastName: 'Nachname',
    orderNumber: 'Bestellnummer',
    buyerType: 'ob Sie Privatperson oder Unternehmen sind',
    companyName: 'Name des Unternehmens',
    vatNumber: 'USt-IdNr.',
    street: 'Straße',
    zipCode: 'Postleitzahl',
    place: 'Ort',
    country: 'Land',
    substance: 'Name des Stoffes',
    cas: 'CAS-Nummer',
    concentration: 'Konzentration',
    intendedUse: 'beabsichtigte Verwendung',
    identity: 'Identitätsprüfung',
    terms: 'Zustimmung zu den Bedingungen',
    robot: 'die Prüfung gegen Roboter',
  },

  successTitle: 'Erklärung erhalten',
  successBody: 'Ihre Endverbleibserklärung wurde gesendet. Sie erhalten eine Bestätigung per E-Mail und eine weitere Nachricht, sobald sie geprüft wurde.',
  successNote: 'Bitte bewahren Sie diese Bestätigung für Ihre Unterlagen auf.',
  notFoundTitle: 'Formular nicht gefunden',
  notFoundBody: 'Unter dieser Adresse gibt es kein Formular. Bitte prüfen Sie den Link.',
  notReadyTitle: 'Formular noch nicht verfügbar',
  notReadyBody: 'Dieses Formular nimmt noch keine Erklärungen entgegen. Bitte versuchen Sie es später erneut.',
  contactSupplier: 'Wenn Sie diesen Link von einem Lieferanten erhalten haben, wenden Sie sich bitte an ihn.',

  errVerifyExpired: 'Ihre Prüfsitzung ist abgelaufen. Bitte starten Sie sie erneut.',
  errVerifyStart: 'Die Identitätsprüfung konnte nicht gestartet werden. Bitte versuchen Sie es erneut.',
  errIncomplete: (list) => `Bitte füllen Sie zuerst das Formular vollständig aus. Noch offen: ${list}.`,
  errIdUnavailable: 'Die Identitätsprüfung ist vorübergehend nicht verfügbar, daher kann dieses Formular gerade nicht gesendet werden.',
  errRateLimited: 'Zu viele Versuche von dieser Verbindung. Bitte warten Sie einige Minuten und versuchen Sie es erneut.',
  errGeneric: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',

  server: {
    TERMS_REQUIRED: 'Sie müssen den Geschäftsbedingungen zustimmen.',
    FIELD_TOO_LONG: 'Eines der Felder ist zu lang. Bitte kürzen Sie es und versuchen Sie es erneut.',
    INVALID_EMAIL: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
    FORM_NOT_OPEN: 'Dieses Formular nimmt noch keine Erklärungen entgegen.',
    FIELD_REQUIRED: 'Ein Pflichtfeld ist leer. Bitte füllen Sie alle mit * markierten Felder aus.',
    BUYER_TYPE_REQUIRED: 'Bitte wählen Sie, ob Sie Privatperson oder Unternehmen sind.',
    COMPANY_NAME_REQUIRED: 'Bitte geben Sie den Namen Ihres Unternehmens ein.',
    VAT_REQUIRED: 'Bitte geben Sie Ihre USt-IdNr. ein.',
    ID_UNAVAILABLE: 'Die Identitätsprüfung ist vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.',
    ID_REQUIRED: 'Bitte schließen Sie zuerst die Identitätsprüfung ab.',
    ID_EXPIRED: 'Ihre Identitätsprüfung ist abgelaufen oder wurde bereits verwendet. Bitte starten Sie sie erneut.',
    ID_UNCONFIRMED: 'Ihre Identitätsprüfung konnte nicht bestätigt werden. Bitte versuchen Sie es erneut.',
    ID_UNFINISHED: 'Ihre Identitätsprüfung ist noch nicht abgeschlossen. Bitte schließen Sie sie ab und versuchen Sie es erneut.',
    ID_DOCUMENT_TYPE: 'Es werden nur Reisepässe und Personalausweise akzeptiert.',
    UNDER_AGE: 'Sie müssen mindestens 18 Jahre alt sein, um eine Endverbleibserklärung abzugeben.',
    BOT_CHECK_MISSING: 'Bitte schließen Sie die Prüfung gegen Roboter ab und versuchen Sie es erneut.',
    BOT_CHECK_ERROR: 'Die Prüfung gegen Roboter konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.',
    BOT_CHECK_FAILED: 'Die Prüfung gegen Roboter wurde nicht bestanden. Bitte versuchen Sie es erneut.',
  },

  poweredBy: 'Bereitgestellt von',
  howItWorksLink: 'Wie funktioniert das?',

  vcDocTitle: 'Prüfung abgeschlossen',
  vcTitle: 'Prüfung beendet',
  vcBody: 'Sie können dieses Fenster schließen und zum Formular zurückkehren. Es aktualisiert sich selbst.',
};

export default de;
