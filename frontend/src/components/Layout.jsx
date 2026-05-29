import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { FileText, Globe } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function Layout() {
  const location = useLocation();
  const isWorkspace = location.pathname.startsWith('/workspace/');
  const { lang, toggleLang, t } = useLanguage();

  return (
    <div className="h-screen min-h-0 overflow-hidden flex flex-col bg-slate-50 text-slate-800">
      {!isWorkspace && (
        <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="text-red-500 w-8 h-8" />
            <h1 className="text-xl font-bold text-gray-800">{t('appTitle')}</h1>
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-6 font-medium text-gray-600">
              <NavLink to="/" className={({isActive}) => isActive ? "text-blue-600 border-b-2 border-blue-600 pb-1" : "hover:text-blue-600 pb-1"}>
                 {t('navConvert')}
              </NavLink>
              <NavLink to="/merge" className={({isActive}) => isActive ? "text-blue-600 border-b-2 border-blue-600 pb-1" : "hover:text-blue-600 pb-1"}>
                 {t('navMerge')}
              </NavLink>
              <NavLink to="/split" className={({isActive}) => isActive ? "text-blue-600 border-b-2 border-blue-600 pb-1" : "hover:text-blue-600 pb-1"}>
                 {t('navSplit')}
              </NavLink>
              <NavLink to="/compress" className={({isActive}) => isActive ? "text-blue-600 border-b-2 border-blue-600 pb-1" : "hover:text-blue-600 pb-1"}>
                 {t('navCompress')}
              </NavLink>
              <NavLink to="/iso" className={({isActive}) => isActive ? "text-blue-600 border-b-2 border-blue-600 pb-1" : "hover:text-blue-600 pb-1"}>
                 {t('navISO')}
              </NavLink>
              <NavLink to="/image-convert" className={({isActive}) => isActive ? "text-blue-600 border-b-2 border-blue-600 pb-1" : "hover:text-blue-600 pb-1"}>
                 {t('navImageConvert')}
              </NavLink>
              <NavLink to="/image-to-text" className={({isActive}) => isActive ? "text-blue-600 border-b-2 border-blue-600 pb-1" : "hover:text-blue-600 pb-1"}>
                 {t('navImageToText')}
              </NavLink>
            </nav>
            
            {/* Language Toggle Button */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-2 ml-4 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 transition-all text-sm font-semibold text-gray-700 hover:text-blue-700 shadow-sm"
              title={lang === 'tr' ? 'Switch to English' : "Türkçe'ye geç"}
            >
              <Globe className="w-4 h-4" />
              <span>{lang === 'tr' ? 'EN' : 'TR'}</span>
            </button>
          </div>
        </header>
      )}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white">
        <Outlet />
      </main>
    </div>
  );
}
