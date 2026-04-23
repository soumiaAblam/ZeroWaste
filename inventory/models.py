from django.db import models
from django.utils import timezone


class ExpiryStatus(models.Model):
    id_estado = models.AutoField(primary_key=True)
    nombre_estado = models.CharField(max_length=50)
    color = models.CharField(max_length=30)
    dias_min = models.IntegerField()
    dias_max = models.IntegerField()

    class Meta:
        managed = False
        db_table = 'estado_caducidad'

    def __str__(self):
        return self.nombre_estado

    @classmethod
    def resolve_for_days(cls, remaining_days):
        status = (
            cls.objects.filter(dias_min__lte=remaining_days, dias_max__gte=remaining_days)
            .order_by('-dias_min')
            .first()
        )
        if status:
            return status

        status = cls.objects.filter(dias_min__lte=remaining_days).order_by('-dias_min').first()
        if status:
            return status

        return cls.objects.filter(dias_min__gte=remaining_days).order_by('dias_min').first()


class InventoryItem(models.Model):
    id_inventario = models.AutoField(primary_key=True)
    usuario = models.ForeignKey(
        'authentication.UserProfile',
        models.DO_NOTHING,
        db_column='id_usuario',
        related_name='inventory_items',
    )
    producto = models.ForeignKey(
        'products.Product',
        models.DO_NOTHING,
        db_column='id_producto',
        related_name='inventory_items',
    )
    estado = models.ForeignKey(
        ExpiryStatus,
        models.DO_NOTHING,
        db_column='id_estado',
        related_name='inventory_items',
    )
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_compra = models.DateField(blank=True, null=True)
    fecha_caducidad = models.DateField()
    ubicacion = models.CharField(max_length=100, blank=True, null=True)
    consumido = models.BooleanField(default=False)

    class Meta:
        managed = False
        db_table = 'inventario'

    def __str__(self):
        return f"{self.producto} - {self.cantidad}"

    def update_status(self):
        if not self.fecha_caducidad:
            return

        remaining_days = (self.fecha_caducidad - timezone.localdate()).days
        status = ExpiryStatus.resolve_for_days(remaining_days)
        if status is not None:
            self.estado = status

    def save(self, *args, **kwargs):
        self.update_status()
        return super().save(*args, **kwargs)
