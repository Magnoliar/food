-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RecipeIngredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipe_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "amount" TEXT,
    "unit" TEXT,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    "substitute_for" TEXT,
    CONSTRAINT "RecipeIngredient_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecipeIngredient_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "Ingredient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RecipeIngredient" ("amount", "id", "ingredient_id", "optional", "recipe_id", "substitute_for", "unit") SELECT "amount", "id", "ingredient_id", "optional", "recipe_id", "substitute_for", "unit" FROM "RecipeIngredient";
DROP TABLE "RecipeIngredient";
ALTER TABLE "new_RecipeIngredient" RENAME TO "RecipeIngredient";
CREATE UNIQUE INDEX "RecipeIngredient_recipe_id_ingredient_id_key" ON "RecipeIngredient"("recipe_id", "ingredient_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
