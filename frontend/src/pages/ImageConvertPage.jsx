import React from 'react';
import { useNavigate } from 'react-router-dom';
import { imageConvertItems } from '../tools';
import { useLanguage } from '../i18n/LanguageContext';

export default function ImageConvertPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleButtonClick = (task) => {
     navigate(`/workspace/${task.id}`);
  };

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="mx-auto w-full max-w-[1880px] px-10 py-7">
        <section>
          <h2 className="mb-5 border-b border-gray-300 pb-3 text-xl font-bold text-gray-700">
            {t('imageConvert')}
          </h2>
          <div className="grid grid-cols-1 gap-x-14 gap-y-3 sm:grid-cols-2 2xl:grid-cols-3">
            {imageConvertItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleButtonClick(item)}
                className="group flex min-h-10 items-center gap-3 rounded-md px-2 text-left transition-colors hover:bg-blue-50"
              >
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center [&_svg]:h-6 [&_svg]:w-6">
                  {item.icon}
                </span>
                <span className="text-[17px] font-medium leading-tight text-gray-700 group-hover:text-blue-700">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
