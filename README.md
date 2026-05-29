# Offline Document Tool

A robust, fully offline document processing and OCR application built with **Python (FastAPI)**, **React**, and **Tesseract-OCR**. 
Designed to run locally as a desktop application without requiring any internet connection.

## 🚀 Features

- **Multilingual Support (i18n)**: UI supports both English and Turkish out-of-the-box, with a seamless real-time language switcher.
- **Advanced PDF Operations**: Merge, split, compress, and organize PDF documents.
- **Image to PDF**: Convert various image formats to PDF.
- **Table OCR Engine**: Extracts complex table structures from images/PDFs and exports directly to styled Excel files (`.xlsx`). 
- **Image Text Extraction (OCR)**: Extracts text from images instantly into an editable format.
- **Offline First**: All processing, including heavy OCR and document manipulation, happens 100% locally on your machine for maximum privacy.
- **Modern UI**: Clean and intuitive web-based interface built with React and Tailwind CSS, served natively in a desktop window via PyWebView.
- **Standalone Export**: Bundles into a standalone folder (Windows) with all dependencies included.

## 📸 Screenshots

<details>
<summary>Click to view screenshots</summary>

### English Interface
![Dashboard English](docs/dashboard_en.png)

### Turkish Interface
![Dashboard Turkish](docs/dashboard_tr.png)

</details>

## 🛠️ Tech Stack

- **Backend**: Python, FastAPI, PyWebView, OpenCV, PyTesseract, PyMuPDF, OpenPyXL
- **Frontend**: React, Vite, Tailwind CSS
- **Bundler**: PyInstaller

## ⚙️ Local Development

### 1. Prerequisites
- Python 3.9+
- Node.js 18+
- [Tesseract-OCR](https://github.com/UB-Mannheim/tesseract/wiki) installed on your system (Default path: `C:\Program Files\Tesseract-OCR`)
- Poppler for PDF to Image conversions (Needs to be in PATH or bundled)

### 2. Setup Backend
```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt
```

### 3. Setup Frontend
```bash
cd frontend
npm install
npm run build  # Builds the React app into frontend/dist
cd ..
```

### 4. Run Application
```bash
python main.py
```
*Note: The script will automatically find an open port, launch the FastAPI server, and open a native desktop window.*

## 📦 Building Standalone Application (Windows .exe)
To package the app into a single standalone folder with all dependencies (including OCR models and Ghostscript) without forcing users to install anything:

1. **Prepare the Cache Directory (`app_cache`)**
   Run the application normally in development mode once (`python main.py`) and use the OCR features. This forces the application to download all required Hugging Face (Table Transformer) and PaddleOCR models into the `app_cache/` folder automatically.

2. **Prepare the Internal Binaries (`_internal/gs`)**
   The application requires Ghostscript for certain PDF manipulations.
   - Download Ghostscript (e.g., v10.02.1)
   - Copy its `bin` and `lib` folders into `_internal/gs/` in the project root.
   *(Resulting structure: `_internal/gs/bin/` and `_internal/gs/lib/`)*

3. **Install Tesseract-OCR**
   Ensure Tesseract is installed at `C:/Program Files/Tesseract-OCR`. The PyInstaller spec file will automatically bundle this entire folder into your final build.

4. **Build with PyInstaller**
   If you don't have a `.spec` file yet, or want to use the existing `OfflineDocTool.spec`, you can compile the application by running:
   ```bash
   pyinstaller --clean OfflineDocTool.spec
   ```
   *Note: Our `OfflineDocTool.spec` is already configured to automatically include the `frontend/dist`, `app_cache`, `_internal/gs`, and `Tesseract-OCR` folders in the final build. Do not add `_internal` or `app_cache` to GitHub as they are massive binary folders.*

   The final output will be generated in the `dist/OfflineDocTool` directory. You can zip this folder and share it!

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
