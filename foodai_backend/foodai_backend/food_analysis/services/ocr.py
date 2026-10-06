import os
from abc import ABC, abstractmethod
from io import BytesIO


class OCREngineUnavailable(Exception):
    pass


class OCREngine(ABC):
    @abstractmethod
    def extract_text(self, image_bytes: bytes) -> str:
        ...


class TesseractOCREngine(OCREngine):
    def __init__(self):
        try:
            import pytesseract
            self._pytesseract = pytesseract

            # Check common Windows paths if not in PATH
            common_tesseract_paths = [
                r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
                os.path.expanduser(r"~\AppData\Local\Tesseract-OCR\tesseract.exe"),
            ]
            for p in common_tesseract_paths:
                if os.path.exists(p):
                    self._pytesseract.pytesseract.tesseract_cmd = p
                    break
        except ImportError:
            self._pytesseract = None

        try:
            from PIL import Image
            self._Image = Image
        except ImportError:
            self._Image = None

    def extract_text(self, image_bytes: bytes) -> str:
        if self._pytesseract is None or self._Image is None:
            raise OCREngineUnavailable("OCR engine unavailable")

        try:
            img = self._Image.open(BytesIO(image_bytes))
            text = self._pytesseract.image_to_string(img)
            # Return only what was actually read. An empty result is surfaced to the
            # UI as "couldn't read this label" rather than being replaced with a
            # made-up ingredient list.
            return (text or "").strip()
        except OCREngineUnavailable:
            raise
        except Exception as e:
            # Never fabricate label text. If the engine is missing or errors out,
            # report unavailability so the caller can fail honestly.
            raise OCREngineUnavailable("OCR engine unavailable") from e


_default_ocr_engine: OCREngine | None = None


def get_default_ocr_engine() -> OCREngine:
    global _default_ocr_engine
    if _default_ocr_engine is None:
        _default_ocr_engine = TesseractOCREngine()
    return _default_ocr_engine
