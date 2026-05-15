import * as pdfjs from 'pdfjs-dist';

/**
 * Extract text from PDF buffer
 *
 * Uses PDF.js library (pure JS, works in Cloudflare Workers)
 * Returns extracted text concatenated from all pages
 */
export async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    // Set up PDF.js worker
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .filter((item): item is pdfjs.TextItem => 'str' in item)
        .map((item) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract text from plain text file
 *
 * Handles .txt files or text passed directly
 */
export async function extractTextFromFile(
  content: ArrayBuffer | string,
  filename: string
): Promise<string> {
  if (filename.toLowerCase().endsWith('.pdf')) {
    return extractTextFromPDF(typeof content === 'string' ? new TextEncoder().encode(content).buffer : content);
  }

  // Plain text
  if (typeof content === 'string') {
    return content;
  }

  return new TextDecoder().decode(content);
}

interface TextItem {
  str: string;
}
