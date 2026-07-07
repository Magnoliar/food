-- Runtime indexes for common SQLite/NAS query paths.
CREATE INDEX IF NOT EXISTS "Recipe_score_idx" ON "Recipe"("score");
CREATE INDEX IF NOT EXISTS "Recipe_cook_count_idx" ON "Recipe"("cook_count");

CREATE INDEX IF NOT EXISTS "FridgeItem_zone_expiry_date_idx" ON "FridgeItem"("zone", "expiry_date");
CREATE INDEX IF NOT EXISTS "FridgeItem_expiry_date_idx" ON "FridgeItem"("expiry_date");

CREATE INDEX IF NOT EXISTS "RecipeIngredient_ingredient_id_idx" ON "RecipeIngredient"("ingredient_id");

CREATE INDEX IF NOT EXISTS "LineArtJob_created_at_idx" ON "LineArtJob"("created_at");

CREATE INDEX IF NOT EXISTS "Tag_name_idx" ON "Tag"("name");
CREATE INDEX IF NOT EXISTS "Tag_dimension_name_idx" ON "Tag"("dimension", "name");
CREATE INDEX IF NOT EXISTS "Tag_parent_id_idx" ON "Tag"("parent_id");

CREATE INDEX IF NOT EXISTS "CookLog_date_idx" ON "CookLog"("date");
CREATE INDEX IF NOT EXISTS "CookLog_recipe_id_date_idx" ON "CookLog"("recipe_id", "date");
CREATE INDEX IF NOT EXISTS "CookLog_user_id_date_idx" ON "CookLog"("user_id", "date");

CREATE INDEX IF NOT EXISTS "MediaAsset_url_idx" ON "MediaAsset"("url");
CREATE INDEX IF NOT EXISTS "MediaAsset_created_at_idx" ON "MediaAsset"("created_at");

CREATE INDEX IF NOT EXISTS "WeekPlan_week_key_idx" ON "WeekPlan"("week_key");
CREATE INDEX IF NOT EXISTS "WeekPlan_status_start_date_idx" ON "WeekPlan"("status", "start_date");
CREATE INDEX IF NOT EXISTS "WeekPlan_start_date_end_date_idx" ON "WeekPlan"("start_date", "end_date");

CREATE INDEX IF NOT EXISTS "MealSlot_week_plan_id_date_idx" ON "MealSlot"("week_plan_id", "date");
CREATE INDEX IF NOT EXISTS "MealSlot_recipe_id_idx" ON "MealSlot"("recipe_id");

CREATE INDEX IF NOT EXISTS "ShoppingList_week_plan_id_updated_at_idx" ON "ShoppingList"("week_plan_id", "updated_at");
CREATE INDEX IF NOT EXISTS "ShoppingList_updated_at_idx" ON "ShoppingList"("updated_at");

CREATE INDEX IF NOT EXISTS "ShoppingListItem_shopping_list_id_category_name_idx" ON "ShoppingListItem"("shopping_list_id", "category", "name");
