-- CreateTable
CREATE TABLE "LineArtJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ingredient_name" TEXT NOT NULL,
    "ingredient_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "image_urls" TEXT NOT NULL DEFAULT '[]',
    "selected_url" TEXT,
    "error" TEXT,
    "thread_id" TEXT,
    "run_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "LineArtJob_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "Ingredient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LineArtJob_ingredient_id_status_idx" ON "LineArtJob"("ingredient_id", "status");

-- CreateIndex
CREATE INDEX "LineArtJob_status_updated_at_idx" ON "LineArtJob"("status", "updated_at");
