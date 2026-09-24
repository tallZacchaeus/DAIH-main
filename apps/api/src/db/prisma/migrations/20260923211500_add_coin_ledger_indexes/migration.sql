-- CreateIndex
CREATE INDEX "coin_ledger_entries_referenceId_action_idx" ON "coin_ledger_entries"("referenceId", "action");

-- CreateIndex
CREATE INDEX "coin_ledger_entries_userId_action_createdAt_idx" ON "coin_ledger_entries"("userId", "action", "createdAt");
