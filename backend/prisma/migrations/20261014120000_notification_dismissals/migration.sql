-- Activity can be cleared, per person: a cleared notice is hidden for the
-- company user who cleared it and stays for everyone else.
ALTER TABLE "Notification" ADD COLUMN "dismissedBy" TEXT[] DEFAULT ARRAY[]::TEXT[];
