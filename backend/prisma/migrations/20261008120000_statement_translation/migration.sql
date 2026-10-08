-- The buyer's form language, the detected language of the stated use, and a
-- machine translation of it for the reviewer. The translation is written by
-- the application encrypted, exactly like `statement`; nothing here is
-- readable in a database dump.
ALTER TABLE "Submission" ADD COLUMN "locale" TEXT;
ALTER TABLE "Submission" ADD COLUMN "statementLang" TEXT;
ALTER TABLE "Submission" ADD COLUMN "statementTranslation" TEXT;
