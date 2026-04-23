from django.contrib import admin

from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('id_usuario', 'nombre_usuario', 'email', 'fecha_registro')
    search_fields = ('nombre_usuario', 'email')
    ordering = ('id_usuario',)
