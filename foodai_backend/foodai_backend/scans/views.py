from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from foodai_backend.scans.models import Scan
from foodai_backend.food_analysis.models import Product
from foodai_backend.food_analysis.serializers import analyze_product


class ScanListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            scans = Scan.objects.filter(user=request.user).order_by("-scanned_at")[:50]
        else:
            scans = Scan.objects.all().order_by("-scanned_at")[:20]

        results = []
        for s in scans:
            payload = s.raw_payload
            if not payload or "product" not in payload:
                payload = analyze_product(s.product)
            results.append({
                "id": s.id,
                "scanned_at": s.scanned_at,
                "product_id": s.product.id,
                "product_name": s.product.product_name,
                "brands": s.product.brands,
                "barcode": s.product.barcode,
                "payload": payload,
            })
        return Response(results, status=status.HTTP_200_OK)

    def post(self, request):
        product_id = request.data.get("product_id")
        barcode = request.data.get("barcode")
        product = None

        if product_id:
            product = Product.objects.filter(id=product_id).first()
        elif barcode:
            product = Product.objects.filter(barcode=barcode).first()

        if not product:
            return Response({"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

        analysis = analyze_product(product, user=request.user if request.user.is_authenticated else None)

        scan = Scan.objects.create(
            user=request.user if request.user.is_authenticated else None,
            product=product,
            raw_payload=analysis,
        )

        return Response({
            "id": scan.id,
            "scanned_at": scan.scanned_at,
            "product": analysis["product"],
            "analysis": analysis,
        }, status=status.HTTP_201_CREATED)


class ScanDetailView(APIView):
    permission_classes = [AllowAny]

    def delete(self, request, pk):
        scan = Scan.objects.filter(pk=pk).first()
        if not scan:
            return Response({"detail": "Scan not found"}, status=status.HTTP_404_NOT_FOUND)
        scan.delete()
        return Response({"detail": "Scan deleted successfully"}, status=status.HTTP_204_NO_CONTENT)
