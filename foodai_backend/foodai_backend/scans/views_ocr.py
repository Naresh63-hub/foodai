from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from foodai_backend.food_analysis.services.ocr import (
    OCREngineUnavailable,
    get_default_ocr_engine,
)


class OCRScanView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        try:
            image_file = request.FILES['image']
            image_bytes = image_file.read()
            engine = get_default_ocr_engine()
            extracted_text = engine.extract_text(image_bytes)
            return Response({'text': extracted_text}, status=200)
        except OCREngineUnavailable:
            return Response({'detail': 'OCR engine unavailable'}, status=503)
        except Exception:
            return Response({'detail': 'Internal server error'}, status=500)
