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

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      // Simple validation
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Max 10MB.`);
        continue;
      }

      // Read file
      const reader = new FileReader();
      const filePromise = new Promise<UploadedFile>((resolve) => {
        reader.onload = (e) => {
          const result = e.target?.result as string;
          // IMPORTANT: Gemini expects just the base64, so we strip the data url prefix
          const base64Data = result.split(',')[1];
          
          resolve({
            id: generateId(),
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64Data,
            mimeType: file.type,
            isSent: false
          });
        };
        reader.readAsDataURL(file);
      });

      newFiles.push(await filePromise);
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
    } catch (error) {
      console.error(error);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newBotMessageId 
            ? { ...msg, content: "**Error:** Failed to process request. Please try again.", isThinking: false } 
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