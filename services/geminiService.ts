
import { GoogleGenAI } from "@google/genai";
import { UploadedFile } from "../types";

// Helper to decode base64 to UTF-8 text safely
const base64ToUtf8 = (base64: string): string => {
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    console.error("Failed to decode text file", e);
    return "";
  }
};

let chatSession: any = null;
let ai: GoogleGenAI | null = null;

export const initGemini = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found");
  }
  ai = new GoogleGenAI({ apiKey: apiKey || '' });
};

export const resetChat = () => {
  chatSession = null;
};

export const sendMessageStream = async (
  text: string,
  newFiles: UploadedFile[],
  onChunk: (text: string) => void
): Promise<string> => {
  if (!ai) initGemini();
  if (!ai) throw new Error("Failed to initialize Gemini AI");

  // Initialize chat if not exists
  if (!chatSession) {
    chatSession = ai.chats.create({
      model: 'gemini-3-pro-preview', 
      config: {
        systemInstruction: `You are LexAI, an elite legal assistant AI specialized in Indian Law.

        **CRITICAL INSTRUCTION FOR LARGE DOCUMENTS:**
        You have a high-capacity context window. When a user uploads large documents (PDF, DOCX, XLS, TXT), you MUST:
        1. **Read Exhaustively:** Process the entire document context. Do not ignore parts of the file.
        2. **Cite Specifics:** Refer to specific page numbers, clause numbers, or table cells from the uploaded file.
        3. **Analyze Multi-Format Data:** If spreadsheets (XLSX) are provided, interpret the data rows/columns as part of the legal case (e.g., financial statements, employee lists).

        **Jurisdiction & Knowledge Base:**
        - **Primary Jurisdiction:** India.
        - **Key Statutes:** Constitution of India, Bharatiya Nyaya Sanhita (BNS), Bharatiya Nagarik Suraksha Sanhita (BNSS), Contract Act, Companies Act, CPC, Evidence Act.
        
        **Tone:** Professional, Objective, Courtroom-ready.
        **Disclaimer:** Remind the user you are an AI assistant, not a replacement for a registered Advocate. Use Markdown for formatting.`
      },
    });
  }

  // Prepare parts
  const parts: any[] = [];
  
  // Add new files
  for (const file of newFiles) {
    if (file.mimeType === 'text/plain' || file.name.endsWith('.txt')) {
      const decodedContent = base64ToUtf8(file.data);
      parts.push({
        text: `[Document: ${file.name}]\n${decodedContent}`
      });
    } else {
      parts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.data
        }
      });
    }
  }

  // Add the text prompt
  if (text) {
    parts.push({ text });
  }

  // Fallback if only files sent
  if (parts.length > 0 && !text && newFiles.length > 0) {
      parts.push({ text: "Please analyze the uploaded documents and provide a professional summary based on Indian legal standards." });
  }

  try {
    const resultStream = await chatSession.sendMessageStream({ message: parts });

    let fullText = "";
    for await (const chunk of resultStream) {
       const chunkText = chunk.text;
       if (chunkText) {
         fullText += chunkText;
         onChunk(fullText);
       }
    }
    return fullText;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Handle key selection error if it occurs
    if (error.message?.includes("Requested entity was not found")) {
        throw new Error("API Key configuration issue. Please ensure your project is properly set up.");
    }
    throw error;
  }
};
