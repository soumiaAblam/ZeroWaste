from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ApiRootView,
    BarcodeLookupView,
    InventoryViewSet,
    LogoutView,
    ProductViewSet,
    CurrentUserView,
    RegisterView,
    ShoppingSuggestionsView,
    UserProfileViewSet,
    ZeroWasteTokenObtainPairView,
)

router = DefaultRouter()
router.register('usuarios', UserProfileViewSet, basename='usuarios')
router.register('productos', ProductViewSet, basename='productos')
router.register('inventarios', InventoryViewSet, basename='inventarios')

urlpatterns = [
    path('', ApiRootView.as_view(), name='api-root'),
    path('auth/login/', ZeroWasteTokenObtainPairView.as_view(), name='auth-login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/me/', CurrentUserView.as_view(), name='auth-me'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('productos/barcode-lookup/', BarcodeLookupView.as_view(), name='barcode-lookup'),
    path('listas-compra/sugerencias/', ShoppingSuggestionsView.as_view(), name='shopping-suggestions'),
    path('', include(router.urls)),
]
