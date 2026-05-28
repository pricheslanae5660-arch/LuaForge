import React, { useState, useRef, useEffect } from 'react';
import { Bot, Loader2, Sparkles, AlertCircle, Copy, Check, Download, FileCode, CheckCircle2, ChevronRight, FileText, History, MessageSquare, Send, X, Clock, Upload, Crown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';

export default function Workbench() {
  const { user, userData, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [idea, setIdea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeFile, setActiveFile] = useState<string | null>(null);

  // History state
  const [history, setHistory] = useState<{id: string, idea: string, result: any, date: string}[]>(() => {
    try {
      const saved = localStorage.getItem('luaforge-history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('luaforge-history', JSON.stringify(history));
    } catch (e) {
      console.warn("Could not save history to localStorage. Pruning older items...", e);
      if (history.length > 1) {
        setHistory(history.slice(0, 1)); // Keep only the latest on error
      }
    }
  }, [history]);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'assistant', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  const handleGenerate = async () => {
    if (!idea.trim() || !user) return;
    if (!userData) {
      setError('Loading user profile, please wait or refresh...');
      return;
    }
    
    // Check limits
    const limit = userData.tier === 'free' ? 1 : userData.tier === 'pro' ? 7 : 150;
    if (userData.generationsUsed >= limit) {
      setError('You have reached the generation limit for your plan.');
      navigate('/pricing');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    setResult(null);
    setActiveFile(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate');
      }

      setResult(data.result);
      if (data.result && data.result.files && data.result.files.length > 0) {
        setActiveFile(data.result.files[0].filename);
      }
      
      // Save to history
      const newItem = {
        id: Date.now().toString(),
        idea: idea,
        result: data.result,
        date: new Date().toISOString()
      };
      setHistory(prev => [newItem, ...prev]);

      // increment usage
      await setDoc(doc(db, 'users', user.uid), {
        generationsUsed: (userData.generationsUsed || 0) + 1
      }, { merge: true });
      refreshUserData();
      
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChatSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || isChatting || !user) return;
    if (!userData) return;

    const limit = userData.tier === 'free' ? 2 : userData.tier === 'pro' ? 800 : 3000;
    if (userData.chatUsed >= limit) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: '**Notice:** You have reached your chat limit for this billing period. Please upgrade your plan.' }]);
      return;
    }

    const userMessage = chatInput.trim();
    setChatInput('');
    const newMessages = [...chatMessages, { role: 'user' as const, content: userMessage }];
    setChatMessages(newMessages);
    setIsChatting(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, gamePack: result }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get chat response');
      }

      setChatMessages([...newMessages, { role: 'assistant', content: data.reply }]);

      // increment usage
      await setDoc(doc(db, 'users', user.uid), {
        chatUsed: (userData.chatUsed || 0) + 1
      }, { merge: true });
      refreshUserData();
    } catch (err: any) {
      setChatMessages([...newMessages, { role: 'assistant', content: `**Error:** ${err.message}` }]);
    } finally {
      setIsChatting(false);
    }
  };

  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const processZipFile = async (file: File) => {
    try {
      const zip = await JSZip.loadAsync(file);
      const files: {filename: string, content: string}[] = [];
      
      let overview = 'Imported Project from ' + file.name;
      let setupGuide = 'Project successfully loaded from zip file.';
      let mapInstructions = '';

      for (const [path, zipEntry] of Object.entries(zip.files)) {
        if (!zipEntry.dir) {
          const fileName = path.split('/').pop() || path;
          if (fileName.endsWith('.lua')) {
            const content = await zipEntry.async('string');
            files.push({ filename: fileName, content });
          } else if (fileName === 'Overview.md') {
            overview = await zipEntry.async('string');
          } else if (fileName === 'SetupGuide.md') {
            setupGuide = await zipEntry.async('string');
          } else if (fileName === 'MapInstructions.md') {
            mapInstructions = await zipEntry.async('string');
          }
        }
      }
      
      if (files.length > 0) {
        const gameName = file.name.replace('.zip', '');
        const newResult = {
           gameName,
           overview,
           setupGuide,
           mapInstructions,
           files,
        };
        
        setResult(newResult);
        setActiveFile(files[0].filename);
        
        // Add to history
        setHistory(prev => [{
            id: Date.now().toString(),
            idea: `Imported ${file.name}`,
            result: newResult,
            date: new Date().toISOString()
        }, ...prev]);
      } else {
        throw new Error("No valid Lua files or markdown docs found in the zip file.");
      }
    } catch (err: any) {
      setError('Failed to load zip file: ' + err.message);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    
    const file = e.dataTransfer?.files[0];
    if (file && file.name.endsWith('.zip')) {
      await processZipFile(file);
    } else {
      setError('Please drop a valid .zip file containing Lua scripts.');
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.zip')) {
      await processZipFile(file);
    } else if (file) {
      setError('Please upload a valid .zip file.');
    }
    // clear value to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopy = () => {
    if (!result || !activeFile) return;
    
    const file = result.files?.find((f: any) => f.filename === activeFile);
    if (file) {
      navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = async () => {
    if (!result || !result.files) return;
    
    const zip = new JSZip();
    const folderName = (result.gameName || "GamePack").replace(/[^a-z0-9]/gi, '_');
    const folder = zip.folder(folderName);
    
    if (!folder) return;

    // Add Lua files
    result.files.forEach((file: any) => {
      folder.file(file.filename, file.content);
    });

    // Generate RBXMX Model
    let rbxmx = `<?xml version="1.0" encoding="utf-8"?>
<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">
  <Meta name="ExplicitAutoJoints">true</Meta>
  <External>null</External>
  <External>nil</External>
  <Item class="Folder" referent="RBX0">
    <Properties>
      <string name="Name">${folderName}</string>
    </Properties>`;
    
    result.files.forEach((file: any, index: number) => {
      let scriptName = file.filename.replace('.lua', '').replace('.txt', '');
      let cdata = file.content.replace(/\]\]>/g, ']]]]><![CDATA[>');
      rbxmx += `
    <Item class="Script" referent="RBX${index + 1}">
      <Properties>
        <string name="Name">${scriptName}</string>
        <ProtectedString name="Source"><![CDATA[${cdata}]]></ProtectedString>
      </Properties>
    </Item>`;
    });

    rbxmx += `
  </Item>
</roblox>`;

    folder.file(folderName + ".rbxmx", rbxmx);

    // Add markdown docs
    if (result.overview) folder.file("Overview.md", result.overview);
    if (result.mapInstructions) folder.file("MapInstructions.md", result.mapInstructions);
    if (result.setupGuide) folder.file("SetupGuide.md", result.setupGuide);

    const blob = await zip.generateAsync({ type: "blob" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = folderName + ".zip";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const suggestions = [
    "Tower lava parkour game where players climb and collect coins.",
    "A pet collecting simulator where eggs hatch rare pets.",
    "A game where you run a pizza shop and deliver to customers.",
    "Survive the zombie wave on a deserted island."
  ];

  return (
    <div 
      className="h-screen w-full flex flex-col bg-slate-50 font-sans text-slate-900 overflow-hidden relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        accept=".zip" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileUpload} 
      />
      
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500/90 z-50 flex flex-col items-center justify-center text-white backdrop-blur-sm">
          <Sparkles className="w-16 h-16 mb-4 animate-bounce" />
          <h2 className="text-3xl font-bold tracking-tight">Drop your zip file</h2>
          <p className="text-lg opacity-90 mt-2">Load your GamePack and start editing</p>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="h-14 bg-slate-900 text-white flex items-center justify-between px-6 shrink-0 shadow z-10">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-xl text-white">L</div>
          <h1 className="text-lg font-semibold tracking-tight text-white">LuaForge <span className="text-slate-400 font-normal hidden sm:inline">| Roblox Game Pack Generator</span></h1>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <button onClick={() => auth.signOut()} className="text-xs font-bold text-slate-400 hover:text-white transition-colors">Sign Out</button>
          <div className="w-px h-5 bg-slate-700 hidden sm:block mx-1"></div>
          <button
            onClick={() => { setIsHistoryOpen(!isHistoryOpen); if(!isHistoryOpen) setIsChatOpen(false); }}
            className={`p-1.5 rounded transition-colors ${isHistoryOpen ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title="History"
          >
            <History className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setIsChatOpen(!isChatOpen); if(!isChatOpen) setIsHistoryOpen(false); }}
            className={`p-1.5 rounded transition-colors ${isChatOpen ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title="Chat Assistant"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className={`p-1.5 rounded transition-colors text-slate-400 hover:bg-slate-800 hover:text-slate-200`}
            title="Upload .zip Pack"
          >
            <Upload className="w-5 h-5" />
          </button>
          <div className="w-px h-5 bg-slate-700 hidden sm:block mx-1"></div>
          {result && (
             <div className="hidden sm:block px-3 py-1 bg-slate-800 rounded text-xs font-medium text-slate-300 border border-slate-700">
               {result.gameName || "Game Pack"}
             </div>
          )}
          
          <button
            onClick={() => navigate('/pricing')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 rounded-md font-bold text-xs transition-colors shadow-lg"
          >
            <Crown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upgrade Plan</span>
          </button>

          <button 
            onClick={async () => {
              if (!result || !result.files) return;
              const folderName = (result.gameName || "GamePack").replace(/[^a-z0-9]/gi, '_');
              let rbxmx = `<?xml version="1.0" encoding="utf-8"?>\n<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">\n  <Meta name="ExplicitAutoJoints">true</Meta>\n  <External>null</External>\n  <External>nil</External>\n  <Item class="Folder" referent="RBX0">\n    <Properties>\n      <string name="Name">${folderName}</string>\n    </Properties>`;
              result.files.forEach((file: any, index: number) => {
                let scriptName = file.filename.replace('.lua', '').replace('.txt', '');
                let cdata = file.content.replace(/\]\]>/g, ']]]]><![CDATA[>');
                rbxmx += `\n    <Item class="Script" referent="RBX${index + 1}">\n      <Properties>\n        <string name="Name">${scriptName}</string>\n        <ProtectedString name="Source"><![CDATA[${cdata}]]></ProtectedString>\n      </Properties>\n    </Item>`;
              });
              rbxmx += `\n  </Item>\n</roblox>`;
              await navigator.clipboard.writeText(rbxmx);
              alert("Roblox Model Copied! Now open Roblox Studio, select Workspace, and press Ctrl+V to paste.");
            }}
            disabled={!result || isGenerating}
            className="bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 px-4 py-1.5 rounded flex items-center gap-2 text-sm font-medium transition-colors shadow-lg"
          >
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">Copy to Roblox (Pasting)</span>
            <span className="sm:hidden">Copy Model</span>
          </button>
          
          <button 
            onClick={() => {
              if (userData?.tier === 'free') {
                alert('Free tier does not support Zip downloads. Please upgrade to Pro or Premium.');
                navigate('/pricing');
                return;
              }
              handleDownload();
            }}
            disabled={!result || isGenerating}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 px-4 py-1.5 rounded flex items-center gap-2 text-sm font-medium transition-colors shadow-lg"
            title={userData?.tier === 'free' ? "Pro/Premium feature" : "Download Zip"}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download Pack (.zip)</span>
            <span className="sm:hidden">.zip</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* If no result, show the large welcome/input screen */}
        {!result && (
          <div className="flex-1 overflow-auto bg-slate-50">
            <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
              
              {/* Header */}
              <div className="text-center space-y-4 mb-10">
                 <div className="inline-flex items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl mb-2 shadow-sm">
                   <Bot className="w-10 h-10 text-blue-500" />
                 </div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-3">
                  Roblox Game Generator
                </h2>
                <p className="text-base text-slate-600 max-w-2xl mx-auto">
                  Describe your idea and Instantly get a developer-ready Game Pack featuring full Lua scripts, map structures, and setup guides.
                </p>
              </div>

               {/* Input Area */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-10">
                <div className="space-y-6">
                  <div>
                    <label htmlFor="idea" className="block text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-2">
                      Game Idea
                    </label>
                    <textarea
                      id="idea"
                      rows={4}
                      value={idea}
                      onChange={(e) => setIdea(e.target.value)}
                      placeholder="Describe your game idea (e.g., 'Make a tower lava parkour game...')"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y text-sm font-mono"
                    />
                  </div>

                {/* Suggestions */}
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-3">Try these examples:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => setIdea(suggestion)}
                        className="text-xs px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-full transition-colors font-medium"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !idea.trim()}
                    className="flex-1 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:text-slate-500 text-white font-medium rounded-lg shadow flex items-center justify-center gap-2 transition-colors text-sm"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating Pack...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate Game Pack
                      </>
                    )}
                  </button>
                  <div className="flex items-center justify-center text-sm font-medium text-slate-400">or</div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 px-6 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors text-sm"
                  >
                    <Upload className="w-4 h-4 text-slate-500" />
                    Upload .zip
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4"
                  >
                    <div className="flex items-center gap-3 p-3 text-red-600 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            </div>
          </div>
        )}

        {/* Workbench UI when result is ready */}
        {result && !isGenerating && (
          <div className="flex-1 flex overflow-hidden w-full h-full">
            
            {/* Left Sidebar: File Explorer */}
            <aside className="w-64 bg-slate-100 border-r border-slate-200 flex flex-col shrink-0">
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h2 className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-2">Project Files</h2>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  {result.gameName || 'GamePack'}
                </div>
              </div>
              <nav className="flex-1 overflow-y-auto py-2">
                
                <div className="px-4 py-2 text-[11px] uppercase tracking-wider font-bold text-slate-400">Lua Scripts</div>
                {result.files?.map((file: any) => (
                  <button
                    key={file.filename}
                    onClick={() => setActiveFile(file.filename)}
                    className={`w-full text-left px-4 py-1.5 text-sm flex items-center gap-2 transition-colors ${
                      activeFile === file.filename 
                        ? 'bg-white text-blue-700 font-medium border-l-2 border-blue-600' 
                        : 'text-slate-600 hover:bg-slate-200 border-l-2 border-transparent'
                    }`}
                  >
                    <span className={activeFile === file.filename ? "text-blue-600" : "text-slate-400"}>◈</span> 
                    <span className="truncate">{file.filename}</span>
                  </button>
                ))}

                <div className="mt-4 px-4 py-2 text-[11px] uppercase tracking-wider font-bold text-slate-400">Documentation</div>
                <button
                    onClick={() => setActiveFile('Guide')}
                    className={`w-full text-left px-4 py-1.5 text-sm flex items-center gap-2 transition-colors ${
                      activeFile === 'Guide' 
                        ? 'bg-white text-blue-700 font-medium border-l-2 border-blue-600' 
                        : 'text-slate-600 hover:bg-slate-200 border-l-2 border-transparent'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    README & Setup
                </button>
              </nav>
            </aside>

            {/* Central Editor View */}
            <main className="flex-1 flex flex-col bg-[#1e1e1e] border-r border-slate-700 h-full overflow-hidden">
              <div className="h-10 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
                  <span>src</span>
                  <span className="text-slate-500">/</span>
                  <span className="text-white font-medium">{activeFile}</span>
                </div>
                {activeFile !== 'Guide' && (
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2 py-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors text-xs font-medium"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy Code'}
                  </button>
                )}
              </div>
              
              <div className="flex-1 overflow-auto p-4 md:p-6 text-slate-300">
                {activeFile === 'Guide' ? (
                   <div className="max-w-3xl font-sans bg-slate-900 rounded-lg p-6 border border-slate-700">
                     <div className="prose prose-invert prose-slate prose-headings:text-slate-100 prose-a:text-blue-400 prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 prose-code:text-blue-300 text-sm">
                       <h2 className="border-b border-slate-700 pb-2 mb-4">Overview</h2>
                       <ReactMarkdown>{result.overview || ''}</ReactMarkdown>
                       
                       <h2 className="border-b border-slate-700 pb-2 mt-8 mb-4">Map Instructions</h2>
                       <ReactMarkdown>{result.mapInstructions || ''}</ReactMarkdown>
                       
                       <h2 className="border-b border-slate-700 pb-2 mt-8 mb-4">Setup Guide</h2>
                       <ReactMarkdown>{result.setupGuide || ''}</ReactMarkdown>
                     </div>
                   </div>
                ) : (
                  <textarea
                    value={result.files?.find((f: any) => f.filename === activeFile)?.content || ''}
                    onChange={(e) => {
                      if (!result) return;
                      const newFiles = result.files.map((f: any) => {
                        if (f.filename === activeFile) {
                          return { ...f, content: e.target.value };
                        }
                        return f;
                      });
                      const newResult = { ...result, files: newFiles };
                      setResult(newResult);
                      
                      // Also update the latest history item if it matches the current game
                      setHistory(prev => {
                        if (prev.length > 0 && prev[0].result?.gameName === newResult.gameName) {
                          const updated = [...prev];
                          updated[0] = { ...updated[0], result: newResult };
                          return updated;
                        }
                        return prev;
                      });
                    }}
                    className="w-full h-full bg-transparent text-slate-300 font-mono text-[13px] leading-relaxed resize-none focus:outline-none p-0"
                    spellCheck="false"
                  />
                )}
              </div>
            </main>
          </div>
        )}
        
        {/* Right Panel: History */}
        {isHistoryOpen && (
          <aside className="absolute right-0 top-14 bottom-8 w-80 bg-white border-l border-slate-200 shadow-xl z-20 flex flex-col sm:static sm:h-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
                <History className="w-4 h-4" /> Generation History
              </h2>
              <button className="sm:hidden text-slate-500 hover:text-slate-700" onClick={() => setIsHistoryOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No history yet.</p>
              ) : (
                history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setResult(item.result);
                      if (item.result.files && item.result.files.length > 0) {
                        setActiveFile(item.result.files[0].filename);
                      } else {
                        setActiveFile('Guide');
                      }
                      setIdea(item.idea);
                      if (window.innerWidth < 640) setIsHistoryOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    <h3 className="font-medium text-sm text-slate-900 truncate">{item.result?.gameName || "Pack"}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">{item.idea}</p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-2">
                       <Clock className="w-3 h-3" />
                       {new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>
        )}

        {/* Right Panel: Chat */}
        {isChatOpen && (
          <aside className="absolute right-0 top-14 bottom-8 w-80 sm:w-96 bg-white border-l border-slate-200 shadow-xl z-20 flex flex-col sm:static sm:h-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
                <Bot className="w-4 h-4 text-blue-600" /> Lua Assistant
              </h2>
              <button className="sm:hidden text-slate-500 hover:text-slate-700" onClick={() => setIsChatOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {chatMessages.length === 0 && (
                <div className="text-center py-8 text-sm text-slate-500">
                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                  <p>Ask questions about the code, or request logic fixes.</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-[13px] ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-800 shadow-sm'}`}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <div className="prose prose-sm prose-p:my-1 prose-pre:my-2 prose-pre:bg-slate-900 prose-pre:p-2 prose-pre:rounded-lg prose-pre:text-slate-300">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isChatting && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                     <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></span>
                     <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 bg-white border-t border-slate-200">
              <form onSubmit={handleChatSubmit} className="relative flex items-end">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleChatSubmit();
                    }
                  }}
                  placeholder="Ask a question or request a fix..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  rows={2}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isChatting}
                  className="absolute right-2 bottom-2 p-1.5 bg-blue-600 text-white rounded-lg disabled:bg-slate-300 disabled:text-slate-500 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </aside>
        )}
      </div>
      
      {/* Bottom Status Bar */}
      <footer className="h-8 bg-slate-200 border-t border-slate-300 flex items-center px-4 justify-between shrink-0 mt-auto">
        <div className="flex gap-4 text-[10px] font-medium text-slate-500 uppercase tracking-widest">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isGenerating ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></span>
            {isGenerating ? 'Processing request...' : 'Generator Ready'}
          </div>
          {userData && (
            <div className="hidden sm:inline-flex items-center gap-4 text-blue-600">
               <span>Packs: {userData.generationsUsed} / {userData.tier === 'free' ? 1 : userData.tier === 'pro' ? 7 : 150}</span>
               <span>Chat: {userData.chatUsed} / {userData.tier === 'free' ? 2 : userData.tier === 'pro' ? 800 : 3000}</span>
            </div>
          )}
          {result && !isGenerating && (
             <div className="hidden sm:inline-flex items-center gap-1 text-slate-600">
               <FileCode className="w-3 h-3" />
               {result.files?.length || 0} Scripts Generated
             </div>
          )}
        </div>
        <div className="text-[10px] text-slate-400 italic font-medium hidden sm:block truncate">Generated by LuaForge Engine</div>
      </footer>
    </div>
  );
}
