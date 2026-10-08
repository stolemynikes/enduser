// Errors a buyer can meet on the public form, each with a stable code.
//
// The form is shown in the buyer's language, but the server does not know which
// one and should not have to: it sends a code, and the browser shows the
// sentence for that code from its own translations. The English message stays
// as the fallback for anything that reads the raw response, and as what an
// operator sees in a log.
//
// Codes are part of the contract with the frontend (frontend/src/i18n). Adding
// one means adding its sentence there too; an unknown code is shown in English.
import { GraphQLError } from 'graphql';

export type BuyerErrorCode =
  | 'TERMS_REQUIRED'
  | 'FIELD_TOO_LONG'
  | 'INVALID_EMAIL'
  | 'FORM_NOT_OPEN'
  | 'FIELD_REQUIRED'
  | 'BUYER_TYPE_REQUIRED'
  | 'COMPANY_NAME_REQUIRED'
  | 'VAT_REQUIRED'
  | 'ID_UNAVAILABLE'
  | 'ID_REQUIRED'
  | 'ID_EXPIRED'
  | 'ID_UNCONFIRMED'
  | 'ID_UNFINISHED'
  | 'ID_DOCUMENT_TYPE'
  | 'UNDER_AGE'
  | 'BOT_CHECK_MISSING'
  | 'BOT_CHECK_ERROR'
  | 'BOT_CHECK_FAILED';

export function buyerError(code: BuyerErrorCode, message: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code } });
}
