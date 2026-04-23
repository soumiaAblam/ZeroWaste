from django.db import models


class UserProfile(models.Model):
    id_usuario = models.AutoField(primary_key=True)
    nombre_usuario = models.CharField(max_length=100)
    email = models.EmailField(unique=True, max_length=150)
    password = models.CharField(max_length=255)
    fecha_registro = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'usuario'

    def __str__(self):
        return self.nombre_usuario
