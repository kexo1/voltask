CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "teamId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectMember" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("projectId", "userId")
);

CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");
CREATE INDEX "Project_teamId_idx" ON "Project"("teamId");
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

ALTER TABLE "Project"
ADD CONSTRAINT "Project_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Project"
ADD CONSTRAINT "Project_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "Team"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectMember"
ADD CONSTRAINT "ProjectMember_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectMember"
ADD CONSTRAINT "ProjectMember_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Task" ADD COLUMN "projectId" TEXT;

INSERT INTO "Project" (
    "id",
    "ownerId",
    "teamId",
    "name",
    "description",
    "createdAt",
    "updatedAt"
)
SELECT
    'legacy-team-' || team."id",
    COALESCE(
        (
            SELECT member."userId"
            FROM "TeamMember" AS member
            WHERE member."teamId" = team."id"
            ORDER BY
                CASE WHEN member."role" = 'OWNER' THEN 0 ELSE 1 END,
                member."joinedAt",
                member."userId"
            LIMIT 1
        ),
        (
            SELECT task."creatorId"
            FROM "Task" AS task
            WHERE task."teamId" = team."id"
            ORDER BY task."createdAt", task."id"
            LIMIT 1
        )
    ),
    team."id",
    'Všeobecný projekt',
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Team" AS team
WHERE EXISTS (
    SELECT 1 FROM "TeamMember" AS member WHERE member."teamId" = team."id"
) OR EXISTS (
    SELECT 1 FROM "Task" AS task WHERE task."teamId" = team."id"
);

INSERT INTO "ProjectMember" ("projectId", "userId")
SELECT project."id", member."userId"
FROM "Project" AS project
JOIN "TeamMember" AS member ON member."teamId" = project."teamId";

UPDATE "Task" AS task
SET "projectId" = 'legacy-team-' || task."teamId";

ALTER TABLE "Task" ALTER COLUMN "projectId" SET NOT NULL;

DROP INDEX "Task_teamId_status_idx";
ALTER TABLE "Task" DROP CONSTRAINT "Task_teamId_fkey";
ALTER TABLE "Task" DROP COLUMN "teamId";

CREATE INDEX "Task_projectId_status_idx" ON "Task"("projectId", "status");

ALTER TABLE "Task"
ADD CONSTRAINT "Task_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
