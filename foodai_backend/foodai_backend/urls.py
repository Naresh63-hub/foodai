from django.contrib import admin
from django.http import JsonResponse
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
from foodai_backend.food_analysis.views_ai import (
    AINutritionAnalyzeView,
    FoodVisionAnalyzeView,
    MultiItemPlateAnalyzeView,
)
from foodai_backend.scans.views import (
    DailyMealLogDetailView,
    DailyMealLogListView,
    ScanDetailView,
    ScanListView,
    WeeklyProgressView,
)
from foodai_backend.scans.views_ocr import OCRScanView
from foodai_backend.users.views import ProfileView


def root_health_view(request):
    return JsonResponse({
        "status": "healthy",
        "service": "FoodAI Backend API",
        "version": "1.0.0",
        "documentation": "/api/docs/",
        "sample_products": "/api/products/sample/",
    })


router = DefaultRouter()

urlpatterns = [
    path('', root_health_view, name='root_health'),
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),

    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Scanning & Analysis
    path('api/scan/barcode/', BarcodeScanView.as_view(), name='scan_barcode'),
    path('api/scan/barcode', BarcodeScanView.as_view()),
    path('api/scan/text/', TextScanView.as_view(), name='scan_text'),
    path('api/scan/text', TextScanView.as_view()),
    path('api/scan/ocr/', OCRScanView.as_view(), name='scan_ocr'),
    path('api/scan/ocr', OCRScanView.as_view()),

    # AI Nutrition & Computer Vision (Gemini / Clinical Synthesizer)
    path('api/ai/nutrition-analyze/', AINutritionAnalyzeView.as_view(), name='ai_nutrition_analyze'),
    path('api/ai/nutrition-analyze', AINutritionAnalyzeView.as_view()),
    path('api/nutrition-analyze/', AINutritionAnalyzeView.as_view(), name='nutrition_analyze'),
    path('api/nutrition-analyze', AINutritionAnalyzeView.as_view()),
    path('api/ai/food-vision-analyze/', FoodVisionAnalyzeView.as_view(), name='ai_food_vision_analyze'),
    path('api/ai/food-vision-analyze', FoodVisionAnalyzeView.as_view()),
    path('api/food-vision-analyze/', FoodVisionAnalyzeView.as_view(), name='food_vision_analyze'),
    path('api/food-vision-analyze', FoodVisionAnalyzeView.as_view()),
    path('api/ai/plate-analyze/', MultiItemPlateAnalyzeView.as_view(), name='ai_plate_analyze'),
    path('api/ai/plate-analyze', MultiItemPlateAnalyzeView.as_view()),
    path('api/plate-analyze/', MultiItemPlateAnalyzeView.as_view(), name='plate_analyze'),
    path('api/plate-analyze', MultiItemPlateAnalyzeView.as_view()),

    # Products & Additives
    path('api/products/search/', ProductCatalogSearchView.as_view(), name='product_search'),
    path('api/products/search', ProductCatalogSearchView.as_view()),
    path('api/products/sample/', SampleProductsView.as_view(), name='products_sample'),
    path('api/products/sample', SampleProductsView.as_view()),
    path('api/products/compare/', ProductComparisonView.as_view(), name='products_compare'),
    path('api/products/compare', ProductComparisonView.as_view()),
    path('api/products/<str:pk_or_barcode>/', ProductDetailView.as_view(), name='product_detail'),
    path('api/products/<str:pk_or_barcode>', ProductDetailView.as_view()),
    path('api/additives/', AdditiveListView.as_view(), name='additives_list'),
    path('api/additives', AdditiveListView.as_view()),
    path('api/additives/<str:code_or_id>/', AdditiveDetailView.as_view(), name='additive_detail'),
    path('api/additives/<str:code_or_id>', AdditiveDetailView.as_view()),

    # Scans History
    path('api/scans/', ScanListView.as_view(), name='scans_list'),
    path('api/scans', ScanListView.as_view()),
    path('api/scans/<int:pk>/', ScanDetailView.as_view(), name='scan_detail'),
    path('api/scans/<int:pk>', ScanDetailView.as_view()),

    # Daily Meal Logs & Weekly Progress
    path('api/daily-logs/', DailyMealLogListView.as_view(), name='daily_logs_list'),
    path('api/daily-logs', DailyMealLogListView.as_view()),
    path('api/daily-logs/<int:pk>/', DailyMealLogDetailView.as_view(), name='daily_logs_detail'),
    path('api/daily-logs/<int:pk>', DailyMealLogDetailView.as_view()),
    path('api/weekly-progress/', WeeklyProgressView.as_view(), name='weekly_progress'),
    path('api/weekly-progress', WeeklyProgressView.as_view()),

    # Users & Profile (Auth handled by Firebase)
    path('api/users/profile/', ProfileView.as_view(), name='user_profile'),
]
