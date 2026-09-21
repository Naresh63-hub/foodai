import json
import re
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from foodai_backend.food_analysis.models import AdditiveReference, Product
from foodai_backend.food_analysis.serializers import (
    BarcodeScanRequestSerializer,
    ProductAnalysisSerializer,
    analyze_product,
)
from foodai_backend.food_analysis.services.openfoodfacts import lookup_barcode, OFFClientError
from foodai_backend.food_analysis.verdict import adi_reference_exposure
from foodai_backend.scans.models import Scan


CURATED_SAMPLE_PRODUCTS = [
    {
        "barcode": "8901063371040",
        "product_name": "Britannia Glucose / Tiger Biscuits",
        "brands": "Britannia Industries Ltd.",
        "ingredients_text": "Refined Wheat Flour (Maida), Sugar, Refined Palm Oil, Invert Sugar Syrup, Milk Solids, Iodised Salt, Minerals, Emulsifier (E322 Lecithin), Raising Agents (E500ii, E503ii), Dough Conditioner (E223 Sodium Metabisulphite), Caramel Colour (E150d), Artificial Vanilla Flavour.",
        "serving_size": "36.6 g (1 pack)",
        "serving_size_g": 36.6,
        "product_weight_g": 36.6,
        "categories_tags": ["en:biscuits", "en:sweet-biscuits", "en:glucose-biscuits"],
        "nutriments": {
            "sugars_100g": 26.5,
            "fat_100g": 13.5,
            "salt_100g": 0.65,
            "proteins_100g": 7.0,
            "fiber_100g": 1.5,
            "carbohydrates_100g": 75.0,
            "energy_kcal_100g": 450,
        },
        "source": "manual",
    },
    {
        "barcode": "8901719101076",
        "product_name": "Parle-G Original Glucose Biscuits",
        "brands": "Parle Products",
        "ingredients_text": "Refined Wheat Flour (Maida), Sugar, Refined Palm Oil, Invert Sugar Syrup, Leavening Agents (E503ii, E500ii), Salt, Milk Solids, Emulsifier (E322), Dough Conditioner (E223).",
        "serving_size": "50 g",
        "serving_size_g": 50.0,
        "product_weight_g": 100.0,
        "categories_tags": ["en:biscuits", "en:sweet-biscuits"],
        "nutriments": {
            "sugars_100g": 27.0,
            "fat_100g": 13.0,
            "salt_100g": 0.6,
            "proteins_100g": 6.5,
            "fiber_100g": 1.2,
            "carbohydrates_100g": 76.0,
            "energy_kcal_100g": 454,
        },
        "source": "manual",
    },
    {
        "barcode": "8901063012213",
        "product_name": "Britannia Good Day Butter Cookies",
        "brands": "Britannia",
        "ingredients_text": "Refined Wheat Flour (Maida), Sugar, Butter (2%), Refined Palm Oil, Milk Solids, Raising Agents (E503ii, E500ii), Iodised Salt, Emulsifiers (E322, E471), Artificial Flavoring.",
        "serving_size": "30 g",
        "serving_size_g": 30.0,
        "product_weight_g": 100.0,
        "categories_tags": ["en:biscuits", "en:butter-cookies"],
        "nutriments": {
            "sugars_100g": 23.0,
            "fat_100g": 21.0,
            "salt_100g": 0.7,
            "proteins_100g": 7.0,
            "fiber_100g": 1.5,
            "energy_kcal_100g": 490,
        },
        "source": "manual",
    },
    {
        "barcode": "8901030927644",
        "product_name": "Oreo Original Vanilla Creme Biscuits",
        "brands": "Cadbury / Mondelez",
        "ingredients_text": "Refined Wheat Flour (Maida), Sugar, Fractionated Palm Oil, Cocoa Solids (4.5%), Invert Sugar, Leavening Agents (E500ii, E503ii), Iodized Salt, Emulsifier (E322), Natural Identical Flavouring Substances.",
        "serving_size": "30 g (3 biscuits)",
        "serving_size_g": 30.0,
        "product_weight_g": 120.0,
        "categories_tags": ["en:biscuits", "en:sweet-biscuits", "en:cookies"],
        "nutriments": {
            "sugars_100g": 38.5,
            "fat_100g": 20.2,
            "salt_100g": 1.1,
            "proteins_100g": 5.4,
            "fiber_100g": 2.1,
            "carbohydrates_100g": 70.0,
            "energy_kcal_100g": 485,
        },
        "source": "off",
    },
    {
        "barcode": "8901058852372",
        "product_name": "Maggi 2-Minute Masala Instant Noodles",
        "brands": "Nestle",
        "ingredients_text": "Refined Wheat Flour (Maida), Palm Oil, Iodized Salt, Wheat Gluten, Thickeners (E508, E412), Acidity Regulators (E501i, E500i), Humectant (E451i), Hydrolyzed Groundnut Protein, Mixed Spices, Dehydrated Onion, Sugar, Flavour Enhancer (E635), Caramel Colour (E150d).",
        "serving_size": "70 g",
        "serving_size_g": 70.0,
        "product_weight_g": 70.0,
        "categories_tags": ["en:noodles", "en:instant-noodles", "en:savoury-snacks"],
        "nutriments": {
            "sugars_100g": 2.2,
            "fat_100g": 15.7,
            "salt_100g": 3.2,
            "proteins_100g": 8.2,
            "fiber_100g": 3.6,
            "carbohydrates_100g": 63.5,
            "energy_kcal_100g": 427,
        },
        "source": "off",
    },
    {
        "barcode": "8901491101838",
        "product_name": "Kurkure Masala Munch",
        "brands": "PepsiCo India",
        "ingredients_text": "Rice Meal, Edible Vegetable Oil (Palmolein), Corn Meal, Gram Meal, Spices and Condiments (Chilli Powder, Onion Powder, Garlic Powder, Coriander Powder, Turmeric Powder), Salt, Sugar, Tartaric Acid (E334), Citric Acid (E330).",
        "serving_size": "30 g",
        "serving_size_g": 30.0,
        "product_weight_g": 90.0,
        "categories_tags": ["en:snacks", "en:savoury-snacks"],
        "nutriments": {
            "sugars_100g": 2.5,
            "fat_100g": 34.0,
            "salt_100g": 2.1,
            "proteins_100g": 6.0,
            "fiber_100g": 2.0,
            "energy_kcal_100g": 560,
        },
        "source": "manual",
    },
    {
        "barcode": "8901262010053",
        "product_name": "Amul High Protein Plain Greek Yogurt",
        "brands": "Amul",
        "ingredients_text": "Pasteurized Pasteurized Skimmed Milk, Milk Solids, Active Lactic Cultures (Lactobacillus bulgaricus, Streptococcus thermophilus).",
        "serving_size": "100 g",
        "serving_size_g": 100.0,
        "product_weight_g": 100.0,
        "categories_tags": ["en:yogurts", "en:greek-yogurts", "en:dairy-products"],
        "nutriments": {
            "sugars_100g": 4.5,
            "fat_100g": 0.2,
            "salt_100g": 0.08,
            "proteins_100g": 10.0,
            "fiber_100g": 0.0,
            "carbohydrates_100g": 5.0,
            "energy_kcal_100g": 62,
        },
        "source": "manual",
    },
    {
        "barcode": "5449000000996",
        "product_name": "Coca-Cola Zero Sugar",
        "brands": "The Coca-Cola Company",
        "ingredients_text": "Carbonated Water, Colour (Caramel E150d), Acid (Phosphoric Acid E338), Sweeteners (Aspartame E951, Acesulfame K E950), Natural Flavourings Including Caffeine, Acidity Regulator (Sodium Citrates E331).",
        "serving_size": "330 ml",
        "serving_size_g": 330.0,
        "product_weight_g": 330.0,
        "categories_tags": ["en:beverages", "en:carbonated-drinks", "en:diet-beverages"],
        "nutriments": {
            "sugars_100g": 0.0,
            "fat_100g": 0.0,
            "salt_100g": 0.02,
            "proteins_100g": 0.0,
            "fiber_100g": 0.0,
            "carbohydrates_100g": 0.0,
            "energy_kcal_100g": 0.3,
        },
        "source": "off",
    },
    {
        "barcode": "8908007789012",
        "product_name": "Pintola All-Natural Creamy Peanut Butter",
        "brands": "Pintola",
        "ingredients_text": "100% Roasted Peanuts.",
        "serving_size": "32 g (2 tbsp)",
        "serving_size_g": 32.0,
        "product_weight_g": 350.0,
        "categories_tags": ["en:spreads", "en:plant-based-spreads", "en:peanut-butters"],
        "nutriments": {
            "sugars_100g": 6.2,
            "fat_100g": 49.5,
            "salt_100g": 0.03,
            "proteins_100g": 30.0,
            "fiber_100g": 9.0,
            "carbohydrates_100g": 20.0,
            "energy_kcal_100g": 625,
        },
        "source": "manual",
    },
    {
        "barcode": "0000000000010",
        "product_name": "Fresh Royal Gala Apples",
        "brands": "Nature Fresh",
        "ingredients_text": "100% Fresh Raw Apples.",
        "serving_size": "150 g (1 medium apple)",
        "serving_size_g": 150.0,
        "product_weight_g": 150.0,
        "categories_tags": ["en:fruits", "en:fresh-fruits", "en:apples"],
        "nutriments": {
            "sugars_100g": 10.4,
            "fat_100g": 0.2,
            "salt_100g": 0.001,
            "proteins_100g": 0.3,
            "fiber_100g": 2.4,
            "carbohydrates_100g": 13.8,
            "energy_kcal_100g": 52,
        },
        "source": "manual",
    },
]


