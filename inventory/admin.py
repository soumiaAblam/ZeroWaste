from django.contrib import admin

from .models import ExpiryStatus, InventoryItem


@admin.register(ExpiryStatus)
class ExpiryStatusAdmin(admin.ModelAdmin):
    list_display = ('id_estado', 'nombre_estado', 'color', 'dias_min', 'dias_max')
    search_fields = ('nombre_estado', 'color')
    ordering = ('id_estado',)


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = (
        'id_inventario',
        'usuario',
        'producto',
        'estado',
        'cantidad',
        'fecha_caducidad',
        'ubicacion',
        'consumido',
    )
    search_fields = (
        'usuario__nombre_usuario',
        'producto__nombre',
        'estado__nombre_estado',
        'ubicacion',
    )
    list_filter = ('estado', 'fecha_caducidad', 'ubicacion', 'consumido')
    autocomplete_fields = ('usuario', 'producto', 'estado')
    ordering = ('id_inventario',)
