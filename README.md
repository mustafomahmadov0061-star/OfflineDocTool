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

*(Add your beautiful UI screenshots here before pushing to GitHub to showcase the project!)*

<details>
<summary>Click to view screenshots</summary>

![Dashboard Placeholder](docs/dashboard.png)
![Merge Tool Placeholder](docs/merge.png)

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

## 📦 Building Standalone Application
You can bundle the entire application (Python backend, compiled React frontend, and optionally Tesseract models) into a standalone directory using PyInstaller.

```bash
pyinstaller --clean OfflineDocTool.spec
```
The output will be generated in the `dist/` directory.

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
