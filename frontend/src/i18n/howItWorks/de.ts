import type { HowItWorks } from './en.ts';

const de: HowItWorks = {
  docTitle: 'So funktioniert es',
  badge: 'Für Käufer',
  title: 'So funktioniert es',
  lede: 'Sie wurden gebeten, eine Endverbleibserklärung auszufüllen, bevor Sie eine Chemikalie kaufen. Diese Seite erklärt, warum, was mit Ihren Angaben geschieht und was Sie selbst tun können.',
  sentBy: (seller) => `Sie kommen über das Formular von ${seller}.`,
  backToForm: 'Zurück zum Formular',
  contents: 'Auf dieser Seite',

  shortTitle: 'Kurz gesagt',
  short: [
    'Der Verkäufer muss prüfen, wer bestimmte Chemikalien kauft und wofür. Das schreibt das Gesetz vor, nicht der Shop.',
    'Ihr Ausweisdokument wird von Didit geprüft. Fotos davon erreichen weder den Verkäufer noch uns.',
    'Das Team des Verkäufers liest Ihre Erklärung. Ihre Dokumentnummer bleibt verborgen, solange sie niemand gezielt abruft, und jeder Abruf wird protokolliert.',
    'Nach 18 Monaten wird alles automatisch gelöscht.',
  ],

  whyTitle: 'Warum werde ich danach gefragt?',
  why: [
    'Manche Chemikalien können missbraucht werden, um Sprengstoffe, Drogen oder Waffen herzustellen. EU-Vorschriften — darunter die Verordnung (EU) 2019/1148 über Ausgangsstoffe für Explosivstoffe — verpflichten Verkäufer, zu wissen, an wen sie diese Stoffe verkaufen und wofür, dies festzuhalten und verdächtige Transaktionen zu melden.',
    'Die Erklärung, die Sie ausfüllen, ist diese Aufzeichnung. eustatement ist der Dienst, mit dem der Verkäufer sie einholt.',
  ],

  idTitle: 'Was passiert mit meinem Ausweisdokument?',
  id: [
    'Wenn der Verkäufer eine Identitätsprüfung verlangt, öffnet sich ein sicheres Fenster von Didit, unserem Anbieter für Identitätsprüfungen. Sie fotografieren Ihren Reisepass oder Personalausweis und nehmen ein kurzes Selfie auf. Didit prüft, ob das Dokument echt ist und zu Ihnen gehört.',
    'Die Fotos gehen nur an Didit — sie erreichen weder den Verkäufer noch uns. Sobald das Ergebnis gespeichert ist, wird die Prüfung bei Didit einschließlich der Fotos gelöscht.',
    'Aufbewahrt werden das Ergebnis und die Angaben auf dem Dokument: Ihr Name, die Art des Dokuments und seine Nummer. Ihr Geburtsdatum wird einmal verwendet, um zu prüfen, dass Sie mindestens 18 Jahre alt sind, und wird nicht gespeichert.',
  ],

  storedTitle: 'Was wird gespeichert, und wer kann es sehen?',
  stored: [
    'Die Angaben, die Sie in das Formular eingeben, das Ergebnis der Identitätsprüfung und das Ergebnis der automatischen Prüfungen des Stoffes. Ihre personenbezogenen Daten werden verschlüsselt auf Servern in der EU gespeichert.',
    'Kein anderer Verkäufer kann Ihre Erklärung sehen — nur der Verkäufer, bei dem Sie kaufen, und sein Team. Ihre Dokumentnummer bleibt sogar vor ihm verborgen: Ein Teammitglied muss sie mit einem zweiten Anmeldeschritt bestätigen, um sie zu sehen, und jeder solche Abruf wird protokolliert.',
    'Unsere eigenen Mitarbeitenden können Erklärungen öffnen, wenn das für Betrieb und Support des Dienstes nötig ist. Auch sie sehen eine Dokumentnummer nur, wenn sie sie gezielt abrufen, und dieser Abruf erscheint im Protokoll des Verkäufers.',
  ],

  decideTitle: 'Wer entscheidet?',
  decide: [
    'Eine Person beim Verkäufer liest jede Erklärung und entscheidet. Automatische Prüfungen — ob der Stoff auf einer Liste beschränkter Stoffe steht, ob die angegebene Verwendung Warnsignale enthält, ob die USt-IdNr. eines Unternehmens gültig ist — weisen die prüfende Person nur auf das hin, was einen genaueren Blick verdient. Sie genehmigen oder verweigern nie selbst etwas.',
    'Die einzige Ausnahme ist das Alter: Zeigt Ihr Dokument, dass Sie unter 18 Jahre alt sind, kann die Erklärung nicht gesendet werden.',
    'Ist Ihre Erklärung nicht auf Englisch oder Niederländisch, kann sie für die prüfende Person maschinell übersetzt werden. Das geschieht auf unserem eigenen Server; Ihr Text wird an keinen Übersetzungsdienst gesendet.',
  ],

  keptTitle: 'Wie lange wird es aufbewahrt?',
  kept: [
    '18 Monate ab dem Tag, an dem Sie die Erklärung senden. Danach wird sie automatisch gelöscht, mit allem oben Beschriebenen. Schließt der Verkäufer sein Konto früher, wird sie 30 Tage danach gelöscht.',
  ],

  othersTitle: 'Wer ist sonst noch beteiligt?',
  othersIntro: 'Neben dem Verkäufer und uns spielen diese Stellen eine Rolle:',
  others: [
    ['Didit', 'prüft Ihr Ausweisdokument — nur wenn der Verkäufer das verlangt.'],
    ['Die Europäische Kommission (VIES)', 'prüft die USt-IdNr. — nur wenn Sie für ein Unternehmen bestellen.'],
    ['PubChem und Wikidata', 'helfen, den Stoff zu erkennen. Sie erhalten den Stoffnamen und die CAS-Nummer, nie etwas über Sie.'],
    ['Unser E-Mail-Anbieter', 'stellt die Bestätigung und die Entscheidung in Ihr Postfach zu.'],
    ['Cloudflare', 'schützt die Website vor Angriffen und sieht Ihre IP-Adresse, wenn der Datenverkehr durchläuft.'],
    ['Hetzner', 'betreibt unsere Server in der EU.'],
  ],
  othersMore: 'Die vollständige Liste mit Standorten steht in unserer Datenschutzerklärung (auf Englisch).',

  rightsTitle: 'Welche Rechte habe ich?',
  rights: [
    'Sie können Auskunft über die zu Ihnen gespeicherten Daten verlangen, ihre Berichtigung oder — soweit das Gesetz es erlaubt — ihre Löschung. Der Verkäufer kann verpflichtet sein, die Aufzeichnung so lange aufzubewahren, wie die Vorschriften es verlangen.',
  ],
  controller: (seller) => seller
    ? `${seller} ist für Ihre Daten verantwortlich (der „Verantwortliche“); eustatement verarbeitet sie in dessen Auftrag. Richten Sie Ihre Anfrage an ${seller}.`
    : 'Der Verkäufer ist für Ihre Daten verantwortlich (der „Verantwortliche“); eustatement verarbeitet sie in dessen Auftrag. Richten Sie Ihre Anfrage an den Verkäufer.',
  fallback: (email) => `Erreichen Sie ihn nicht, schreiben Sie an ${email}; wir leiten Ihre Anfrage weiter.`,
  complaint: 'Sie können sich außerdem bei der Datenschutzaufsichtsbehörde in Ihrem Land beschweren.',

  questionsTitle: 'Fragen?',
  questionsOrder: 'Zu Ihrer Bestellung oder zur Entscheidung: Wenden Sie sich an den Verkäufer.',
  questionsData: (email) => `Zu dieser Seite oder zum Umgang mit Ihren Daten: ${email}.`,

  lastUpdated: (date) => `Zuletzt aktualisiert: ${date}`,
  privacyPolicy: 'Datenschutzerklärung',
};

export default de;
