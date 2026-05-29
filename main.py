# ── Monkeypatch importlib.metadata to avoid PackageNotFoundError under PyInstaller ──
import importlib.metadata
_orig_version = importlib.metadata.version

def _patched_version(distribution_name):
    try:
        return _orig_version(distribution_name)
    except importlib.metadata.PackageNotFoundError:
        name_lower = distribution_name.lower()
        if "opencv" in name_lower:
            import cv2
            return getattr(cv2, "__version__", "4.10.0")
        if "paddle" in name_lower:
            return "3.0.0"
        dep_map = {
            "pyyaml": "yaml",
            "pillow": "PIL",
        }
        import_name = dep_map.get(name_lower, name_lower).replace("-", "_")
        try:
            mod = __import__(import_name)
            return getattr(mod, "__version__", "1.0.0")
        except ImportError:
            raise importlib.metadata.PackageNotFoundError(distribution_name)

importlib.metadata.version = _patched_version

import os
# Save original user environment variables before any imports (which might mutate them)
_ORIGINAL_USERPROFILE = os.environ.get("USERPROFILE")
_ORIGINAL_HOME = os.environ.get("HOME")

import webview
import threading
import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, Body
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
import sys
import time
import shutil
import zipfile
import logging
import uuid
from pathlib import Path
from backend.pdf_tools import generate_thumbnails, merge_pdfs, split_pdf, compress_pdf, images_to_single_pdf

if getattr(sys, 'frozen', False):
    base_dir = os.path.dirname(sys.executable)
else:
    base_dir = os.path.dirname(os.path.abspath(__file__))

