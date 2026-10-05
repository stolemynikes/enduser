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

  type Company {
    id: ID!
    name: String!
    slug: String!
    formConfigured: Boolean!
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
    inviteUrl: String!
  }

  type CompanyAuthPayload {
    token: String!
    company: Company!
    role: CompanyRole!
  }

  type CompanyActivity {
    id: ID!
    name: String!
    slug: String!
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
    adminInsights: AdminInsights!
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
    registerCompany(name: String!, slug: String!, email: String!, password: String!, yourName: String!, turnstileToken: String): CompanyAuthPayload!
    companyLogin(email: String!, password: String!, turnstileToken: String, totp: String): CompanyAuthPayload!
    inviteMember(email: String!, role: CompanyRole!): CompanyInviteResult!
    acceptInvite(token: String!, name: String!, password: String!): CompanyAuthPayload!
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
    """
    Step one of revealing a document number with a passkey, for accounts that
    have one instead of an authenticator app.
    """
    startRevealWithPasskey(id: ID!): PasskeyChallenge!
    finishRevealWithPasskey(id: ID!, ticket: String!, responseJson: String!): RevealedDocument!
    """Marks the given notifications read, or every one of them when no ids are given."""
    markNotificationsRead(ids: [ID!]): Int!
    """
    Step one of enrolling a passkey. The browser turns the options into a
    credential; finishPasskeyRegistration stores it.
    """
    startPasskeyRegistration: PasskeyChallenge!
    finishPasskeyRegistration(ticket: String!, responseJson: String!, name: String!): PasskeyInfo!
    removePasskey(id: ID!): Boolean!
    """
    Step one of signing in with a passkey: proves the password, then hands back
    a challenge. Returns nothing useful without the correct password.
    """
    beginPasskeyLogin(email: String!, password: String!, turnstileToken: String): PasskeyChallenge!
    """Step two: the signed assertion, in exchange for a session."""
    finishPasskeyLogin(ticket: String!, responseJson: String!): CompanyAuthPayload!
    startMfaEnrolment: MfaEnrolment!
    confirmMfaEnrolment(code: String!): MfaActivation!
    disableMfa(password: String!, code: String!): Boolean!
    regenerateRecoveryCodes(code: String!): RecoveryCodes!
    startAdminPasskeyRegistration: PasskeyChallenge!
    finishAdminPasskeyRegistration(ticket: String!, responseJson: String!, name: String!): PasskeyInfo!
    removeAdminPasskey(id: ID!): Boolean!
    beginAdminPasskeyLogin(username: String!, password: String!, turnstileToken: String): PasskeyChallenge!
    finishAdminPasskeyLogin(ticket: String!, responseJson: String!): AuthPayload!
    startAdminMfaEnrolment: MfaEnrolment!
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
