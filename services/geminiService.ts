import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { UploadedFile } from "../types";

// Helper to sanitize base64
const cleanBase64 = (dataUrl: string) => {
  return dataUrl.split(',')[1] || dataUrl;
};

let chatSession: Chat | null = null;
let ai: GoogleGenAI | null = null;

export const initGemini = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found");
  }
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
      model: 'gemini-3-pro-preview', // High reasoning model for legal tasks
      config: {
        systemInstruction: `You are LexAI, an elite legal assistant AI specialized in Indian Law, designed to support Indian lawyers and legal professionals.

        **Jurisdiction & Knowledge Base:**
        - **Primary Jurisdiction:** India.
        - **Key Statutes:** Constitution of India, Indian Penal Code (IPC), Code of Criminal Procedure (CrPC), Bharatiya Nyaya Sanhita (BNS) & related new criminal laws, Indian Contract Act, Companies Act, Transfer of Property Act, and specific acts like NI Act (Section 138).
        - **Case Law:** Refer to landmark Supreme Court of India and High Court judgments where relevant (e.g., AIR, SCC citations).

        **Core Functions:**
        1. **General Legal Conversation:** Engage in professional, high-level discussions about legal concepts, case strategies, and legal ethics in India. You are capable of general "chat" without specific documents.
        2. **Document Analysis:** Review, summarize, and analyze uploaded legal documents (Vakalatnamas, Plaints, Written Statements, Agreements) for compliance with Indian law.
        3. **Legal Research & Reasoning:** Answer complex legal questions, explain statutes, and discuss case law principles.
        4. **Drafting:** Assist in drafting legal notices, affidavits, and contracts adhering to Indian legal standards and formats.

        **Operational Guidelines:**
        - **Context Awareness:** If documents are uploaded, strictly prioritize their content. If the user asks a general question (e.g., "What is the limitation period for a money suit?"), answer using your general knowledge of the Limitation Act, 1963.
        - **Accuracy & Citation:** Cite specific Sections, Articles, or Orders (e.g., "Order 39, Rules 1 & 2 of CPC").
        - **Tone:** Professional, Objective, and Courtroom-ready (e.g., "Learned counsel", "Hon'ble Court").
        - **Disclaimer:** When providing analysis, implicitly or explicitly remind the user that you are an AI assistant and this is not a substitute for professional legal counsel from a registered Advocate.
        - **Formatting:** Use Markdown for formatting: headers, bullet points, and bold text for emphasis.`,
        thinkingConfig: {
            thinkingBudget: 4096 // Allocating budget for complex legal reasoning
        }
      },
    });
  }

  // Prepare parts
  // We can mix text and inlineData in the user message
  const parts: any[] = [];
  
  // Add new files that haven't been introduced to the context yet
  for (const file of newFiles) {
    parts.push({
      inlineData: {
        mimeType: file.mimeType,
        data: file.data
      }
    });
  }

  // Add the text prompt
  if (text) {
    parts.push({ text });
  }

  // If we have files but no text (rare, but possible if user just drops files), add a default prompt
  if (parts.length > 0 && !text && newFiles.length > 0) {
      parts.push({ text: "I have uploaded these documents for review. Please analyze them in the context of Indian Law." });
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