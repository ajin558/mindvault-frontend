"use client";

import React, { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { 
  Menu, Plus, Send, Upload, Globe, 
  Bot, User, Trash2, CheckCircle2, MessageSquare, Image as ImageIcon, X, Network
} from "lucide-react";

// 🔥 引入 3D 引擎 (必须动态导入并关闭 SSR，因为依赖 WebGL)
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

type Message = { role: "user" | "assistant" | "system"; content: string; };
type ChatSession = { id: string; title: string; messages: Message[]; };

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function MindVaultChat() {
  const [isMounted, setIsMounted] = useState(false); 
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  
  const [sessionId, setSessionId] = useState<string>("");
  const [imageBase64, setImageBase64] = useState<string>("");
  
  // 🌌 3D 全息图谱状态
  const [showBrain, setShowBrain] = useState(false);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
    let currentId = localStorage.getItem("mindvault_session_id");
    if (!currentId) {
      currentId = `user_${generateUUID()}`; 
      localStorage.setItem("mindvault_session_id", currentId);
    }
    setSessionId(currentId);

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

  const createNewChat = () => {
    const newId = Date.now().toString();
    const initialMsg: Message = { role: "assistant", content: "双核海马体已就绪。随时可执行深网搜索、图谱检索、视觉冲浪与沙盒编程。" };
    setChatHistory((prev) => [{ id: newId, title: "新指令", messages: [initialMsg] }, ...prev]);
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
      } else createNewChat();
    }
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImageBase64(reader.result.replace(/^data:image\/[a-z]+;base64,/, ""));
        }
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  // 🌌 获取图谱数据的动作
  const loadBrainGraph = async () => {
    setShowBrain(true);
    setGraphData({ nodes: [], links: [] });
    try {
      const res = await fetch("/api/graph_data");
      const data = await res.json();
      setGraphData(data);
    } catch (error) {
      console.error("加载大脑图谱失败", error);
    }
  };

  const handleSend = async () => {
    const effectiveInput = input.trim() || (imageBase64 ? "请帮我分析一下这张图。" : "");
    if (!effectiveInput || isLoading) return;

    const imageToSend = imageBase64;
    let displayContent = effectiveInput;
    if (imageToSend) displayContent += "\n\n*[附带了一张视觉图像]*";

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
        newMsgs[newMsgs.length - 1].content = "⚠️ 系统异常：无法连接到 MindVault 大脑。";
        return newMsgs;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
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
    <div className="flex h-screen w-full bg-[#0a0a0a] text-gray-100 font-sans overflow-hidden relative">
      
      {/* 🌌 3D 全息星空大脑弹窗 (最高层级 z-50) */}
      {showBrain && (
        <div className="absolute inset-0 z-50 bg-[#000000e6] backdrop-blur-md flex items-center justify-center overflow-hidden transition-all animate-in fade-in duration-500">
          <button 
            onClick={() => setShowBrain(false)} 
            className="absolute top-6 right-6 text-gray-400 hover:text-red-500 z-[60] bg-white/5 p-2 rounded-full transition-colors"
          >
            <X size={28} />
          </button>
          
          <div className="absolute top-6 left-6 text-emerald-400 font-mono text-sm z-[60] pointer-events-none p-4 bg-black/40 border border-emerald-500/20 rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
              <Network size={18} /> MindVault 神经图谱
            </h2>
            <div className="opacity-80">
              节点数量 (Nodes): {graphData.nodes.length} <br/>
              突触连线 (Synapses): {graphData.links.length}
            </div>
            <div className="text-[10px] text-gray-500 mt-2">提示：支持滚轮缩放、鼠标左键拖拽视角</div>
          </div>

          {/* 🔥 修复处的正确代码，剔除了重复嵌套 */}
          {graphData.nodes.length > 0 ? (
            <div className="w-full h-full cursor-move">
              <ForceGraph3D
                graphData={graphData}
                // 🌌 节点色彩魔法：母体核心为紫色，其他普通节点为青色发光体
                nodeColor={(node: any) => node.id === 'MindVault' ? '#b026ff' : '#00ffff'}
                // 🌌 节点大小与发光透明度
                nodeVal={(node: any) => Math.sqrt(node.val) * 4} 
                nodeOpacity={0.8}
                nodeResolution={24}
                nodeLabel="name"
                
                // 🌌 连线魔法：深邃幽蓝的半透明连线
                linkColor={() => 'rgba(30, 144, 255, 0.4)'}
                linkWidth={0.6}
                
                // ✨ 光子流特效：赛博朋克风的绿色光脉冲在神经元之间穿梭
                linkDirectionalParticles={3} 
                linkDirectionalParticleWidth={2.5}
                linkDirectionalParticleSpeed={0.006}
                linkDirectionalParticleColor={() => '#00ffcc'}
                
                // 🌃 背景：深空暗夜蓝
                backgroundColor="#03030a" 
                showNavInfo={false}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
              <div className="text-emerald-500 font-mono tracking-widest animate-pulse">正在穿透物理脑机接口，读取记忆流...</div>
            </div>
          )}
        </div>
      )}

      {/* ================= 侧边栏 ================= */}
      <div className={`flex-shrink-0 bg-[#141414] border-r border-white/10 transition-all duration-300 flex flex-col ${isSidebarOpen ? "w-64" : "w-0"} overflow-hidden`}>
        <div className="p-4 flex flex-col h-full w-64">
          <button onClick={createNewChat} className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all mb-6 text-sm font-medium">
            <Plus size={18} /> 新建指令
          </button>

          <div className="flex-1 overflow-y-auto pr-1">
            <h3 className="text-xs font-semibold text-gray-500 mb-3 px-2">历史战役</h3>
            <div className="space-y-1">
              {chatHistory.map((chat) => (
                <div key={chat.id} onClick={() => switchChat(chat.id)} className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${currentChatId === chat.id ? "bg-blue-500/10 text-blue-400" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"}`}>
                  <div className="flex items-center gap-2 overflow-hidden">
                    <MessageSquare size={14} className="flex-shrink-0 opacity-70" />
                    <span className="text-sm truncate">{chat.title}</span>
                  </div>
                  <button onClick={(e) => deleteChat(chat.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-gray-500 hover:text-red-400 transition-all">
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
                {uploadStatus === "uploading" ? "正在挂载数据..." : uploadStatus === "success" ? "入库成功！" : "上传资料 / 表格"}
              </span>
              <input type="file" accept=".pdf,.txt,.csv,.xls,.xlsx" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>
      </div>

      {/* ================= 主聊天区 ================= */}
      <div className="flex-1 flex flex-col relative h-full max-w-full">
        <header className="absolute top-0 w-full h-16 flex items-center justify-between px-4 z-10 bg-gradient-to-b from-[#0a0a0a] to-transparent">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <Menu size={20} />
            </button>
            <span className="font-semibold text-lg flex items-center gap-2">
              MindVault <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] tracking-wider border border-blue-500/30">AGENT</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={loadBrainGraph}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 rounded-lg text-sm font-medium transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]"
            >
              <Network size={16} /> 展开全息大脑
            </button>

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
                          table({node, ...props}) { return <div className="overflow-x-auto my-5 rounded-lg border border-white/10"><table className="w-full text-sm text-left border-collapse" {...props} /></div> },
                          th({node, ...props}) { return <th className="px-4 py-3 bg-white/5 border-b border-white/10 font-semibold text-gray-200 whitespace-nowrap" {...props} /> },
                          td({node, ...props}) { return <td className="px-4 py-3 border-b border-white/5 text-gray-300" {...props} /> },
                          
                          // 🔥 这里是修复图片不显示的核心逻辑！
                          img({node, ...props}) {
                            let imgSrc = props.src || '';
                            
                            // 探测是否为相对路径（即不包含 http://, https://, 也不是 data:base64 格式）
                            if (imgSrc && !imgSrc.startsWith('http') && !imgSrc.startsWith('data:')) {
                              // 如果你给服务器配了域名且是 HTTPS，请替换下面的 IP 为域名（例如: https://api.xxx.com）
                              // NEXT_PUBLIC_API_URL 如果在环境变量里配了会自动读取，没配的话就用你服务器的 8000 端口
                              const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://47.93.151.189:8000";
                              
                              // 拼接出正确的物理访问地址，防止出现双斜杠 /
                              imgSrc = `${backendBaseUrl.replace(/\/$/, '')}/${imgSrc.replace(/^\//, '')}`;
                            }
                            
                            // 分离出 src 和 alt，防止被旧的 props 覆盖
                            const { src, alt, ...restProps } = props;

                            return (
                              <div className="my-5 p-2 rounded-xl bg-white/5 border border-white/10 inline-block shadow-2xl">
                                <img 
                                  src={imgSrc} 
                                  alt={alt || "视觉快照"}
                                  className="rounded-lg max-w-full h-auto object-contain max-h-[400px]" 
                                  {...restProps} 
                                />
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
                <Globe size={14} className={useWebSearch ? "animate-pulse" : ""} /> 全球雷达
              </button>
            </div>

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
              <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
              <button onClick={() => fileInputRef.current?.click()} className={`absolute left-3 bottom-3 p-2 rounded-full transition-all duration-300 flex items-center justify-center z-10 ${imageBase64 ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"}`} title="挂载视觉感官">
                <ImageIcon size={18} />
              </button>
              <textarea ref={textareaRef} value={input} onChange={handleInput} onKeyDown={handleKeyDown} placeholder="输入指令 或 /swarm 触发自动开发..." className="w-full max-h-[200px] bg-transparent text-gray-100 placeholder-gray-600 pl-12 pr-12 py-4 resize-none outline-none text-[15px] leading-relaxed" rows={1} disabled={isLoading} />
              <button onClick={handleSend} disabled={(!input.trim() && !imageBase64) || isLoading} className={`absolute right-3 bottom-3 p-2 rounded-full transition-all duration-300 flex items-center justify-center z-10 ${(input.trim() || imageBase64) && !isLoading ? "bg-white text-black hover:bg-gray-200" : "bg-white/5 text-gray-600"}`}>
                <Send size={18} className={(input.trim() || imageBase64) && !isLoading ? "ml-0.5" : ""} />
              </button>
            </div>
            <div className="text-center mt-3 text-[11px] text-gray-600">
              MindVault V40.0: [GraphRAG 图谱] | [Swarm 多文件工程] | [Web Surfer 特工] | [3D 星空引擎] 已激活。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}