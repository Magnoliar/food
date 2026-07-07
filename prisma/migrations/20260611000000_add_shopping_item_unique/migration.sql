-- CreateIndex
CREATE UNIQUE INDEX "ShoppingListItem_shopping_list_id_name_key" ON "ShoppingListItem"("shopping_list_id", "name");
