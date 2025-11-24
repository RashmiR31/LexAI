import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { UploadedFile } from "../types";

// Helper to sanitize base64
const cleanBase64 = (dataUrl: string) => {
  return dataUrl.split(',')[1] || dataUrl;
};

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

let chatSession: Chat | null = null;
let ai: GoogleGenAI | null = null;

export const initGemini = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found");
  }
  // Safe initialization even if key is missing to prevent immediate crash, though calls will fail
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
      model: 'gemini-2.5-flash', 
      config: {
        systemInstruction: `You are LexAI, an elite legal assistant AI specialized in Indian Law.

        **CRITICAL INSTRUCTION FOR LARGE DOCUMENTS:**
        You have a 1 Million Token Context Window. When a user uploads large documents (e.g., 500+ pages), you MUST:
        1. **Read Exhaustively:** Do not just scan the first few pages. Process the entire document context.
        2. **Cite Specifics:** When answering, refer to specific page numbers, clause numbers, or paragraph numbers from the uploaded file to ensure accuracy.
        3. **Synthesize:** If information is scattered across hundreds of pages, synthesize it into a coherent answer.

        **Jurisdiction & Knowledge Base:**
        - **Primary Jurisdiction:** India.
        - **Key Statutes:** Constitution of India, IPC, CrPC/BNSS, BNS, Contract Act, Companies Act, CPC, Evidence Act.
        
        **Core Functions:**
        1. **General Legal Conversation:** Professional discussion on legal concepts, strategy, and ethics.
        2. **Deep Document Analysis:** Review, summarize, and cross-reference large legal documents.
        3. **Drafting:** Create Indian legal standard drafts (Notices, Affidavits).

        **Operational Guidelines:**
        - **Context Awareness:** Prioritize uploaded document content over general knowledge.
        - **Accuracy:** Be precise. If a document is silent on an issue, state that clearly. Do not hallucinate clauses.
        - **Tone:** Professional, Objective, Courtroom-ready.
        - **Disclaimer:** Remind the user you are an AI assistant, not a replacement for a registered Advocate.
        - **Formatting:** Use Markdown with clear headers and bullet points.`
      },
    });
  }

  // Prepare parts
  const parts: any[] = [];
  
  // Add new files that haven't been introduced to the context yet
  for (const file of newFiles) {
    // Check if it's a text file, if so, decode and send as text part
    if (file.mimeType === 'text/plain' || file.name.endsWith('.txt')) {
      const decodedContent = base64ToUtf8(file.data);
      parts.push({
        text: `[Document: ${file.name}]\n${decodedContent}`
      });
    } else {
      // For PDFs and images
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

  // If we have files but no text (rare, but possible if user just drops files), add a default prompt
  if (parts.length > 0 && !text && newFiles.length > 0) {
      parts.push({ text: "I have uploaded these documents. Please provide a detailed summary and analysis based on Indian Law, citing specific clauses or pages where relevant." });
  }

  try {
    const resultStream = await chatSession.sendMessageStream({ message: parts });

    let fullText = "";
    for await (const chunk of resultStream) {
       const chunkText = (chunk as GenerateContentResponse).text;
       if (chunkText) {
         fullText += chunkText;
         onChunk(fullText);
       }
    }
    return fullText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};