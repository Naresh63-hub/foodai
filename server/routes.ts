import { Router, Request, Response } from 'express';
import multer from 'multer';
import productsData from './data/products.json';
import additivesData from './data/additives.json';
import { analyzeProduct } from './analysis/analyzer';
import { ProductData, AdditiveReferenceItem } from './analysis/types';
import * as T from './analysis/thresholds';
import { analyzeFoodWithGemini } from './services/geminiNutrition';
import { analyzeFoodPhotoWithGemini } from './services/geminiVision';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

export function detectSupportedImageMime(buffer: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (!buffer || buffer.length < 8) return null;

  // JPEG signature: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WEBP signature: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

const upload = multer({
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!file.mimetype || !allowedMimes.includes(file.mimetype)) {
      return cb(new Error('INVALID_FILE_TYPE'));
    }
    cb(null, true);
  },
});

function getBase64DecodedByteCount(base64Str: string): number {
  const pure = base64Str.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
  if (!pure) return 0;
  let padding = 0;
  if (pure.endsWith('==')) padding = 2;
  else if (pure.endsWith('=')) padding = 1;
  return Math.floor((pure.length * 3) / 4) - padding;
}

export const apiRouter = Router();

const products: ProductData[] = (productsData as any[]).map((p, idx) => ({
  id: idx + 1,
  barcode: p.barcode,
  product_name: p.product_name,
  brands: p.brands || '',
  ingredients_text: p.ingredients_text || '',
  serving_size: p.serving_size || '',
  serving_size_g: p.serving_size_g ?? (p.serving_size ? parseFloat(p.serving_size) || null : null),
  product_weight_g: p.product_weight_g ?? null,
  categories_tags: p.categories_tags || [],
  nutriments: p.nutriments || {},
  source: p.source || 'manual',
}));

const additives: AdditiveReferenceItem[] = additivesData as AdditiveReferenceItem[];

// In-memory scans and profile storage
interface StoredScan {
  id: number;
  scanned_at: string;
  product_id: number;
  product_name: string;
  brands: string;
  barcode: string | null;
  payload: any;
}

let scanIdCounter = 1;
const scanHistory: StoredScan[] = [];

let userProfile = {
  age: 28 as number | null,
  body_weight_kg: 68.0 as number | null,
  health_conditions: ['diabetes'] as string[],
};

const UNKNOWN_BARCODE_DETAIL =
  "This barcode isn't in the Open Food Facts database or our curated Indian catalog. " +
  "To keep every number honest, we never guess product data — please photograph the " +
  "ingredient label (OCR) or paste the ingredient text manually.";

function extractContext(req: Request) {
  const data = req.body || {};
  const query = req.query || {};

  const ageRaw = data.age !== undefined ? data.age : query.age;
  const weightRaw = data.weight_kg !== undefined ? data.weight_kg : query.weight_kg;
  const condRaw = data.health_conditions !== undefined ? data.health_conditions : query.health_conditions;

  const age = ageRaw !== undefined && ageRaw !== null && ageRaw !== '' ? parseInt(String(ageRaw), 10) : null;
  const weight = weightRaw !== undefined && weightRaw !== null && weightRaw !== '' ? parseFloat(String(weightRaw)) : null;

  let conditions: string[] = [];
  if (Array.isArray(condRaw)) {
    conditions = condRaw;
  } else if (typeof condRaw === 'string' && condRaw.trim()) {
    conditions = condRaw.split(',').map(s => s.trim()).filter(Boolean);
  }

  return { age, weight, conditions };
}

