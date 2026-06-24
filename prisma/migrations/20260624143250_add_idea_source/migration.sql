-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ideas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "msku" TEXT NOT NULL,
    "auto_generate_msku" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "ai_model_id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "source_links" TEXT NOT NULL DEFAULT '[]',
    "main_image_url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'reviewing',
    "photo_status" TEXT NOT NULL DEFAULT 'not_requested',
    "photo_assignee_id" TEXT,
    "photo_revision_note" TEXT,
    "file_status" TEXT NOT NULL DEFAULT 'not_started',
    "fulfillment_type" TEXT NOT NULL DEFAULT 'FBM',
    "production_file_url" TEXT,
    "title" TEXT,
    "description" TEXT,
    "review_comment" TEXT,
    "needs_rereview" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'employee',
    "partner_name" TEXT,
    "partner_label" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "ideas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ideas_photo_assignee_id_fkey" FOREIGN KEY ("photo_assignee_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ideas_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "product_topics" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ideas_ai_model_id_fkey" FOREIGN KEY ("ai_model_id") REFERENCES "ai_models" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ideas" ("ai_model_id", "auto_generate_msku", "created_at", "created_by", "description", "file_status", "fulfillment_type", "id", "main_image_url", "msku", "needs_rereview", "photo_assignee_id", "photo_revision_note", "photo_status", "production_file_url", "prompt", "review_comment", "sku", "source_links", "status", "title", "topic_id", "updated_at", "version") SELECT "ai_model_id", "auto_generate_msku", "created_at", "created_by", "description", "file_status", "fulfillment_type", "id", "main_image_url", "msku", "needs_rereview", "photo_assignee_id", "photo_revision_note", "photo_status", "production_file_url", "prompt", "review_comment", "sku", "source_links", "status", "title", "topic_id", "updated_at", "version" FROM "ideas";
DROP TABLE "ideas";
ALTER TABLE "new_ideas" RENAME TO "ideas";
CREATE UNIQUE INDEX "ideas_msku_key" ON "ideas"("msku");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
