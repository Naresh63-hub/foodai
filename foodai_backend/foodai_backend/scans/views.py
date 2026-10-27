import datetime
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from foodai_backend.scans.models import DailyMealLog, Scan
from foodai_backend.food_analysis.models import Product
from foodai_backend.food_analysis.serializers import analyze_product


class ScanListView(APIView):
    permission_classes = [AllowAny]

    def get_permissions(self):
        # Reading history is private (owner only); logging a scan may be anonymous.
        if self.request.method.lower() == 'get':
            return [IsAuthenticated()]
        return [AllowAny()]

    def get(self, request):
        # Only the authenticated user's own scans, never other users'
        scans = (
            Scan.objects.filter(user=request.user)
            .select_related('product')
            .order_by("-scanned_at")[:50]
        )

        results = []
        for s in scans:
            payload = s.raw_payload or {}
            product_name = ""
            brands = ""
            barcode = ""

            if s.product:
                product_name = s.product.product_name
                brands = s.product.brands
                barcode = s.product.barcode
                if not payload or "product" not in payload:
                    payload = analyze_product(s.product)
            else:
                product_name = s.food_name or payload.get("food_name") or "Food Scan"
                barcode = payload.get("barcode") or str(s.id)

            results.append({
                "id": s.id,
                "scanned_at": s.scanned_at.isoformat() if hasattr(s.scanned_at, "isoformat") else str(s.scanned_at),
                "product_id": s.product.id if s.product else None,
                "product_name": product_name,
                "brands": brands,
                "barcode": barcode,
                "scan_type": s.scan_type,
                "calories_kcal": s.calories_kcal,
                "payload": payload,
            })
        return Response(results, status=status.HTTP_200_OK)

    def post(self, request):
        product_id = request.data.get("product_id")
        barcode = request.data.get("barcode")
        food_name = request.data.get("food_name") or request.data.get("product_name") or ""
        scan_type = request.data.get("scan_type") or "barcode"
        calories = float(request.data.get("calories_kcal") or 0.0)
        custom_payload = request.data.get("payload") or request.data.get("raw_payload") or {}

        product = None
        if product_id:
            product = Product.objects.filter(id=product_id).first()
        elif barcode:
            product = Product.objects.filter(barcode=barcode).first()

        analysis = custom_payload
        if product:
            analysis = analyze_product(product, user=request.user if request.user.is_authenticated else None)
            food_name = product.product_name

        if not product and not food_name:
            return Response({"detail": "Please provide a valid product or food name."}, status=status.HTTP_400_BAD_REQUEST)

        scan = Scan.objects.create(
            user=request.user if request.user.is_authenticated else None,
            product=product,
            food_name=food_name,
            scan_type=scan_type,
            calories_kcal=calories,
            raw_payload=analysis,
        )

        return Response({
            "id": scan.id,
            "scanned_at": scan.scanned_at.isoformat(),
            "product_name": food_name,
            "scan_type": scan_type,
            "calories_kcal": calories,
            "analysis": analysis,
        }, status=status.HTTP_201_CREATED)


class ScanDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        scan = Scan.objects.filter(pk=pk, user=request.user).first()
        if not scan:
            return Response({"detail": "Scan not found"}, status=status.HTTP_404_NOT_FOUND)
        scan.delete()
        return Response({"detail": "Scan deleted successfully"}, status=status.HTTP_204_NO_CONTENT)


