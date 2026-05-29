import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ConvertPage from './pages/ConvertPage';
import MergePage from './pages/MergePage';
import SplitPage from './pages/SplitPage';
import CompressPage from './pages/CompressPage';
import WorkspacePage from './pages/WorkspacePage';
import IsoPage from './pages/IsoPage';
import ImageConvertPage from './pages/ImageConvertPage';
import ImageToTextPage from './pages/ImageToTextPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ConvertPage />} />
          <Route path="merge" element={<MergePage />} />
          <Route path="split" element={<SplitPage />} />
          <Route path="compress" element={<CompressPage />} />
          <Route path="iso" element={<IsoPage />} />
          <Route path="image-convert" element={<ImageConvertPage />} />
          <Route path="image-to-text" element={<ImageToTextPage />} />
          <Route path="workspace/:taskId" element={<WorkspacePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
