import { useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Plus, RotateCcw, RotateCw, Download, Search, FileText, File, Archive, X, Settings2, Trash2, ChevronDown } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function CompressPage() {
    const { t, tl } = useLanguage();
  const [files, setFiles] = useState([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [errorText, setErrorText] = useState('');
  const [result, setResult] = useState(null);
  const [levelResults, setLevelResults] = useState({});
  const [level, setLevel] = useState('medium'); // Default recommended
  const [previewModalFile, setPreviewModalFile] = useState(null);
  const [ekleMenuOpen, setEkleMenuOpen] = useState(false);

  const addMoreInputRef = useRef(null);
  const ekleMenuRef = useRef(null);
  const levelLabels = {
    high: 'Yüksek',
    medium: 'Orta',
    low: 'Düşük'
  };
  const levelEstimateRanges = {
    high: t("highEstimate"),
    medium: t("mediumEstimate"),
    low: t("lowEstimate")
  };

  const filesSignature = () => files
    .map(f => `${f.original_file}:${f.page_num}:${f.rotation}`)
    .join('|');

  const renderLevelInfo = (levelKey) => {
    const levelResult = levelResults[levelKey];
    if (levelResult && levelResult.signature === filesSignature()) {
      return `${levelResult.originalSize} KB → ${levelResult.size} KB`;
    }
    return levelEstimateRanges[levelKey];
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ekleMenuRef.current && !ekleMenuRef.current.contains(e.target)) {
        setEkleMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFilesUpload = async (acceptedFiles) => {
    if (!acceptedFiles.length) return;
    setLoading(true);
    setErrorText('');
    setResult(null);
    setLevelResults({});
    setStatusText(t('filesUploading'));
    let newFilesList = [];
    let uploadedBytes = 0;
    
    // Add sizes of newly uploaded files
    for (let file of acceptedFiles) {
      setStatusText(`${file.name} yükleniyor...`);
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        if (!res.ok || !data.thumbnails) {
          throw new Error(data.error || 'Dosya yüklenemedi.');
        }
        const newFiles = data.thumbnails.map(t => ({
           id: t.id,
           name: t.original_name,
           original_file: t.original_file,
           page_num: t.page_num,
           preview: t.url,
           rotation: 0,
           original_size: file.size,
           source_page_count: data.thumbnails.length,
           selected: false
        }));
        newFilesList = [...newFilesList, ...newFiles];
        uploadedBytes += file.size;
      } catch(e) {
        console.error(e);
        setErrorText(e.message || 'Dosya yüklenirken hata oluştu.');
      }
    }
    
    setFiles(prev => [...prev, ...newFilesList]);
    setTotalBytes(prev => prev + uploadedBytes);
    setLoading(false);
    setStatusText('');
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop: handleFilesUpload
  });

  const handleHiddenFileInput = (e) => {
    const uploadFiles = Array.from(e.target.files);
    if (!uploadFiles.length) return;
    handleFilesUpload(uploadFiles);
    e.target.value = null;
  };

  const handleInlineDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const uploadFiles = Array.from(e.dataTransfer.files || []);
    if (uploadFiles.length) handleFilesUpload(uploadFiles);
  };

  const rotate = (idx, angle) => {
    setFiles(prev => {
       const newArr = [...prev];
       newArr[idx].rotation = (newArr[idx].rotation + angle) % 360;
       return newArr;
    });
  };

  const addBlankPage = async () => {
    setLoading(true);
    setStatusText('{t("addBlankPage")}niyor...');
    setErrorText('');
    try {
      const res = await fetch("/api/blank", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.thumbnails) {
        throw new Error(data.error || 'Boş sayfa oluşturulamadı.');
      }
      const newFiles = data.thumbnails.map(t => ({
        id: t.id,
        name: t.original_name,
        original_file: t.original_file,
        page_num: t.page_num,
        preview: t.url,
        rotation: 0,
        original_size: 0,
        source_page_count: data.thumbnails.length,
        selected: false
      }));
      setFiles(prev => [...prev, ...newFiles]);
    } catch(e) {
      console.error(e);
      setErrorText(e.message || 'Boş sayfa oluşturulamadı.');
    }
    setLoading(false);
    setStatusText('');
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setResult(null);
    setLevelResults({});
  };

  const compressPdf = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setErrorText('');
    setResult(null);
    setStatusText(t("preparingPdf"));
    try {
       const sourceFiles = [...new Set(files.map(f => f.original_file))];
       const canCompressOriginal =
          sourceFiles.length === 1 &&
          files.every(f => f.rotation === 0 && f.source_page_count === files.length) &&
          files.map(f => f.page_num).sort((a, b) => a - b).every((pageNum, idx) => pageNum === idx);

       let mergedFilePath = sourceFiles[0];

       // Merge files into one PDF if multiple, or just process one
       if (!canCompressOriginal) {
          const payload = files.map(f => ({
             original_file: f.original_file,
             page_num: f.page_num,
             rotation: f.rotation
          }));
          const mergeRes = await fetch("/api/merge", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ pages: payload })
          });
          const mergeData = await mergeRes.json();
          if (!mergeRes.ok || !mergeData.url) {
             throw new Error(mergeData.error || 'PDF hazırlanamadı.');
          }
          const mergedFilename = mergeData.url.split('/').pop();
          mergedFilePath = "temp/" + mergedFilename;
       }
       
       setStatusText(t("compressing"));

       const compRes = await fetch("/api/compress", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ file_path: mergedFilePath, level: level })
       });
       const data = await compRes.json();
       if (!compRes.ok || !data.url) {
          throw new Error(data.error || 'Sıkıştırma tamamlanamadı.');
       }

       const nextResult = {
          url: data.url,
          size: data.size_kb,
          originalSize: data.original_size_kb,
          savedPercent: data.saved_percent,
          filename: data.url.split('/').pop(),
          level,
          preservedStructure: data.preserved_structure,
          maxCompressionMode: data.max_compression_mode,
          dpiTarget: data.image_dpi_target,
          imageQuality: data.image_quality,
          signature: filesSignature()
       };
       setResult(nextResult);
       setLevelResults(prev => ({
          ...prev,
          [level]: nextResult
       }));
    } catch(e) {
       console.error(e);
       setErrorText(e.message || 'Sıkıştırma sırasında hata oluştu.');
    }
    setLoading(false);
    setStatusText('');
  };

  const handleSave = async (url) => {
     try {
       const res = await fetch("/api/save", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ file_url: url })
       });
       if (res.ok) {
         window.open(url, "_blank");
       }
     } catch (e) {
       console.error(e);
     }
  };

  const [packFormat, setPackFormat] = useState('none');
  const [isPacking, setIsPacking] = useState(false);

  const handleSaveResult = async (url) => {
     if (packFormat !== 'none') {
         setIsPacking(true);
         try {
             const res = await fetch("/api/pack", {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({
                     file_urls: [url],
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
                 alert("Paketleme hatası: " + (data.error || "Bilinmeyen hata"));
             }
         } catch(e) { 
             console.error(e); 
             alert("Paketleme sırasında bir hata oluştu.");
         }
         setIsPacking(false);
         return;
     }

     await handleSave(url);
  };

  return (
    <div className="h-full min-h-0 flex relative overflow-hidden bg-[#F4F7FB]">
      <input type="file" ref={addMoreInputRef} onChange={handleHiddenFileInput} className="hidden" multiple />
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/65">
          <div className="rounded-xl border border-gray-200 bg-white px-7 py-6 text-center shadow-xl">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-red-100 border-t-red-500"></div>
            <p className="text-base font-bold text-gray-800">{statusText || t("fileProcessing")}</p>
          </div>
        </div>
      )}

      {previewModalFile && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4" onClick={() => setPreviewModalFile(null)}>
          <div className="bg-white rounded-lg p-3 max-w-[90vw] max-h-[90vh] overflow-auto shadow-2xl flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center w-full mb-3 px-2 border-b pb-2">
              <span className="font-medium text-gray-700 truncate">{previewModalFile.name} ({t("page")} {previewModalFile.page_num + 1})</span>
              <button onClick={() => setPreviewModalFile(null)} className="text-gray-500 hover:text-red-500 font-bold px-2 py-1">{t("close")}</button>
            </div>
            <img
              src={previewModalFile.preview}
              alt="Preview"
              style={{ transform: `rotate(${previewModalFile.rotation}deg)` }}
              className="max-w-[80vw] max-h-[80vh] object-contain transition-transform"
            />
          </div>
        </div>
      )}
      
      {/* Main Workspace Area (Left) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0 z-10 relative">
            <div className="flex items-center px-4 h-14">
              <div className="flex items-center gap-2 text-red-500 font-bold text-lg border-b-2 border-red-500 h-full px-2">
                <Archive className="w-5 h-5"/> {t("compress")}
              </div>
              <div className="ml-5 relative" ref={ekleMenuRef}>
                <button onClick={() => setEkleMenuOpen(!ekleMenuOpen)} className="flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Plus className="w-4 h-4"/> {t("add")} <ChevronDown className="w-4 h-4"/>
                </button>
                {ekleMenuOpen && (
                  <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-gray-200 shadow-lg rounded-md z-50 py-1">
                    <button onClick={() => { setEkleMenuOpen(false); addMoreInputRef.current?.click(); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors">
                      <FileText className="w-4 h-4"/> {t("addDocument")}
                    </button>
                    <button onClick={() => { setEkleMenuOpen(false); addBlankPage(); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors">
                      <File className="w-4 h-4"/> {t("addBlankPage")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-8">
            <div className="flex items-start justify-start flex-wrap gap-6 pb-10">
              {files.length === 0 && (
                <div
                  {...getRootProps()}
                  className={"w-full min-h-[390px] rounded-2xl border-4 border-dashed bg-white flex flex-col items-center justify-center cursor-pointer transition-all " + (isDragActive ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:bg-gray-50')}
                >
                  <input {...getInputProps()} />
                  <Archive className="w-20 h-20 text-red-500 mb-5" />
                  <h2 className="text-3xl font-bold text-gray-800 mb-3">{t("fileCompression")}</h2>
                  <p className="text-lg text-gray-600 mb-7">{t("dropFilesOrSelect")}</p>
                  <button className="bg-red-500 hover:bg-red-600 text-white text-lg font-bold py-4 px-9 rounded-xl shadow-lg transition-transform transform hover:scale-105">
                    {t("selectFiles")}
                  </button>
                </div>
              )}

              {files.map((file, idx) => (
                 <div key={file.id + idx} className="relative group w-40">
                    <div className="w-40 h-56 bg-white border border-gray-200 shadow-sm rounded-xl flex flex-col relative transition-shadow hover:shadow-md overflow-visible">
                       <button onClick={() => removeFile(idx)} className="absolute -top-3 -right-3 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors z-10 shadow-sm">
                          <X className="w-4 h-4"/>
                       </button>
                       <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 hidden group-hover:flex items-center gap-1 bg-white shadow-md p-1 rounded-md border border-gray-100">
                          <button onClick={() => setPreviewModalFile(file)} className="p-1.5 hover:bg-gray-100 rounded text-gray-600" title={t("preview")}><Search className="w-4 h-4"/></button>
                          <button onClick={() => rotate(idx, 90)} className="p-1.5 hover:bg-gray-100 rounded text-gray-600" title={t("rotateRight")}><RotateCw className="w-4 h-4"/></button>
                          <button onClick={() => rotate(idx, -90)} className="p-1.5 hover:bg-gray-100 rounded text-gray-600" title={t("rotateLeft")}><RotateCcw className="w-4 h-4"/></button>
                          <button onClick={() => removeFile(idx)} className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Delete"><Trash2 className="w-4 h-4"/></button>
                       </div>
                       <div className="h-[184px] p-3 flex items-center justify-center overflow-hidden bg-gray-50 rounded-t-xl">
                          <div className="w-[112px] h-[158px] bg-white border border-gray-100 shadow-sm flex items-center justify-center overflow-hidden">
                            <img onClick={() => setPreviewModalFile(file)} src={file.preview} alt={file.name} style={{ transform: `rotate(${file.rotation}deg)` }} className="w-full h-full object-contain transition-transform cursor-pointer" draggable="false" />
                          </div>
                       </div>
                       <div className="h-10 border-t border-gray-100 flex items-center justify-center bg-white rounded-b-xl px-2">
                          <span className="text-xs font-semibold text-gray-700 truncate w-full text-center" title={file.name}>{file.name}</span>
                       </div>
                       
                    </div>
                 </div>
              ))}
              
              {files.length > 0 && (
                <div
                  onClick={() => addMoreInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={handleInlineDrop}
                  className="w-40 h-56 rounded-xl border-2 border-red-300 border-dashed bg-white/60 flex flex-col items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-500 hover:border-red-400 cursor-pointer transition-colors shadow-sm"
                  title={t("addFile")}
                >
                   <div className="w-14 h-14 rounded-full border-2 border-red-200 flex items-center justify-center mb-3">
                     <Plus className="w-8 h-8"/>
                   </div>
                   <p className="px-4 text-center text-sm font-semibold text-red-500">{t("addFile")}</p>
                   <p className="mt-1 px-4 text-center text-xs text-gray-400">{t("dragHere")}</p>
                </div>
              )}
            </div>
          </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-[360px] h-full bg-white border-l border-gray-200 flex flex-col shadow-sm flex-shrink-0 z-10">
          <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-gray-50">
             <Settings2 className="w-5 h-5 text-gray-700"/>
             <h3 className="font-bold text-gray-800 text-lg">{t("compressionLevel")}</h3>
          </div>
          
          <div className="p-6 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto bg-gray-50/50">
             {/* High Compression */}
             <label className={"relative block rounded-xl border-2 p-4 cursor-pointer transition-all " + (level === 'high' ? 'border-red-500 bg-red-50/30' : 'border-transparent bg-white shadow-sm hover:border-gray-300')}>
                <input type="radio" checked={level === 'high'} onChange={() => setLevel('high')} className="peer sr-only" />
                <div className="flex items-start gap-4">
                   <div className={"w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center " + (level === 'high' ? 'border-red-500' : 'border-gray-300')}>
                      {level === 'high' && <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>}
                   </div>
                   <div>
                     <span className={"block font-bold text-base " + (level === 'high' ? 'text-gray-900' : 'text-gray-900')}>{t("high")}</span>
                     <p className="text-sm text-gray-500 mt-1 mb-2 leading-snug">{t("highDesc")}</p>
                     {totalBytes > 0 && (
                        <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-md">
                           {renderLevelInfo('high')}
                        </span>
                     )}
                   </div>
                </div>
             </label>

             {/* Medium Compression (Recommended) */}
             <label className={"relative block rounded-xl border-2 p-4 cursor-pointer transition-all " + (level === 'medium' ? 'border-red-500 bg-red-50/30' : 'border-transparent bg-white shadow-sm hover:border-gray-300')}>
                <input type="radio" checked={level === 'medium'} onChange={() => setLevel('medium')} className="peer sr-only" />
                <div className="flex items-start gap-4">
                   <div className={"w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center " + (level === 'medium' ? 'border-red-500' : 'border-gray-300')}>
                      {level === 'medium' && <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>}
                   </div>
                   <div>
                     <span className={"block font-bold text-base flex items-center gap-2 " + (level === 'medium' ? 'text-gray-900' : 'text-gray-900')}>
                        Orta
                     </span>
                     <p className="text-sm text-gray-500 mt-1 mb-2 leading-snug">{t("medium")} boy, daha kaliteli</p>
                     {totalBytes > 0 && (
                        <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-md">
                           {renderLevelInfo('medium')}
                        </span>
                     )}
                   </div>
                </div>
             </label>

             {/* Low Compression */}
             <label className={"relative block rounded-xl border-2 p-4 cursor-pointer transition-all " + (level === 'low' ? 'border-red-500 bg-red-50/30' : 'border-transparent bg-white shadow-sm hover:border-gray-300')}>
                <input type="radio" checked={level === 'low'} onChange={() => setLevel('low')} className="peer sr-only" />
                <div className="flex items-start gap-4">
                   <div className={"w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center " + (level === 'low' ? 'border-red-500' : 'border-gray-300')}>
                      {level === 'low' && <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>}
                   </div>
                   <div>
                     <span className={"block font-bold text-base " + (level === 'low' ? 'text-gray-900' : 'text-gray-900')}>{t("low")}</span>
                     <p className="text-sm text-gray-500 mt-1 mb-2 leading-snug">{t("lowDesc")}</p>
                     {totalBytes > 0 && (
                        <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-md">
                           {renderLevelInfo('low')}
                        </span>
                     )}
                   </div>
                </div>
             </label>
          </div>
          
          <div className="flex-shrink-0 p-6 border-t border-gray-200 bg-white">
             {errorText && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                  {errorText}
                </div>
             )}
             {result ? (
                 <div className="flex flex-col gap-3">
                    <div className={(result.level === level ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200") + " border rounded-lg p-3 text-center mb-2"}>
                        <p className={(result.level === level ? "text-green-800" : "text-amber-800") + " font-medium text-sm"}>
                          {result.level === level ? t("compressionComplete") : `${levelLabels[level]} seviyesi seçildi`}
                        </p>
                        <p className={(result.level === level ? "text-green-700" : "text-amber-700") + " text-xs mt-1"}>
                          {result.originalSize ? `${result.originalSize} KB → ${result.size} KB` : `${result.size} KB`}
                          {result.savedPercent ? ` • %${result.savedPercent} daha küçük` : ''} ({levelLabels[result.level]})
                        </p>
                        <p className="mt-1 text-[11px] text-green-700">
                          {result.preservedStructure ? '{t("pdfStructurePreserved")}' : '{t("scannedPdfCompressed")}'} {result.dpiTarget ? `Görüntü hedefi: ${result.dpiTarget} DPI / kalite ${result.imageQuality}` : ''}
                        </p>
                        <button 
                            onClick={async () => {
                                try {
                                    await fetch("/api/open", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ file_url: result.url })
                                    });
                                } catch(e) { console.error("Açma hatası:", e); }
                            }}
                            className="text-[#2c3e50] hover:text-blue-600 hover:underline text-xs mt-1 truncate block font-bold cursor-pointer w-full text-center" 
                            title={result.filename}
                         >
                            {result.filename}
                         </button>
                    </div>
                    {result.level !== level && (
                       <button onClick={compressPdf} disabled={files.length === 0 || loading} className="w-full bg-red-500 disabled:bg-red-300 disabled:cursor-not-allowed hover:bg-red-600 text-white font-bold py-4 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-base">
                          {levelLabels[level].toUpperCase()} İLE TEKRAR SIKIŞTIR
                       </button>
                    )}
                    
                    <div className="w-full mb-1">
                       <label className="block text-sm font-medium text-gray-700 mb-1 text-left">{t("howToDownload")}</label>
                       <select 
                          value={packFormat}
                          onChange={(e) => setPackFormat(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-4 py-3 outline-none focus:border-red-500 transition-colors text-sm"
                       >
                          <option value="none">{t("asPdfOnly")}</option>
                          <option value="zip">{t("asZipArchive")}</option>
                          <option value="iso">{t("asIsoImage")}</option>
                       </select>
                    </div>

                    <button disabled={isPacking} onClick={() => handleSaveResult(result.url)} className={(result.level === level ? "bg-red-500 hover:bg-red-600 text-white py-4 text-lg disabled:bg-gray-400" : "bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 py-3 text-base disabled:bg-gray-100 disabled:text-gray-400") + " w-full font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"}>
                        {isPacking ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Download className="w-5 h-5"/>} 
                        {isPacking ? 'Paketleniyor...' : (result.level === level ? 'Download' : `${levelLabels[result.level]} sonucunu indir`)}
                    </button>
                    <button onClick={() => { setResult(null); setLevelResults({}); setFiles([]); setTotalBytes(0); setErrorText(''); }} className="w-full bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 font-bold py-3 rounded-xl transition-colors mt-2">
                        {t("newCompression")}
                    </button>
                    {result.level === level && (
                       <button onClick={compressPdf} disabled={files.length === 0 || loading} className="w-full text-gray-500 hover:text-red-600 font-bold py-2 rounded-xl transition-colors">
                          {t("recompressSameFiles")}
                       </button>
                    )}
                 </div>
             ) : (
                 <button onClick={compressPdf} disabled={files.length === 0 || loading} className="w-full bg-red-500 disabled:bg-red-300 disabled:cursor-not-allowed hover:bg-red-600 text-white font-bold text-xl py-5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
                     {loading ? (
                         <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                     ) : (
                         <>
                            {t("compressFiles")}
                         </>
                     )}
                 </button>
             )}
          </div>
      </div>
    </div>
  );
}
