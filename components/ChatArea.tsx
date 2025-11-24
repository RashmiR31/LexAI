import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, ChatStatus } from '../types';
import { Send, Loader2, Bot, User, Sparkles, MessageSquare } from 'lucide-react';

interface ChatAreaProps {
  messages: Message[];
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  status: ChatStatus;
}

const SUGGESTIONS = [
  "Draft a Legal Notice for Cheque Bounce (Sec 138 NI Act)",
  "Explain the key changes in the Bharatiya Nyaya Sanhita (BNS)",
  "What are the grounds for divorce under the Hindu Marriage Act?",
  "Summarize the concept of 'Res Judicata' under CPC"
];

export const ChatArea: React.FC<ChatAreaProps> = ({ messages, input, setInput, onSend, status }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, status]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
             <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 rotate-3 shadow-sm">
                <Sparkles className="w-10 h-10 text-indigo-400" />
             </div>
             <h2 className="text-2xl font-serif font-bold text-slate-700 mb-2">LexAI Legal Assistant</h2>
             <p className="text-slate-500 max-w-md text-center mb-8">
               Your Indian Law specialist. Review documents, draft notices, or discuss case law.
             </p>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl px-4">
               {SUGGESTIONS.map((suggestion, idx) => (
                 <button
                   key={idx}
                   onClick={() => setInput(suggestion)}
                   className="flex items-center space-x-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all text-left group"
                 >
                   <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                     <MessageSquare className="w-4 h-4 text-indigo-500" />
                   </div>
                   <span className="text-sm text-slate-600 group-hover:text-slate-900">{suggestion}</span>
                 </button>
               ))}
             </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
                
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                  msg.role === 'user' ? 'bg-slate-700' : 'bg-indigo-600'
                }`}>
                  {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                </div>

                {/* Bubble */}
                <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-5 py-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-slate-800 text-white rounded-tr-none' 
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none font-serif'
                  }`}>
                    {msg.isThinking ? (
                      <div className="flex items-center space-x-2 text-indigo-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="font-semibold text-xs tracking-wide uppercase">Reasoning...</span>
                      </div>
                    ) : (
                      <div className="markdown-body">
                         <ReactMarkdown 
                            components={{
                              h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-2 mt-2" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-base font-bold mb-2 mt-2" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-sm font-bold mb-1 mt-1" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-2 space-y-1" {...props} />,
                              li: ({node, ...props}) => <li className="pl-1" {...props} />,
                              p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                              strong: ({node, ...props}) => <strong className="font-bold text-slate-900" {...props} />,
                              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-200 pl-4 italic text-slate-600 my-2" {...props} />,
                            }}
                         >
                           {msg.content}
                         </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  
                  {/* Attachments indicator for User */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-1 flex gap-2">
                        {msg.attachments.map(f => (
                            <span key={f.id} className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full flex items-center">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                                {f.name}
                            </span>
                        ))}
                    </div>
                  )}

                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto flex items-end gap-2 bg-slate-50 border border-slate-300 rounded-xl p-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={status === 'thinking' ? "Please wait for response..." : "Ask a legal question, cite a case, or draft a clause..."}
            disabled={status === 'thinking' || status === 'streaming'}
            className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-[150px] p-2 text-slate-800 placeholder:text-slate-400 text-sm"
            rows={1}
          />
          <button
            onClick={onSend}
            disabled={(!input.trim() && status !== 'streaming') || status === 'thinking' || status === 'streaming'}
            className={`p-2.5 rounded-lg flex-shrink-0 transition-all ${
              input.trim() && status === 'idle'
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {status === 'thinking' || status === 'streaming' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-2">
           LexAI can make mistakes. Please verify important legal information.
        </p>
      </div>
    </div>
  );
};