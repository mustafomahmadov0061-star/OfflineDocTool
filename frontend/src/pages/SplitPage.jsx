import React, { useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Plus, RotateCcw, RotateCw, Trash2, Download, Search, FileText, File, Scissors, Check, Upload, ChevronDown, RefreshCw } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';


export default function SplitPage() {
    const { t, tl } = useLanguage();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [interval, setInterval] = useState(4);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [previewModalFile, setPreviewModalFile] = useState(null);
  const [insertIndex, setInsertIndex] = useState(null);
  const [ekleMenuOpen, setEkleMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [openPartMenu, setOpenPartMenu] = useState(null);
  const [previewPartUrl, setPreviewPartUrl] = useState(null);
  const fileInputRef = useRef(null);
  const ekleMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ekleMenuRef.current && !ekleMenuRef.current.contains(e.target)) {
        setEkleMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFilesUpload = async (acceptedFiles, targetIndex = null) => {
    setLoading(true);
    let newFilesList = [];
    
    for (let file of acceptedFiles) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        const newFiles = data.thumbnails.map(t => ({
           id: t.id,
           name: t.original_name,
           original_file: t.original_file,
           page_num: t.page_num,
           preview: t.url,
           rotation: 0,
           selected: false
        }));
        newFilesList = [...newFilesList, ...newFiles];
      } catch(e) {
        console.error(e);
      }
    }
    
    setFiles(prev => {
       if (targetIndex !== null) {
          const arr = [...prev];
          arr.splice(targetIndex, 0, ...newFilesList);
          return arr;
       }
       return [...prev, ...newFilesList];
    });
    setLoading(false);
  };

  const { getRootProps, getInputProps } = useDropzone({ 
    onDrop: (files) => handleFilesUpload(files, null) 
  });

  const handleHiddenFileInput = (e) => {
    const uploadFiles = Array.from(e.target.files);
    if (!uploadFiles.length) return;
    handleFilesUpload(uploadFiles, insertIndex);
    e.target.value = null; // reset
  };

  const insertAtIndex = (idx) => {
    setInsertIndex(idx);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const addBlankPage = async (index = null) => {
    try {
      const res = await fetch("/api/blank", {
        method: "POST"
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server returned ${res.status}: ${errText}`);
      }
      const data = await res.json();
      
      setFiles(prev => {
        const arr = [...prev];
        const newFiles = data.thumbnails.map(t => ({
          id: t.id,
          name: t.original_name,
          original_file: t.original_file,
          page_num: t.page_num,
          preview: t.url,
          rotation: 0,
          selected: false
        }));
        if (index !== null) {
          arr.splice(index, 0, ...newFiles);
        } else {
          arr.push(...newFiles);
        }
        return arr;
      });
    } catch (e) {
      console.error("Boş sayfa oluşturulamadı:", e);
      alert(`Boş sayfa oluşturulamadı.\n\nError: ${e.message}`);
    }
  };

  // Rotation and Selection
  const rotate = (idx, angle) => {
    setFiles(prev => {
       const newArr = [...prev];
       newArr[idx].rotation = (newArr[idx].rotation + angle) % 360;
       return newArr;
    });
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleSelect = (idx) => {
    setFiles(prev => {
       const arr = [...prev];
       arr[idx].selected = !arr[idx].selected;
       return arr;
    });
  };

  const toggleSelectAll = (e) => {
    const checked = e.target.checked;
    setFiles(prev => prev.map(f => ({ ...f, selected: checked })));
  };

  const rotateSelectedLeft = () => {
    setFiles(prev => prev.map(f => f.selected ? { ...f, rotation: (f.rotation - 90) % 360 } : f));
  };

  const rotateSelectedRight = () => {
    setFiles(prev => prev.map(f => f.selected ? { ...f, rotation: (f.rotation + 90) % 360 } : f));
  };

  const deleteSelected = () => {
    setFiles(prev => prev.filter(f => f.selected !== true)); // filter out selected ones
  };

  // Drag and drop
  const handleDragStart = (e, idx) => {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    setFiles(prev => {
       const arr = [...prev];
       const item = arr.splice(draggedIdx, 1)[0];
       arr.splice(targetIdx, 0, item);
       return arr;
    });
    setDraggedIdx(null);
  };

  const splitFiles = async () => {
    if (files.length === 0) return;
    setLoading(true);
    try {
       const payload = files.map(f => ({
          original_file: f.original_file,
          page_num: f.page_num,
          rotation: f.rotation
       }));
       const res = await fetch("/api/split", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pages: payload, interval: interval })
       });
       const data = await res.json();
       if (data.zip_url) {
          setResult({
             url: data.zip_url,
             size: data.zip_size_kb,
             filename: data.zip_url.split('/').pop(),
             parts: (data.parts || []).map(p => ({
                 ...p,
                 url: p.url
             }))
          });
       }
    } catch(e) {
       console.error(e);
    }
    setLoading(false);
  };

  const handleDeletePart = async (partFilename) => {
    if (!result) return;
    const newParts = result.parts.filter(p => p.filename !== partFilename);
    setResult({ ...result, parts: newParts });
    
    // Rebuild zip on server
    try {
        const res = await fetch("/api/rebuild_zip", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ part_names: newParts.map(p => p.filename) })
        });
        const data = await res.json();
        if (data.zip_url) {
           setResult(prev => ({
              ...prev,
              url: data.zip_url,
              size: data.zip_size_kb,
              filename: data.zip_url.split('/').pop()
           }));
        }
    } catch (e) {
        console.error("Rebuild zip hatası:", e);
    }
  };

  const handleSave = async (url) => {
     try {
       const res = await fetch("/api/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_url: url })
       });
       const data = await res.json();
       if (data.error && data.error !== "Cancel edildi.") alert("Saveme hatası: " + data.error);
     } catch (e) {
       console.error("Saveme hatası:", e);
     }
  };

  const [packFormat, setPackFormat] = useState('zip');
  const [isPacking, setIsPacking] = useState(false);

  const handleSaveAll = async () => {
     if (!result || !result.parts) return;
     
     if (packFormat === 'zip') {
         handleSave(result.url);
         return;
     }

     if (packFormat !== 'none') {
         setIsPacking(true);
         try {
             const res = await fetch("/api/pack", {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({
                     file_urls: result.parts.map(p => p.url),
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

     for (const p of result.parts) {
         await handleSave(p.url);
     }
  };

  const getBadgeColor = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return 'bg-pink-100 text-pink-700';
    if (['doc', 'docx'].includes(ext)) return 'bg-indigo-100 text-indigo-700';
    if (['xls', 'xlsx'].includes(ext)) return 'bg-green-100 text-green-700';
    return 'bg-blue-100 text-blue-700';
  };

  if (result) {
    return (
       <div className="h-full flex flex-col relative bg-[#F4F7FB]">
          {/* PDF Part Preview Modal */}
          {previewPartUrl && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4" onClick={() => setPreviewPartUrl(null)}>
               <div className="bg-white rounded p-2 w-full max-w-4xl h-[90vh] shadow-2xl flex flex-col items-center" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center w-full mb-2 px-4 py-2 border-b">
                     <span className="font-medium text-gray-700 truncate">{t("preview")}</span>
                     <button onClick={() => setPreviewPartUrl(null)} className="text-gray-500 hover:text-red-500 font-bold px-2 py-1">{t("close")}</button>
                  </div>
                  <iframe src={previewPartUrl} className="w-full flex-1 border-none bg-gray-200"></iframe>
               </div>
            </div>
          )}
         {/* Top Bar for Results */}
         <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0 z-10 p-4 flex items-center">
           <button onClick={() => setResult(null)} className="flex items-center gap-2 text-gray-700 font-bold hover:text-blue-600 transition-colors">
              <RotateCcw className="w-5 h-5"/> {t("split")}
           </button>
         </div>
         {/* Main Split Layout */}
         <div className="flex-1 flex overflow-hidden">
           {/* Left Side: Files list */}
           <div className="flex-1 overflow-auto p-8 bg-[#F4F7FB]">
              {result.parts.map(part => (
                 <div key={part.filename} className="bg-white p-4 mb-4 shadow-sm border border-gray-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="bg-red-100 p-2 rounded">
                          <FileText className="text-red-600 w-6 h-6"/>
                          <div className="text-[10px] font-bold text-center text-red-600 mt-1">PDF</div>
                       </div>
                       <div>
                          <div className="text-gray-800 font-medium">{part.filename}</div>
                          <div className="text-green-600 text-xs font-bold mt-1">Completed</div>
                       </div>
                    </div>
                    <div className="flex items-center relative">
                       <button onClick={() => handleSave(part.url)} className="w-10 h-10 text-gray-600 hover:bg-gray-100 border border-gray-200 border-r-0 rounded-l-md flex items-center justify-center transition-colors">
                          <Download className="w-5 h-5"/>
                       </button>
                       <button onClick={() => setOpenPartMenu(openPartMenu === part.filename ? null : part.filename)} className="w-10 h-10 text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-r-md flex items-center justify-center transition-colors">
                          <ChevronDown className="w-5 h-5"/>
                       </button>
                       {openPartMenu === part.filename && (
                          <div className="absolute top-full right-0 mt-1 w-36 bg-white border border-gray-200 shadow-lg rounded-md z-50 py-1">
                             <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700 flex items-center gap-2 transition-colors" onClick={() => { 
                                setOpenPartMenu(null);
                                setPreviewPartUrl(part.url);
                             }}>
                                <Search className="w-4 h-4"/> Görüntüle
                             </button>
                             <button className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600 flex items-center gap-2 transition-colors" onClick={() => { handleDeletePart(part.filename); setOpenPartMenu(null); }}>
                                <Trash2 className="w-4 h-4"/> Delete
                             </button>
                          </div>
                       )}
                    </div>
                 </div>
              ))}
           </div>
  
           {/* Right Side: Sidebar */}
           <div className="w-80 bg-white border-l border-gray-200 shadow-sm p-6 flex flex-col items-start justify-start">
              <div className="flex items-center gap-2 mb-2">
                 <div className="bg-green-500 rounded-md p-1"><Check className="text-white w-4 h-4"/></div>
                 <span className="font-bold text-lg text-gray-800">Completed</span>
              </div>
              <div className="text-sm text-gray-600 truncate mb-1 w-full" title={result.filename}>{result.filename}</div>
              <div className="text-sm text-gray-500 mb-6">{result.parts.length} {t("filesCount")}</div>
  
              <div className="w-full mb-4">
                 <label className="block text-sm font-medium text-gray-700 mb-1 text-left">{t("howToDownload")}</label>
                 <select 
                    value={packFormat}
                    onChange={(e) => setPackFormat(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-700 rounded-md px-4 py-3 outline-none focus:border-blue-500 transition-colors text-sm"
                 >
                    <option value="zip">{t("asZipArchive")}</option>
                    <option value="none">{t("saveSeparately")}</option>
                    <option value="iso">{t("asIsoImage")}</option>
                    <option value="pdf">{t("asSinglePdfMerge")}</option>
                 </select>
              </div>

              <button onClick={handleSaveAll} disabled={isPacking} className="w-full bg-blue-600 disabled:bg-gray-400 hover:bg-blue-700 text-white font-semibold py-3 rounded-md transition-colors shadow-sm flex items-center justify-center gap-2 text-base">
                 {isPacking ? <RefreshCw className="animate-spin w-5 h-5" /> : <Download className="w-5 h-5"/>} 
                 {isPacking ? 'Paketleniyor...' : 'Download'}
              </button>
           </div>
         </div>
       </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative bg-[#F4F7FB]">
      
      {/* Hidden file input for middle insertion */}
      <input type="file" ref={fileInputRef} onChange={handleHiddenFileInput} className="hidden" multiple />

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/70 flex items-center justify-center z-[60]">
           <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center border border-gray-200">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
              <p className="font-bold text-gray-700">Processing...</p>
           </div>
        </div>
      )}



      {/* Full Image Preview Modal */}
      {previewModalFile && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4" onClick={() => setPreviewModalFile(null)}>
           <div className="bg-white rounded p-2 max-w-[90vw] max-h-[90vh] overflow-auto shadow-2xl flex flex-col items-center" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center w-full mb-2 px-2 border-b pb-2">
                 <span className="font-medium text-gray-700 truncate">{previewModalFile.name} ({t("page")} {previewModalFile.page_num})</span>
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


      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0 z-10 relative">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-700 font-bold text-lg border-r border-gray-200 pr-4">
              <Scissors className="w-5 h-5 text-gray-600"/> {t("split")}
            </div>
            
            <div className="flex items-center gap-2">
               <button className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md text-sm font-semibold border border-blue-100">
                 <FileText className="w-4 h-4"/> Files
               </button>
            </div>

            <div className="h-6 w-px bg-gray-200 mx-2"></div>

            <div className="relative" ref={ekleMenuRef}>
              <button onClick={() => setEkleMenuOpen(!ekleMenuOpen)} className="flex items-center gap-1 font-medium text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-md text-sm border border-transparent hover:border-gray-200 transition-colors">
                <Plus className="w-4 h-4"/> {t("add")}
              </button>
              {ekleMenuOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 shadow-lg rounded-md z-50 py-1">
                  <button onClick={() => { setEkleMenuOpen(false); if(fileInputRef.current) fileInputRef.current.click(); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 transition-colors">
                    <FileText className="w-4 h-4"/> {t("selectFileFromDevice")}
                  </button>
                  <button onClick={() => { setEkleMenuOpen(false); addBlankPage(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 transition-colors">
                    <File className="w-4 h-4"/> {t("addBlankPage")}
                  </button>
                </div>
              )}
            </div>
            
            <button onClick={rotateSelectedLeft} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 border border-transparent hover:border-gray-200 transition-colors" title={t("rotateLeftAll")}><RotateCcw className="w-4 h-4"/></button>
            <button onClick={rotateSelectedRight} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 border border-transparent hover:border-gray-200 transition-colors" title={t("rotateRightAll")}><RotateCw className="w-4 h-4"/></button>
            <button onClick={deleteSelected} className="p-1.5 hover:bg-red-50 rounded-md text-red-500 border border-transparent hover:border-red-100 transition-colors" title={t("deleteSelected")}><Trash2 className="w-4 h-4"/></button>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300" defaultChecked />
                {t("splitFrequency")}
              </label>
              <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white">
                <button onClick={() => setInterval(Math.max(1, interval - 1))} className="px-3 py-1.5 hover:bg-gray-100 text-gray-600 font-bold border-r border-gray-300">-</button>
                <div className="px-4 py-1.5 text-sm font-semibold text-gray-800 min-w-[3rem] text-center">{interval}</div>
                <button onClick={() => setInterval(interval + 1)} className="px-3 py-1.5 hover:bg-gray-100 text-gray-600 font-bold border-l border-gray-300">+</button>
              </div>
              <span className="text-sm text-gray-600">{t("pages")}</span>
            </div>

            <button onClick={splitFiles} disabled={loading || files.length === 0} className="bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md flex items-center gap-2 text-sm shadow-sm transition-colors">
              Böl ({Math.ceil((files.length || 1) / interval)} PDF) <span className="ml-1">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="p-6 flex-1 overflow-auto">
        {/* Select All Checkbox */}
        {files.length > 0 && (
           <div className="mb-4 flex items-center gap-2 ml-2">
             <input type="checkbox" checked={files.every(f => f.selected)} onChange={toggleSelectAll} className="w-4 h-4 text-blue-600 rounded border-gray-300 cursor-pointer" />
             <label className="text-sm text-gray-700 font-medium cursor-pointer select-none" onClick={() => toggleSelectAll({target: {checked: !files.every(f => f.selected)}})}>{t("selectAll")}</label>
           </div>
        )}

        <div className="flex items-start flex-wrap overflow-y-auto pb-8 pt-4 px-2 min-h-[350px] gap-4">
          {Array.from({ length: Math.ceil(files.length / interval) }).map((_, groupIdx) => {
             const groupFiles = files.slice(groupIdx * interval, (groupIdx + 1) * interval);
             return (
               <React.Fragment key={groupIdx}>
                 <div className="flex flex-col gap-2 max-w-[calc(100vw-300px)]">
                   <div className="text-sm font-bold text-blue-600 mb-1 px-2">{groupIdx + 1}. PDF</div>
                   <div className="flex items-center gap-2 p-3 rounded-xl border-2 border-blue-400 bg-blue-50/30 overflow-x-auto pb-4">
                     {groupFiles.map((file, localIdx) => {
                       const idx = groupIdx * interval + localIdx;
                       return (
                         <div 
                           key={file.id + idx}
                           draggable
                           onDragStart={(e) => handleDragStart(e, idx)}
                           onDragOver={(e) => handleDragOver(e, idx)}
                           onDrop={(e) => handleDrop(e, idx)}
                           className={`flex flex-col items-center gap-3 relative group flex-shrink-0 cursor-grab active:cursor-grabbing rounded-lg p-2 transition-colors ${file.selected ? 'bg-blue-100/60' : 'hover:bg-white/80'}`}
                         >
                            {/* Top left checkbox */}
                            <div className="absolute -top-1 -left-1 z-20">
                               <input type="checkbox" checked={!!file.selected} onChange={() => toggleSelect(idx)} className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded shadow-sm cursor-pointer" />
                            </div>

                            {/* Page Thumbnail Box */}
                            <div className={`relative w-48 h-64 bg-white border ${file.selected ? 'border-blue-400 shadow-md' : 'border-gray-200 shadow-sm'} flex items-center justify-center p-2 overflow-hidden transition-all rounded-md group-hover:shadow-md`}>
                               
                               {/* Hover Toolbar */}
                               <div className="absolute top-2 right-2 z-10 hidden group-hover:flex items-center gap-1 bg-white shadow-md p-1 rounded-md border border-gray-100">
                                  <button onClick={() => setPreviewModalFile(file)} className="p-1.5 hover:bg-gray-100 rounded text-gray-600" title={t("preview")}><Search className="w-4 h-4"/></button>
                                  <button onClick={() => rotate(idx, -90)} className="p-1.5 hover:bg-gray-100 rounded text-gray-600" title={t("rotateLeft")}><RotateCcw className="w-4 h-4"/></button>
                                  <button onClick={() => rotate(idx, 90)} className="p-1.5 hover:bg-gray-100 rounded text-gray-600" title={t("rotateRight")}><RotateCw className="w-4 h-4"/></button>
                                  <button onClick={() => removeFile(idx)} className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Delete"><Trash2 className="w-4 h-4"/></button>
                               </div>

                               <img onClick={() => setPreviewModalFile(file)} src={file.preview} alt={file.name} style={{ transform: `rotate(${file.rotation}deg)` }} className="max-w-full max-h-full object-contain transition-transform cursor-pointer" draggable="false" />
                            </div>
                            
                            {/* Number and Label */}
                            <div className="flex flex-col items-center gap-1.5 w-full mt-1">
                              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shadow-sm">
                                {idx + 1}
                              </div>
                              <div className={`px-3 py-1.5 ${getBadgeColor(file.name)} text-[11px] font-semibold rounded-md truncate w-full text-center max-w-[192px] uppercase tracking-wide`}>
                                {file.name}
                              </div>
                            </div>
                         </div>
                       );
                     })}
                   </div>
                 </div>

                 {/* Scissors Icon Between Groups */}
                 {groupIdx < Math.ceil(files.length / interval) - 1 && (
                    <div className="flex-shrink-0 flex flex-col items-center justify-center w-12 z-10 relative">
                       <div className="w-px h-16 border-l-2 border-dashed border-gray-300"></div>
                       <div className="w-10 h-10 rounded-full bg-white border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 shadow-sm z-10 bg-clip-padding">
                          <Scissors className="w-5 h-5 -rotate-90"/>
                       </div>
                       <div className="w-px h-16 border-l-2 border-dashed border-gray-300"></div>
                    </div>
                 )}
               </React.Fragment>
             );
          })}

          {/* End Add Button */}
          <div {...getRootProps()} className="flex-shrink-0 w-48 h-64 border-2 border-blue-300 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-all p-4 text-center ml-4 bg-white/50 self-end mb-11">
            <input {...getInputProps()} />
            <div className="w-12 h-12 rounded-full border border-blue-200 flex items-center justify-center mb-4 text-blue-500 bg-blue-50 shadow-sm">
               <Plus className="w-6 h-6" />
            </div>
            <p className="text-sm text-blue-600 font-medium leading-relaxed px-2">{t("addFilesDropzone")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

