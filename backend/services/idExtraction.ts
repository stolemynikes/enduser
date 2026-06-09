import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export type IdDocumentType = 'PASSPORT' | 'ID_CARD' | 'DRIVERS_LICENSE';

export type ExtractedIdData = {
  name: string | null;
  documentType: IdDocumentType | null;
  documentNumber: string | null;
};

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number];

export async function extractIdDocument(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ExtractedIdData> {
  if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMime)) {
    throw new Error('Unsupported image type. Use JPG, PNG or WebP.');
  }

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: mimeType as AllowedMime,
        data: imageBuffer.toString('base64'),
      },
    },
    `Extract only these three fields from this identity document. Reply with ONLY valid JSON, no other text:
{
  "name": "full name as printed on the document, or null if unreadable",
  "documentType": "PASSPORT" | "ID_CARD" | "DRIVERS_LICENSE" | null,
  "documentNumber": "document number or passport number, or null if unreadable"
}
Do NOT include BSN, date of birth, address, nationality, or any other information.`,
  ]);

  const text = result.response.text().trim().replace(/^```json\n?|\n?```$/g, '');

  try {
    const parsed = JSON.parse(text);
    return {
      name: typeof parsed.name === 'string' ? parsed.name : null,
      documentType: ['PASSPORT', 'ID_CARD', 'DRIVERS_LICENSE'].includes(parsed.documentType)
        ? (parsed.documentType as IdDocumentType)
        : null,
      documentNumber: typeof parsed.documentNumber === 'string' ? parsed.documentNumber : null,
    };
  } catch {
    return { name: null, documentType: null, documentNumber: null };
  }
}
