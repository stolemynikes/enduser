-- One query scans this column: the requeue at boot, which looks for checks left
-- PENDING by a restart. It was a sequential scan over every submission ever
-- made, on every start.
--
-- Partial rather than a plain index on the column. Almost every row is OK,
-- NOT_CHECKED or FLAGGED and would be dead weight in a full index; PENDING is a
-- handful of rows at any moment, so this index stays kilobytes however large
-- the table grows — and it is the only value anything searches for.
CREATE INDEX "Submission_pending_substance_idx"
  ON "Submission"("id")
  WHERE "substanceCheckStatus" = 'PENDING';