class DailyMealLogListView(APIView):
    """
    CRUD API for 24-hour Daily Food Intake Logs.
    Stores and retrieves meals across devices for logged-in or guest users.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        date_param = request.query_params.get("date")
        qs = DailyMealLog.objects.all()

        if request.user.is_authenticated:
            qs = qs.filter(user=request.user)

        if date_param:
            qs = qs.filter(date_key=date_param)

        logs = qs.order_by("-created_at")[:100]

        results = [
            {
                "id": str(log.id),
                "timestamp": log.created_at.isoformat(),
                "product_name": log.product_name,
                "meal_type": log.meal_type,
                "portion_g": log.portion_g,
                "calories_kcal": log.calories_kcal,
                "carbohydrates_g": log.carbohydrates_g,
                "proteins_g": log.proteins_g,
                "fat_g": log.fat_g,
                "sugars_g": log.sugars_g,
                "salt_g": log.salt_g,
                "additives_count": log.additives_count,
                "processing_level": log.processing_level,
                "date_key": log.date_key,
                "raw_data": log.raw_data,
            }
            for log in logs
        ]
        return Response(results, status=status.HTTP_200_OK)

    def post(self, request):
        data = request.data
        product_name = data.get("product_name") or data.get("foodName") or ""
        if not product_name:
            return Response({"detail": "product_name is required."}, status=status.HTTP_400_BAD_REQUEST)

        date_key = data.get("date_key") or datetime.date.today().isoformat()
        meal_type = data.get("meal_type") or "meal"
        portion_g = float(data.get("portion_g") or 200.0)
        calories = float(data.get("calories_kcal") or data.get("calories") or 0.0)
        carbs = float(data.get("carbohydrates_g") or 0.0)
        proteins = float(data.get("proteins_g") or 0.0)
        fat = float(data.get("fat_g") or 0.0)
        sugars = float(data.get("sugars_g") or 0.0)
        salt = float(data.get("salt_g") or 0.0)
        additives_count = int(data.get("additives_count") or 0)
        processing_level = data.get("processing_level") or "minimally_processed"

        log = DailyMealLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            product_name=product_name,
            meal_type=meal_type,
            portion_g=portion_g,
            calories_kcal=calories,
            carbohydrates_g=carbs,
            proteins_g=proteins,
            fat_g=fat,
            sugars_g=sugars,
            salt_g=salt,
            additives_count=additives_count,
            processing_level=processing_level,
            date_key=date_key,
            raw_data=data,
        )

        return Response({
            "id": str(log.id),
            "timestamp": log.created_at.isoformat(),
            "product_name": log.product_name,
            "portion_g": log.portion_g,
            "calories_kcal": log.calories_kcal,
            "carbohydrates_g": log.carbohydrates_g,
            "proteins_g": log.proteins_g,
            "fat_g": log.fat_g,
            "sugars_g": log.sugars_g,
            "salt_g": log.salt_g,
            "additives_count": log.additives_count,
            "processing_level": log.processing_level,
            "date_key": log.date_key,
        }, status=status.HTTP_201_CREATED)


class DailyMealLogDetailView(APIView):
    permission_classes = [AllowAny]

    def delete(self, request, pk):
        qs = DailyMealLog.objects.filter(pk=pk)
        if request.user.is_authenticated:
            qs = qs.filter(user=request.user)
        log = qs.first()
        if not log:
            return Response({"detail": "Meal log not found."}, status=status.HTTP_404_NOT_FOUND)
        log.delete()
        return Response({"detail": "Meal log deleted."}, status=status.HTTP_204_NO_CONTENT)


class WeeklyProgressView(APIView):
    """
    Computes 7-day caloric & macro progress directly from the backend database.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        daily_target = int(request.query_params.get("target", 2000))
        today = datetime.date.today()
        days_data = []

        day_labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

        for i in range(6, -1, -1):
            target_date = today - datetime.timedelta(days=i)
            date_str = target_date.isoformat()
            weekday_idx = (target_date.weekday() + 1) % 7
            day_label = "Today" if i == 0 else day_labels[weekday_idx]

            logs_qs = DailyMealLog.objects.filter(date_key=date_str)
            if request.user.is_authenticated:
                logs_qs = logs_qs.filter(user=request.user)

            logs = list(logs_qs)
            total_cal = sum(l.calories_kcal for l in logs)
            carbs = sum(l.carbohydrates_g for l in logs)
            protein = sum(l.proteins_g for l in logs)
            fat = sum(l.fat_g for l in logs)

            meals = [
                {
                    "name": l.product_name,
                    "calories": round(l.calories_kcal),
                    "time": l.created_at.strftime("%I:%M %p"),
                    "source": "meal_log",
                }
                for l in logs
            ]

            days_data.append({
                "date": date_str,
                "dayLabel": day_label,
                "calories": round(total_cal),
                "targetCalories": daily_target,
                "carbsG": round(carbs),
                "proteinG": round(protein),
                "fatG": round(fat),
                "mealsCount": len(meals),
                "meals": meals,
            })

        return Response(days_data, status=status.HTTP_200_OK)
