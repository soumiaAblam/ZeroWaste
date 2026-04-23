from django.contrib import admin

from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id_producto', 'nombre', 'categoria', 'precio')
    search_fields = ('nombre', 'categoria', 'descripcion', 'codigo_barras')
    list_filter = ('categoria',)
    ordering = ('id_producto',)
