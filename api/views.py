from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from authentication.models import UserProfile
from inventory.models import InventoryItem
from shopping_list.models import ShoppingListItem
from products.models import Product
from products.services import get_product_by_barcode
from shopping_list.services import (
    AUTO_SHOPPING_LIST_NAME,
    sync_inventory_with_shopping_list,
    sync_shopping_suggestion,
    sync_user_suggestions,
)

from .serializers import (
    AuthUserSerializer,
    InventorySerializer,
    ProductSerializer,
    RegisterSerializer,
    ShoppingSuggestionSerializer,
    UserProfileSerializer,
    ZeroWasteTokenObtainPairSerializer,
)
from .services import get_or_sync_profile_for_auth_user


def build_auth_response(user):
    profile = get_or_sync_profile_for_auth_user(user)
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'auth_user': AuthUserSerializer(user).data,
        'usuario': UserProfileSerializer(profile).data if profile else None,
    }


def get_request_profile(request):
    return get_or_sync_profile_for_auth_user(request.user)


class ApiRootView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                'name': 'ZeroWaste API',
                'version': '1.0',
                'auth': {
                    'login': request.build_absolute_uri('/api/auth/login/'),
                    'refresh': request.build_absolute_uri('/api/auth/refresh/'),
                    'register': request.build_absolute_uri('/api/auth/register/'),
                    'me': request.build_absolute_uri('/api/auth/me/'),
                },
                'resources': {
                    'usuarios': request.build_absolute_uri('/api/usuarios/'),
                    'productos': request.build_absolute_uri('/api/productos/'),
                    'inventarios': request.build_absolute_uri('/api/inventarios/'),
                    'sugerencias_compra': request.build_absolute_uri('/api/listas-compra/sugerencias/'),
                    'barcode_lookup': request.build_absolute_uri('/api/productos/barcode-lookup/'),
                },
            }
        )


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(build_auth_response(user), status=status.HTTP_201_CREATED)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_request_profile(request)
        return Response(
            {
                'auth_user': AuthUserSerializer(request.user).data,
                'usuario': UserProfileSerializer(profile).data if profile else None,
            }
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response(status=status.HTTP_204_NO_CONTENT)


class ZeroWasteTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = ZeroWasteTokenObtainPairSerializer


class BarcodeLookupView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        barcode = (request.query_params.get('codigo_barras') or '').strip()
        if not barcode:
            return Response(
                {'ok': False, 'error': 'Debes indicar un codigo de barras.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        product = get_product_by_barcode(barcode)
        if not product:
            return Response(
                {'ok': False, 'error': 'No se encontro informacion para ese codigo de barras.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({'ok': True, 'producto': product})


class ShoppingSuggestionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_request_profile(request)
        if profile is None:
            return Response([])

        sync_user_suggestions(profile)
        items = ShoppingListItem.objects.select_related('lista', 'producto').filter(
            lista__usuario=profile,
            lista__nombre_lista=AUTO_SHOPPING_LIST_NAME,
        ).order_by('producto__nombre')
        return Response(ShoppingSuggestionSerializer(items, many=True).data)


class UserProfileViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    lookup_value_regex = r'\d+'
    queryset = UserProfile.objects.all().order_by('id_usuario')
    serializer_class = UserProfileSerializer
    search_fields = ('nombre_usuario', 'email')
    ordering_fields = ('id_usuario', 'nombre_usuario', 'email', 'fecha_registro')


class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    lookup_value_regex = r'\d+'
    queryset = Product.objects.all().order_by('id_producto')
    serializer_class = ProductSerializer
    search_fields = ('nombre', 'categoria', 'codigo_barras', 'descripcion')
    ordering_fields = ('id_producto', 'nombre', 'categoria', 'precio', 'codigo_barras')


class InventoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    lookup_value_regex = r'\d+'
    queryset = InventoryItem.objects.select_related('usuario', 'producto', 'estado').order_by('id_inventario')
    serializer_class = InventorySerializer
    search_fields = ('usuario__nombre_usuario', 'producto__nombre', 'estado__nombre_estado', 'ubicacion')
    ordering_fields = ('id_inventario', 'cantidad', 'fecha_compra', 'fecha_caducidad', 'ubicacion', 'consumido')

    def perform_create(self, serializer):
        profile = get_request_profile(self.request)
        inventory_item = serializer.save(usuario=profile, consumido=False)
        sync_inventory_with_shopping_list(inventory_item)

    def perform_update(self, serializer):
        inventory_item = serializer.save()
        sync_inventory_with_shopping_list(inventory_item)

    def perform_destroy(self, instance):
        profile = instance.usuario
        product = instance.producto
        super().perform_destroy(instance)
        sync_shopping_suggestion(profile, product)
