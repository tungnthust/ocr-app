'use client';

import { useState, useCallback } from 'react';
import FileUploader from '@/components/FileUploader';
import UploadFileViewer from '@/components/UploadFileViewer';
import OCRResultViewer from '@/components/OCRResultViewer';
import type { Element, OCRResult } from '@/types/ocr';

export default function Home() {
  const [viewMode, setViewMode] = useState<'markdown' | 'json'>('markdown');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [hoveredElement, setHoveredElement] = useState<Element | null>(null);

  const handleSetCurrentPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePagesChange = useCallback((count: number) => {
    setTotalPages(count);
  }, []);

  const handleElementHover = useCallback((element: Element | null) => {
    setHoveredElement(element);
  }, []);

  const checkFileType = (file: File): 'pdf' | 'image' | null => {
    const isPDF = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    if (isPDF) return 'pdf';
    if (isImage) return 'image';
    return null;
  };

  const handleFileUpload = (file: File) => {
    // Validate file type
    const fileType = checkFileType(file);
    
    if (!fileType) {
      alert('Please upload a PDF or image file (JPG, PNG, JPEG)');
      return;
    }

    // Cleanup previous URL if it exists
    if (pdfUrl.startsWith('blob:')) {
      URL.revokeObjectURL(pdfUrl);
    }

    // Create URL and update state
    const url = URL.createObjectURL(file);
    setFile(file);
    setPdfUrl(url);
    setOcrResult(null);
    setCurrentPage(0); // Reset to first page for new files
  };

  const handleExtract = async () => {
    if (!file) return;

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('render_html', 'true');

    try {
      const response = await fetch('http://27.66.108.30:7866/extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('OCR request failed');

      const result = await response.json();
      setOcrResult(result);
      setCurrentPage(0);
    } catch (error) {
      console.error('Error during OCR:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F6F5F3] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#32323220] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-[#323232]">VTS Document Extraction</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="px-4 py-2 text-[#323232] hover:text-[#D90000]">View Pricing</button>
          <button className="px-4 py-2 bg-[#D90000] text-white rounded-md hover:bg-[#D90000]/90">API Docs</button>
        </div>
      </header>
      
      {/* Main content */}
      <div className="flex-1 container mx-auto px-6 py-4">
        {!file ? (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
            <FileUploader onFileUpload={handleFileUpload} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => {
                  if (pdfUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(pdfUrl);
                  }
                  setFile(null);
                  setPdfUrl('');
                  setOcrResult(null);
                }}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                </svg>
                Upload New File
              </button>
            </div>

            {/* Main content area with fixed height */}
            <div className="h-[calc(100vh-12rem)] flex gap-6">
              {/* Left side - Original document viewer */}
              <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {!file?.type.startsWith('image/') && (
                      <>
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                          disabled={currentPage === 0}
                          className="p-2 hover:bg-gray-100 rounded-md disabled:opacity-50"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-600">Page</span>
                          <input
                            type="number"
                            min={1}
                            value={currentPage + 1}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) - 1;
                              if (!isNaN(value)) {
                                setCurrentPage(Math.max(0, Math.min(value, totalPages - 1)));
                              }
                            }}
                            className="w-12 px-1 py-0.5 text-sm text-center border rounded"
                          />
                          <span className="text-sm text-gray-600">of</span>
                          <span className="text-sm text-gray-600">{totalPages}</span>
                        </div>
                        <button
                          onClick={() => setCurrentPage(prev => prev + 1)}
                          disabled={currentPage >= totalPages - 1}
                          className="p-2 hover:bg-gray-100 rounded-md disabled:opacity-50"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  <UploadFileViewer
                    result={ocrResult}
                    currentPage={currentPage}
                    setCurrentPage={handleSetCurrentPage}
                    pdfUrl={pdfUrl}
                    showBoundingBoxes={showBoundingBoxes}
                    hoveredElement={hoveredElement}
                    onElementHover={handleElementHover}
                    onPagesChange={handlePagesChange}
                  />
                </div>
              </div>

              {/* Right side - OCR results */}
              <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode('markdown')}
                      className={`px-3 py-1 text-sm font-medium rounded-md ${
                        viewMode === 'markdown'
                          ? 'bg-[#D90000]/10 text-[#D90000]'
                          : 'text-[#323232] hover:text-[#D90000]'
                      }`}
                    >
                      Markdown
                    </button>
                    <button
                      onClick={() => setViewMode('json')}
                      className={`px-3 py-1 text-sm font-medium rounded-md ${
                        viewMode === 'json'
                          ? 'bg-[#D90000]/10 text-[#D90000]'
                          : 'text-[#323232] hover:text-[#D90000]'
                      }`}
                    >
                      JSON
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExtract}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-[#D90000] text-white text-sm font-medium rounded-md hover:bg-[#D90000]/90 disabled:opacity-50"
                    >
                      {isProcessing ? 'Processing...' : 'Extract'}
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  {isProcessing ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                    </div>
                  ) : ocrResult && ocrResult.result.pages[currentPage] ? (
                    <OCRResultViewer
                      elements={ocrResult.result.pages[currentPage].elements}
                      onElementHover={setHoveredElement}
                      hoveredElement={hoveredElement}
                      viewMode={viewMode}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      Click "Extract" to process the document
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
