import { useState, useRef, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Download, CheckCircle2, FileText, UploadCloud, X } from 'lucide-react';
import { allTools } from '../tools';
import { useLanguage } from '../i18n/LanguageContext';

export default function WorkspacePage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
    const { t, tl } = useLanguage();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [ocrProgress, setOcrProgress] = useState({ percent: 0, status: t("preparing") });

  useEffect(() => {
    let intervalId;
    let active = true;
    if (loading && (taskId === 'img_to_excel' || taskId === 'pdf_to_excel' || taskId === 'pdf_ocr')) {
      const fetchProgress = async () => {
        try {
          const res = await fetch('/api/ocr_progress');
          if (res.ok) {
            const data = await res.json();
            if (active && data && typeof data.percent === 'number') {
              setOcrProgress({
                percent: data.percent,
                status: data.status || 'Processing...'
              });
            }
          }
        } catch (e) {
          if (active) {
            console.error("Progress polling error", e);
          }
        }
      };
      
      fetchProgress();
      intervalId = setInterval(fetchProgress, 600);
    } else {
      setOcrProgress({ percent: 0, status: t("preparing") });
    }

    return () => {
      active = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [loading, taskId]);

  const tool = allTools.find(t => t.id === taskId);
  const isImageTool = tool?.accept?.includes('image') || /\.(png|jpg|jpeg|tiff|tif|heic|webp)/i.test(tool?.accept || '');
  const imageToPdfTasks = ['png_to_pdf', 'jpg_to_pdf', 'tiff_to_pdf', 'heic_to_pdf', 'webp_to_pdf'];
  const shouldCombineImagesToPdf = imageToPdfTasks.includes(tool?.id) || tool?.id === 'make_iso';
  const outputLabels = {
    pdf_to_jpg: 'JPG',
    pdf_to_png: 'PNG',
    pdf_to_ppt: 'PPT',
    pdf_to_word: 'Word',
    pdf_to_docx: 'DOCX',
    pdf_to_excel: 'Excel',
    pdf_to_ods: 'ODS',
    pdf_to_odp: 'ODP',
    pdf_to_odt: 'ODT',
    pdf_to_txt: t("outputText"),
    pdf_ocr: 'Excel',
    img_to_excel: 'Excel',
    enhance_image: t("enhancedImage"),
    make_iso: 'ISO',
    extract_iso: 'ZIP',
    heic_to_jpg: 'JPG',
    jpg_to_heic: 'HEIC',
    webp_to_jpg: 'JPG',
    jpg_to_webp: 'WEBP',
    tiff_to_jpg: 'JPG',
    jpg_to_tiff: 'TIFF'
  };
  const outputLabel = outputLabels[tool?.id] || 'PDF';

  const filePreviews = useMemo(() => {
    return files.map((file) => ({
      file,
      url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
  }, [files]);

  useEffect(() => {
    return () => {
      filePreviews.forEach((item) => {
        if (item.url) URL.revokeObjectURL(item.url);
      });
    };
  }, [filePreviews]);

  if (!tool) {
     return <div className="p-8">{t("toolNotFound")}</div>;
  }

  const handleFilesSelected = (e) => {
    const newFiles = Array.from(e.target.files);
    if (newFiles.length > 0) {
       setFiles(prev => [...prev, ...newFiles]);
       // If completed before, reset
       if (isCompleted) {
           setIsCompleted(false);
           setResults({});
       }
    }
    e.target.value = null;
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setResults(prev => {
       const newR = {...prev};
       delete newR[idx];
       return newR;
    });
  };

  const clearFiles = () => {
    setFiles([]);
    setResults({});
    setIsCompleted(false);
  };

  const processAll = async () => {
    if (files.length === 0) return;
    setOcrProgress({ percent: 0, status: t("preparing") });
    setLoading(true);

    if (shouldCombineImagesToPdf) {
       const formData = new FormData();
       files.forEach((file) => formData.append("files", file));
       formData.append("task_id", tool.id);

       try {
         const res = await fetch("/api/convert_images_batch", {
            method: "POST",
            body: formData
         });
         const data = await res.json();
         if (!res.ok || !data.url) {
             throw new Error(data.error || "Images could not be converted to PDF.");
         }

         let previewData = data.preview;
         const filename = data.url.split('/').pop();
         if (!previewData && filename.toLowerCase().endsWith('.pdf')) {
            try {
               const prevRes = await fetch(`/api/preview_pdf?filename=${filename}`);
               if (prevRes.ok) {
                  const prevData = await prevRes.json();
                  if (prevData.url) previewData = prevData.url;
               }
            } catch (e) {
               console.error("Preview fetch error", e);
            }
         }

         setResults({
            0: {
               url: data.url,
               preview: previewData,
               filename,
               size_kb: data.size_kb,
               pages: data.pages
            }
         });
         setIsCompleted(true);
       } catch (err) {
         console.error("Error", err);
       }
       setLoading(false);
       return;
    }
    
    for (let i = 0; i < files.length; i++) {
       const file = files[i];
       const formData = new FormData();
       formData.append("file", file);
       formData.append("task_id", tool.id);
       
       try {
         const res = await fetch("/api/convert", {
            method: "POST",
            body: formData
         });
         const data = await res.json();
         if (data.url) {
            let previewData = data.preview;
            const filename = data.url.split('/').pop();
            if (!previewData && filename.toLowerCase().endsWith('.pdf')) {
               try {
                  const prevRes = await fetch(`/api/preview_pdf?filename=${filename}`);
                  if (prevRes.ok) {
                     const prevData = await prevRes.json();
                     if (prevData.url) previewData = prevData.url;
                  }
               } catch (e) {
                  console.error("Preview fetch error", e);
               }
            }

            setResults(prev => ({
               ...prev,
               [i]: {
                  url: data.url,
                  preview: previewData,
                  filename: filename,
                  size_kb: data.size_kb,
                  pages: data.pages
               }
            }));
         }
       } catch (err) {
         console.error("Error", err);
       }
    }
    setLoading(false);
    setIsCompleted(true);
  };

  const [packFormat, setPackFormat] = useState('none');
  const [isPacking, setIsPacking] = useState(false);

  const handleSaveAll = async () => {
     const resVals = Object.values(results);
     if (resVals.length === 0) return;
     
     if (packFormat !== 'none') {
         setIsPacking(true);
         try {
             const res = await fetch("/api/pack", {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({
                     file_urls: resVals.map(r => r.url),
                     format: packFormat
                 })
             });
             const data = await res.json();
             if (data.url) {
                 await fetch("/api/save", {
                     method: "POST",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({ file_url: data.url })
                 });
             } else {
                 alert("Packaging error: " + (data.error || "Unknown error"));
             }
         } catch(e) { 
             console.error(e); 
             alert("An error occurred during packaging.");
         }
         setIsPacking(false);
         return;
     }

     // Single file save or packFormat === 'none'
     for (const r of resVals) {
         try {
            if (r.pages && r.pages.length > 0) {
                for (const pageUrl of r.pages) {
                    await fetch("/api/save", {
                       method: "POST",
                       headers: { "Content-Type": "application/json" },
                       body: JSON.stringify({ file_url: pageUrl })
                    });
                }
            } else {
                await fetch("/api/save", {
                   method: "POST",
                   headers: { "Content-Type": "application/json" },
                   body: JSON.stringify({ file_url: r.url })
                });
            }
         } catch (e) {
           console.error("Save error:", e);
         }
     }
  };

  const getTotalResultSize = () => {
      return Object.values(results).reduce((acc, r) => acc + (r.size_kb || 0), 0);
  };

  const formatFileSize = (bytes) => {
      if (!bytes && bytes !== 0) return "";
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Derived arrays for UI
  const resultsArray = Object.values(results);

  return (
    <div className="w-full h-screen flex flex-col relative bg-[#F4F7FB]">
       <input type="file" multiple ref={fileInputRef} onChange={handleFilesSelected} className="hidden" accept={tool.accept} />

       {loading && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] transition-all duration-300">
           <div className="bg-white/95 backdrop-blur-lg p-8 rounded-3xl shadow-2xl flex flex-col items-center border border-white/20 max-w-md w-full mx-4 transition-all transform scale-100">
              {/* Spinner / Icon */}
              <div className="relative w-24 h-24 mb-6">
                {/* Outer glowing ring */}
                <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-pulse"></div>
                {/* Spinning gradient border */}
                <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 border-r-indigo-500 border-b-purple-500 border-l-transparent animate-spin"></div>
                {/* Center icon */}
                <div className="absolute inset-3 bg-slate-50 rounded-full flex items-center justify-center shadow-inner">
                  <FileText className="w-8 h-8 text-blue-600 animate-bounce" />
                </div>
              </div>
              
              <h3 className="font-extrabold text-xl text-slate-800 mb-2 tracking-tight">
                {(taskId === 'img_to_excel' || taskId === 'pdf_to_excel' || taskId === 'pdf_ocr') 
                  ? t("analyzingTable") 
                  : t("processing")}
              </h3>
              
              {(taskId === 'img_to_excel' || taskId === 'pdf_to_excel' || taskId === 'pdf_ocr') ? (
                <div className="w-full flex flex-col items-center">
                  {/* Status text */}
                  <p className="text-sm font-medium text-slate-500 text-center min-h-[40px] px-2 mb-5">
                    {ocrProgress.status}
                  </p>
                  
                  {/* Progress Container */}
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner mb-2 relative">
                    <div 
                      className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${ocrProgress.percent}%` }}
                    ></div>
                  </div>
                  
                  {/* Percentage label */}
                  <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                    %{ocrProgress.percent}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center">{t("convertingFile")}</p>
              )}
           </div>
        </div>
       )}

       <div className="h-[88px] bg-white border-b border-gray-200 flex items-center justify-between px-7 shadow-sm flex-shrink-0 z-20">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium transition-colors">
             <ArrowLeft size={20} /> {t("back")}
          </button>
          
          <div className="flex items-center gap-4">
             <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gray-50 border border-gray-100 shadow-sm">
                {tool.icon}
             </div>
             <div>
                <span className="font-bold text-gray-800 text-xl block leading-tight">{tool.label || t(tool.id)}</span>
                <span className="text-sm text-gray-400">{tool.accept || t('allFiles')} → {outputLabel}</span>
             </div>
          </div>

          <button
             onClick={processAll}
             disabled={files.length === 0 || loading}
             className="min-w-[166px] bg-[#2563eb] disabled:bg-gray-300 disabled:text-gray-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-base"
          >
             <RefreshCw size={18}/> {t("convert")}
          </button>
       </div>

       <div className="h-[calc(100vh-88px)] overflow-hidden bg-[#f7f9fc]">
          {isCompleted ? (
             <div className="h-full grid grid-cols-[330px_minmax(0,1fr)] overflow-hidden">
                <div className="bg-white border-r border-gray-200 p-8 flex flex-col items-center h-full shadow-sm">
                   <div className="flex-1 flex flex-col items-center justify-center w-full">
                      <div className="w-16 h-16 bg-green-50 border-4 border-green-500 rounded-full flex items-center justify-center mb-6">
                         <CheckCircle2 className="text-green-500 w-8 h-8" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">{t("conversionComplete")}</h2>
                      <p className="text-gray-500 mb-6 text-sm">{files.length} {t("filesCount")} • {getTotalResultSize().toFixed(1)} KB</p>
                      
                      <div className="w-full mb-4">
                         <label className="block text-sm font-medium text-gray-700 mb-1 text-left">{t("howToDownload")}</label>
                         <select 
                            value={packFormat}
                            onChange={(e) => setPackFormat(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 text-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                         >
                            <option value="none">{t("saveSeparately")}</option>
                            <option value="zip">{t("asZipArchive")}</option>
                            <option value="iso">{t("asIsoImage")}</option>
                            <option value="pdf">{t("asSinglePdfMerge")}</option>
                         </select>
                      </div>

                      <button onClick={handleSaveAll} disabled={isPacking} className="w-full bg-[#10b981] disabled:bg-gray-400 hover:bg-[#059669] text-white font-bold py-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-lg mb-4">
                         {isPacking ? <RefreshCw className="animate-spin" size={20} /> : <Download size={20}/>} 
                         {isPacking ? t('packing') : t('download')}
                      </button>
                      
                      <button onClick={clearFiles} className="text-gray-400 hover:text-gray-600 font-medium text-sm py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors">
                         {t("newConversion")}
                      </button>
                   </div>
                </div>

                <div className="p-5 overflow-hidden flex flex-col bg-[#f7f9fc]">
                   <div className="h-full rounded-lg overflow-hidden flex items-center justify-center relative border border-gray-200 bg-white shadow-sm">
                 
                 {isCompleted && resultsArray.length > 0 ? (
                     // AFTER CONVERSION (Image 3 Right Area: BIG PREVIEW)
                     resultsArray[0].url.endsWith('.pdf') ? (
                         // Render PDF natively via iframe for the BEST preview experience
                         <iframe src={resultsArray[0].url} className="w-full h-full border-0 bg-gray-100 absolute inset-0" title="PDF Önizleme" />
                     ) : Array.isArray(resultsArray[0].preview) ? (
                         // Render Table Preview for Excel files
                         <div className="w-full h-full overflow-auto p-4 absolute inset-0 bg-white">
                             <table className="w-full border-collapse border border-gray-300 text-sm">
                                 <tbody>
                                     {resultsArray[0].preview.map((row, rIdx) => (
                                         <tr key={rIdx}>
                                             {row.map((cell, cIdx) => (
                                                 <td key={cIdx} className="border border-gray-300 p-2 whitespace-pre-wrap">
                                                     {cell}
                                                 </td>
                                             ))}
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </div>
                     ) : (resultsArray[0].url.match(/\.(jpeg|jpg|png|gif|webp)$/i) || resultsArray[0].preview) ? (
                         // Render Image Preview
                         <img src={resultsArray[0].preview || resultsArray[0].url} className="max-w-full max-h-full object-contain p-4 shadow-sm absolute inset-0 m-auto" alt={t("resultPreview")} />
                     ) : (
                         <div className="flex flex-col items-center text-gray-400">
                            <FileText size={80} className="mb-4 text-gray-200" />
                            <p className="font-medium text-lg">{t("previewNotAvailable")}</p>
                         </div>
                     )
                 ) : files.length > 0 ? (
                     // BEFORE CONVERSION WITH FILES: Show grid of inputs (so user sees what they added)
                     <div className="w-full h-full p-8 overflow-y-auto bg-gray-50/50">
                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                             {files.map((file, idx) => (
                                 <div key={idx} className="aspect-[3/4] bg-white border border-gray-200 shadow-sm rounded-xl p-2 flex flex-col items-center justify-center relative overflow-hidden group">
                                     {file.type.startsWith('image/') ? (
                                         <img src={URL.createObjectURL(file)} className="max-w-full max-h-full object-contain" />
                                     ) : (
                                         <FileText className="text-gray-300 w-16 h-16" />
                                     )}
                                     <div className="absolute bottom-0 left-0 right-0 bg-white/90 p-2 text-center truncate text-xs font-bold text-gray-700 border-t border-gray-100 backdrop-blur-sm">
                                         {file.name}
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>
                 ) : (
                     // EMPTY STATE (Image 2 Right Area: Placeholder text)
                     <div className="flex flex-col items-center text-gray-400">
                         <p className="font-bold text-xl text-gray-500 mb-2">{t("previewAfterConversion")}</p>
                         <p className="text-sm">{t("previewAfterConversionDesc")}</p>
                     </div>
                 )}
                 
                   </div>
                </div>
             </div>
          ) : (
             <div
                className="h-full grid grid-cols-[minmax(360px,620px)_minmax(380px,1fr)] gap-6 p-7 overflow-hidden"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                   e.preventDefault(); e.stopPropagation();
                   if (e.dataTransfer.files?.length > 0) {
                      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
                   }
                }}
             >
                <div className="min-h-0 overflow-y-auto pr-1">
                   <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full min-h-[224px] border-2 border-dashed border-[#b6c6e3] rounded-2xl bg-[#f0f4fa] flex flex-col items-center justify-center p-7 cursor-pointer hover:bg-[#e4ebf5] transition-colors text-center relative overflow-hidden group"
                   >
                      <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-[#4f75ff] group-hover:scale-110 transition-transform">
                         <UploadCloud size={27} />
                      </div>
                       <p className="font-bold text-gray-700 text-base mb-1">{(tool.label || t(tool.id))} {t("dragFileHere")}</p>
                       <p className="text-xs text-gray-400 mt-2">{t('supported')}: {tool.accept || t('allFiles')}</p>
                      {isImageTool && <p className="text-xs text-gray-400 mt-1">{t("canSelectMultiple")}</p>}
                   </div>

                   {files.length > 0 && (
                      <div className="mt-6">
                         <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-lg font-bold text-gray-700">{files.length} {t("filesSelected")}</h2>
                            <div className="flex items-center gap-4 text-base font-medium">
                               <button onClick={() => fileInputRef.current?.click()} className="text-blue-600 hover:text-blue-700 transition-colors">
                                  {t("addMore")}
                               </button>
                               <button onClick={clearFiles} className="text-red-500 hover:text-red-600 transition-colors">
                                  Clear
                               </button>
                            </div>
                         </div>

                         <div className="flex flex-wrap gap-4">
                            {filePreviews.map(({ file, url }, idx) => (
                               <div key={`${file.name}-${idx}`} className="w-[154px] h-[206px] bg-white border border-gray-200 shadow-sm rounded-xl p-3 flex flex-col relative group">
                                  <button
                                     onClick={() => removeFile(idx)}
                                     className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#ff3045] hover:bg-red-600 text-white shadow-md flex items-center justify-center z-10"
                                     title="Delete"
                                  >
                                     <X size={16} strokeWidth={3}/>
                                  </button>
                                  <div className="h-[132px] rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                                     {url ? (
                                        <img src={url} className="w-full h-full object-contain" alt={file.name} draggable="false" />
                                     ) : (
                                        <FileText className="text-gray-300 w-14 h-14" />
                                     )}
                                  </div>
                                  <div className="mt-3 min-w-0 text-center">
                                     <p className="truncate text-sm font-medium text-gray-600" title={file.name}>{file.name}</p>
                                     <p className="mt-1 text-xs text-gray-400">{formatFileSize(file.size)}</p>
                                  </div>
                               </div>
                            ))}
                         </div>

                         <button
                            onClick={processAll}
                            disabled={files.length === 0 || loading}
                            className="mt-6 bg-[#2563eb] disabled:bg-gray-300 disabled:text-gray-500 hover:bg-blue-700 text-white font-bold py-4 px-9 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-lg"
                         >
                            <RefreshCw size={20}/> {t("convert")}
                         </button>
                      </div>
                   )}
                </div>

                <div className="min-h-0 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                   <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <div>
                         <h2 className="text-lg font-bold text-gray-800">{t("previewArea")}</h2>
                         <p className="text-sm text-gray-400">{t("resultWillOpen")}</p>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                         <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                   </div>
                   <div className="flex-1 min-h-0 flex items-center justify-center p-8 bg-[#fbfcfe]">
                      <div className="max-w-[360px] text-center">
                         <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center">
                            <FileText className="w-8 h-8 text-gray-300" />
                         </div>
                         <p className="text-lg font-bold text-gray-700">{t("previewNotReady")}</p>
                         <p className="mt-2 text-sm leading-6 text-gray-400">
                            {t("generatedFileShown")}
                         </p>
                      </div>
                   </div>
                </div>
             </div>
          )}
       </div>
    </div>
  );
}