log_file = os.path.join(base_dir, "app.log")
logging.basicConfig(
    filename=log_file,
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

class LoggerWriter:
    def __init__(self, level):
        self.level = level
    def write(self, message):
        if message.strip():
            self.level(message.strip())
    def flush(self):
        pass
    def isatty(self):
        return False

sys.stdout = LoggerWriter(logging.info)
sys.stderr = LoggerWriter(logging.warning)

logging.info("=========================================")
logging.info("Application starting up...")
logging.info("=========================================")
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = Path("temp")
TEMP_DIR.mkdir(exist_ok=True)
app.mount("/temp", StaticFiles(directory=str(TEMP_DIR)), name="temp")

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    # Save uploaded file to temp
    file_path = TEMP_DIR / file.filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Generate thumbnails and return
    thumbnails = generate_thumbnails(str(file_path), file.filename)
    return {"thumbnails": thumbnails}

@app.get("/api/preview_pdf")
def preview_pdf(filename: str):
    pdf_path = TEMP_DIR / filename
    if not pdf_path.exists():
        return {"error": "File not found"}
    thumbnails = generate_thumbnails(str(pdf_path), filename)
    if thumbnails:
        return {"url": thumbnails[0]["url"]}
    return {"error": "Could not generate preview"}

@app.post("/api/blank")
def create_blank_page():
    """Generates a blank A4 PDF page and returns its thumbnail."""
    import uuid
    import fitz
    file_id = str(uuid.uuid4())
    pdf_name = f"Blank_Page_{file_id}.pdf"
    pdf_path = TEMP_DIR / pdf_name
    
    doc = fitz.open()
    doc.new_page(width=595, height=842) # A4 size
    doc.save(str(pdf_path))
    doc.close()
    
    thumbnails = generate_thumbnails(str(pdf_path), "Blank_Page.pdf")
    return {"thumbnails": thumbnails}

class MergeRequest(BaseModel):
    pages: List[dict]

@app.post("/api/merge")
def merge(req: MergeRequest):
    url = merge_pdfs(req.pages)
    try:
        filename = url.replace("/download/", "")
        size_kb = (Path("temp") / filename).stat().st_size / 1024
    except:
        size_kb = 0
    return {"url": url, "size_kb": round(size_kb, 2)}

class SplitRequest(BaseModel):
    pages: List[dict]
    interval: int

@app.post("/api/split")
def split(req: SplitRequest):
    result = split_pdf(req.pages, req.interval)
    try:
        filename = result["zip_url"].split("/")[-1]
        size_kb = (Path("temp") / filename).stat().st_size / 1024
        result["zip_size_kb"] = round(size_kb, 2)
    except:
        result["zip_size_kb"] = 0
    return result

class RebuildZipRequest(BaseModel):
    part_names: List[str]

@app.post("/api/rebuild_zip")
def rebuild_zip_api(req: RebuildZipRequest):
    import time
    output_name = f"split_documents_{int(time.time())}.zip"
    zip_path = Path("temp") / output_name
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for part_name in req.part_names:
            part_path = Path("temp") / part_name
            if part_path.exists():
                zipf.write(part_path, part_name)
    try:
        size_kb = zip_path.stat().st_size / 1024
    except:
        size_kb = 0
    return {"zip_url": f"/temp/{output_name}", "zip_size_kb": round(size_kb, 2)}

class CompressRequest(BaseModel):
    file_path: str
    level: str

class RebuildZipRequest(BaseModel):
    part_names: list[str]

@app.post("/api/rebuild_zip")
def rebuild_zip(req: RebuildZipRequest):
    import zipfile
    import uuid
    zip_name = f"split_documents_{uuid.uuid4().hex[:6]}.zip"
    zip_path = Path("temp") / zip_name
    
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for p in req.part_names:
            p_path = Path("temp") / p
            if p_path.exists():
                zipf.write(p_path, p)
                
    size_kb = zip_path.stat().st_size / 1024
    return {"zip_url": f"/temp/{zip_name}", "zip_size_kb": round(size_kb, 2)}

class PackRequest(BaseModel):
    file_urls: List[str]
    format: str

@app.post("/api/pack")
def pack_files(req: PackRequest):
    import pycdlib
    
    paths = []
    for url in req.file_urls:
        filename = url.split("/")[-1]
        p = Path("temp") / filename
        if p.exists():
            paths.append((p, filename))
            
    if not paths:
        return {"error": "Paketlenecek dosya bulunamadı."}
        
    uid = uuid.uuid4().hex[:6]
    
    try:
        if req.format == "zip":
            out_name = f"Paket_{uid}.zip"
            out_path = Path("temp") / out_name
            with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for p, name in paths:
                    zipf.write(p, name)
            
        elif req.format == "iso":
            out_name = f"Paket_{uid}.iso"
            out_path = Path("temp") / out_name
            iso = pycdlib.PyCdlib()
            iso.new(interchange_level=3, joliet=True)
            for idx, (p, name) in enumerate(paths):
                # Basic sanitization for Joliet names (replace invalid chars with _)
                safe_name = "".join(c if c.isalnum() or c in ".-_ " else "_" for c in name)
                iso.add_file(str(p), f"/F{idx+1};1", joliet_path=f"/{safe_name}")
            iso.write(str(out_path))
            iso.close()
            
        elif req.format == "pdf":
            # If they choose PDF packing, try to use fitz to merge full documents
            is_all_pdf = all(p.suffix.lower() == '.pdf' for p, n in paths)
            if is_all_pdf:
                import fitz
                import logging
                out_name = f"Paket_{uid}.pdf"
                out_path = Path("temp") / out_name
                merged_doc = fitz.open()
                for p, n in paths:
                    try:
                        src = fitz.open(str(p))
                        merged_doc.insert_pdf(src)
                        src.close()
                    except Exception as e:
                        logging.error(f"Cannot merge {p}: {e}")
                merged_doc.save(str(out_path), garbage=4, deflate=True)
                merged_doc.close()
                out_url = f"/temp/{out_name}"
            else:
                from backend.pdf_tools import images_to_single_pdf
                out_url = images_to_single_pdf([str(p) for p, n in paths])
        else:
            return {"error": "Desteklenmeyen format."}
            
        size_kb = out_path.stat().st_size / 1024
        return {"url": f"/temp/{out_name}", "size_kb": round(size_kb, 2), "format": req.format}
    except Exception as e:
        logging.exception("Pack failed")
        return {"error": f"Paketleme hatası: {str(e)}"}

@app.post("/api/compress")
def compress(req: CompressRequest):
    try:
        res = compress_pdf(req.file_path, req.level)
        # res might already be {"url": ...}
        if isinstance(res, dict) and "url" in res:
            try:
                filename = res["url"].split("/")[-1]
                size_kb = (Path("temp") / filename).stat().st_size / 1024
                res["size_kb"] = round(size_kb, 2)
            except:
                res["size_kb"] = 0
        return res
    except Exception as e:
        logging.exception("Compress failed")
        return {"error": f"Sıkıştırma hatası: {str(e)}"}

@app.get("/api/ocr_progress")
def get_ocr_progress():
    try:
        from backend.table_ocr import current_progress
        return current_progress
    except Exception as e:
        return {"percent": 0, "status": f"Hata: {str(e)}"}

@app.post("/api/convert")
def convert_file(file: UploadFile = File(...), task_id: str = Form(...)):
    # Reset table OCR progress state immediately
    try:
        from backend.table_ocr import update_progress
        update_progress(0, "Hazırlanıyor...")
    except:
        pass

    try:
        file_path = TEMP_DIR / file.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Import dynamically to avoid circular issues
        from backend.pdf_tools import process_conversion
        res = process_conversion(str(file_path), task_id)
        
        url = res["url"] if isinstance(res, dict) else res
        preview = res.get("preview") if isinstance(res, dict) else None
        pages = res.get("pages") if isinstance(res, dict) else None
        
        # Calculate file size of the generated file
        try:
            filename = url.split("/")[-1]
            out_path = Path("temp") / filename
            size_kb = out_path.stat().st_size / 1024
        except:
            size_kb = 0
            
        return {"url": url, "size_kb": round(size_kb, 2), "preview": preview, "pages": pages}
    finally:
        try:
            from backend.table_ocr import update_progress
            update_progress(0, "Hazırlanıyor...")
        except:
            pass

@app.post("/api/image_to_text")
def image_to_text(file: UploadFile = File(...)):
    try:
        TEMP_DIR.mkdir(exist_ok=True)
        file_path = TEMP_DIR / file.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        import cv2
        import numpy as np
        from backend.table_ocr import PaddleTurkishOCREngine, APP_CACHE_DIR
        from PIL import Image
        import pillow_heif
        
        # Enable Pillow opening HEIC
        pillow_heif.register_heif_opener()
        
        # Read the image
        img = cv2.imread(str(file_path))
        if img is None:
            try:
                pil_img = Image.open(str(file_path))
                img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            except Exception as e:
                print(f"PIL fallback read failed: {e}")
                
        if img is None:
            return {"error": "Resim okunamadı veya yüklenemedi."}
            
        model_dir = str((APP_CACHE_DIR / "paddleocr").absolute())
        engine = PaddleTurkishOCREngine(model_storage_dir=model_dir)
        
        words, _ = engine.recognize_page(img)
        if not words:
            return {"text": ""}
            
        # Line reconstruction
        words_sorted = sorted(words, key=lambda w: (w.box[1], w.box[0]))
        lines = []
        current_line = []
        
        for w in words_sorted:
            if not current_line:
                current_line.append(w)
            else:
                last_w = current_line[-1]
                avg_h = (last_w.height + w.height) / 2.0
                if abs(w.cy - last_w.cy) < avg_h * 0.65:
                    current_line.append(w)
                else:
                    current_line.sort(key=lambda item: item.box[0])
                    lines.append(" ".join(item.text for item in current_line))
                    current_line = [w]
                    
        if current_line:
            current_line.sort(key=lambda item: item.box[0])
            lines.append(" ".join(item.text for item in current_line))
            
        extracted_text = "\n".join(lines)
        
        try:
            file_path.unlink()
        except:
            pass
            
        return {"text": extracted_text}
    except Exception as e:
        logging.exception("Image to text OCR failed")
        return {"error": f"OCR Hatası: {str(e)}"}

@app.post("/api/convert_images_batch")
async def convert_images_batch(files: List[UploadFile] = File(...), task_id: str = Form(...)):
    image_to_pdf_tasks = {"png_to_pdf", "jpg_to_pdf", "tiff_to_pdf", "heic_to_pdf", "webp_to_pdf"}
    if task_id not in image_to_pdf_tasks and task_id != "make_iso":
        return {"error": "Desteklenmeyen toplu işlem görevi."}

    if task_id == "make_iso":
        import pycdlib
        
        uid = uuid.uuid4().hex[:6]
        iso_build_dir = TEMP_DIR / f"iso_build_{uid}"
        iso_build_dir.mkdir(parents=True, exist_ok=True)
        
        out_name = f"Arsiv_{uid}.iso"
        out_path = TEMP_DIR / out_name
        
        saved_files = []
        for file in files:
            file_path = iso_build_dir / file.filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_files.append((file_path, file.filename))
            
        try:
            iso = pycdlib.PyCdlib()
            iso.new(interchange_level=3, joliet=True)
            
            # Check if we have a single ZIP file to extract
            is_zip = False
            if len(saved_files) == 1:
                try:
                    if zipfile.is_zipfile(str(saved_files[0][0])):
                        is_zip = True
                except:
                    pass
            
            if is_zip:
                temp_extract_dir = iso_build_dir / "extracted"
                temp_extract_dir.mkdir(exist_ok=True)
                with zipfile.ZipFile(str(saved_files[0][0]), 'r') as zip_ref:
                    zip_ref.extractall(temp_extract_dir)
                
                joliet_to_iso9660_dir = { '/': '/' }
                dir_id_counter = 0
                file_counter = 0
                
                for root, dirs, files_in_zip in os.walk(temp_extract_dir):
                    rel_dir = os.path.relpath(root, temp_extract_dir).replace('\\', '/')
                    if rel_dir == '.':
                        joliet_parent = '/'
                    else:
                        joliet_parent = '/' + rel_dir
                        
                    for d in dirs:
                        if joliet_parent == '/':
                            joliet_dir = '/' + d
                        else:
                            joliet_dir = joliet_parent + '/' + d
                            
                        dir_id_counter += 1
                        iso9660_parent_path = joliet_to_iso9660_dir[joliet_parent]
                        if iso9660_parent_path == '/':
                            iso9660_dir = f"/D{dir_id_counter}"
                        else:
                            iso9660_dir = f"{iso9660_parent_path}/D{dir_id_counter}"
                            
                        iso.add_directory(iso_path=iso9660_dir, joliet_path=joliet_dir)
                        joliet_to_iso9660_dir[joliet_dir] = iso9660_dir
                        
                    for f in files_in_zip:
                        file_counter += 1
                        full_local_path = os.path.join(root, f)
                        
                        if joliet_parent == '/':
                            joliet_file = '/' + f
                        else:
                            joliet_file = joliet_parent + '/' + f
                            
                        iso9660_parent_path = joliet_to_iso9660_dir[joliet_parent]
                        if iso9660_parent_path == '/':
                            iso9660_file = f"/F{file_counter};1"
                        else:
                            iso9660_file = f"{iso9660_parent_path}/F{file_counter};1"
                            
                        iso.add_file(full_local_path, iso9660_file, joliet_path=joliet_file)
            else:
                # Add all files flatly
                for idx, (p, name) in enumerate(saved_files):
                    stem = Path(name).stem[:50]
                    ext = Path(name).suffix[:10]
                    clean_name = "".join(c for c in stem if c.isalnum() or c in ".-_ ") + ext
                    if not clean_name:
                        clean_name = f"dosya_{uuid.uuid4().hex[:6]}" + ext
                    safe_joliet_path = "/" + clean_name
                    iso.add_file(str(p), f"/F{idx+1};1", joliet_path=safe_joliet_path)
                
            iso.write(str(out_path))
            iso.close()
            
            shutil.rmtree(iso_build_dir, ignore_errors=True)
            size_kb = out_path.stat().st_size / 1024
            return {"url": f"/temp/{out_name}", "size_kb": round(size_kb, 2)}
        except Exception as e:
            logging.exception("Make ISO failed")
            shutil.rmtree(iso_build_dir, ignore_errors=True)
            return {"error": f"ISO oluşturulamadı: {str(e)}"}

    saved_paths = []
    for file in files:
        safe_name = f"{Path(file.filename).stem}_{uuid.uuid4().hex[:6]}{Path(file.filename).suffix}"
        file_path = TEMP_DIR / safe_name
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        saved_paths.append(str(file_path))

    try:
        url = images_to_single_pdf(saved_paths)
        filename = url.split("/")[-1]
        out_path = TEMP_DIR / filename
        size_kb = out_path.stat().st_size / 1024
        preview_data = None
        try:
            thumbnails = generate_thumbnails(str(out_path), filename)
            if thumbnails:
                preview_data = thumbnails[0]["url"]
        except Exception as e:
            logging.warning(f"Batch image PDF preview failed: {e}")
        return {"url": url, "size_kb": round(size_kb, 2), "preview": preview_data}
    except Exception as e:
        logging.exception("Batch image to PDF conversion failed")
        return {"error": f"Görüntüler PDF'e dönüştürülemedi: {str(e)}"}

class SaveRequest(BaseModel):
    file_url: str

class OpenRequest(BaseModel):
    file_url: str

@app.post("/api/open")
def open_file_endpoint(req: OpenRequest):
    filename = req.file_url.split("/")[-1]
    src_path = Path("temp") / filename
    if not src_path.exists():
        return {"error": "Dosya bulunamadı."}
    try:
        if os.name == 'nt':
            os.startfile(src_path)
        else:
            import subprocess
            subprocess.call(('open', src_path) if sys.platform == 'darwin' else ('xdg-open', src_path))
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/save")
def save_file(req: SaveRequest):
    filename = req.file_url.split("/")[-1]
    src_path = Path("temp") / filename
    if not src_path.exists():
        return {"error": "Dosya bulunamadı."}
    
    _, ext = os.path.splitext(filename)
    
    # Use Windows native GetSaveFileName via ctypes — works in frozen builds
    result_path = [None]
    
    def _win32_save_dialog():
        try:
            import ctypes
            import ctypes.wintypes
            
            OFN_OVERWRITEPROMPT = 0x00000002
            OFN_NOCHANGEDIR = 0x00000008
            MAX_PATH = 1024
            
            class OPENFILENAME(ctypes.Structure):
                _fields_ = [
                    ("lStructSize", ctypes.wintypes.DWORD),
                    ("hwndOwner", ctypes.wintypes.HWND),
                    ("hInstance", ctypes.wintypes.HINSTANCE),
                    ("lpstrFilter", ctypes.wintypes.LPCWSTR),
                    ("lpstrCustomFilter", ctypes.c_wchar_p),
                    ("nMaxCustFilter", ctypes.wintypes.DWORD),
                    ("nFilterIndex", ctypes.wintypes.DWORD),
                    ("lpstrFile", ctypes.wintypes.LPWSTR),
                    ("nMaxFile", ctypes.wintypes.DWORD),
                    ("lpstrFileTitle", ctypes.wintypes.LPWSTR),
                    ("nMaxFileTitle", ctypes.wintypes.DWORD),
                    ("lpstrInitialDir", ctypes.wintypes.LPCWSTR),
                    ("lpstrTitle", ctypes.wintypes.LPCWSTR),
                    ("Flags", ctypes.wintypes.DWORD),
                    ("nFileOffset", ctypes.wintypes.WORD),
                    ("nFileExtension", ctypes.wintypes.WORD),
                    ("lpstrDefExt", ctypes.wintypes.LPCWSTR),
                    ("lCustData", ctypes.wintypes.LPARAM),
                    ("lpfnHook", ctypes.c_void_p),
                    ("lpTemplateName", ctypes.wintypes.LPCWSTR),
                    ("pvReserved", ctypes.c_void_p),
                    ("dwReserved", ctypes.wintypes.DWORD),
                    ("FlagsEx", ctypes.wintypes.DWORD),
                ]
            
            ext_upper = ext.lstrip('.').upper() if ext else ""
            filter_str = f"{ext_upper} Dosyası (*{ext})\0*{ext}\0Tüm Dosyalar (*.*)\0*.*\0\0" if ext else "Tüm Dosyalar (*.*)\0*.*\0\0"
            
            buf = ctypes.create_unicode_buffer(filename, MAX_PATH)
            
            ofn = OPENFILENAME()
            ofn.lStructSize = ctypes.sizeof(OPENFILENAME)
            ofn.hwndOwner = None
            ofn.lpstrFilter = filter_str
            ofn.lpstrFile = ctypes.cast(buf, ctypes.wintypes.LPWSTR)
            ofn.nMaxFile = MAX_PATH
            ofn.lpstrTitle = "Farklı Kaydet"
            ofn.Flags = OFN_OVERWRITEPROMPT | OFN_NOCHANGEDIR
            ofn.lpstrDefExt = ext.lstrip('.') if ext else None
            
            # Set initial directory to user's home/Downloads/Desktop to ensure valid starting directory
            initial_dir = None
            if _ORIGINAL_USERPROFILE:
                options = [
                    os.path.join(_ORIGINAL_USERPROFILE, "Downloads"),
                    os.path.join(_ORIGINAL_USERPROFILE, "Desktop"),
                    _ORIGINAL_USERPROFILE
                ]
                for path in options:
                    if os.path.exists(path):
                        initial_dir = path
                        break
            ofn.lpstrInitialDir = initial_dir
            
            # Temporarily restore original USERPROFILE/HOME variables for the save dialog 
            # so quick-access links in sidebar (e.g. Downloads) resolve correctly
            curr_userprofile = os.environ.get("USERPROFILE")
            curr_home = os.environ.get("HOME")
            if _ORIGINAL_USERPROFILE:
                os.environ["USERPROFILE"] = _ORIGINAL_USERPROFILE
            if _ORIGINAL_HOME:
                os.environ["HOME"] = _ORIGINAL_HOME
                
            try:
                if ctypes.windll.comdlg32.GetSaveFileNameW(ctypes.byref(ofn)):
                    result_path[0] = buf.value
            finally:
                # Restore back the application environment state
                if curr_userprofile is not None:
                    os.environ["USERPROFILE"] = curr_userprofile
                if curr_home is not None:
                    os.environ["HOME"] = curr_home
        except Exception as e:
            logging.exception("Win32 save dialog failed")
    
    # Run in a thread to avoid blocking the FastAPI event loop
    t = threading.Thread(target=_win32_save_dialog)
    t.start()
    t.join(timeout=300)  # 5 min timeout
    
    if result_path[0]:
        shutil.copy2(src_path, result_path[0])
        return {"success": True}
    return {"error": "İptal edildi."}




if getattr(sys, 'frozen', False):
    static_path = os.path.join(sys._MEIPASS, "frontend", "dist")
else:
    static_path = os.path.join(os.path.dirname(__file__), "frontend", "dist")

if os.path.exists(static_path):
    app.mount("/", StaticFiles(directory=static_path, html=True), name="static")

import socket

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        return s.getsockname()[1]

def run_server(port):
    uvicorn.run(app, host="127.0.0.1", port=port, log_config=None)

if __name__ == '__main__':
    port = find_free_port()
    t = threading.Thread(target=run_server, args=(port,))
    t.daemon = True
    t.start()
    
    time.sleep(1)

    url = f"http://127.0.0.1:{port}"
    
    webview.create_window('Offline Document Tool', url, width=1280, height=800)
    webview.start(debug=False)
    os._exit(0)
