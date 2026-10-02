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
    testVies(vat: String!, street: String, zipCode: String, place: String): ViesTestResult!
    testSubstanceCheck(substances: String!, casNumbers: String!, concentration: String, statement: String!, buyerType: BuyerType!): SubstanceTestResult!
  }

  type Mutation {
    submitEndUserStatement(input: SubmitInput!): Submission!
    approveSubmission(id: ID!): Submission!
    denySubmission(id: ID!, reason: String!): Submission!
    recheckSubmissionSubstance(id: ID!): Submission!
    overrideSubmissionCheck(id: ID!, category: OverrideCategory!, reason: String!): Submission!
    clearSubmissionCheckOverride(id: ID!, category: OverrideCategory!): Submission!
    adminLogin(username: String!, password: String!, turnstileToken: String): AuthPayload!
    registerCompany(name: String!, slug: String!, email: String!, password: String!, yourName: String!, turnstileToken: String): CompanyAuthPayload!
    companyLogin(email: String!, password: String!, turnstileToken: String): CompanyAuthPayload!
    inviteMember(email: String!, role: CompanyRole!): CompanyInviteResult!
    acceptInvite(token: String!, name: String!, password: String!): CompanyAuthPayload!
    """Always returns true — whether an account exists is not disclosed here."""
    requestPasswordReset(email: String!, turnstileToken: String): Boolean!
    resetPassword(token: String!, password: String!): Boolean!
    verifyEmail(token: String!): Boolean!
    resendEmailVerification: Boolean!
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
