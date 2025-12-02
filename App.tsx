import React, { useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { UploadedFile, Message, ChatStatus } from './types';
import { sendMessageStream, resetChat } from './services/geminiService';

// Simple ID generator replacement
const generateId = () => Math.random().toString(36).substring(2, 15);

const App: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<ChatStatus>('idle');

  const handleFileUpload = async (fileList: FileList) => {
    const newFiles: UploadedFile[] = [];
    // Increased limit to 50MB as requested.
    const MAX_FILE_SIZE = 50 * 1024 * 1024; 

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      // Validation
      if (file.size > MAX_FILE_SIZE) {
        alert(`File "${file.name}" exceeds the 50MB limit.`);
        continue;
      }

      // Check supported types
      const isPdf = file.type === 'application/pdf';
      const isTxt = file.type === 'text/plain' || file.name.endsWith('.txt');
      const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx');
      const isExcel = file.type === 'application/vnd.ms-excel' || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xls') || file.name.endsWith('.xlsx');


      if (!isPdf && !isTxt && !isDocx && !isExcel) {
        alert(`File ${file.name} is not supported. Please upload PDF, DOCX, TXT, or Excel files.`);
        continue;
      }

      try {
        let base64Data = '';
        let finalMimeType = file.type;

        if (isDocx) {
          // Handle DOCX: Extract text -> Convert to Base64 -> Treat as text/plain
          
          // Robust check: If mammoth isn't loaded globally, try to load it dynamically
          if (!(window as any).mammoth) {
             console.log("DOCX library missing, attempting dynamic load...");
             try {
                await new Promise<void>((resolve, reject) => {
                   const script = document.createElement('script');
                   script.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";
                   script.onload = () => resolve();
                   script.onerror = () => reject(new Error("Failed to download DOCX library"));
                   document.head.appendChild(script);
                });
             } catch (loadErr) {
                throw new Error("DOCX processing library could not be loaded. Please check your internet connection.");
             }
          }

          const mammoth = (window as any).mammoth;
          if (!mammoth) {
             throw new Error("DOCX library loaded but failed to initialize. Please refresh.");
          }

          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          // safely encode utf8 text to base64
          base64Data = btoa(unescape(encodeURIComponent(result.value)));
          // We mask it as text/plain so the service handles it as a text part
          finalMimeType = 'text/plain'; 
        } else if (isExcel) {
          // Handle Excel
          if (!(window as any).XLSX) {
             console.log("XLSX library missing, attempting dynamic load...");
             try {
                await new Promise<void>((resolve, reject) => {
                   const script = document.createElement('script');
                   script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
                   script.onload = () => resolve();
                   script.onerror = () => reject(new Error("Failed to download XLSX library"));
                   document.head.appendChild(script);
                });
             } catch (loadErr) {
                throw new Error("Excel processing library could not be loaded. Please check your internet connection.");
             }
          }

          const XLSX = (window as any).XLSX;
          if (!XLSX) {
             throw new Error("Excel library loaded but failed to initialize. Please refresh.");
          }

          const arrayBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          
          let allText = "";
          workbook.SheetNames.forEach((sheetName: string) => {
              const sheet = workbook.Sheets[sheetName];
              const csv = XLSX.utils.sheet_to_csv(sheet);
              if (csv && csv.trim().length > 0) {
                  allText += `--- Sheet: ${sheetName} ---\n${csv}\n\n`;
              }
          });

          base64Data = btoa(unescape(encodeURIComponent(allText)));
          finalMimeType = 'text/plain';

        } else {
          // Handle PDF / Text
          const reader = new FileReader();
          base64Data = await new Promise<string>((resolve, reject) => {
            reader.onload = (e) => {
              const result = e.target?.result as string;
              resolve(result.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }

        newFiles.push({
          id: generateId(),
          name: file.name,
          type: file.type, // keep original type for UI display
          size: file.size,
          data: base64Data,
          mimeType: finalMimeType, // used for API logic
          isSent: false
        });

      } catch (err) {
        console.error("Error processing file", file.name, err);
        alert(`Failed to process ${file.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleReset = useCallback(() => {
    setFiles([]);
    setMessages([]);
    setInput('');
    setStatus('idle');
    resetChat();
  }, []);

  const handleSendMessage = useCallback(async () => {
    if ((!input.trim() && files.every(f => f.isSent)) || status !== 'idle') return;

    const userMessageText = input.trim();
    setInput('');
    setStatus('thinking');

    // Identify pending files
    const pendingFiles = files.filter(f => !f.isSent);
    
    // Optimistic UI update
    const newMessageId = generateId();
    const newUserMessage: Message = {
      id: newMessageId,
      role: 'user',
      content: userMessageText || (pendingFiles.length > 0 ? "Uploaded documents for review." : ""),
      timestamp: new Date(),
      attachments: pendingFiles // Associate these files with this message in UI
    };

    const newBotMessageId = generateId();
    const placeholderBotMessage: Message = {
      id: newBotMessageId,
      role: 'model',
      content: '',
      timestamp: new Date(),
      isThinking: true
    };

    setMessages(prev => [...prev, newUserMessage, placeholderBotMessage]);

    // Mark files as sent locally
    setFiles(prev => prev.map(f => pendingFiles.find(pf => pf.id === f.id) ? { ...f, isSent: true } : f));

    try {
      let responseText = '';
      
      await sendMessageStream(userMessageText, pendingFiles, (chunk) => {
        setStatus('streaming');
        responseText = chunk;
        setMessages(prev => 
          prev.map(msg => 
            msg.id === newBotMessageId 
              ? { ...msg, content: responseText, isThinking: false } 
              : msg
          )
        );
      });

      setStatus('idle');
    } catch (error: any) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newBotMessageId 
            ? { ...msg, content: `**Error:** ${errorMessage}. \n\n*Note: For files > 20MB, the API might reject the request payload. Try splitting the document.*`, isThinking: false } 
            : msg
        )
      );
      setStatus('error');
    }
  }, [input, files, status]);

  return (
    <div className="flex h-screen w-full bg-slate-50">
      {/* Sidebar */}
      <Sidebar 
        files={files} 
        onUpload={handleFileUpload} 
        onRemove={handleRemoveFile} 
        onReset={handleReset}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        <ChatArea 
          messages={messages} 
          input={input} 
          setInput={setInput} 
          onSend={handleSendMessage}
          status={status}
        />
      </div>
    </div>
  );
};

export default App;