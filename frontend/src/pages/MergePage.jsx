import React, { useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Plus, RotateCcw, RotateCw, Trash2, Download, Search, FileText, File } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function MergePage() {
    const { t, tl } = useLanguage();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [previewModalFile, setPreviewModalFile] = useState(null);
  const [insertIndex, setInsertIndex] = useState(null);
  const [ekleMenuOpen, setEkleMenuOpen] = useState(false);
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

  const mergeFiles = async () => {
    if (files.length === 0) return;
    setLoading(true);
    try {
       const payload = files.map(f => ({
          original_file: f.original_file,
          page_num: f.page_num,
          rotation: f.rotation
       }));
       const res = await fetch("/api/merge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pages: payload })
       });
       const data = await res.json();
       if (data.url) {
          setResult({
             url: data.url,
             size: data.size_kb,
             filename: data.url.split('/').pop()
          });
       }
    } catch(e) {
       console.error(e);
    }
    setLoading(false);
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

  const [packFormat, setPackFormat] = useState('none');
  const [isPacking, setIsPacking] = useState(false);

  const handleSaveResult = async () => {
     if (!result) return;
     if (packFormat !== 'none') {
         setIsPacking(true);
         try {
             const res = await fetch("/api/pack", {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({
                     file_urls: [result.url],
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

     await handleSave(result.url);
  };

  const getBadgeColor = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return 'bg-pink-100 text-pink-700';
    if (['doc', 'docx'].includes(ext)) return 'bg-indigo-100 text-indigo-700';
    if (['xls', 'xlsx'].includes(ext)) return 'bg-green-100 text-green-700';
    return 'bg-blue-100 text-blue-700';
  };

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

      {/* Result Modal */}
      {result && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center border border-gray-200 max-w-sm w-full">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                 <Download className="text-green-600 w-8 h-8" />
              </div>
              <h3 className="font-bold text-gray-800 text-xl">{t("mergeSuccess")}</h3>
              <p className="text-sm text-gray-500 mt-2 text-center">{t("mergeSuccessDesc")}</p>
              
              <div className="bg-gray-50 w-full mt-6 p-4 rounded-lg border border-gray-100 text-sm">
                 <div className="flex justify-between text-gray-500 mb-2"><span>{t("file")}:</span> <span className="font-medium text-gray-700 truncate max-w-[150px]">{result.filename}</span></div>
                 <div className="flex justify-between text-gray-500"><span>{t("size")}:</span> <span className="font-medium text-gray-700">{result.size ? result.size + ' KB' : 'Bilinmiyor'}</span></div>
              </div>
              
              <div className="flex flex-col w-full gap-3 mt-6">
                 <div className="w-full mb-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-left">{t("howToDownload")}</label>
                    <select 
                       value={packFormat}
                       onChange={(e) => setPackFormat(e.target.value)}
                       className="w-full bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors text-sm"
                    >
                       <option value="none">{t("asPdfOnly")}</option>
                       <option value="zip">{t("asZipArchive")}</option>
                       <option value="iso">{t("asIsoImage")}</option>
                    </select>
                 </div>

                 <button onClick={handleSaveResult} disabled={isPacking} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm">
                    {isPacking ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Download size={20} />} 
                    {isPacking ? 'Paketleniyor...' : 'Bilgisayara Save'}
                 </button>
                 <button onClick={() => { setResult(null); setFiles([]); }} className="w-full bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2">
                    {t("newMerge")}
                 </button>
                 <button onClick={() => setResult(null)} className="w-full bg-transparent hover:bg-gray-100 text-gray-500 font-medium py-2 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 mt-1">
                    {t("goBack")}
                 </button>
              </div>
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
              <RotateCcw className="w-5 h-5 text-gray-600"/> Merge
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

          <div>
            <button onClick={mergeFiles} disabled={loading || files.length === 0} className="bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md flex items-center gap-2 text-sm shadow-sm transition-colors">
              <Download className="w-4 h-4"/>
              {t("export")}
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

        <div className="flex items-start justify-start flex-wrap overflow-y-auto pb-8 pt-4 px-2 min-h-[350px] gap-y-6">
          {files.map((file, idx) => (
            <React.Fragment key={file.id + idx}>
              <div 
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                className={`flex flex-col items-center gap-3 relative group flex-shrink-0 cursor-grab active:cursor-grabbing rounded-lg p-3 pt-4 transition-colors ${file.selected ? 'bg-blue-50/50' : 'hover:bg-gray-100/50'}`}
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
                   <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 text-xs font-bold flex items-center justify-center shadow-sm">
                     {idx + 1}
                   </div>
                   <div className={`px-3 py-1.5 ${getBadgeColor(file.name)} text-[11px] font-semibold rounded-md truncate w-full text-center max-w-[192px] uppercase tracking-wide`}>
                     {file.name}
                   </div>
                 </div>
              </div>

              {/* Plus Button Between Pages */}
              <div className="flex-shrink-0 flex items-center justify-center w-12 z-10 relative group/plus">
                 <button onClick={() => insertAtIndex(idx + 1)} className="w-8 h-8 rounded-full bg-blue-50 text-blue-400 border border-blue-100 group-hover/plus:bg-blue-500 group-hover/plus:text-white group-hover/plus:border-blue-500 flex items-center justify-center transition-all shadow-sm">
                    <Plus className="w-5 h-5"/>
                 </button>
              </div>
            </React.Fragment>
          ))}

          {/* End Add Button */}
          <div {...getRootProps()} className="flex-shrink-0 w-48 h-64 border-2 border-blue-300 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-all p-4 text-center ml-2 bg-white/50">
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
