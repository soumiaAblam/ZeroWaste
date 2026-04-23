from django.db import models


class ShoppingList(models.Model):
    id_lista = models.AutoField(primary_key=True)
    usuario = models.ForeignKey(
        'authentication.UserProfile',
        models.DO_NOTHING,
        db_column='id_usuario',
        related_name='shopping_lists',
    )
    nombre_lista = models.CharField(max_length=120)
    fecha_creacion = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'lista_compra'

    def __str__(self):
        return self.nombre_lista


class ShoppingListItem(models.Model):
    id_item = models.AutoField(primary_key=True)
    lista = models.ForeignKey(
        ShoppingList,
        models.DO_NOTHING,
        db_column='id_lista',
        related_name='items',
    )
    producto = models.ForeignKey(
        'products.Product',
        models.DO_NOTHING,
        db_column='id_producto',
        related_name='shopping_list_items',
    )
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    comprado = models.BooleanField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'item_lista_compra'

    def __str__(self):
        return f"{self.producto} ({self.cantidad})"
