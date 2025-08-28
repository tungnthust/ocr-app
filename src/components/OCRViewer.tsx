'use client';

import { useState, useRef, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Element, OCRResult, Page } from '@/types/ocr';

interface OCRViewerProps {
  result: OCRResult | null;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pdfUrl: string;
  showBoundingBoxes: boolean;
  hoveredElement: Element | null;
  onElementHover: (element: Element | null) => void;
  onPagesChange?: (count: number) => void;
}

export default function OCRViewer({ result, currentPage, setCurrentPage, pdfUrl, showBoundingBoxes, hoveredElement, onElementHover, onPagesChange = () => {} }: OCRViewerProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loadError, setLoadError] = useState<string>('');
  const [imageWidth, setImageWidth] = useState<number | null>(null);
  const [imageHeight, setImageHeight] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    let currentRenderTask: any = null;

    const checkIsImage = async (url: string): Promise<boolean> => {
      // First check by URL pattern
      if (/\.(jpe?g|png|gif|bmp|webp)$/i.test(url)) {
        return true;
      }
      
      // For blob URLs, we need to check the mime type
      if (url.startsWith('blob:')) {
        try {
          const response = await fetch(url);
          const contentType = response.headers.get('content-type');
          return contentType?.startsWith('image/') || false;
        } catch {
          return false;
        }
      }
      
      return false;
    };

    const loadFile = async () => {
      if (!pdfUrl) return;

      try {
        setLoadError('');
        setImageUrl('');
        
        // First determine if this is an image
        const isImage = await checkIsImage(pdfUrl);

        if (isImage) {
          // For images, display at original pixel dimensions
          const img = new Image();
          img.onload = () => {
            if (!isMounted) return;
            setImageWidth(img.naturalWidth);
            setImageHeight(img.naturalHeight);
            setImageUrl(pdfUrl);
            onPagesChange(1);
          };
          img.onerror = () => {
            if (!isMounted) return;
            setLoadError('Failed to load image');
          };
          img.src = pdfUrl;
          return;
        }

        // For PDFs, use the PDF.js rendering
        if (currentRenderTask) {
          currentRenderTask.cancel();
        }
        if (pdfDocRef.current) {
          pdfDocRef.current.destroy();
        }

        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

        try {
          pdfDocRef.current = await pdfjsLib.getDocument(pdfUrl).promise;
          if (!isMounted) return;

          onPagesChange(pdfDocRef.current.numPages);
          
          if (currentPage >= pdfDocRef.current.numPages) {
            setCurrentPage(Math.max(0, pdfDocRef.current.numPages - 1));
            return;
          }

          const pdfPage = await pdfDocRef.current.getPage(currentPage + 1);
          if (!isMounted) return;

          const viewport = pdfPage.getViewport({ scale: 1.0 });
          const canvas = canvasRef.current;
          if (!canvas || !isMounted) return;

          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          currentRenderTask = pdfPage.render({
            canvasContext: ctx,
            viewport,
            background: 'rgb(255,255,255)',
            intent: 'display'
          });

          await currentRenderTask.promise;
          if (!isMounted) return;
          
          setImageWidth(canvas.width);
          setImageHeight(canvas.height);
          setImageUrl(canvas.toDataURL());
          setLoadError('');
          
          pdfPage.cleanup();
        } catch (error: any) {
          console.error('Error loading PDF:', error);
          if (isMounted) {
            setLoadError('Error loading PDF file: ' + (error.message || ''));
          }
        }
      } catch (error: any) {
        console.error('Error loading file:', error);
        if (isMounted) {
          setLoadError('Error loading file: ' + (error.message || ''));
        }
      }
    };

    loadFile();

    return () => {
      isMounted = false;
      if (currentRenderTask) {
        currentRenderTask.cancel();
      }
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
      }
      setImageUrl('');
      setLoadError('');
      setImageWidth(null);
      setImageHeight(null);
    };
  }, [pdfUrl, currentPage, onPagesChange, setCurrentPage]);

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="hidden" />
      {loadError ? (
        <div className="p-4 text-red-500">{loadError}</div>
      ) : (
        <TransformWrapper
            wheel={{ 
              step: 0.1,
              wheelDisabled: true,
              activationKeys: ['Control']
            }}
            doubleClick={{ disabled: true }}
          >
          <TransformComponent
            wrapperStyle={{ width: "100%", height: "100%", overflow: "auto" }}
          >
            {imageUrl && imageWidth != null && imageHeight != null && (
              <div className="w-full flex justify-center">
                <div
                  className="relative bg-white"
                  style={{ width: imageWidth, height: imageHeight }}
                >
                  <img
                    src={imageUrl}
                    alt={`Page ${currentPage + 1}`}
                    style={{ width: imageWidth, height: imageHeight, display: 'block' }}
                  />
                  {showBoundingBoxes && result && result.result.pages[currentPage]?.elements && (
                    <div
                      className="pointer-events-none"
                      style={{ position: 'absolute', inset: 0 }}
                    >
                      {result.result.pages[currentPage].elements.flatMap((element: Element, index: number) => {
                        const boxes = [];
                        // Handle regular element bounding box
                        if (element.type === 'text' || (element.type === 'table' && !element.cells)) {
                          const [x, y, width, height] = element.bbox;
                          const isHovered = hoveredElement === element;
                          boxes.push(
                              <div
                                key={`element-${index}`}
                                className={`absolute transition-all duration-200 mix-blend-multiply ${
                                  isHovered 
                                    ? 'border-2 border-blue-500 bg-blue-200 bg-opacity-30' 
                                    : 'border border-blue-500'
                                }`}
                                style={{
                                  left: x,
                                  top: y,
                                  width: width - x,
                                  height: height - y,
                                  pointerEvents: 'auto',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={() => onElementHover(element)}
                                onMouseLeave={() => onElementHover(null)}
                                onClick={() => {
                                  window.dispatchEvent(new CustomEvent('elementClick', { detail: element }));
                                }}
                              />
                            );
                        }

                        // Handle table cells if they exist
                        if (element.type === 'table' && element.cells) {
                          element.cells.forEach((cell, cellIndex) => {
                            const [x, y, width, height] = cell.bbox;
                            const isHovered = hoveredElement && 
                              hoveredElement.type === 'table-cell' && 
                              hoveredElement.bbox.toString() === cell.bbox.toString();
                            
                            boxes.push(
                                <div
                                  key={`cell-${index}-${cellIndex}`}
                                  className={`absolute transition-all duration-200 mix-blend-multiply ${
                                    isHovered 
                                      ? 'border-2 border-blue-500 bg-blue-200 bg-opacity-30' 
                                      : 'border border-blue-500'
                                  }`}
                                  style={{
                                    left: x,
                                    top: y,
                                    width: width - x,
                                    height: height - y,
                                    pointerEvents: 'auto',
                                    cursor: 'pointer'
                                  }}
                                  onMouseEnter={() => onElementHover({
                                    type: 'table-cell',
                                    bbox: cell.bbox,
                                    content: cell.content
                                  })}
                                  onMouseLeave={() => onElementHover(null)}
                                  onClick={() => {
                                    window.dispatchEvent(new CustomEvent('elementClick', {
                                      detail: {
                                        type: 'table-cell',
                                        bbox: cell.bbox,
                                        content: cell.content
                                      }
                                    }));
                                  }}
                                />
                              );
                          });
                        }
                        return boxes;
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </TransformComponent>
        </TransformWrapper>
      )}
    </div>
  );
}