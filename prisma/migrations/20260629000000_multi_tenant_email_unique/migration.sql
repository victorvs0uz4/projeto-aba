-- Multi-tenant: the same e-mail must be allowed across different clinics.
-- Drop the global unique constraint on User.email and the standalone index,
-- replacing them with a composite unique constraint scoped to the clinic.
DROP INDEX "User_email_key";
DROP INDEX "User_email_idx";

-- CreateIndex
CREATE UNIQUE INDEX "User_email_clinicId_key" ON "User"("email", "clinicId");