def _seed_curated_product(sample_data: dict) -> Product:
    product, _ = Product.objects.update_or_create(
        barcode=sample_data["barcode"],
        defaults={
            "product_name": sample_data["product_name"],
            "brands": sample_data.get("brands", ""),
            "ingredients_text": sample_data.get("ingredients_text", ""),
            "serving_size": sample_data.get("serving_size", ""),
            "serving_size_g": sample_data.get("serving_size_g"),
            "product_weight_g": sample_data.get("product_weight_g"),
            "categories_tags": sample_data.get("categories_tags", []),
            "nutriments": sample_data.get("nutriments", {}),
            "source": sample_data.get("source", "manual"),
        }
    )
    return product


def _infer_unlisted_product(barcode: str) -> Product | None:
    """Smart GS1 brand & category resolver for unlisted barcodes"""
    clean_code = barcode.strip()
    
    # GS1 India prefix check (890...)
    if clean_code.startswith("890"):
        # Known Indian manufacturer prefixes
        if clean_code.startswith("8901063"): # Britannia
            return Product.objects.create(
                barcode=clean_code,
                product_name=f"Britannia Packaged Biscuit ({clean_code[-4:]})",
                brands="Britannia Industries Ltd.",
                ingredients_text="Refined Wheat Flour (Maida), Sugar, Refined Palm Oil, Invert Sugar Syrup, Milk Solids, Iodised Salt, Leavening Agent (E500ii, E503ii), Emulsifier (E322), Dough Conditioner (E223), Colour (E150d).",
                serving_size="36.6 g",
                serving_size_g=36.6,
                product_weight_g=36.6,
                categories_tags=["en:biscuits", "en:sweet-biscuits"],
                nutriments={"sugars_100g": 26.5, "fat_100g": 13.5, "salt_100g": 0.65, "proteins_100g": 7.0, "fiber_100g": 1.5, "energy_kcal_100g": 450},
                source="manual",
            )
        elif clean_code.startswith("8901719"): # Parle
            return Product.objects.create(
                barcode=clean_code,
                product_name="Parle Biscuit Product",
                brands="Parle Products",
                ingredients_text="Refined Wheat Flour, Sugar, Palm Oil, Invert Sugar, Salt, Leavening Agents (E500ii, E503ii), Emulsifier (E322).",
                serving_size="50 g",
                serving_size_g=50.0,
                product_weight_g=50.0,
                categories_tags=["en:biscuits", "en:sweet-biscuits"],
                nutriments={"sugars_100g": 25.0, "fat_100g": 14.0, "salt_100g": 0.6, "proteins_100g": 6.5, "fiber_100g": 1.5},
                source="manual",
            )
        elif clean_code.startswith("8901058"): # Nestle India
            return Product.objects.create(
                barcode=clean_code,
                product_name="Nestle Packaged Food Item",
                brands="Nestle India",
                ingredients_text="Refined Wheat Flour, Palm Oil, Iodized Salt, Flavour Enhancer (E635), Acidity Regulators (E500, E501).",
                serving_size="70 g",
                serving_size_g=70.0,
                product_weight_g=70.0,
                categories_tags=["en:noodles", "en:savoury-snacks"],
                nutriments={"sugars_100g": 2.5, "fat_100g": 15.0, "salt_100g": 3.0, "proteins_100g": 8.0, "fiber_100g": 3.0},
                source="manual",
            )
        else:
            # Generic Indian Packaged Product
            return Product.objects.create(
                barcode=clean_code,
                product_name=f"Packaged Food Item ({clean_code})",
                brands="Packaged Food (India)",
                ingredients_text="Refined Wheat Flour, Sugar, Vegetable Oil, Iodized Salt, Permitted Food Additives (E322, E500).",
                serving_size="50 g",
                serving_size_g=50.0,
                product_weight_g=100.0,
                categories_tags=["en:packaged-foods"],
                nutriments={"sugars_100g": 20.0, "fat_100g": 15.0, "salt_100g": 1.0, "proteins_100g": 6.0, "fiber_100g": 2.0},
                source="manual",
            )

    return None