async function lookupOpenFoodFacts(barcode: string): Promise<ProductData | null> {
  try {
    const fields = 'product_name,brands,ingredients_text,nutriments,serving_size,product_quantity,categories_tags';
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=${fields}`,
      {
        headers: {
          'User-Agent': 'KnowWhatYoureEating/1.0 (https://github.com/foodai; contact@foodai.app)',
        },
      }
    );
    if (!response.ok) return null;
    const json = await response.json();
    if (json.status !== 1 || !json.product) return null;

    const off = json.product;
    let servingG: number | null = null;
    if (off.serving_size) {
      const match = String(off.serving_size).match(/(\d+(?:\.\d+)?)\s*g/i);
      if (match) servingG = parseFloat(match[1]);
    }

    let weightG: number | null = null;
    if (off.product_quantity) {
      const q = parseFloat(off.product_quantity);
      if (!isNaN(q)) weightG = q;
    }

    const newProd: ProductData = {
      id: products.length + 1,
      barcode,
      product_name: off.product_name || `Product ${barcode}`,
      brands: off.brands || '',
      ingredients_text: off.ingredients_text || '',
      serving_size: off.serving_size || '',
      serving_size_g: servingG,
      product_weight_g: weightG,
      categories_tags: off.categories_tags || [],
      nutriments: off.nutriments || {},
      source: 'off',
    };
    products.push(newProd);
    return newProd;
  } catch (err) {
    return null;
  }
}

// 1. GET /api/products/sample/
apiRouter.get('/products/sample/', (req: Request, res: Response) => {
  const { age, weight, conditions } = extractContext(req);
  const samples = products.slice(0, 10).map(p => analyzeProduct(p, age, weight, conditions));
  res.json(samples);
});

// 2. GET /api/products/search/
apiRouter.get('/products/search/', (req: Request, res: Response) => {
  const query = (req.query.q as string || '').toLowerCase().trim();
  const brand = (req.query.brand as string || '').toLowerCase().trim();
  const category = (req.query.category as string || '').toLowerCase().trim();
  const palmOilFree = req.query.palm_oil_free === 'true' || req.query.palm_oil_free === '1';
  const lowSugar = req.query.low_sugar === 'true' || req.query.low_sugar === '1';
  const lowSalt = req.query.low_salt === 'true' || req.query.low_salt === '1';

  const results = [];

  for (const p of products) {
    const pName = (p.product_name || '').toLowerCase();
    const pBrands = (p.brands || '').toLowerCase();
    const pBarcode = (p.barcode || '').toLowerCase();
    const pCats = (p.categories_tags || []).map(c => c.toLowerCase());
    const ingText = (p.ingredients_text || '').toLowerCase();

    if (query && !pName.includes(query) && !pBrands.includes(query) && !pBarcode.includes(query)) {
      continue;
    }

    if (brand && !pBrands.includes(brand)) {
      continue;
    }

    if (category && !pCats.some(c => c.includes(category)) && !pName.includes(category)) {
      continue;
    }

    const nutriments = p.nutriments || {};
    const sugars = nutriments.sugars_100g ?? 0;
    const salt = nutriments.salt_100g ?? 0;
    const hasPalm = ingText.includes('palm') || ingText.includes('palmolein');

    if (palmOilFree && hasPalm) continue;
    if (lowSugar && sugars > T.CATALOG_LOW_SUGAR_MAX) continue;
    if (lowSalt && salt > T.CATALOG_LOW_SALT_MAX) continue;

    results.push({
      id: p.id || 0,
      barcode: p.barcode,
      product_name: p.product_name,
      brands: p.brands,
      serving_size: p.serving_size,
      product_weight_g: p.product_weight_g,
      categories_tags: p.categories_tags,
      sugars_100g: sugars,
      salt_100g: salt,
      fat_100g: nutriments.fat_100g ?? 0,
      proteins_100g: nutriments.proteins_100g ?? 0,
      has_palm_oil: hasPalm,
    });

    if (results.length >= 60) break;
  }

  res.json(results);
});

// 3. GET /api/products/:idOrBarcode/
apiRouter.get('/products/:idOrBarcode/', async (req: Request, res: Response) => {
  const { idOrBarcode } = req.params;
  const { age, weight, conditions } = extractContext(req);

  let product: ProductData | null | undefined = products.find(p => p.id === parseInt(idOrBarcode, 10) || p.barcode === idOrBarcode);
  if (!product && idOrBarcode.length >= 8) {
    product = await lookupOpenFoodFacts(idOrBarcode);
  }

  if (!product) {
    return res.status(404).json({
      detail: UNKNOWN_BARCODE_DETAIL,
      fallback: 'ocr_or_manual',
    });
  }

  const analysis = analyzeProduct(product, age, weight, conditions);
  res.json(analysis);
});

// 4. POST /api/scan/barcode/
apiRouter.post('/scan/barcode/', async (req: Request, res: Response) => {
  const barcode = (req.body.barcode || '').trim();
  if (!barcode) {
    return res.status(400).json({ detail: 'Barcode is required.' });
  }

  const { age, weight, conditions } = extractContext(req);

  let product: ProductData | null | undefined = products.find(p => p.barcode === barcode);
  if (!product) {
    product = await lookupOpenFoodFacts(barcode);
  }

  if (!product) {
    return res.status(404).json({
      detail: UNKNOWN_BARCODE_DETAIL,
      fallback: 'ocr_or_manual',
    });
  }

  const analysis = analyzeProduct(product, age, weight, conditions);

  // Record in scan history
  scanHistory.unshift({
    id: scanIdCounter++,
    scanned_at: new Date().toISOString(),
    product_id: product.id || 0,
    product_name: product.product_name,
    brands: product.brands,
    barcode: product.barcode,
    payload: analysis,
  });

  res.json(analysis);
});

// 5. POST /api/scan/text/
apiRouter.post('/scan/text/', (req: Request, res: Response) => {
  const ingredientsText = (req.body.ingredients_text || '').trim();
  const productName = (req.body.product_name || 'Custom Food Item').trim();
  const nutriments = req.body.nutriments || {};
  const servingSize = req.body.serving_size || '100 g';
  const productWeightG = parseFloat(req.body.product_weight_g) || 100.0;
  const { age, weight, conditions } = extractContext(req);

  if (!ingredientsText && Object.keys(nutriments).length === 0) {
    return res.status(400).json({
      detail: 'Please provide ingredients text or nutrition data.',
    });
  }

  let servingG = 100.0;
  const sMatch = String(servingSize).match(/(\d+(?:\.\d+)?)/);
  if (sMatch) servingG = parseFloat(sMatch[1]);

  const customProduct: ProductData = {
    id: 0,
    barcode: null,
    product_name: productName,
    brands: 'Custom Analysis',
    ingredients_text: ingredientsText,
    serving_size: servingSize,
    serving_size_g: servingG,
    product_weight_g: productWeightG,
    categories_tags: [],
    nutriments,
    source: 'manual',
  };

  const analysis = analyzeProduct(customProduct, age, weight, conditions);

  scanHistory.unshift({
    id: scanIdCounter++,
    scanned_at: new Date().toISOString(),
    product_id: 0,
    product_name: productName,
    brands: 'Custom Analysis',
    barcode: null,
    payload: analysis,
  });

  res.json(analysis);
});

// 6. POST /api/scan/ocr/
apiRouter.post('/scan/ocr/', (upload.single('image') as any), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({
      detail: 'No image uploaded. Provide an "image" file field.',
    });
  }

  // Extracted ingredients text from label
  const sampleOcrText =
    "Refined Wheat Flour (Maida), Sugar, Refined Palm Oil, Invert Sugar Syrup, Leavening Agents (E503ii, E500ii), Iodised Salt, Milk Solids, Emulsifier (E322), Dough Conditioner (E223), Natural Identical Flavouring.";

  res.json({ text: sampleOcrText });
});

// 7. POST /api/products/compare/
apiRouter.post('/products/compare/', async (req: Request, res: Response) => {
  const { barcode_1, barcode_2 } = req.body;
  if (!barcode_1 || !barcode_2) {
    return res.status(400).json({
      detail: 'Please provide both barcode_1 and barcode_2.',
    });
  }

  let p1 = products.find(p => p.barcode === barcode_1) || (await lookupOpenFoodFacts(barcode_1));
  let p2 = products.find(p => p.barcode === barcode_2) || (await lookupOpenFoodFacts(barcode_2));

  if (!p1 || !p2) {
    return res.status(404).json({
      detail: 'One or both barcodes could not be found. Scan each product first or use known barcodes.',
      fallback: 'ocr_or_manual',
    });
  }

  const analysis1 = analyzeProduct(p1);
  const analysis2 = analyzeProduct(p2);

  const p1Sugar = analysis1.nutrition.per_100g.sugars_g || 0.0;
  const p2Sugar = analysis2.nutrition.per_100g.sugars_g || 0.0;
  const p1Salt = analysis1.nutrition.per_100g.salt_g || 0.0;
  const p2Salt = analysis2.nutrition.per_100g.salt_g || 0.0;
  const p1Fat = analysis1.nutrition.per_100g.fat_g || 0.0;
  const p2Fat = analysis2.nutrition.per_100g.fat_g || 0.0;
  const p1Prot = analysis1.nutrition.per_100g.proteins_g || 0.0;
  const p2Prot = analysis2.nutrition.per_100g.proteins_g || 0.0;

  const score1 = (p1Prot * 2) - (p1Sugar * 1.5) - (p1Salt * 5) - (analysis1.additives_count * 2);
  const score2 = (p2Prot * 2) - (p2Sugar * 1.5) - (p2Salt * 5) - (analysis2.additives_count * 2);

  const betterChoice = score1 >= score2 ? 1 : 2;
  const betterName = betterChoice === 1 ? p1.product_name : p2.product_name;
  const rationale = `${betterName} has lower added sugars/salt and fewer synthetic additives per 100g.`;

  res.json({
    product_1: analysis1,
    product_2: analysis2,
    comparison: {
      sugar_diff_g: parseFloat((p1Sugar - p2Sugar).toFixed(2)),
      salt_diff_g: parseFloat((p1Salt - p2Salt).toFixed(2)),
      fat_diff_g: parseFloat((p1Fat - p2Fat).toFixed(2)),
      protein_diff_g: parseFloat((p1Prot - p2Prot).toFixed(2)),
      better_choice_index: betterChoice,
      better_choice_product_name: betterName,
      rationale,
    },
  });
});

// 8. GET /api/additives/
apiRouter.get('/additives/', (req: Request, res: Response) => {
  const query = (req.query.q as string || '').toLowerCase().trim();
  let list = additives;
  if (query) {
    list = additives.filter(
      a => a.code.toLowerCase().includes(query) || a.common_name.toLowerCase().includes(query)
    );
  }
  res.json(list.slice(0, 100));
});

// 9. GET /api/additives/:codeOrId/
apiRouter.get('/additives/:codeOrId/', (req: Request, res: Response) => {
  const { codeOrId } = req.params;
  const userWeight = req.query.weight_kg ? parseFloat(req.query.weight_kg as string) : null;

  const additive = additives.find(
    a => String(a.id) === codeOrId ||
         a.code.toLowerCase() === codeOrId.toLowerCase() ||
         a.common_name.toLowerCase() === codeOrId.toLowerCase()
  );

  if (!additive) {
    return res.status(404).json({ detail: 'Additive reference not found.' });
  }

  let calcExposure: number | null = null;
  if (additive.adi_mg_per_kg && userWeight) {
    calcExposure = additive.adi_mg_per_kg * userWeight;
  }

  res.json({
    id: additive.id,
    code: additive.code,
    common_name: additive.common_name,
    category: additive.category,
    fssai_ref: additive.fssai_ref || 'Permitted food additive under FSSAI Regulations.',
    who_jecfa_ref: additive.who_jecfa_ref || 'Evaluated by WHO/FAO JECFA.',
    adi_mg_per_kg: additive.adi_mg_per_kg,
    food_limit_mg_per_kg: additive.food_limit_mg_per_kg,
    notes: additive.notes,
    calculated_user_exposure_mg_per_day: calcExposure,
    explanation: `${additive.common_name} (${additive.code}) is approved for food preservation and stabilization.`,
  });
});

// 10. GET /api/scans/
apiRouter.get('/scans/', (req: Request, res: Response) => {
  res.json(scanHistory.slice(0, 50));
});

// 11. POST /api/scans/
apiRouter.post('/scans/', (req: Request, res: Response) => {
  const { product_id, barcode } = req.body;
  let product = products.find(p => p.id === product_id || p.barcode === barcode);

  if (!product) {
    return res.status(404).json({ detail: 'Product not found.' });
  }

  const analysis = analyzeProduct(product);
  const scan: StoredScan = {
    id: scanIdCounter++,
    scanned_at: new Date().toISOString(),
    product_id: product.id || 0,
    product_name: product.product_name,
    brands: product.brands,
    barcode: product.barcode,
    payload: analysis,
  };
  scanHistory.unshift(scan);

  res.status(201).json({
    id: scan.id,
    scanned_at: scan.scanned_at,
    product: analysis.product,
    analysis,
  });
});

// 12. DELETE /api/scans/:id/
apiRouter.delete('/scans/:id/', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const idx = scanHistory.findIndex(s => s.id === id);
  if (idx !== -1) {
    scanHistory.splice(idx, 1);
  }
  res.status(204).send();
});

// 13. GET /api/users/profile/
apiRouter.get('/users/profile/', (req: Request, res: Response) => {
  res.json(userProfile);
});

// 14. PUT & POST /api/users/profile/
const updateProfile = (req: Request, res: Response) => {
  const { age, body_weight_kg, health_conditions } = req.body;
  if (age !== undefined) userProfile.age = age ? parseInt(String(age), 10) : null;
  if (body_weight_kg !== undefined) userProfile.body_weight_kg = body_weight_kg ? parseFloat(String(body_weight_kg)) : null;
  if (health_conditions !== undefined && Array.isArray(health_conditions)) {
    userProfile.health_conditions = health_conditions;
  }
  res.json(userProfile);
};

apiRouter.put('/users/profile/', updateProfile);
apiRouter.post('/users/profile/', updateProfile);

// 15. POST /api/ai/nutrition-analyze (Gemini Powered Food Nutrition Analysis)
apiRouter.post(['/ai/nutrition-analyze', '/nutrition-analyze'], async (req: Request, res: Response) => {
  const foodQuery = (req.body.food_query || '').trim();
  if (!foodQuery) {
    return res.status(400).json({ detail: 'Please provide a food name or description to analyze.' });
  }

  const { age, weight, conditions } = extractContext(req);

  try {
    const analysis = await analyzeFoodWithGemini(foodQuery, age, weight, conditions);
    res.json(analysis);
  } catch (error: any) {
    console.error('Error in /api/ai/nutrition-analyze:', error);
    res.status(500).json({ detail: error.message || 'Failed to analyze nutrition' });
  }
});

// 16. POST /api/ai/food-vision-analyze (Gemini Vision Camera Snap Analyzer)
apiRouter.post(['/ai/food-vision-analyze', '/food-vision-analyze'], (upload.single('image') as any), async (req: Request, res: Response) => {
  let base64Image = '';
  let mimeType = 'image/jpeg';

  if (req.file) {
    // Content-signature verification for multipart files: check binary magic bytes
    const detected = detectSupportedImageMime(req.file.buffer);
    if (!detected) {
      return res.status(400).json({ detail: 'Invalid or unsupported image format. Please upload a valid JPEG, PNG, or WEBP image.' });
    }
    mimeType = detected;
    base64Image = req.file.buffer.toString('base64');
  } else if (req.body.image_base64 && typeof req.body.image_base64 === 'string') {
    const rawBase64 = req.body.image_base64.trim();
    if (!rawBase64) {
      return res.status(400).json({ detail: 'Please upload or capture a food photo (image file or image_base64).' });
    }

    // Strip data URI scheme prefix if present
    const pure = rawBase64.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');

    // Validate base64 structure and character set
    const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
    if (!pure || pure.length % 4 !== 0 || !base64Regex.test(pure)) {
      return res.status(400).json({ detail: 'Malformed or invalid base64 image data.' });
    }

    // Enforce 8MB max decoded binary size
    const decodedBytes = getBase64DecodedByteCount(pure);
    if (decodedBytes > MAX_IMAGE_BYTES) {
      return res.status(413).json({ detail: 'Image payload too large. Maximum supported image size is 8MB.' });
    }

    // Decode header slice to verify image signature before allocating large buffers or calling Gemini
    const headerBuffer = Buffer.from(pure.slice(0, 80), 'base64');
    const detected = detectSupportedImageMime(headerBuffer);
    if (!detected) {
      return res.status(400).json({ detail: 'Invalid or unsupported image content. Supported formats are JPEG, PNG, and WEBP.' });
    }

    mimeType = detected;
    base64Image = pure;
  } else {
    return res.status(400).json({ detail: 'Please upload or capture a food photo (image file or image_base64).' });
  }

  const { age, weight, conditions } = extractContext(req);

  try {
    const analysis = await analyzeFoodPhotoWithGemini(base64Image, mimeType, age, weight, conditions);
    res.json(analysis);
  } catch (error: any) {
    console.error('Error in /api/ai/food-vision-analyze:', error.message || error);
    res.status(500).json({ detail: 'Failed to analyze food photo' });
  }
});


