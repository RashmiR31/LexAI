import React, { useRef } from 'react';
import { UploadedFile } from '../types';
import { Plus, FileText, Trash2, Scale, MessageSquarePlus } from 'lucide-react';

interface SidebarProps {
  files: UploadedFile[];
  onUpload: (files: FileList) => void;
  onRemove: (id: string) => void;
  onReset: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ files, onUpload, onRemove, onReset }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-80 bg-slate-900 text-slate-100 flex flex-col h-full border-r border-slate-700 shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold font-serif tracking-wide">LexAI</h1>
        </div>
        
        <button 
          onClick={onReset}
          className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 px-4 rounded-lg font-medium transition-all border border-slate-700 hover:border-slate-600 group"
        >
          <MessageSquarePlus className="w-4 h-4 text-indigo-400 group-hover:text-white transition-colors" />
          <span>New Chat</span>
        </button>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Case Files</h2>
          <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400">{files.length}</span>
        </div>

        {files.length === 0 ? (
          <div className="text-center py-10 px-4 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/30">
            <p className="text-sm text-slate-400 mb-2">No documents uploaded</p>
            <p className="text-xs text-slate-500">Supported: PDF, DOCX, TXT, XLS/XLSX</p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div key={file.id} className="group relative bg-slate-800 hover:bg-slate-700 transition-colors p-3 rounded-lg border border-slate-700 flex items-start space-x-3">
                <FileText className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate" title={file.name}>{file.name}</p>
                  <p className="text-xs text-slate-500 flex justify-between mt-1">
                    <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    <span className={file.isSent ? "text-green-400" : "text-amber-400"}>
                      {file.isSent ? "Analyzed" : "Pending"}
                    </span>
                  </p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onRemove(file.id); }}
                  className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded transition-all"
                  aria-label="Remove file"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Button */}
      <div className="p-4 border-t border-slate-800 bg-slate-900">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          multiple 
          accept=".pdf,.txt,.docx,.xls,.xlsx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        />
        <button 
          onClick={triggerUpload}
          className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg font-medium transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Add Documents</span>
        </button>
        <p className="text-[10px] text-center text-slate-500 mt-2">
          Max 50MB per file
        </p>
      </div>
    </div>
  );
};