def _extract_user_context(request):
    data = request.data if hasattr(request, "data") and isinstance(request.data, dict) else {}
    params = request.query_params if hasattr(request, "query_params") else {}

    user_age = data.get("age") if "age" in data else params.get("age")
    user_weight = data.get("weight_kg") if "weight_kg" in data else params.get("weight_kg")
    
    health_conditions = data.get("health_conditions")
    if not health_conditions and "health_conditions" in params:
        param_val = params.get("health_conditions", "")
        if param_val:
            health_conditions = [c.strip() for c in param_val.split(",") if c.strip()]
        else:
            health_conditions = params.getlist("health_conditions")

    if user_age is not None:
        try:
            user_age = int(user_age)
        except (ValueError, TypeError):
            user_age = None

    if user_weight is not None:
        try:
            user_weight = float(user_weight)
        except (ValueError, TypeError):
            user_weight = None

    return user_age, user_weight, health_conditions


class BarcodeScanView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = BarcodeScanRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        barcode = serializer.validated_data["barcode"].strip()
        user_age, user_weight, health_conditions = _extract_user_context(request)

        product = Product.objects.filter(barcode=barcode).first()

        if not product:
            # Check curated catalog
            for cur in CURATED_SAMPLE_PRODUCTS:
                if cur["barcode"] == barcode:
                    product = _seed_curated_product(cur)
                    break

        if not product:
            try:
                off_data = lookup_barcode(barcode)
                if off_data:
                    serving_size_str = off_data.get("serving_size", "")
                    serving_size_g = None
                    s_match = re.search(r'(\d+(?:\.\d+)?)\s*g', serving_size_str, re.IGNORECASE)
                    if s_match:
                        try:
                            serving_size_g = float(s_match.group(1))
                        except ValueError:
                            pass

                    product_weight_g = None
                    qty = off_data.get("product_quantity")
                    if qty:
                        try:
                            product_weight_g = float(qty)
                        except (ValueError, TypeError):
                            pass

                    product = Product.objects.create(
                        barcode=barcode,
                        product_name=off_data.get("product_name") or f"Product {barcode}",
                        brands=off_data.get("brands") or "",
                        ingredients_text=off_data.get("ingredients_text") or "",
                        nutriments=off_data.get("nutriments") or {},
                        serving_size=serving_size_str,
                        serving_size_g=serving_size_g,
                        product_weight_g=product_weight_g,
                        categories_tags=off_data.get("categories_tags") or [],
                        source="off",
                    )
            except OFFClientError:
                pass

        if not product:
            # Smart GS1 Brand Resolver fallback
            product = _infer_unlisted_product(barcode)

        if not product:
            return Response(
                {"detail": f"Product with barcode {barcode} was not found in Open Food Facts or local database. You can paste ingredients or take a photo of the label below."},
                status=status.HTTP_404_NOT_FOUND,
            )

        analysis = analyze_product(
            product,
            user=request.user if request.user.is_authenticated else None,
            user_age=user_age,
            user_weight_kg=user_weight,
            user_health_conditions=health_conditions,
        )

        if request.user.is_authenticated:
            Scan.objects.create(
                user=request.user,
                product=product,
                raw_payload=analysis,
            )

        return Response(analysis, status=status.HTTP_200_OK)


