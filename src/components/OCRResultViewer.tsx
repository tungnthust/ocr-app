import { useEffect, useRef } from 'react';
import { Element } from '@/types/ocr';

interface OCRResultViewerProps {
  elements: Element[];
  onElementHover: (element: Element | null) => void;
  hoveredElement: Element | null;
  viewMode?: 'markdown' | 'json';
}

export default function OCRResultViewer({ elements, onElementHover, hoveredElement, viewMode = 'markdown' }: OCRResultViewerProps) {
  const elementRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Listen for click events from UploadFileViewer
  useEffect(() => {
    const handleClick = (e: CustomEvent) => {
      const element = e.detail;
      const key = `${element.type}-${element.bbox?.join('-')}-${element.content || ''}`;
      const ref = elementRefs.current[key];

      if (ref) {
        ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
        ref.classList.add('highlight');
        setTimeout(() => ref.classList.remove('highlight'), 2000); // Auto-remove highlight
      }
    };

    window.addEventListener('elementClick', handleClick as EventListener);
    return () => {
      window.removeEventListener('elementClick', handleClick as EventListener);
    };
  }, []);
  // Add global event listeners for cell hover events
  useEffect(() => {
    const handleCellHover = (e: CustomEvent) => onElementHover(e.detail);
    const handleCellLeave = () => onElementHover(null);

    window.addEventListener('cellHover', handleCellHover as EventListener);
    window.addEventListener('cellLeave', handleCellLeave);

    return () => {
      window.removeEventListener('cellHover', handleCellHover as EventListener);
      window.removeEventListener('cellLeave', handleCellLeave);
    };
  }, [onElementHover]);

  const renderTable = (element: Element, index: number) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(element.html || '', 'text/html');
    
    // Add event listeners to all cells
    doc.querySelectorAll('td, th').forEach((cell) => {
      const bbox = cell.getAttribute('data-bbox');
      if (bbox) {
        const [x, y, width, height] = bbox.split(',').map(Number);
        
        // Add hover handlers
        cell.setAttribute('onmouseenter', `this.classList.add('hovered'); window.dispatchEvent(new CustomEvent('cellHover', { detail: { bbox: [${x},${y},${width},${height}], content: this.textContent, type: 'table-cell' } }))`);
        cell.setAttribute('onmouseleave', `this.classList.remove('hovered'); window.dispatchEvent(new CustomEvent('cellLeave'))`);
        
        // Check if this cell is currently hovered
        if (hoveredElement?.type === 'table-cell' && 
            hoveredElement.bbox.toString() === [x,y,width,height].toString()) {
          cell.classList.add('hovered');
        }
      }
    });

    return (
      <div key={index} className="mb-4 overflow-x-auto">
        <style>
          {`
            .ocr-table table {
              border-collapse: collapse;
              width: 100%;
              margin: 8px 0;
            }
            .ocr-table td, .ocr-table th {
              border: 1px solid #ccc;
              padding: 8px;
              text-align: left;
              transition: all 0.2s;
              position: relative;
            }
            .ocr-table td.hovered, .ocr-table th.hovered {
              background-color: rgba(59, 130, 246, 0.1);
            }
            .ocr-table td:hover, .ocr-table th:hover {
              background-color: rgba(59, 130, 246, 0.05);
            }
          `}
        </style>
        <div className="ocr-table">
          <div dangerouslySetInnerHTML={{ __html: doc.body.innerHTML }} />
        </div>
      </div>
    );
  };

  const renderElement = (element: Element, index: number) => {
    const key = `${element.type}-${element.bbox?.join('-')}-${element.content || ''}`;

    if (element.type === 'text') {
      return (
        <div
          key={key}
          ref={(el) => (elementRefs.current[key] = el)}
          className={`mb-2 p-2 rounded cursor-pointer transition-colors ${
            hoveredElement === element ? 'bg-blue-50' : 'hover:bg-blue-50/50'
          }`}
          onMouseEnter={() => onElementHover(element)}
          onMouseLeave={() => onElementHover(null)}
          onClick={() => {
          window.dispatchEvent(new CustomEvent('elementOCRClick', { detail: element }));
        }}
        >
          {element.content}
        </div>
      );
    } else if (element.type === 'table') {
      return renderTable(element, index);
    }
    return null;
  };

  if (viewMode === 'json') {
    return (
      <div className="h-full overflow-auto">
        <pre className="p-4 bg-gray-50 rounded-md">
          <code className="text-sm">{JSON.stringify(elements, null, 2)}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      {elements.map((element, index) => renderElement(element, index))}
    </div>
  );
}