import { useNavigate } from 'react-router-dom';
import { toPdfItems, fromPdfItems, imageConvertItems } from '../tools';
import { ScanText } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function ConvertPage() {
  const navigate = useNavigate();
  const { t, tl } = useLanguage();

  const toPdfOrder = [
    'word_to_pdf',
    'png_to_pdf',
    'docx_to_pdf',
    'ppt_to_pdf',
    'tiff_to_pdf',
    'jpg_to_pdf',
    'excel_to_pdf',
    'heic_to_pdf',
    'webp_to_pdf',
  ];

  const fromPdfOrder = [
    'pdf_ocr',
    'pdf_to_jpg',
    'pdf_to_excel',
    'pdf_to_word',
    'pdf_to_ppt',
    'pdf_to_png',
    'pdf_to_docx',
    'pdf_to_txt',
    'pdf_to_odt',
    'pdf_to_ods',
    'pdf_to_odp',
  ];

  const sortByOrder = (items, order) => {
    const position = new Map(order.map((id, index) => [id, index]));
    return [...items].sort((a, b) => {
      const aPos = position.has(a.id) ? position.get(a.id) : Number.MAX_SAFE_INTEGER;
      const bPos = position.has(b.id) ? position.get(b.id) : Number.MAX_SAFE_INTEGER;
      return aPos - bPos;
    });
  };

  const handleButtonClick = (task) => {
     navigate(`/workspace/${task.id}`);
  };

  const pdfFromItems = fromPdfItems.filter((item) => item.id.startsWith('pdf_'));
  const extraItems = fromPdfItems.filter((item) => !item.id.startsWith('pdf_'));

  const renderToolList = (items) => (
    <div className="grid grid-cols-1 gap-x-14 gap-y-3 sm:grid-cols-2 2xl:grid-cols-3">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => handleButtonClick(item)}
          className="group flex min-h-10 items-center gap-3 rounded-md px-2 text-left transition-colors hover:bg-blue-50"
        >
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center [&_svg]:h-6 [&_svg]:w-6">
            {item.icon}
          </span>
          <span className="text-[17px] font-medium leading-tight text-gray-700 group-hover:text-blue-700">
            {item.label || tl(item.id)}
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="mx-auto w-full max-w-[1880px] px-10 py-7">
        <div className="grid grid-cols-1 gap-14 xl:grid-cols-2">
          <section>
            <h2 className="mb-5 border-b border-gray-300 pb-3 text-xl font-bold text-gray-700">
              {t('convertToPdf')}
            </h2>
            {renderToolList(sortByOrder(toPdfItems, toPdfOrder))}
          </section>

          <section>
            <h2 className="mb-5 border-b border-gray-300 pb-3 text-xl font-bold text-gray-700">
              {t('convertFromPdf')}
            </h2>
            {renderToolList(sortByOrder(pdfFromItems, fromPdfOrder))}
          </section>
        </div>

        <div className="grid grid-cols-1 gap-14 xl:grid-cols-2 mt-14">
          <section>
            <h2 className="mb-5 border-b border-gray-300 pb-3 text-xl font-bold text-gray-700">
              {t('imageConvert')}
            </h2>
            {renderToolList(imageConvertItems)}
          </section>

          <section>
            <h2 className="mb-5 border-b border-gray-300 pb-3 text-xl font-bold text-gray-700">
              {t('imageToText')}
            </h2>
            <div className="grid grid-cols-1 gap-x-14 gap-y-3 sm:grid-cols-2 2xl:grid-cols-3">
              <button
                onClick={() => navigate('/image-to-text')}
                className="group flex min-h-10 items-center gap-3 rounded-md px-2 text-left transition-colors hover:bg-blue-50"
              >
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center [&_svg]:h-6 [&_svg]:w-6">
                  <ScanText className="text-blue-500 w-6 h-6" />
                </span>
                <span className="text-[17px] font-medium leading-tight text-gray-700 group-hover:text-blue-700">
                  {t('extractTextOCR')}
                </span>
              </button>
            </div>
          </section>
        </div>

        <div className="mt-14 max-w-[820px]">
          <div>
            <h2 className="mb-5 border-b border-gray-300 pb-3 text-xl font-bold text-gray-700">
              {t('additionalTools')}
            </h2>
            {renderToolList(extraItems)}
          </div>
        </div>
      </div>
    </div>
  );
}
