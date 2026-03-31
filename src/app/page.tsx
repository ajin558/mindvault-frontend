"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { 
  Menu, Plus, Send, Upload, Globe, 
  Bot, User, Trash2, CheckCircle2, MessageSquare, Image as ImageIcon, X
} from "lucide-react";

// 消息类型定义
type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

// 对话 Session 类型定义
type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
};

// 🔴 核心新增 1：极其轻量的本地 UUID 生成器
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function MindVaultChat() {
  // === 状态管理 ===
  const [isMounted, setIsMounted] = useState(false); 
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  
  // 🔴 核心新增 2：用于存放当前用户的“灵魂通行证”
  const [sessionId, setSessionId] = useState<string>("");

  // 👁️ 视觉觉醒：存放图片的 Base64 数据
  const [imageBase64, setImageBase64] = useState<string>("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // 用于触发图片上传

  // === 初始化与本地存储读取 ===
  useEffect(() => {
    setIsMounted(true);

    // 🔴 核心新增 3：给当前浏览器发放/读取唯一身份码
    let currentId = localStorage.getItem("mindvault_session_id");
    if (!currentId) {
      currentId = `user_${generateUUID()}`; 
      localStorage.setItem("mindvault_session_id", currentId);
      console.log("🆕 检测到新访客，已签发独立记忆通行证:", currentId);
    } else {
      console.log("👋 老朋友回归，记忆通道已重新连接:", currentId);
    }
    setSessionId(currentId);

    // 读取历史聊天记录
    const savedChats = localStorage.getItem("mindvault_chats");
    if (savedChats) {
      const parsedChats: ChatSession[] = JSON.parse(savedChats);
      setChatHistory(parsedChats);
      if (parsedChats.length > 0) {
        setCurrentChatId(parsedChats[0].id);
        setMessages(parsedChats[0].messages);
      }
    } else {
      createNewChat(); 
    }
  }, []);

  // === 实时保存到本地存储 ===
  useEffect(() => {
    if (!isMounted || !currentChatId) return;

    setChatHistory((prev) => {
      const updatedHistory = prev.map((chat) => {
        if (chat.id === currentChatId) {
          let newTitle = chat.title;
          if (newTitle === "新对话" && messages.length > 1) {
            const firstUserMsg = messages.find((m) => m.role === "user");
            if (firstUserMsg) {
              newTitle = firstUserMsg.content.slice(0, 12) + (firstUserMsg.content.length > 12 ? "..." : "");
            }
          }
          return { ...chat, title: newTitle, messages: messages };
        }
        return chat;
      });
      localStorage.setItem("mindvault_chats", JSON.stringify(updatedHistory));
      return updatedHistory;
    });
  }, [messages, currentChatId, isMounted]);

  // === 会话管理功能 ===
  const createNewChat = () => {
    const newId = Date.now().toString();
    const initialMsg: Message = { role: "assistant", content: "新的情报检索已开启，请指示。" };
    setChatHistory((prev) => [{ id: newId, title: "新对话", messages: [initialMsg] }, ...prev]);
    setCurrentChatId(newId);
    setMessages([initialMsg]);
  };

  const switchChat = (id: string) => {
    const targetChat = chatHistory.find((c) => c.id === id);
    if (targetChat) {
      setCurrentChatId(id);
      setMessages(targetChat.messages);
    }
  };

  const deleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    const updatedHistory = chatHistory.filter((c) => c.id !== id);
    setChatHistory(updatedHistory);
    localStorage.setItem("mindvault_chats", JSON.stringify(updatedHistory));
    
    if (currentChatId === id) {
      if (updatedHistory.length > 0) {
        setCurrentChatId(updatedHistory[0].id);
        setMessages(updatedHistory[0].messages);
      } else {
        createNewChat();
      }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  // 👁️ 视觉觉醒：处理用户上传图片转 Base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const base64String = reader.result.replace(/^data:image\/[a-z]+;base64,/, "");
          setImageBase64(base64String);
        }
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  // === 发送消息 ===
  const handleSend = async () => {
    const effectiveInput = input.trim() || (imageBase64 ? "请帮我分析一下这张图。" : "");
    if (!effectiveInput || isLoading) return;

    const imageToSend = imageBase64;
    
    let displayContent = effectiveInput;
    if (imageToSend) {
        displayContent += "\n\n*[附带了一张视觉图像]*";
    }

    const userMsg: Message = { role: "user", content: displayContent };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setImageBase64(""); 
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsLoading(true);

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: effectiveInput }], 
          user_id: sessionId || `user_fallback_${Date.now()}`,
          image_base64: imageToSend 
        }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let done = false;
      let aiContent = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          aiContent += chunk; 
          
          setMessages((prev) => {
            const newMsgs = [...prev];
            newMsgs[newMsgs.length - 1].content = aiContent;
            return newMsgs;
          });
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1].content = "⚠️ 系统异常：无法连接到 MindVault 大脑，请检查后端服务是否启动。";
        return newMsgs;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setUploadStatus("uploading");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) setUploadStatus("success");
      else setUploadStatus("error");
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (error) {
      setUploadStatus("error");
      setTimeout(() => setUploadStatus(null), 3000);
    }
  };

  if (!isMounted) return <div className="h-screen w-full bg-[#0a0a0a]"></div>;

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-gray-100 font-sans overflow-hidden">
      
      {/* ================= 侧边栏 ================= */}
      <div 
        className={`flex-shrink-0 bg-[#141414] border-r border-white/10 transition-all duration-300 ease-in-out flex flex-col
          ${isSidebarOpen ? "w-64" : "w-0"} overflow-hidden`}
      >
        <div className="p-4 flex flex-col h-full w-64">
          <button 
            onClick={createNewChat}
            className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all mb-6 text-sm font-medium"
          >
            <Plus size={18} />
            新建对话
          </button>

          <div className="flex-1 overflow-y-auto pr-1">
            <h3 className="text-xs font-semibold text-gray-500 mb-3 px-2">历史记忆库</h3>
            
            <div className="space-y-1">
              {chatHistory.map((chat) => (
                <div 
                  key={chat.id}
                  onClick={() => switchChat(chat.id)}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                    ${currentChatId === chat.id ? "bg-blue-500/10 text-blue-400" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"}`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <MessageSquare size={14} className="flex-shrink-0 opacity-70" />
                    <span className="text-sm truncate">{chat.title}</span>
                  </div>
                  <button 
                    onClick={(e) => deleteChat(chat.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-gray-500 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10">
            <label className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-300 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all cursor-pointer relative overflow-hidden">
              {uploadStatus === "uploading" ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
              ) : uploadStatus === "success" ? (
                <CheckCircle2 size={18} className="text-emerald-400" />
              ) : (
                <Upload size={18} />
              )}
              <span className="truncate">
                {/* 🔴 修改 1：文案升级，支持提示表格上传 */}
                {uploadStatus === "uploading" ? "正在挂载数据..." : uploadStatus === "success" ? "入库成功！" : "上传知识库 / 数据表"}
              </span>
              {/* 🔴 修改 2：增加了对 .csv, .xls, .xlsx 的支持 */}
              <input type="file" accept=".pdf,.txt,.csv,.xls,.xlsx" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>
      </div>

      {/* ================= 主聊天区 ================= */}
      <div className="flex-1 flex flex-col relative h-full max-w-full">
        <header className="absolute top-0 w-full h-16 flex items-center justify-between px-4 z-10 bg-gradient-to-b from-[#0a0a0a] to-transparent">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <Menu size={20} />
            </button>
            <span className="font-semibold text-lg flex items-center gap-2">
              MindVault <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] tracking-wider border border-blue-500/30">AGENT</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 border border-white/20 flex items-center justify-center text-sm shadow-lg shadow-purple-500/20">
              <Bot size={18} className="text-white" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pt-20 pb-32">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={16} className="text-gray-300" />
                  </div>
                )}
                <div className={`relative max-w-[85%] px-5 py-4 rounded-2xl text-[15px] leading-relaxed shadow-sm
                  ${msg.role === "user" 
                    ? "bg-white/10 text-white rounded-br-sm" 
                    : "bg-transparent text-gray-200"}`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-invert prose-p:leading-relaxed max-w-none">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code(props: any) {
                            const { children, className, node, ...rest } = props;
                            const match = /language-(\w+)/.exec(className || '');
                            return match ? (
                              <div className="rounded-lg overflow-hidden my-4 border border-white/10 shadow-2xl">
                                <div className="flex items-center px-4 py-2 bg-[#1e1e1e] border-b border-white/5">
                                  <div className="flex gap-1.5 mr-4">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                                  </div>
                                  <span className="text-xs text-gray-400 font-mono lowercase">{match[1]}</span>
                                </div>
                                <SyntaxHighlighter
                                  style={vscDarkPlus as any}
                                  language={match[1]}
                                  PreTag="div"
                                  customStyle={{ margin: 0, padding: '1rem', background: '#0d0d0d', fontSize: '13px' }}
                                  {...rest}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              </div>
                            ) : (
                              <code className="bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded text-[13px] font-mono border border-blue-500/20" {...rest}>
                                {children}
                              </code>
                            )
                          },
                          blockquote({node, children, ...props}) {
                            return (
                              <blockquote className="my-3 pl-4 border-l-2 border-emerald-500/50 bg-emerald-500/5 py-2.5 pr-4 rounded-r-lg shadow-inner" {...props}>
                                <div className="text-[13px] text-emerald-400/90 font-mono flex items-center gap-2">
                                  {children}
                                </div>
                              </blockquote>
                            )
                          },
                          table({node, ...props}) {
                            return <div className="overflow-x-auto my-5 rounded-lg border border-white/10"><table className="w-full text-sm text-left border-collapse" {...props} /></div>
                          },
                          th({node, ...props}) {
                            return <th className="px-4 py-3 bg-white/5 border-b border-white/10 font-semibold text-gray-200 whitespace-nowrap" {...props} />
                          },
                          td({node, ...props}) {
                            return <td className="px-4 py-3 border-b border-white/5 text-gray-300" {...props} />
                          },
                          img({node, ...props}) {
                            return (
                              <div className="my-5 p-2 rounded-xl bg-white/5 border border-white/10 inline-block shadow-2xl">
                                <img className="rounded-lg max-w-full h-auto object-contain max-h-[400px]" {...props} alt="数据图表" />
                              </div>
                            )
                          }
                        }}
                      >
                        {msg.content || ""}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <User size={16} className="text-white" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && messages[messages.length - 1].role === "user" && (
               <div className="flex gap-4 justify-start animate-pulse">
                 <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={16} className="text-gray-400" />
                 </div>
                 <div className="flex items-center gap-1 px-4 py-3 bg-transparent">
                   <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                   <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                   <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                 </div>
               </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </main>

        {/* ================= 输入区 ================= */}
        <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent pt-10 pb-6 px-4">
          <div className="max-w-3xl mx-auto relative group">
            <div className="absolute -top-10 left-0 flex gap-2">
              <button 
                onClick={() => setUseWebSearch(!useWebSearch)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 border
                  ${useWebSearch 
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]" 
                    : "bg-white/5 text-gray-500 border-transparent hover:text-gray-300"}`}
              >
                <Globe size={14} className={useWebSearch ? "animate-pulse" : ""} />
                全球雷达
              </button>
            </div>

            {/* 👁️ 视觉觉醒：图片预览悬浮窗 */}
            {imageBase64 && (
              <div className="absolute -top-16 right-0 bg-[#1e1e1e] border border-emerald-500/30 rounded-lg p-1 shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                <div className="w-10 h-10 rounded overflow-hidden bg-black flex items-center justify-center">
                  <img src={`data:image/jpeg;base64,${imageBase64}`} alt="预览" className="w-full h-full object-cover opacity-80" />
                </div>
                <div className="flex flex-col pr-2">
                  <span className="text-xs text-emerald-400 font-medium">视觉感官已挂载</span>
                  <span className="text-[10px] text-gray-500">发送即可触发看图分析</span>
                </div>
                <button onClick={() => setImageBase64("")} className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white mr-1 transition-colors">
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="relative flex items-end w-full bg-[#181818] border border-white/10 rounded-3xl shadow-2xl focus-within:ring-1 focus-within:ring-white/20 focus-within:border-white/20 transition-all duration-300 overflow-hidden">
              
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleImageUpload} 
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`absolute left-3 bottom-3 p-2 rounded-full transition-all duration-300 flex items-center justify-center z-10
                  ${imageBase64 ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"}`}
                title="挂载视觉感官 (上传图片)"
              >
                <ImageIcon size={18} />
              </button>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="向 MindVault 提问... (Shift + Enter 换行)"
                className="w-full max-h-[200px] bg-transparent text-gray-100 placeholder-gray-600 pl-12 pr-12 py-4 resize-none outline-none text-[15px] leading-relaxed"
                rows={1}
                disabled={isLoading}
              />
              
              <button
                onClick={handleSend}
                disabled={(!input.trim() && !imageBase64) || isLoading}
                className={`absolute right-3 bottom-3 p-2 rounded-full transition-all duration-300 flex items-center justify-center z-10
                  ${(input.trim() || imageBase64) && !isLoading
                    ? "bg-white text-black hover:bg-gray-200" 
                    : "bg-white/5 text-gray-600"}`}
              >
                <Send size={18} className={(input.trim() || imageBase64) && !isLoading ? "ml-0.5" : ""} />
              </button>
            </div>
            <div className="text-center mt-3 text-[11px] text-gray-600">
              MindVault 现已搭载数据仓库与视觉感官。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}