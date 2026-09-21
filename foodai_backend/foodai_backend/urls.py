from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

from foodai_backend.food_analysis.views import (
    AdditiveDetailView,
    AdditiveListView,
    BarcodeScanView,
    ProductComparisonView,
    ProductDetailView,
    ProductCatalogSearchView,
    SampleProductsView,
    TextScanView,
)
from foodai_backend.scans.views import ScanDetailView, ScanListView
from foodai_backend.scans.views_ocr import OCRScanView
from foodai_backend.users.views import LoginView, ProfileView, RegisterView

router = DefaultRouter()

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),

    # Scanning & Analysis
    path('api/scan/barcode/', BarcodeScanView.as_view(), name='scan_barcode'),
    path('api/scan/text/', TextScanView.as_view(), name='scan_text'),
    path('api/scan/ocr/', OCRScanView.as_view(), name='scan_ocr'),

    # Products & Additives
    path('api/products/search/', ProductCatalogSearchView.as_view(), name='product_search'),
    path('api/products/sample/', SampleProductsView.as_view(), name='products_sample'),
    path('api/products/compare/', ProductComparisonView.as_view(), name='products_compare'),
    path('api/products/<str:pk_or_barcode>/', ProductDetailView.as_view(), name='product_detail'),
    path('api/additives/', AdditiveListView.as_view(), name='additives_list'),
    path('api/additives/<str:code_or_id>/', AdditiveDetailView.as_view(), name='additive_detail'),

    # Scans History
    path('api/scans/', ScanListView.as_view(), name='scans_list'),
    path('api/scans/<int:pk>/', ScanDetailView.as_view(), name='scan_detail'),

    # Users & Auth
    path('api/auth/register/', RegisterView.as_view(), name='auth_register'),
    path('api/auth/login/', LoginView.as_view(), name='auth_login'),
    path('api/users/profile/', ProfileView.as_view(), name='user_profile'),
    path('api/auth/', include([
        path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
        path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
        path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    ])),
]