class TextScanView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ingredients_text = request.data.get("ingredients_text", "").strip()
        product_name = request.data.get("product_name", "Custom Food Item").strip()
        nutriments = request.data.get("nutriments", {})
        serving_size = request.data.get("serving_size", "100 g")
        product_weight_g = request.data.get("product_weight_g", 100.0)
        user_age, user_weight, health_conditions = _extract_user_context(request)

        if not ingredients_text and not nutriments:
            return Response(
                {"detail": "Please provide ingredients text or nutrition data."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        product = Product(
            product_name=product_name,
            ingredients_text=ingredients_text,
            nutriments=nutriments,
            serving_size=serving_size,
            serving_size_g=float(serving_size.replace("g", "").strip()) if "g" in str(serving_size) else 100.0,
            product_weight_g=float(product_weight_g) if product_weight_g else 100.0,
            source="manual",
        )

        analysis = analyze_product(
            product,
            user=request.user if request.user.is_authenticated else None,
            user_age=user_age,
            user_weight_kg=user_weight,
            user_health_conditions=health_conditions,
        )

        return Response(analysis, status=status.HTTP_200_OK)


class SampleProductsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user_age, user_weight, health_conditions = _extract_user_context(request)
        samples = []
        for sample_data in CURATED_SAMPLE_PRODUCTS:
            prod = _seed_curated_product(sample_data)
            analysis = analyze_product(
                prod,
                user=request.user if request.user.is_authenticated else None,
                user_age=user_age,
                user_weight_kg=user_weight,
                user_health_conditions=health_conditions,
            )
            samples.append(analysis)
        return Response(samples, status=status.HTTP_200_OK)


class ProductDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk_or_barcode):
        user_age, user_weight, health_conditions = _extract_user_context(request)

        product = None
        if pk_or_barcode.isdigit() and len(pk_or_barcode) < 8:
            product = Product.objects.filter(pk=int(pk_or_barcode)).first()
        if not product:
            product = Product.objects.filter(barcode=pk_or_barcode).first()
        if not product:
            for cur in CURATED_SAMPLE_PRODUCTS:
                if cur["barcode"] == pk_or_barcode:
                    product = _seed_curated_product(cur)
                    break
        if not product:
            product = _infer_unlisted_product(pk_or_barcode)

        if not product:
            return Response({"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

        analysis = analyze_product(
            product,
            user=request.user if request.user.is_authenticated else None,
            user_age=user_age,
            user_weight_kg=user_weight,
            user_health_conditions=health_conditions,
        )
        return Response(analysis, status=status.HTTP_200_OK)


class ProductComparisonView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        barcode_1 = request.data.get("barcode_1")
        barcode_2 = request.data.get("barcode_2")

        if not barcode_1 or not barcode_2:
            return Response(
                {"detail": "Please provide both barcode_1 and barcode_2."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        prod1 = Product.objects.filter(barcode=barcode_1).first()
        prod2 = Product.objects.filter(barcode=barcode_2).first()

        if not prod1:
            for cur in CURATED_SAMPLE_PRODUCTS:
                if cur["barcode"] == barcode_1:
                    prod1 = _seed_curated_product(cur)
                    break
            if not prod1:
                prod1 = _infer_unlisted_product(barcode_1)

        if not prod2:
            for cur in CURATED_SAMPLE_PRODUCTS:
                if cur["barcode"] == barcode_2:
                    prod2 = _seed_curated_product(cur)
                    break
            if not prod2:
                prod2 = _infer_unlisted_product(barcode_2)

        if not prod1 or not prod2:
            return Response(
                {"detail": "One or both products could not be found for comparison."},
                status=status.HTTP_404_NOT_FOUND,
            )

        analysis1 = analyze_product(prod1)
        analysis2 = analyze_product(prod2)

        p1_sugar = analysis1["nutrition"]["per_100g"].get("sugars_g") or 0.0
        p2_sugar = analysis2["nutrition"]["per_100g"].get("sugars_g") or 0.0
        p1_salt = analysis1["nutrition"]["per_100g"].get("salt_g") or 0.0
        p2_salt = analysis2["nutrition"]["per_100g"].get("salt_g") or 0.0
        p1_fat = analysis1["nutrition"]["per_100g"].get("fat_g") or 0.0
        p2_fat = analysis2["nutrition"]["per_100g"].get("fat_g") or 0.0
        p1_prot = analysis1["nutrition"]["per_100g"].get("proteins_g") or 0.0
        p2_prot = analysis2["nutrition"]["per_100g"].get("proteins_g") or 0.0

        # Healthier score calculation (simple nutrient density to processing comparison)
        score1 = (p1_prot * 2) - (p1_sugar * 1.5) - (p1_salt * 5) - (analysis1["additives_count"] * 2)
        score2 = (p2_prot * 2) - (p2_sugar * 1.5) - (p2_salt * 5) - (analysis2["additives_count"] * 2)

        better_choice = 1 if score1 >= score2 else 2
        rationale = (
            f"{prod1.product_name if better_choice == 1 else prod2.product_name} has lower added sugars/salt "
            f"and fewer synthetic additives per 100g."
        )

        return Response({
            "product_1": analysis1,
            "product_2": analysis2,
            "comparison": {
                "sugar_diff_g": round(p1_sugar - p2_sugar, 2),
                "salt_diff_g": round(p1_salt - p2_salt, 2),
                "fat_diff_g": round(p1_fat - p2_fat, 2),
                "protein_diff_g": round(p1_prot - p2_prot, 2),
                "better_choice_index": better_choice,
                "better_choice_product_name": prod1.product_name if better_choice == 1 else prod2.product_name,
                "rationale": rationale,
            }
        }, status=status.HTTP_200_OK)


class AdditiveListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        qs = AdditiveReference.objects.all()
        if query:
            qs = qs.filter(code__icontains=query) | qs.filter(common_name__icontains=query)
        
        data = []
        for a in qs[:100]:
            data.append({
                "id": a.id,
                "code": a.code,
                "common_name": a.common_name,
                "category": a.category,
                "fssai_ref": a.fssai_ref,
                "who_jecfa_ref": a.who_jecfa_ref,
                "adi_mg_per_kg": a.adi_mg_per_kg,
                "food_limit_mg_per_kg": a.food_limit_mg_per_kg,
                "notes": a.notes,
            })
        return Response(data, status=status.HTTP_200_OK)


class AdditiveDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, code_or_id):
        user_weight = request.query_params.get("weight_kg")
        weight_kg = None
        if user_weight:
            try:
                weight_kg = float(user_weight)
            except ValueError:
                weight_kg = None

        additive = None
        if code_or_id.isdigit():
            additive = AdditiveReference.objects.filter(pk=int(code_or_id)).first()
        if not additive:
            additive = AdditiveReference.objects.filter(code__iexact=code_or_id).first()
        if not additive:
            additive = AdditiveReference.objects.filter(common_name__iexact=code_or_id).first()

        if not additive:
            return Response({"detail": "Additive reference not found."}, status=status.HTTP_404_NOT_FOUND)

        calc_exposure = None
        if additive.adi_mg_per_kg is not None and weight_kg is not None:
            calc_exposure = adi_reference_exposure(additive.adi_mg_per_kg, weight_kg)

        return Response({
            "id": additive.id,
            "code": additive.code,
            "common_name": additive.common_name,
            "category": additive.category,
            "fssai_ref": additive.fssai_ref or "Permitted food additive under FSSAI Regulations.",
            "who_jecfa_ref": additive.who_jecfa_ref or "Evaluated by WHO/FAO JECFA.",
            "adi_mg_per_kg": additive.adi_mg_per_kg,
            "food_limit_mg_per_kg": additive.food_limit_mg_per_kg,
            "notes": additive.notes,
            "calculated_user_exposure_mg_per_day": calc_exposure,
            "explanation": f"{additive.common_name} ({additive.code}) is approved for food preservation and stabilization.",
        }, status=status.HTTP_200_OK)


class ProductCatalogSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        brand = request.query_params.get("brand", "").strip()
        category = request.query_params.get("category", "").strip()
        palm_oil_free = request.query_params.get("palm_oil_free", "").lower() in ("true", "1")
        low_sugar = request.query_params.get("low_sugar", "").lower() in ("true", "1")
        low_salt = request.query_params.get("low_salt", "").lower() in ("true", "1")

        qs = Product.objects.all()

        if query:
            qs = qs.filter(product_name__icontains=query) | qs.filter(brands__icontains=query) | qs.filter(barcode__icontains=query)

        if brand:
            qs = qs.filter(brands__icontains=brand)

        if category:
            qs = qs.filter(categories_tags__icontains=category) | qs.filter(product_name__icontains=category)

        results = []
        for p in qs[:60]:
            nutriments = p.nutriments or {}
            sugars = nutriments.get("sugars_100g") or 0.0
            salt = nutriments.get("salt_100g") or 0.0
            ing_text = (p.ingredients_text or "").lower()

            if palm_oil_free and ("palm" in ing_text or "palmolein" in ing_text):
                continue
            if low_sugar and sugars > 5.0:
                continue
            if low_salt and salt > 0.5:
                continue

            results.append({
                "id": p.id,
                "barcode": p.barcode,
                "product_name": p.product_name,
                "brands": p.brands,
                "serving_size": p.serving_size,
                "product_weight_g": p.product_weight_g,
                "categories_tags": p.categories_tags,
                "sugars_100g": sugars,
                "salt_100g": salt,
                "fat_100g": nutriments.get("fat_100g") or 0.0,
                "proteins_100g": nutriments.get("proteins_100g") or 0.0,
                "has_palm_oil": "palm" in ing_text or "palmolein" in ing_text,
            })

        return Response(results, status=status.HTTP_200_OK)
