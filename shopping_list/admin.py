from django.contrib import admin

from .models import ShoppingList, ShoppingListItem


@admin.register(ShoppingList)
class ShoppingListAdmin(admin.ModelAdmin):
    list_display = ('id_lista', 'usuario', 'nombre_lista', 'fecha_creacion')
    search_fields = ('nombre_lista', 'usuario__nombre_usuario')
    autocomplete_fields = ('usuario',)
    ordering = ('id_lista',)


@admin.register(ShoppingListItem)
class ShoppingListItemAdmin(admin.ModelAdmin):
    list_display = ('id_item', 'lista', 'producto', 'cantidad', 'comprado')
    search_fields = ('lista__nombre_lista', 'producto__nombre')
    list_filter = ('comprado',)
    autocomplete_fields = ('lista', 'producto')
    ordering = ('id_item',)
