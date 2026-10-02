from django.conf import settings
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from foodai_backend.food_analysis.services.ocr import (
    OCREngineUnavailable,
    get_default_ocr_engine,
)
from foodai_backend.throttling import RoleRateThrottle


class OCRScanView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [RoleRateThrottle]
    throttle_scope = 'ocr'

    def post(self, request, *args, **kwargs):
        image_file = request.FILES.get('image')
        if image_file is None:
            return Response(
                {'detail': 'No image uploaded. Provide an "image" file field.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        max_bytes = getattr(settings, 'OCR_MAX_UPLOAD_BYTES', 8 * 1024 * 1024)
        if image_file.size and image_file.size > max_bytes:
            return Response(
                {'detail': f'Image too large. Maximum allowed size is {max_bytes // (1024 * 1024)} MB.'},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        try:
            image_bytes = image_file.read()
            engine = get_default_ocr_engine()
            extracted_text = engine.extract_text(image_bytes)
            return Response({'text': extracted_text}, status=200)
        except OCREngineUnavailable:
            return Response({'detail': 'OCR engine unavailable'}, status=503)
        except Exception:
            return Response({'detail': 'Internal server error'}, status=500)
