export const typeDefs = `#graphql
  enum ViesStatus {
    VALID
    INVALID
    ERROR
  }

  enum SubmissionStatus {
    PENDING_REVIEW
    APPROVED
    DENIED
  }

  enum IdDocumentType {
    PASSPORT
    ID_CARD
    DRIVERS_LICENSE
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
    substances: String!
    casNumbers: String!
    statement: String!
    idDocumentName: String
    idDocumentType: IdDocumentType
    idDocumentNumber: String
    idDataCollectedAt: String
    viesStatus: ViesStatus!
    status: SubmissionStatus!
    adminNote: String
    createdAt: String!
    updatedAt: String!
  }

  type ExtractedIdData {
    name: String
    documentType: IdDocumentType
    documentNumber: String
  }

  type AuthPayload {
    token: String!
  }

  input SubmitInput {
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
    substances: String!
    casNumbers: String!
    statement: String!
    idDocumentName: String!
    idDocumentType: IdDocumentType!
    idDocumentNumber: String!
    agreedToTerms: Boolean!
  }

  type Query {
    submissions: [Submission!]!
    submission(id: ID!): Submission
  }

  type Mutation {
    submitEndUserStatement(input: SubmitInput!): Submission!
    approveSubmission(id: ID!): Submission!
    denySubmission(id: ID!, reason: String!): Submission!
    adminLogin(username: String!, password: String!): AuthPayload!
  }
`;
