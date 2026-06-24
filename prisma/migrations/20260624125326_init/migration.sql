-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "name_abbreviation" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'employee',
    "status" TEXT NOT NULL DEFAULT 'active',
    "start_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avatar_url" TEXT,
    "notification_settings" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ideas" (
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
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "ideas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ideas_photo_assignee_id_fkey" FOREIGN KEY ("photo_assignee_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ideas_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "product_topics" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ideas_ai_model_id_fkey" FOREIGN KEY ("ai_model_id") REFERENCES "ai_models" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "amazon_listings" (
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
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "amazon_listings_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "amazon_listings_selling_account_id_fkey" FOREIGN KEY ("selling_account_id") REFERENCES "selling_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "etsy_listings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idea_id" TEXT NOT NULL,
    "selling_account_id" TEXT,
    "title" TEXT,
    "listing_id" TEXT,
    "tags" TEXT,
    "description" TEXT,
    "price" REAL,
    "use_shared_main_image" BOOLEAN NOT NULL DEFAULT true,
    "gallery_images" TEXT,
    "use_shared_gallery" BOOLEAN NOT NULL DEFAULT false,
    "video_url" TEXT,
    "use_amazon_video" BOOLEAN NOT NULL DEFAULT false,
    "listing_status" TEXT NOT NULL DEFAULT 'ready',
    "listing_status_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "etsy_listings_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "etsy_listings_selling_account_id_fkey" FOREIGN KEY ("selling_account_id") REFERENCES "selling_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "selling_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "selling_accounts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "production_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idea_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'batch',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "requested_qty" INTEGER NOT NULL,
    "actual_qty" INTEGER,
    "requested_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    "note_for_workers" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "production_requests_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "production_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "production_request_id" TEXT NOT NULL,
    "step_name" TEXT NOT NULL,
    "sequence_order" INTEGER NOT NULL,
    "performed_by" TEXT,
    "started_at" DATETIME,
    "finished_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "production_steps_production_request_id_fkey" FOREIGN KEY ("production_request_id") REFERENCES "production_requests" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "order_date" DATETIME NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT,
    "address_line1" TEXT NOT NULL,
    "address_line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "zipcode" TEXT,
    "country" TEXT NOT NULL,
    "item_detail" TEXT,
    "weight" REAL,
    "length" REAL,
    "width" REAL,
    "height" REAL,
    "service" TEXT DEFAULT 'US Express',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sku" TEXT NOT NULL,
    "unit_price" REAL,
    "selling_account_id" TEXT NOT NULL,
    "custom_note" TEXT,
    "tracking_number" TEXT,
    "tracking_uploaded" BOOLEAN NOT NULL DEFAULT false,
    "production_status" TEXT NOT NULL DEFAULT 'producing',
    "designer_id" TEXT,
    "order_production_file_url" TEXT,
    "producer_id" TEXT,
    "note" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "orders_selling_account_id_fkey" FOREIGN KEY ("selling_account_id") REFERENCES "selling_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "orders_designer_id_fkey" FOREIGN KEY ("designer_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "orders_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shipment_boxes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ship_date" DATETIME NOT NULL,
    "amazon_account_id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "box_name" TEXT NOT NULL,
    "warehouse_code" TEXT NOT NULL,
    "label_file_url" TEXT,
    "ship_line" TEXT,
    "length_cm" REAL,
    "width_cm" REAL,
    "height_cm" REAL,
    "weight_kg" REAL,
    "tracking_number" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "shipment_boxes_amazon_account_id_fkey" FOREIGN KEY ("amazon_account_id") REFERENCES "selling_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shipment_box_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shipment_box_id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "qty_per_box" INTEGER NOT NULL,
    "total_box_count" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "shipment_box_items_shipment_box_id_fkey" FOREIGN KEY ("shipment_box_id") REFERENCES "shipment_boxes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shipment_box_items_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "product_topics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ai_models" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "message" TEXT NOT NULL,
    "action_url" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "changed_by" TEXT NOT NULL,
    "changed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "workers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ideas_msku_key" ON "ideas"("msku");

-- CreateIndex
CREATE UNIQUE INDEX "amazon_listings_idea_id_key" ON "amazon_listings"("idea_id");

-- CreateIndex
CREATE UNIQUE INDEX "etsy_listings_idea_id_key" ON "etsy_listings"("idea_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_topics_name_key" ON "product_topics"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ai_models_name_key" ON "ai_models"("name");

-- CreateIndex
CREATE UNIQUE INDEX "workers_name_key" ON "workers"("name");
