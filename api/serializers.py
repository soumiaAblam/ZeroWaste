from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from authentication.models import UserProfile
from inventory.models import InventoryItem
from inventory.services import get_alert_days
from shopping_list.models import ShoppingListItem
from products.models import Product
from products.services import normalize_product_name

from .services import (
    get_or_sync_profile_for_auth_user,
    sync_auth_user_from_profile,
    sync_profile_from_auth_user,
)


class AuthUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')


class UserProfileSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = UserProfile
        fields = ('id_usuario', 'nombre_usuario', 'email', 'password', 'fecha_registro')
        read_only_fields = ('id_usuario',)

    def validate(self, attrs):
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError({'password': 'La contrasena es obligatoria al crear un usuario.'})
        return attrs

    def create(self, validated_data):
        raw_password = validated_data.pop('password')
        profile = UserProfile.objects.create(**validated_data)
        sync_auth_user_from_profile(profile, raw_password=raw_password)
        profile.refresh_from_db()
        return profile

    def update(self, instance, validated_data):
        raw_password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        sync_auth_user_from_profile(instance, raw_password=raw_password or None)
        if raw_password:
            instance.refresh_from_db()
        return instance


class ProductSerializer(serializers.ModelSerializer):
    imagen_url = serializers.SerializerMethodField()

    def get_imagen_url(self, obj):
        return None

    def validate(self, attrs):
        if 'nombre' in attrs:
            attrs['nombre'] = normalize_product_name(attrs.get('nombre'))

        return attrs

    class Meta:
        model = Product
        fields = ('id_producto', 'nombre', 'categoria', 'descripcion', 'precio', 'codigo_barras', 'imagen_url')
        read_only_fields = ('id_producto',)


