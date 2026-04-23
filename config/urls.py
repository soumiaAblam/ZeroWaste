from django.contrib import admin
from django.urls import include, path

from api.views import ApiRootView

urlpatterns = [
    path('', ApiRootView.as_view(), name='api_root'),
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]
