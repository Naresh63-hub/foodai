from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

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
from foodai_backend.users.views import ProfileView

router = DefaultRouter()

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),

    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

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

    # Users & Profile (Auth handled by Firebase)
    path('api/users/profile/', ProfileView.as_view(), name='user_profile'),
]
