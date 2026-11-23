from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient


class CareAndMedicineAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_care_analyze_soap_with_sulfates(self):
        """Tests that personal care evaluator flags harsh sulfates and calculates clean score."""
        payload = {
            "product_name": "Deep Clean Bath Soap",
            "ingredients_text": "Sodium Lauryl Sulfate, Aqua, Glycerin, Artificial Parfum, Methylparaben",
        }
        res = self.client.post("/api/care/analyze/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        self.assertIn("clean_score", data)
        self.assertLess(data["clean_score"], 70)  # Should be penalized for SLS + Paraben
        self.assertIn("harmful_ingredients", data)
        self.assertIn("beneficial_ingredients", data)
        self.assertIn("skin_compatibility", data)
        self.assertIn("disclaimer", data)
        self.assertTrue(any("sulfate" in h["name"].lower() for h in data["harmful_ingredients"]))
        self.assertTrue(any("paraben" in h["name"].lower() for h in data["harmful_ingredients"]))

    def test_care_analyze_clean_moisturizer(self):
        """Tests clean formulation evaluation with beneficial actives (Ceramides & Hyaluronic Acid)."""
        payload = {
            "product_name": "Hydra Barrier Restoring Cream",
            "ingredients_text": "Purified Water, Glycerin, Ceramide NP, Hyaluronic Acid, Niacinamide, Squalane",
        }
        res = self.client.post("/api/care/analyze/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        self.assertGreaterEqual(data["clean_score"], 80)
        self.assertEqual(data["hazard_level"], "Clean / Low Hazard")
        self.assertTrue(data["skin_compatibility"]["sensitive_skin"])
        self.assertTrue(any("hyaluronic" in b["name"].lower() for b in data["beneficial_ingredients"]))
        self.assertTrue(any("ceramide" in b["name"].lower() for b in data["beneficial_ingredients"]))

    def test_medicine_analyze_paracetamol_alcohol_interaction(self):
        """Tests paracetamol analysis, active salt extraction, and alcohol hepatotoxicity warning."""
        payload = {
            "medicine_name": "Dolo 650 Tablet",
            "label_text": "Paracetamol Tablets IP 650mg",
        }
        res = self.client.post("/api/medicine/analyze/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        self.assertIn("active_salt", data)
        self.assertIn("Paracetamol", data["active_salt"])
        self.assertIn("meal_timing", data)
        self.assertTrue(data.get("alcohol_contraindicated"))
        self.assertIn("disclaimer", data)
        self.assertIn("food_drug_interactions", data)

    def test_medicine_analyze_pantoprazole_timing(self):
        """Tests that PPI antacid identifies empty stomach morning timing."""
        payload = {
            "medicine_name": "Pantoprazole 40mg",
            "label_text": "Gastro-resistant tablets IP",
        }
        res = self.client.post("/api/medicine/analyze/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        self.assertIn("empty stomach", data["meal_timing"].lower())
        self.assertIn("generic_salt_name", data)

    def test_medicine_analyze_atorvastatin_grapefruit_interaction(self):
        """Tests that statin cholesterol medication warns against grapefruit consumption."""
        payload = {
            "medicine_name": "Atorvastatin 20mg",
        }
        res = self.client.post("/api/medicine/analyze/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        interactions = data["food_drug_interactions"]
        has_grapefruit = any("grapefruit" in item["food_or_beverage"].lower() for item in interactions)
        self.assertTrue(has_grapefruit)

    def test_symptom_guide_triage_and_red_flags(self):
        """Tests symptom guide provides triage, doctor prep questions, and emergency red flags."""
        payload = {
            "symptoms_text": "High fever, persistent dry cough and body ache for 2 days",
            "duration_days": "2",
        }
        res = self.client.post("/api/health/symptom-guide/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        self.assertIn("triage_level", data)
        self.assertIn("questions_for_doctor", data)
        self.assertGreaterEqual(len(data["questions_for_doctor"]), 2)
        self.assertIn("red_flag_warnings", data)
        self.assertIn("home_comfort_measures", data)

    def test_care_analyze_full_ingredients_breakdown_and_barcode(self):
        """Tests that personal care evaluator returns full chemical breakdown and resolves barcode."""
        payload = {
            "barcode": "8901030382348",  # Dove Soap Bar
        }
        res = self.client.post("/api/care/analyze/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        self.assertIn("all_ingredients_breakdown", data)
        self.assertGreater(len(data["all_ingredients_breakdown"]), 5)
        self.assertIn("hazard_summary", data)
        first_ing = data["all_ingredients_breakdown"][0]
        self.assertIn("name", first_ing)
        self.assertIn("safety_rating", first_ing)
        self.assertIn("function", first_ing)
        self.assertIn("comedogenic_score", first_ing)
        self.assertIn("explanation", first_ing)

    def test_medicine_pharmacological_profile_and_excipients(self):
        """Tests that medicine evaluator returns pharmacology organ impacts and inactive excipients."""
        payload = {
            "barcode": "8901117002014",  # Dolo 650
        }
        res = self.client.post("/api/medicine/analyze/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        self.assertIn("pharmacological_profile", data)
        pharma = data["pharmacological_profile"]
        self.assertIn("mechanism_of_action", pharma)
        self.assertIn("organ_impact", pharma)
        self.assertIn("liver", pharma["organ_impact"])
        self.assertIn("kidneys", pharma["organ_impact"])
        self.assertIn("stomach", pharma["organ_impact"])

        self.assertIn("excipients_and_additives", data)
        self.assertGreaterEqual(len(data["excipients_and_additives"]), 1)
        excipient = data["excipients_and_additives"][0]
        self.assertIn("name", excipient)
        self.assertIn("category", excipient)
        self.assertIn("concern", excipient)
        self.assertIn("key_safety_warning", data)
        self.assertIn("disclaimer", data)
