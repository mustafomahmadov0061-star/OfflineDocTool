import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Disc, FolderOpen } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function IsoPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const tools = [
    {
      id: 'make_iso',
      icon: <Disc className="text-indigo-500 w-12 h-12" />,
      titleKey: "createIso",
      descKey: "createIsoDesc"
    },
    {
      id: 'extract_iso',
      icon: <FolderOpen className="text-amber-500 w-12 h-12" />,
      titleKey: "extractIso",
      descKey: "extractIsoDesc"
    }
  ];

  return (
    <div className="h-full overflow-y-auto bg-slate-50 flex items-center justify-center p-8">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('isoTools')}</h2>
        <p className="text-gray-500 mb-10">{t('isoDesc')}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => navigate(`/workspace/${tool.id}`)}
              className="flex flex-col items-center text-center p-8 border border-gray-100 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group bg-slate-50/50 hover:bg-white"
            >
              <div className="p-4 bg-white rounded-2xl shadow-sm mb-6 group-hover:scale-105 transition-transform">
                {tool.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                {t(tool.titleKey)}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                {t(tool.descKey)}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
