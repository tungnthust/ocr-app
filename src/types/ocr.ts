export interface BoundingBox {
  bbox: [number, number, number, number];
  content: string;
}

export interface TableCell extends BoundingBox {
}

export interface Element {
  type: 'text' | 'table' | 'table-cell';
  bbox: [number, number, number, number];
  content?: string;
  html?: string;
  cells?: TableCell[];
}

export interface Page {
  page_num: number;
  page_width: number;
  page_height: number;
  elements: Element[];
}

export interface OCRResult {
  result: {
    num_pages: number;
    pages: Page[];
    process_time: number;
  };
}
