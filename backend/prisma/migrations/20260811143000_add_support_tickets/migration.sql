-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "support_tickets" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER,
    "user_email" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "user_role" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT,
    "related_entity_type" TEXT,
    "related_entity_id" TEXT,
    "assigned_to_id" INTEGER,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "support_ticket_replies" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "user_email" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "user_role" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_staff_reply" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_ticket_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_tickets_user_id_status_idx" ON "support_tickets"("user_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_tickets_status_priority_created_at_idx" ON "support_tickets"("status", "priority", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_tickets_assigned_to_id_idx" ON "support_tickets"("assigned_to_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_tickets_user_email_idx" ON "support_tickets"("user_email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_ticket_replies_ticket_id_created_at_idx" ON "support_ticket_replies"("ticket_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_ticket_replies_user_id_idx" ON "support_ticket_replies"("user_id");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "support_tickets"
    ADD CONSTRAINT "support_tickets_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "support_tickets"
    ADD CONSTRAINT "support_tickets_assigned_to_id_fkey"
    FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "support_ticket_replies"
    ADD CONSTRAINT "support_ticket_replies_ticket_id_fkey"
    FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
