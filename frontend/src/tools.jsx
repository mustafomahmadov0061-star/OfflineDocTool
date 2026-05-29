import React from 'react';
import { FileText, Image as ImageIcon, FileImage, FileBarChart, Monitor, ScanText, Disc, FolderOpen } from 'lucide-react';

export const toPdfItems = [
  { id: 'word_to_pdf', icon: <FileText className="text-blue-500 w-6 h-6"/>, accept: ".doc,.docx" },
  { id: 'png_to_pdf', icon: <ImageIcon className="text-green-500 w-6 h-6"/>, accept: ".png" },
  { id: 'docx_to_pdf', icon: <FileText className="text-blue-400 w-6 h-6"/>, accept: ".docx" },
  { id: 'ppt_to_pdf', icon: <Monitor className="text-orange-500 w-6 h-6"/>, accept: ".ppt,.pptx" },
  { id: 'jpg_to_pdf', icon: <FileImage className="text-purple-500 w-6 h-6"/>, accept: ".jpg,.jpeg" },
  { id: 'excel_to_pdf', icon: <FileBarChart className="text-green-600 w-6 h-6"/>, accept: ".xls,.xlsx" },
  { id: 'tiff_to_pdf', icon: <ImageIcon className="text-gray-500 w-6 h-6"/>, accept: ".tiff,.tif" },
  { id: 'heic_to_pdf', icon: <ImageIcon className="text-red-500 w-6 h-6"/>, accept: ".heic" },
  { id: 'webp_to_pdf', icon: <ImageIcon className="text-teal-500 w-6 h-6"/>, accept: ".webp" },
];

export const fromPdfItems = [
  { id: 'pdf_ocr', icon: <ScanText className="text-gray-700 w-6 h-6"/>, accept: ".pdf" },
  { id: 'img_to_excel', icon: <FileBarChart className="text-green-600 w-6 h-6"/>, accept: "image/*" },
  { id: 'enhance_image', icon: <ImageIcon className="text-pink-500 w-6 h-6"/>, accept: "image/*" },
  { id: 'make_iso', icon: <Disc className="text-indigo-500 w-6 h-6"/>, accept: "*" },
  { id: 'extract_iso', icon: <FolderOpen className="text-amber-500 w-6 h-6"/>, accept: ".iso" },
  { id: 'pdf_to_jpg', icon: <FileImage className="text-purple-500 w-6 h-6"/>, accept: ".pdf" },
  { id: 'pdf_to_excel', icon: <FileBarChart className="text-green-600 w-6 h-6"/>, accept: ".pdf" },
  { id: 'pdf_to_word', icon: <FileText className="text-blue-500 w-6 h-6"/>, accept: ".pdf" },
  { id: 'pdf_to_ppt', icon: <Monitor className="text-orange-500 w-6 h-6"/>, accept: ".pdf" },
  { id: 'pdf_to_ods', icon: <FileBarChart className="text-emerald-500 w-6 h-6"/>, accept: ".pdf" },
  { id: 'pdf_to_odp', icon: <Monitor className="text-red-600 w-6 h-6"/>, accept: ".pdf" },
  { id: 'pdf_to_odt', icon: <FileText className="text-blue-600 w-6 h-6"/>, accept: ".pdf" },
];

export const imageConvertItems = [
  { id: 'heic_to_jpg', icon: <ImageIcon className="text-rose-500 w-6 h-6"/>, label: "HEIC → JPG", accept: ".heic" },
  { id: 'jpg_to_heic', icon: <ImageIcon className="text-emerald-500 w-6 h-6"/>, label: "JPG → HEIC", accept: ".jpg,.jpeg" },
  { id: 'webp_to_jpg', icon: <ImageIcon className="text-sky-500 w-6 h-6"/>, label: "WEBP → JPG", accept: ".webp" },
  { id: 'jpg_to_webp', icon: <ImageIcon className="text-indigo-500 w-6 h-6"/>, label: "JPG → WEBP", accept: ".jpg,.jpeg" },
  { id: 'tiff_to_jpg', icon: <ImageIcon className="text-purple-500 w-6 h-6"/>, label: "TIFF → JPG", accept: ".tiff,.tif" },
  { id: 'jpg_to_tiff', icon: <ImageIcon className="text-pink-500 w-6 h-6"/>, label: "JPG → TIFF", accept: ".jpg,.jpeg" },
];

export const allTools = [...toPdfItems, ...fromPdfItems, ...imageConvertItems];
