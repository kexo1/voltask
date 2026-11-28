CREATE TABLE "UsedRefreshToken" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsedRefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UsedRefreshToken_tokenHash_key" ON "UsedRefreshToken"("tokenHash");
CREATE INDEX "UsedRefreshToken_sessionId_idx" ON "UsedRefreshToken"("sessionId");

ALTER TABLE "UsedRefreshToken"
ADD CONSTRAINT "UsedRefreshToken_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "AuthSession"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
