-- AddForeignKey
ALTER TABLE "ReauditSubmission" ADD CONSTRAINT "ReauditSubmission_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReauditSubmission" ADD CONSTRAINT "ReauditSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
