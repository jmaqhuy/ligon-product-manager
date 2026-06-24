-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_amazon_listings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idea_id" TEXT NOT NULL,
    "selling_account_id" TEXT,
    "asin" TEXT,
    "fnsku_code" TEXT,
    "fnsku_label_file_url" TEXT,
    "item_name" TEXT,
    "item_highlights" TEXT,
    "bullet_points" TEXT,
    "description" TEXT,
    "tags" TEXT,
    "slugs" TEXT,
    "price" REAL,
    "use_shared_main_image" BOOLEAN NOT NULL DEFAULT true,
    "gallery_images" TEXT,
    "video_url" TEXT,
    "content_a_plus_url" TEXT,
    "listing_status" TEXT NOT NULL DEFAULT 'ready',
    "listing_status_reason" TEXT,
    "vine_status" TEXT NOT NULL DEFAULT 'not_enrolled',
    "vine_review_url" TEXT,
    "photos_uploaded" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "amazon_listings_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "amazon_listings_selling_account_id_fkey" FOREIGN KEY ("selling_account_id") REFERENCES "selling_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_amazon_listings" ("asin", "bullet_points", "content_a_plus_url", "created_at", "description", "fnsku_code", "fnsku_label_file_url", "gallery_images", "id", "idea_id", "item_highlights", "item_name", "listing_status", "listing_status_reason", "price", "selling_account_id", "slugs", "tags", "updated_at", "use_shared_main_image", "version", "video_url") SELECT "asin", "bullet_points", "content_a_plus_url", "created_at", "description", "fnsku_code", "fnsku_label_file_url", "gallery_images", "id", "idea_id", "item_highlights", "item_name", "listing_status", "listing_status_reason", "price", "selling_account_id", "slugs", "tags", "updated_at", "use_shared_main_image", "version", "video_url" FROM "amazon_listings";
DROP TABLE "amazon_listings";
ALTER TABLE "new_amazon_listings" RENAME TO "amazon_listings";
CREATE UNIQUE INDEX "amazon_listings_idea_id_key" ON "amazon_listings"("idea_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