class InventorySerializer(serializers.ModelSerializer):
    producto = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        required=False,
        allow_null=True,
    )
    cantidad = serializers.IntegerField(min_value=1)
    estado = serializers.PrimaryKeyRelatedField(read_only=True)
    usuario = serializers.PrimaryKeyRelatedField(read_only=True)
    usuario_nombre = serializers.CharField(source='usuario.nombre_usuario', read_only=True)
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_categoria = serializers.CharField(source='producto.categoria', read_only=True)
    producto_descripcion = serializers.CharField(source='producto.descripcion', read_only=True)
    producto_codigo_barras = serializers.CharField(source='producto.codigo_barras', read_only=True)
    producto_precio = serializers.DecimalField(
        source='producto.precio',
        max_digits=10,
        decimal_places=2,
        read_only=True,
        allow_null=True,
    )
    producto_imagen_url = serializers.SerializerMethodField()
    estado_nombre = serializers.SerializerMethodField()
    estado_color = serializers.SerializerMethodField()
    estado_dias_aviso = serializers.SerializerMethodField()
    dias_restantes = serializers.SerializerMethodField()
    producto_nombre_nuevo = serializers.CharField(write_only=True, required=False, allow_blank=True)
    producto_categoria_nueva = serializers.CharField(write_only=True, required=False, allow_blank=True)
    producto_precio_nuevo = serializers.DecimalField(
        write_only=True,
        required=False,
        allow_null=True,
        max_digits=10,
        decimal_places=2,
    )
    producto_codigo_barras_nuevo = serializers.CharField(write_only=True, required=False, allow_blank=True)

    def get_producto_imagen_url(self, obj):
        return None

    def get_estado_dias_aviso(self, obj):
        return get_alert_days(obj.estado)

    def get_dias_restantes(self, obj):
        return (obj.fecha_caducidad - timezone.localdate()).days

    def get_estado_nombre(self, obj):
        if self._is_expired(obj):
            return 'Caducado'

        return obj.estado.nombre_estado

    def get_estado_color(self, obj):
        if self._is_expired(obj):
            return 'gris'

        return obj.estado.color

    def validate(self, attrs):
        if self.instance is None:
            producto = attrs.get('producto')
            nombre_nuevo = str(attrs.get('producto_nombre_nuevo') or '').strip()

            if producto is None and not nombre_nuevo:
                raise serializers.ValidationError(
                    {'producto': 'Selecciona un producto existente o escribe el nombre de un producto nuevo.'}
                )

        return attrs

    def create(self, validated_data):
        self._assign_product(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        self._assign_product(validated_data)
        return super().update(instance, validated_data)

    def _assign_product(self, validated_data):
        selected_product = validated_data.get('producto')
        if selected_product is not None:
            self._clear_new_product_fields(validated_data)
            return

        new_name = str(validated_data.pop('producto_nombre_nuevo', '') or '').strip()
        new_category = str(validated_data.pop('producto_categoria_nueva', '') or '').strip()
        new_price = validated_data.pop('producto_precio_nuevo', None)
        new_barcode = str(validated_data.pop('producto_codigo_barras_nuevo', '') or '').strip()
        new_brand = str(validated_data.get('ubicacion') or '').strip()
        validated_data.pop('producto', None)

        if not new_name:
            return

        # Si el usuario escribe un producto nuevo, primero intento reutilizar uno ya existente para no duplicar el mismo registro.
        product = self._find_or_create_product(
            name=new_name,
            category=new_category,
            price=new_price,
            barcode=new_barcode,
            brand=new_brand,
        )
        validated_data['producto'] = product

    def _find_or_create_product(self, name, category, price, barcode, brand):
        normalized_name = normalize_product_name(name, brand)
        normalized_category = category or 'Sin categoria'

        if barcode:
            product = Product.objects.filter(codigo_barras=barcode).first()
            if product is not None:
                return product

        product = Product.objects.filter(
            nombre__iexact=normalized_name,
            categoria__iexact=normalized_category,
        ).first()
        if product is not None:
            return product

        return Product.objects.create(
            nombre=normalized_name,
            categoria=normalized_category,
            descripcion='',
            precio=price,
            codigo_barras=barcode or None,
        )

    def _clear_new_product_fields(self, validated_data):
        validated_data.pop('producto_nombre_nuevo', None)
        validated_data.pop('producto_categoria_nueva', None)
        validated_data.pop('producto_precio_nuevo', None)
        validated_data.pop('producto_codigo_barras_nuevo', None)

    def _is_expired(self, obj):
        return self.get_dias_restantes(obj) < 0

    class Meta:
        model = InventoryItem
        fields = (
            'id_inventario',
            'usuario',
            'usuario_nombre',
            'producto',
            'producto_nombre',
            'producto_categoria',
            'producto_descripcion',
            'producto_codigo_barras',
            'producto_precio',
            'producto_imagen_url',
            'estado',
            'estado_nombre',
            'estado_color',
            'estado_dias_aviso',
            'dias_restantes',
            'cantidad',
            'fecha_compra',
            'fecha_caducidad',
            'ubicacion',
            'consumido',
            'producto_nombre_nuevo',
            'producto_categoria_nueva',
            'producto_precio_nuevo',
            'producto_codigo_barras_nuevo',
        )
        read_only_fields = ('id_inventario',)


class ShoppingSuggestionSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_categoria = serializers.CharField(source='producto.categoria', read_only=True)
    producto_codigo_barras = serializers.CharField(source='producto.codigo_barras', read_only=True)
    producto_imagen_url = serializers.SerializerMethodField()
    sugerencia_motivos = serializers.SerializerMethodField()
    cantidad = serializers.IntegerField(min_value=1)

    def get_producto_imagen_url(self, obj):
        return None

    def get_sugerencia_motivos(self, obj):
        motivos = []
        inventory_items = InventoryItem.objects.filter(usuario=obj.lista.usuario, producto=obj.producto)

        if inventory_items.filter(consumido=True).exists():
            return ['Consumido']

        if inventory_items.filter(consumido=False, fecha_caducidad__lt=timezone.localdate()).exists():
            return ['Caducado']

        return motivos

    class Meta:
        model = ShoppingListItem
        fields = (
            'id_item',
            'producto_nombre',
            'producto_categoria',
            'producto_codigo_barras',
            'producto_imagen_url',
            'cantidad',
            'comprado',
            'sugerencia_motivos',
        )
        read_only_fields = ('id_item',)


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Ya existe un usuario de Django con este correo.')
        if UserProfile.objects.filter(email=value).exists():
            raise serializers.ValidationError('Ya existe un registro en la tabla usuario con este correo.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Las contrasenas no coinciden.'})
        if User.objects.filter(username=attrs['username']).exists():
            raise serializers.ValidationError({'username': 'Ya existe un usuario con ese nombre.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
        )
        sync_profile_from_auth_user(user)
        return user


class ZeroWasteTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        profile = get_or_sync_profile_for_auth_user(self.user)
        data['auth_user'] = AuthUserSerializer(self.user).data
        data['usuario'] = UserProfileSerializer(profile).data if profile else None
        return data
