import { useState, useRef } from 'react';
import { UploadCloud, Copy, Check, RefreshCw, FileText } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function ImageToTextPage() {
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const { t } = useLanguage();

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setFileUrl(URL.createObjectURL(selected));
      setText('');
      setError('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const selected = e.dataTransfer.files[0];
    if (selected && selected.type.startsWith('image/')) {
      setFile(selected);
      setFileUrl(URL.createObjectURL(selected));
      setText('');
      setError('');
    }
  };

  const runOcr = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/image_to_text", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setText(data.text || t('noTextFound'));
      } else {
        setError(data.error || t('ocrFailed'));
      }
    } catch (e) {
      setError(t('connectionError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setFile(null);
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl(null);
    setText('');
    setError('');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">{t('imageToTextTitle')}</h1>
          <p className="mt-2 text-slate-500">{t('imageToTextDesc')}</p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left panel: Upload and Preview */}
          <div className="flex flex-col gap-6">
            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-3xl p-12 bg-white hover:bg-slate-55 cursor-pointer transition-all hover:border-blue-500 group shadow-sm min-h-[350px]"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-8 h-8 text-blue-500" />
                </div>
                <span className="text-lg font-bold text-slate-700">{t('uploadOrDrag')}</span>
                <span className="text-sm text-slate-400 mt-2">{t('formatSupported')}</span>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center min-h-[350px] relative">
                <button
                  onClick={reset}
                  className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                <div className="max-h-[280px] w-full flex items-center justify-center overflow-hidden rounded-2xl bg-slate-100 border border-slate-150 mb-6">
                  <img src={fileUrl} alt="Preview" className="max-h-[280px] object-contain" />
                </div>
                {!text && !loading && (
                  <button
                    onClick={runOcr}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/35 flex items-center justify-center gap-2"
                  >
                    {t('extractText')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right panel: Result */}
          <div className="flex flex-col bg-white border border-slate-200 rounded-3xl p-6 shadow-sm min-h-[350px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" /> {t('extractedText')}
              </h2>
              {text && (
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    copied
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" /> {t('copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> {t('copy')}
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex-1 flex flex-col relative min-h-[220px]">
              {loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
                  <div className="relative w-16 h-16 mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-pulse"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                  </div>
                  <span className="font-bold text-slate-700">{t('resolvingText')}</span>
                  <span className="text-xs text-slate-400 mt-1">{t('ocrAnalysis')}</span>
                </div>
              ) : null}

              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100 mb-4">
                  {error}
                </div>
              )}

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('textPlaceholder')}
                className="w-full flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-sm leading-relaxed text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none min-h-[200px]"
                readOnly={loading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
