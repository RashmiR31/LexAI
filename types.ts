export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // Base64 string without the prefix
  mimeType: string;
  isSent: boolean; // Tracks if the file has been sent to the chat context
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  isThinking?: boolean;
  attachments?: UploadedFile[];
}

export type ChatStatus = 'idle' | 'thinking' | 'streaming' | 'error';
