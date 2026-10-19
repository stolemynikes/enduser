export const typeDefs = `#graphql
  enum ViesStatus {
    VALID
    INVALID
    ERROR
    NOT_CHECKED
  }

  enum ViesAddressMatch {
    NOT_CHECKED
    UNAVAILABLE
    MATCH
    PARTIAL
    MISMATCH
  }

  enum FieldMode {
    REQUIRED
    OPTIONAL
    HIDDEN
  }

  enum CustomTermsMode {
    TEXT
    LINK
  }

  enum BuyerType {
    INDIVIDUAL
    COMPANY
  }

  enum BuyerPolicy {
    COMPANY_ONLY
    INDIVIDUAL_ONLY
    BOTH
  }

  type FormFieldConfig {
    orderNumber: FieldMode!
    address: FieldMode!
    buyerTypes: BuyerPolicy!
    casNumbers: FieldMode!
    concentration: FieldMode!
    idVerification: FieldMode!
    customTermsMode: CustomTermsMode!
    customTermsText: String!
    customTermsUrl: String!
  }

  input FormFieldConfigInput {
    orderNumber: FieldMode!
    address: FieldMode!
    buyerTypes: BuyerPolicy!
    casNumbers: FieldMode!
    concentration: FieldMode
    idVerification: FieldMode!
    customTermsMode: CustomTermsMode
    customTermsText: String
    customTermsUrl: String
  }

  type PublicFormInfo {
    companyName: String!
    configured: Boolean!
    config: FormFieldConfig!
    """False when the platform has no identity verification provider configured."""
    identityVerificationAvailable: Boolean!
  }

  enum SubmissionStatus {
    PENDING_REVIEW
    APPROVED
    DENIED
  }

  enum SubstanceCheckStatus {
    NOT_CHECKED
    PENDING
    OK
    FLAGGED
    ERROR
  }

  enum IdDocumentType {
    PASSPORT
    ID_CARD
  }

  enum IdVerificationStatus {
    NOT_CHECKED
    PENDING
    IN_REVIEW
    APPROVED
    DECLINED
    EXPIRED
    ERROR
  }

  enum OverrideCategory {
    VIES
    IDENTITY
    SUBSTANCE
  }

  type SubmissionOverride {
    id: ID!
    category: OverrideCategory!
    reason: String!
    createdByName: String!
    createdAt: String!
  }

  type Submission {
    id: ID!
    email: String!
    orderNumber: String!
    firstName: String!
    lastName: String!
    street: String!
    zipCode: String!
    place: String!
    country: String!
    companyName: String!
    vatNumber: String!
    buyerType: BuyerType!
    substances: String!
    casNumbers: String!
    concentration: String
    statement: String!
    """Language the stated use is written in (ISO 639-1), when it could be told."""
    statementLang: String
    """
    English machine translation of the stated use, made on this server. A
    reading aid only — the original is the record.
    """
    statementTranslation: String
    """Language the buyer chose on the form."""
    locale: String
    idDocumentName: String
    idDocumentType: IdDocumentType
    idDocumentNumber: String
    idDataCollectedAt: String
    idMrzValid: Boolean
    idLikelySynthetic: Boolean
    idDocumentExpiry: String
    idVerificationStatus: IdVerificationStatus!
    idLivenessPassed: Boolean
    idFaceMatch: Boolean
    idVerificationWarnings: String
    idVerificationCheckedAt: String
    idVerificationPurged: Boolean!
    viesStatus: ViesStatus!
    viesName: String
    viesAddress: String
    viesAddressMatch: ViesAddressMatch!
    substanceCheckStatus: SubstanceCheckStatus!
    substanceCheckNote: String
    substanceCheckedAt: String
    status: SubmissionStatus!
    adminNote: String
    reviewedByName: String
    reviewedAt: String
    overrides: [SubmissionOverride!]!
    isTest: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type SubstanceTestResult {
    status: String!
    note: String!
  }

  type ViesTestResult {
    status: ViesStatus!
    name: String
    address: String
    addressMatch: ViesAddressMatch!
  }

  input TestSubmissionInput {
    buyerType: BuyerType
    companyName: String
    vatNumber: String
    firstName: String
    lastName: String
    email: String
    street: String
    zipCode: String
    place: String
    country: String
    substances: String
    casNumbers: String
    statement: String
    companySlug: String
    """
    Identity outcome to simulate. Lets the dashboard's warning states be
    exercised without spending a real Didit verification — several of them
    (ERROR, an unsupported document type) are otherwise hard to produce on
    demand. Only ever applied to isTest submissions.
    """
    idVerificationStatus: IdVerificationStatus
    idDocumentType: IdDocumentType
    idDocumentName: String
    idDocumentNumber: String
    """ISO date (YYYY-MM-DD). A past date exercises the expired-document warning."""
    idDocumentExpiry: String
    idLivenessPassed: Boolean
    idFaceMatch: Boolean
    idVerificationWarnings: String
    idVerificationPurged: Boolean
  }

  type AuthPayload {
    token: String!
  }

  enum CompanyRole {
    OWNER
    EMPLOYEE_PLUS
    EMPLOYEE
  }

  enum AccessStatus {
    PENDING
    APPROVED
    REJECTED
  }

  type Company {
    id: ID!
    name: String!
    slug: String!
    formConfigured: Boolean!
    """Whether a platform admin has opened this company's form. Until then it takes no submissions."""
    accessStatus: AccessStatus!
    rejectionReason: String
    """Set once the owner closes the account; the purge follows 30 days later."""
    deletionRequestedAt: String
    deletionScheduledFor: String
  }

  type MyCompany {
    id: ID!
    name: String!
    slug: String!
    role: CompanyRole!
    current: Boolean!
  }

  type SubmissionCounts {
    all: Int!
    pending: Int!
    approved: Int!
    denied: Int!
    tests: Int!
  }

  type MyAccount {
    id: ID!
    email: String!
    name: String!
    emailVerified: Boolean!
    mfaEnabled: Boolean!
    """How many single-use recovery codes are still unspent."""
    recoveryCodesLeft: Int!
  }

  type CompanyMember {
    id: ID!
    userId: ID!
    email: String!
    name: String!
    role: CompanyRole!
    joinedAt: String!
  }

  type CompanyInviteResult {
    ok: Boolean!
    """Only on a local instance with no public address; otherwise the link exists in the invitee's email alone."""
    inviteUrl: String
  }

  type CompanyAuthPayload {
    token: String!
    company: Company!
    role: CompanyRole!
  }

  """A company that asked for access, as the platform admin sees it."""
  type AccessRequest {
    id: ID!
    name: String!
    slug: String!
    status: AccessStatus!
    requestNote: String
    ownerName: String
    ownerEmail: String
    """Whether the applicant has confirmed the address they signed up with."""
    ownerEmailVerified: Boolean!
    formConfigured: Boolean!
    rejectionReason: String
    createdAt: String!
    decidedAt: String
  }

  type CompanyActivity {
    id: ID!
    name: String!
    slug: String!
    accessStatus: AccessStatus!
    membersCount: Int!
    submissionsCount: Int!
    pendingCount: Int!
    configured: Boolean!
    lastSubmissionAt: String
    createdAt: String!
  }

  type WeekPoint {
    weekStart: String!
    submissions: Int!
    companies: Int!
  }

  """How an outside service last answered. Counts and times only."""
  type ServiceStatus {
    service: String!
    """OK, DEGRADED (failing, fewer than 3 in a row), DOWN, UNKNOWN (not called yet) or DISABLED (not configured)."""
    state: String!
    lastOkAt: String
    lastFailAt: String
    failStreak: Int!
  }

  type CheckStats {
    """substance, vies or identity."""
    kind: String!
    ok: Int!
    """Flagged (substance), invalid (VIES), declined or expired (identity)."""
    flagged: Int!
    error: Int!
    """Still undecided: substance checks running, identity checks in review."""
    open: Int!
    """Failed checks a reviewer overrode with a reason."""
    overridden: Int!
  }

  type DiditStats {
    started: Int!
    submitted: Int!
    purgedAfterSubmit: Int!
    purgedAbandoned: Int!
    purgedRefused: Int!
    purgeFailed: Int!
    gaveUp: Int!
    """Submitted checks still in review after 7 days, at any age."""
    stuckInReview: Int!
  }

  type MailFailure {
    kind: String!
    count: Int!
  }

  """Platform health for the admin. Aggregates only: no names, no reasons, no buyer data."""
  type AdminHealth {
    days: Int!
    services: [ServiceStatus!]!
    checks: [CheckStats!]!
    didit: DiditStats!
    mailFailures: [MailFailure!]!
    """Statements whose language was never settled because the translator could not be reached."""
    untranslated: Int!
    translationEnabled: Boolean!
  }

  """A buyer's personal data at one seller, for an access request. The document number is masked."""
  type BuyerExport {
    filename: String!
    pdfBase64: String!
    json: String!
    statements: Int!
  }

  type LegalAcceptanceEntry {
    version: String!
    acceptedAt: String!
    acceptedBy: String!
  }

  """Which version of the Terms, DPA and Privacy Policy this company has accepted."""
  type CompanyLegal {
    currentVersion: String!
    acceptedVersion: String
    needsAcceptance: Boolean!
    history: [LegalAcceptanceEntry!]!
  }

  """A new or replaced sub-processor, as shown to a company."""
  type SubprocessorAnnouncement {
    id: ID!
    name: String!
    purpose: String!
    data: String!
    location: String!
    effectiveAt: String!
  }

  """The same, with how many owners were emailed. Platform admin only."""
  type SubprocessorNoticeRecord {
    id: ID!
    name: String!
    purpose: String!
    data: String!
    location: String!
    effectiveAt: String!
    sent: Int!
    failed: Int!
    createdAt: String!
  }

  input SubprocessorNoticeInput {
    name: String!
    purpose: String!
    data: String!
    location: String!
    """YYYY-MM-DD, at least 30 days from today."""
    effectiveDate: String!
  }

  type DecisionExport {
    filename: String!
    csv: String!
    rows: Int!
    """True when the period held more decisions than one export carries; choose a shorter one."""
    truncated: Boolean!
  }

  type IncidentNoticeRecord {
    id: ID!
    subject: String!
    message: String!
    allCompanies: Boolean!
    companies: Int!
    sent: Int!
    failed: Int!
    createdAt: String!
  }

  input IncidentNoticeInput {
    subject: String!
    message: String!
    """True to write to every company on the platform; otherwise list their form addresses in slugs."""
    allCompanies: Boolean!
    slugs: [String!]
  }

  """Whether a statement PDF is genuine. Shows nothing about the buyer."""
  type StatementCheck {
    """GENUINE, GENUINE_NOT_HELD (the code is right but the statement has been deleted), or UNKNOWN."""
    result: String!
    submittedAt: String
    sellerName: String
    status: String
  }

  type AdminInsights {
    totalCompanies: Int!
    totalSubmissions: Int!
    pendingReview: Int!
    approved: Int!
    denied: Int!
    avgReviewHours: Float
    viesInvalid: Int!
    viesError: Int!
    mrzInvalid: Int!
    likelySynthetic: Int!
    weekly: [WeekPoint!]!
  }

  input SubmitInput {
    email: String!
    orderNumber: String
    firstName: String!
    lastName: String!
    street: String
    zipCode: String
    place: String
    country: String
    companyName: String
    vatNumber: String
    buyerType: BuyerType
    substances: String!
    casNumbers: String
    concentration: String
    statement: String!
    """
    Id of a Didit hosted verification session started by this server. All
    identity fields are read back from Didit — nothing about the document is
    accepted from the client.
    """
    diditSessionId: String
    agreedToTerms: Boolean!
    companySlug: String
    """Language the buyer chose on the form (ISO 639-1). Anything else is ignored."""
    locale: String
    """Cloudflare Turnstile response, required once TURNSTILE_SECRET is configured."""
    turnstileToken: String
  }

  enum NotificationKind {
    SUBMISSION_RECEIVED
    SUBSTANCE_FLAGGED
    VIES_INVALID
    IDENTITY_DECLINED
    DOCUMENT_EXPIRING
    DUPLICATE_SEEN
    ROLE_CHANGED
    INVITE_ACCEPTED
    SUPPORT_ACCESS
  }

  type TeamDecisionPage {
    """How many decisions match, across all pages."""
    total: Int!
    items: [TeamDecision!]!
  }

  type TeamDecision {
    submissionId: ID!
    reviewerId: ID
    buyerName: String!
    orderNumber: String
    decision: SubmissionStatus!
    reviewerName: String
    decidedAt: String!
    """The reason given for a denial."""
    reason: String
    """How many failed checks were overridden to approve it."""
    overrides: Int!
  }

  type Notification {
    id: ID!
    kind: NotificationKind!
    title: String!
    body: String
    """The submission this is about, when there is one to open."""
    submissionId: ID
    read: Boolean!
    createdAt: String!
  }

  """Which fingerprints agreed: DOCUMENT is the same person, VAT the same company."""
  enum DuplicateMatchOn {
    DOCUMENT
    VAT
    SUBSTANCE
  }

  """
  Prior approvals, plus how long the chain has run.
  """
  type PriorApprovals {
    matches: [DuplicateMatch!]!
    """Every match, not only the ones listed."""
    total: Int!
    """
    The oldest approval still on record — not necessarily the first ever.
    Nothing outlives the eighteen-month retention period.
    """
    oldestAt: String
  }

  type DuplicateMatch {
    id: ID!
    buyerName: String!
    approvedAt: String
    approvedByName: String
    """How closely the stated use reads like this one, 0-100."""
    statementMatch: Int!
    matchedOn: [DuplicateMatchOn!]!
  }

  """What an authenticator app needs in order to be enrolled."""
  type MfaEnrolment {
    """The shared secret, grouped in fours for anyone typing it by hand."""
    secret: String!
    otpauthUri: String!
    """An inline SVG data URI, so no image is fetched from anywhere."""
    qrSvg: String!
  }

  """Shown once, on the screen that asked for them, and never again."""
  type RecoveryCodes {
    recoveryCodes: [String!]!
  }

  """
  Turning the factor on ends every session that existed before it, so the
  caller is handed a replacement — otherwise the person doing the enrolling is
  the one who gets signed out.
  """
  type MfaActivation {
    recoveryCodes: [String!]!
    token: String!
  }

  type MfaStatus {
    enabled: Boolean!
    recoveryCodesLeft: Int!
  }

  """
  The identity document number, handed back by the one call that is allowed to
  produce it. Every query reports this field as null.
  """
  type RevealedDocument {
    submissionId: ID!
    documentNumber: String
  }

  """One recorded look at a document number."""
  type RevealEntry {
    id: ID!
    submissionId: ID!
    userName: String!
    """True when platform staff did this through a support session."""
    bySupport: Boolean!
    at: String!
  }

  """
  A WebAuthn ceremony: the browser needs the options, and the server needs the
  challenge back. The ticket carries the challenge and expires in two minutes.
  """
  type PasskeyChallenge {
    """PublicKeyCredentialCreationOptions or RequestOptions, as JSON."""
    optionsJson: String!
    ticket: String!
  }

  type PasskeyInfo {
    id: ID!
    name: String!
    createdAt: String!
    lastUsedAt: String
  }

  type PublicConfig {
    """Site key for the anti-robot check; null when it is not configured."""
    turnstileSiteKey: String
  }

  type Query {
    publicConfig: PublicConfig!
    submissions(limit: Int = 200, offset: Int = 0): [Submission!]!
    submission(id: ID!): Submission
    companySubmissions(
      status: SubmissionStatus
      includeTest: Boolean = false
      limit: Int = 100
      offset: Int = 0
    ): [Submission!]!
    companySubmissionCounts(includeTest: Boolean = false): SubmissionCounts!
    notifications(limit: Int = 30): [Notification!]!
    """
    Owners only: approve and deny decisions in this company and who made them,
    newest first. search matches the buyer's name, email or order number;
    reviewerId "NONE" picks decisions with no recorded reviewer; from and to
    are dates (YYYY-MM-DD), inclusive.
    """
    teamDecisions(search: String, reviewerId: ID, decision: SubmissionStatus, from: String, to: String, offset: Int = 0, limit: Int = 20): TeamDecisionPage!
    """
    In a support session: whether the admin acting here has a second factor,
    which is what opening a document number checks. False outside support.
    """
    supportAdminHasSecondFactor: Boolean!
    """One statement by id, with the same access rules as the list."""
    companySubmission(id: ID!): Submission
    unreadNotificationCount: Int!
    """Earlier approvals in this company that look like the same request."""
    priorApprovals(id: ID!): PriorApprovals!
    """Who looked at a document number, and when. Owner only."""
    revealLog(limit: Int = 50): [RevealEntry!]!
    """How many document numbers were read in this company in the last 24 hours."""
    revealsToday: Int!
    """The passkeys enrolled on your own account."""
    myPasskeys: [PasskeyInfo!]!
    myCompanies: [MyCompany!]!
    companyMembers: [CompanyMember!]!
    formInfo(slug: String!): PublicFormInfo
    myCompany: Company!
    myFormConfig: FormFieldConfig!
    myRole: CompanyRole!
    myAccount: MyAccount!
    identityVerificationAvailable: Boolean!
    adminCompanies: [CompanyActivity!]!
    """Undecided access requests first, then the most recent decisions."""
    accessRequests: [AccessRequest!]!
    adminInsights: AdminInsights!
    companyLegal: CompanyLegal!
    """Public: check the reference and code printed on a statement PDF."""
    checkStatement(reference: String!, code: String!): StatementCheck!
    """Announced sub-processor changes, until a week after they take effect."""
    subprocessorNotices: [SubprocessorAnnouncement!]!
    adminSubprocessorNotices: [SubprocessorNoticeRecord!]!
    adminIncidentNotices: [IncidentNoticeRecord!]!
    """A PDF record of every acceptance, base64. Owner only."""
    legalAcceptanceRecord: String!
    """Platform health over the last \`days\` days (1–365). Platform admin only."""
    adminHealth(days: Int!): AdminHealth!
    adminMfaStatus: MfaStatus!
    adminPasskeys: [PasskeyInfo!]!
    testVies(vat: String!, street: String, zipCode: String, place: String): ViesTestResult!
    testSubstanceCheck(substances: String!, casNumbers: String!, concentration: String, statement: String!, buyerType: BuyerType!): SubstanceTestResult!
  }

  type Mutation {
    submitEndUserStatement(input: SubmitInput!): Submission!
    approveSubmission(id: ID!): Submission!
    denySubmission(id: ID!, reason: String!): Submission!
    """
    The platform admin's path to one submission's identity document number.
    Needs their own code or password, and is recorded in the tenant's log.
    """
    revealSubmissionDocumentNumber(id: ID!, credential: String!): RevealedDocument!
    recheckSubmissionSubstance(id: ID!): Submission!
    overrideSubmissionCheck(id: ID!, category: OverrideCategory!, reason: String!): Submission!
    clearSubmissionCheckOverride(id: ID!, category: OverrideCategory!): Submission!
    adminLogin(username: String!, password: String!, turnstileToken: String, totp: String): AuthPayload!
    """\`legalVersion\` is the version of the Terms, DPA and Privacy Policy the applicant was shown and agreed to; it must be the current one."""
    registerCompany(name: String!, slug: String!, email: String!, password: String!, yourName: String!, turnstileToken: String, requestNote: String, legalVersion: String): CompanyAuthPayload!
    """Opens a company's form. Platform admin only."""
    approveCompanyAccess(id: ID!): AccessRequest!
    """Declines an access request with a reason the applicant is told. Platform admin only."""
    rejectCompanyAccess(id: ID!, reason: String!): AccessRequest!
    companyLogin(email: String!, password: String!, turnstileToken: String, totp: String): CompanyAuthPayload!
    inviteMember(email: String!, role: CompanyRole!): CompanyInviteResult!
    acceptInvite(token: String!, name: String!, password: String!): CompanyAuthPayload!
    """An existing account joins a company it was invited to, from inside its own signed-in session."""
    acceptInviteSignedIn(token: String!): CompanyAuthPayload!
    """Always returns true — whether an account exists is not disclosed here."""
    requestPasswordReset(email: String!, turnstileToken: String): Boolean!
    resetPassword(token: String!, password: String!): Boolean!
    verifyEmail(token: String!): Boolean!
    resendEmailVerification: Boolean!
    """
    Reveals one submission's identity document number. Needs the code from your
    authenticator app, or your password while you have no second factor. Every
    call is recorded.
    """
    revealDocumentNumber(id: ID!, credential: String!): RevealedDocument!
    """Everything held about the buyer of this statement, for a GDPR access request. Owner or reviewer, with a current second-factor code; logged."""
    exportBuyerData(id: ID!, credential: String!): BuyerExport!
    """The owner accepts the current Terms, DPA and Privacy Policy; \`version\` must be the current one."""
    acceptLegal(version: String!): CompanyLegal!
    """Every approval and denial between two dates (YYYY-MM-DD, inclusive) as CSV. Owner only, with a current second-factor code; logged."""
    exportDecisions(from: String!, to: String!, credential: String!): DecisionExport!
    """Announces a sub-processor to every company owner by email and on the dashboard. Platform admin only."""
    announceSubprocessor(input: SubprocessorNoticeInput!): SubprocessorNoticeRecord!
    """Emails the owners of all or the listed companies about a security incident. Platform admin only."""
    notifyIncident(input: IncidentNoticeInput!): IncidentNoticeRecord!
    """Deletes every statement of the buyer of this statement, for a GDPR erasure request. Owner only, with a current second-factor code; logged. Returns how many were deleted."""
    eraseBuyerData(id: ID!, credential: String!): Int!
    """
    Step one of revealing a document number with a passkey, for accounts that
    have one instead of an authenticator app.
    """
    startRevealWithPasskey(id: ID!): PasskeyChallenge!
    """A passkey challenge for one sensitive step; finishStepUp returns a one-time token that counts as a code."""
    startStepUp: PasskeyChallenge!
    finishStepUp(ticket: String!, responseJson: String!): String!
    finishRevealWithPasskey(id: ID!, ticket: String!, responseJson: String!): RevealedDocument!
    """Marks the given notifications read, or every one of them when no ids are given."""
    markNotificationsRead(ids: [ID!]): Int!
    """Clears the given notifications from your own activity, or all of them when no ids are given. The rest of the team still sees them."""
    clearNotifications(ids: [ID!]): Int!
    """
    Step one of enrolling a passkey. The browser turns the options into a
    credential; finishPasskeyRegistration stores it.
    """
    startPasskeyRegistration(proof: String): PasskeyChallenge!
    finishPasskeyRegistration(ticket: String!, responseJson: String!, name: String!): PasskeyInfo!
    removePasskey(id: ID!, proof: String): Boolean!
    """
    Step one of signing in with a passkey: proves the password, then hands back
    a challenge. Returns nothing useful without the correct password.
    """
    beginPasskeyLogin(email: String!, password: String!, turnstileToken: String): PasskeyChallenge!
    """Step two: the signed assertion, in exchange for a session."""
    finishPasskeyLogin(ticket: String!, responseJson: String!): CompanyAuthPayload!
    startMfaEnrolment(proof: String): MfaEnrolment!
    confirmMfaEnrolment(code: String!): MfaActivation!
    disableMfa(password: String!, code: String!): Boolean!
    regenerateRecoveryCodes(code: String!): RecoveryCodes!
    startAdminPasskeyRegistration(proof: String): PasskeyChallenge!
    finishAdminPasskeyRegistration(ticket: String!, responseJson: String!, name: String!): PasskeyInfo!
    removeAdminPasskey(id: ID!, proof: String): Boolean!
    beginAdminPasskeyLogin(username: String!, password: String!, turnstileToken: String): PasskeyChallenge!
    finishAdminPasskeyLogin(ticket: String!, responseJson: String!): AuthPayload!
    startAdminStepUp: PasskeyChallenge!
    finishAdminStepUp(ticket: String!, responseJson: String!): String!
    startAdminMfaEnrolment(proof: String): MfaEnrolment!
    confirmAdminMfaEnrolment(code: String!): MfaActivation!
    disableAdminMfa(password: String!, code: String!): Boolean!
    regenerateAdminRecoveryCodes(code: String!): RecoveryCodes!
    """
    Extends the current session. Runs through the same checks as any other
    request, so a removed member or a password reset stops it.
    """
    refreshSession: CompanyAuthPayload!
    switchCompany(companyId: ID!): CompanyAuthPayload!
    requestCompanyDeletion(confirmSlug: String!): Boolean!
    cancelCompanyDeletion: Boolean!
    removeMember(userId: ID!): Boolean!
    changeMemberRole(userId: ID!, role: CompanyRole!): CompanyMember!
    deleteCompanySubmission(id: ID!): Boolean!
    approveCompanySubmission(id: ID!): Submission!
    denyCompanySubmission(id: ID!, reason: String!): Submission!
    reopenCompanySubmission(id: ID!): Submission!
    recheckCompanySubmissionSubstance(id: ID!): Submission!
    overrideCompanySubmissionCheck(id: ID!, category: OverrideCategory!, reason: String!): Submission!
    clearCompanySubmissionCheckOverride(id: ID!, category: OverrideCategory!): Submission!
    updateFormConfig(config: FormFieldConfigInput!): FormFieldConfig!
    adminSupportLogin(companyId: ID!): CompanyAuthPayload!
    createTestSubmission(input: TestSubmissionInput!): Submission!
    deleteTestSubmissions: Int!
  }
`;
