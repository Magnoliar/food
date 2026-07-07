-- CreateTable
CREATE TABLE "FridgeItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "amount" TEXT,
    "zone" TEXT NOT NULL DEFAULT 'refrigerated',
    "added_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
