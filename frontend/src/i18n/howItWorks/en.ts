// "How this works" — the page a buyer reaches from the link under every form.
//
// It is the information a person is owed when their data is collected
// (Art. 13 GDPR), written for someone who just wanted to buy a chemical. Every
// sentence must stay true of the code: the retention period, what Didit keeps,
// who can see the document number. When any of those change, this page
// changes with them — in every language — and LAST_UPDATED in lib/legal.ts
// moves.
//
// The whole page counts as LEGAL in the sense of messages/en.ts: have each
// translation read by a native speaker before relying on it.

const en = {
  docTitle: 'How this works',
  badge: 'For buyers',
  title: 'How this works',
  lede: 'You were asked to fill in an end-user statement before buying a chemical. This page explains why, what happens to your details, and what you can do about it.',
  sentBy: (seller: string) => `You came here from the form of ${seller}.`,
  backToForm: 'Back to the form',
  contents: 'On this page',

  shortTitle: 'In short',
  short: [
    'The seller has to check who buys certain chemicals and what for. That is the law, not a choice of the shop.',
    'Your identity document is checked by Didit. Photos of it never reach the seller or us.',
    'The seller’s team reads your statement. Your document number stays hidden unless someone deliberately looks it up, and every look-up is recorded.',
    'Everything is deleted automatically after 18 months.',
  ],

  whyTitle: 'Why am I asked for this?',
  why: [
    'Some chemicals can be misused to make explosives, drugs or weapons. EU rules — Regulation (EU) 2019/1148 on explosives precursors among them — require sellers to know who they sell these substances to and for what purpose, to keep a record, and to report transactions that look suspicious.',
    'The statement you fill in is that record. eustatement is the service the seller uses to collect it.',
  ],

  idTitle: 'What happens to my identity document?',
  id: [
    'If the seller asks for identity verification, a secure window from Didit, our identity verification provider, opens. You photograph your passport or identity card and take a short selfie. Didit checks that the document is genuine and that it belongs to you.',
    'The photos go to Didit only — they never reach the seller or us. As soon as the result is stored, the verification at Didit, photos included, is deleted.',
    'What is kept is the result and what is printed on the document: your name, the type of document and its number. Your date of birth is used once, to check that you are 18 or older, and is not kept.',
  ],

  storedTitle: 'What is stored, and who can see it?',
  stored: [
    'The details you type into the form, the result of the identity check, and the result of the automatic checks on the substance. Your personal details are stored encrypted, on servers in the EU.',
    'No other seller can see your statement — only the seller you are buying from and their team. Your document number stays hidden even from them: a team member has to confirm with a second sign-in step to see it, and each time that happens it is recorded.',
    'Our own staff can open statements when that is needed to run and support the service. They too can see a document number only by deliberately looking it up, and that look-up shows in the seller’s record.',
  ],

  decideTitle: 'Who decides?',
  decide: [
    'A person at the seller reads every statement and decides. Automatic checks — whether the substance is on a restricted list, whether the stated use contains warning signs, whether a company’s VAT number is valid — only point the reviewer at what deserves a closer look. They never approve or refuse anything on their own.',
    'The one exception is age: if your document shows you are under 18, the statement cannot be sent.',
    'If your statement is not in English or Dutch, it may be translated by machine for the reviewer. That happens on our own server; your text is not sent to a translation service.',
  ],

  keptTitle: 'How long is it kept?',
  kept: [
    '18 months from the day you send it. After that it is deleted automatically, with everything described above. If the seller closes their account earlier, it is deleted 30 days after that.',
  ],

  othersTitle: 'Who else is involved?',
  othersIntro: 'Besides the seller and us, these parties play a part:',
  others: [
    ['Didit', 'checks your identity document — only when the seller asks for it.'],
    ['The European Commission (VIES)', 'checks the VAT number — only when you order for a company.'],
    ['PubChem and Wikidata', 'help identify the substance. They receive the substance name and CAS number, never anything about you.'],
    ['Our email provider', 'delivers the confirmation and the decision to your inbox.'],
    ['Cloudflare', 'protects the website against attacks and sees your IP address as traffic passes through.'],
    ['Hetzner', 'hosts our servers in the EU.'],
  ] as [string, string][],
  othersMore: 'The full list, with locations, is in our Privacy Policy.',

  rightsTitle: 'What are my rights?',
  rights: [
    'You can ask to see the data held about you, to have it corrected, or to have it deleted where the law allows — the seller may have to keep the record for as long as the rules require.',
  ],
  controller: (seller?: string) => seller
    ? `${seller} is responsible for your data (the “controller”); eustatement processes it on their behalf. Send your request to ${seller}.`
    : 'The seller is responsible for your data (the “controller”); eustatement processes it on their behalf. Send your request to the seller.',
  fallback: (email: string) => `If you cannot reach them, write to ${email} and we will pass your request on.`,
  complaint: 'You can also complain to the data protection authority in your country.',

  questionsTitle: 'Questions?',
  questionsOrder: 'About your order or the decision: contact the seller.',
  questionsData: (email: string) => `About this page or how your data is handled: ${email}.`,

  lastUpdated: (date: string) => `Last updated: ${date}`,
  privacyPolicy: 'Privacy Policy',
};

export type HowItWorks = typeof en;
export default en;
