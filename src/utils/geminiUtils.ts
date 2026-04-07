import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Transaction, TransactionType, PaymentType } from '../types';

export interface GeminiParsedTransaction {
  amount: number;
  type: TransactionType;
  paymentType: PaymentType;
  category: string;
  notes: string;
  account?: string;
  vendor?: string;
  date?: string;
}

export interface GeminiDualIntent {
  isQuestion: boolean;
  answerText: string | null;
  extractedTransactions: GeminiParsedTransaction[] | null;
}

const SYSTEM_PROMPT = `
You are CafeFlow AI, a highly advanced local financial assistant.
You will receive the user's prompt and a CSV dump of their recent transaction history for context.
Your goal is to figure out whether the user is giving a COMMAND to add new transactions, or asking an ANALYTICAL QUESTION about their data.

You MUST respond strictly with a valid JSON object matching this exact interface:
{
  "isQuestion": boolean,
  "answerText": string | null,
  "extractedTransactions": array of objects | null
}

Rules for Question/Analytics (isQuestion = true):
- If they ask "what did rakesh spend", "how much is my profit", "show me expenses", analyze the provided CSV data.
- Write a short, conversational, helpful markdown-formatted string and place it in "answerText".
- Do not make up data; rely solely on the CSV context provided.
- "extractedTransactions" must be null.

Rules for Command (isQuestion = false):
- If the user wants to add/log a payment e.g. "spent 50 on food", "sales cash 400", extrapolate all transactions.
- "answerText" must be null.
- "extractedTransactions" must be an array of objects where:
  - amount: integer or float.
  - type: strictly "sale" or "expense".
  - paymentType: strictly "cash", "upi", "bank", or "other". If not mentioned, infer reasonably (cash or bank).
  - category: if 'sale', typically 'sale'. If expense, strictly map to: [vegetables, oil, gas, packaging, rent, utilities, salary, marketing, dairy, meat, spices, beverages, cleaning, equipment, repairs, transport, misc]
  - notes: short description.
  - account: optional, e.g. "paid from HDFC" -> "HDFC".
  - vendor: optional, e.g. "bought from Swiggy" -> "Swiggy".
`;

export const parseWithGemini = async (text: string, apiKey: string, transactions: Transaction[]): Promise<GeminiDualIntent> => {
  try {
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Build the CSV context of the last ~500 records
    const recentTxns = transactions.filter(t => t.status === 'approved').slice(0, 500);
    const csvHeader = 'date,type,category,paymentType,amount,account,vendor,notes\n';
    const csvBody = recentTxns.map(t => 
      `${t.date.split('T')[0]},${t.type},${t.category},${t.paymentType},${t.amount},${t.account || ''},${t.vendor || ''},"${(t.notes || '').replace(/"/g, '""')}"`
    ).join('\n');

    const promptContext = `
      ${SYSTEM_PROMPT}

      USER DATA (Last ${recentTxns.length} transactions):
      ${csvHeader}${csvBody}

      USER QUERY:
      "${text}"
    `;

    const response = await model.generateContent(promptContext);
    const outputString = response.response.text() || "{}";
    const cleanJson = outputString.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error('Gemini API Error:', err);
    throw err;
  }
};

export const parseReceiptWithGemini = async (base64Image: string, mimeType: string, apiKey: string): Promise<GeminiParsedTransaction | null> => {
  try {
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are a precise invoice/receipt scanner for "CafeFlow".
      Analyze this image and extract:
      1. amount (number, total INR amount)
      2. vendor (string, who issued it)
      3. date (YYYY-MM-DD or today's date if missing)
      4. category (Choose from: vegetables, oil, gas, packaging, rent, utilities, salary, marketing, dairy, meat, spices, beverages, cleaning, equipment, repairs, transport, misc)
      5. notes (Brief item summary)

      Return strictly a single valid JSON object. No markdown.
      Schema: { "amount": number, "type": "expense", "paymentType": "cash", "category": string, "notes": string, "vendor": string, "date": string }
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      },
      { text: prompt },
    ]);

    const outputString = result.response.text() || "{}";
    const cleanJson = outputString.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error('Gemini Vision Parsing Error:', err);
    return null;
  }
};
