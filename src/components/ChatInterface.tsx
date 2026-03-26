import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Calculator, Table, LogIn, LogOut, AlertCircle, Mic, MicOff, Volume2, VolumeX, Loader2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Message, LoanRate, EMIData } from '../types';
import { chatWithGemini, speakText } from '../services/gemini';
import { fetchLoanRates, calculateEMI } from '../services/api';
import { cn, formatCurrency } from '../lib/utils';
import EMICalculator from './EMICalculator';
import InterestRatesTable from './InterestRatesTable';
import ChatHistory from './ChatHistory';
import Disclaimer from './Disclaimer';
import { auth, googleProvider, signInWithPopup, onAuthStateChanged, db, collection, addDoc, serverTimestamp, User } from '../firebase';

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, errorInfo: string | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen p-6 bg-rose-50 text-rose-900">
          <AlertCircle size={48} className="mb-4" />
          <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
          <p className="text-sm opacity-80 mb-6 text-center max-w-md">{this.state.errorInfo}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors"
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ChatContent() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Namaste! I'm Lonix, your AI financial assistant for Indian bank loans. Please sign in to save your chat history and get personalized loan advice.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAutoRead, setIsAutoRead] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const [showEMI, setShowEMI] = useState(false);
  const [showRates, setShowRates] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [ratesData, setRatesData] = useState<{ rbiRepoRate: string; banks: LoanRate[] } | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSpeak = async (text: string, messageId: string) => {
    if (currentlySpeakingId === messageId) {
      audioRef.current?.pause();
      setCurrentlySpeakingId(null);
      return;
    }

    // Stop any current audio
    if (audioRef.current) {
      audioRef.current.pause();
    }

    setCurrentlySpeakingId(messageId);
    
    try {
      const audioUrl = await speakText(text);
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = () => setCurrentlySpeakingId(null);
        audio.play();
      } else {
        setCurrentlySpeakingId(null);
      }
    } catch (error) {
      console.error("Speech Error:", error);
      setCurrentlySpeakingId(null);
    }
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-IN';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);
      if (user) {
        setMessages((prev) => [
          ...prev,
          {
            id: 'welcome-' + Date.now(),
            role: 'assistant',
            content: `Welcome back, ${user.displayName}! How can I help you with your loan queries today?`,
            timestamp: new Date(),
          }
        ]);
      }
    });

    // Fetch rates on mount
    const loadRates = async () => {
      try {
        const data = await fetchLoanRates();
        setRatesData(data);
      } catch (error) {
        console.error("Failed to load rates on mount:", error);
      }
    };
    loadRates();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setMessages([{
        id: '1',
        role: 'assistant',
        content: "You've been signed out. Namaste! I'm Lonix, your AI financial assistant for Indian bank loans. Please sign in to save your chat history.",
        timestamp: new Date(),
      }]);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const saveQueryToFirestore = async (query: string, response: string) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'queries'), {
        userId: currentUser.uid,
        query,
        response,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Firestore Save Error:", error);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    if (isListening) {
      recognitionRef.current?.stop();
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const lowerInput = input.toLowerCase();
      
      if (lowerInput.includes('emi') || lowerInput.includes('calculate')) {
        setShowEMI(true);
      }
      
      if (lowerInput.includes('rate') || lowerInput.includes('interest')) {
        const data = await fetchLoanRates();
        setRatesData(data);
        setShowRates(true);
      }

      const response = await chatWithGemini(input);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (isAutoRead) {
        handleSpeak(response, assistantMessage.id);
      }

      // Save to Firestore
      if (currentUser) {
        await saveQueryToFirestore(input, response);
      }
    } catch (error) {
      console.error("Chat Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectHistoryItem = (query: string, response: string) => {
    const userMsg: Message = {
      id: 'hist-u-' + Date.now(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    };
    const assistantMsg: Message = {
      id: 'hist-a-' + Date.now(),
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setShowHistory(false);
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-50 font-sans text-neutral-900">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <Bot size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-neutral-900">Lonix</h1>
            <p className="text-xs text-neutral-500 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              AI Financial Expert • RBI Aligned
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <button 
            onClick={() => setShowEMI(!showEMI)}
            className={cn(
              "p-3 rounded-xl transition-all duration-200 border",
              showEMI ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            )}
            title="EMI Calculator"
          >
            <Calculator size={22} />
          </button>
          <button 
            onClick={async () => {
              if (!ratesData) {
                try {
                  const data = await fetchLoanRates();
                  setRatesData(data);
                } catch (error) {
                  console.error("Failed to fetch rates on click:", error);
                }
              }
              setShowRates(!showRates);
              setShowEMI(false);
            }}
            className={cn(
              "p-3 rounded-xl transition-all duration-200 border",
              showRates ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            )}
            title="Interest Rates"
          >
            <Table size={22} />
          </button>
          {currentUser && (
            <button 
              onClick={() => {
                setShowHistory(!showHistory);
                setShowEMI(false);
                setShowRates(false);
              }}
              className={cn(
                "p-3 rounded-xl transition-all duration-200 border",
                showHistory ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
              )}
              title="Chat History"
            >
              <Clock size={22} />
            </button>
          )}
          <button 
            onClick={() => setIsAutoRead(!isAutoRead)}
            className={cn(
              "p-3 rounded-xl transition-all duration-200 border",
              isAutoRead ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            )}
            title={isAutoRead ? "Voice Assistant On" : "Voice Assistant Off"}
          >
            {isAutoRead ? <Volume2 size={22} /> : <VolumeX size={22} />}
          </button>
          <div className="w-px h-6 bg-neutral-200 mx-1" />
          {currentUser ? (
            <div className="flex items-center gap-3">
              <img src={currentUser.photoURL || ''} alt={currentUser.displayName || ''} className="w-9 h-9 rounded-full border border-neutral-200" referrerPolicy="no-referrer" />
              <button onClick={handleLogout} className="p-3 text-neutral-500 hover:text-rose-600 transition-colors" title="Sign Out">
                <LogOut size={22} />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
            >
              <LogIn size={18} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-neutral-200">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={cn(
                    "flex w-full",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn(
                    "flex gap-3 max-w-[85%] sm:max-w-[75%]",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-1",
                      msg.role === 'user' ? "bg-indigo-100 text-indigo-600" : "bg-white border border-neutral-200 text-neutral-600"
                    )}>
                      {msg.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
                    </div>
                    <div className={cn(
                      "p-4 rounded-2xl shadow-sm relative group",
                      msg.role === 'user' 
                        ? "bg-indigo-600 text-white rounded-tr-none" 
                        : "bg-white border border-neutral-200 text-neutral-800 rounded-tl-none"
                    )}>
                      <div className="prose prose-sm max-w-none prose-neutral dark:prose-invert">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className={cn(
                          "text-[10px] font-medium opacity-60",
                          msg.role === 'user' ? "text-indigo-100" : "text-neutral-400"
                        )}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {msg.role === 'assistant' && (
                          <button 
                            onClick={() => handleSpeak(msg.content, msg.id)}
                            className={cn(
                              "p-1 rounded-md transition-colors",
                              currentlySpeakingId === msg.id 
                                ? "bg-indigo-100 text-indigo-600" 
                                : "text-neutral-400 hover:bg-neutral-100 hover:text-indigo-600"
                            )}
                          >
                            {currentlySpeakingId === msg.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Volume2 size={12} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200 text-neutral-600 flex items-center justify-center mt-1">
                    <Bot size={16} />
                  </div>
                  <div className="bg-white border border-neutral-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-neutral-300 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-neutral-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-neutral-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-neutral-200 pb-safe">
            <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={currentUser ? "Ask about home loans, EMI..." : "Please sign in to chat..."}
                  disabled={!currentUser}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-4 pl-5 pr-14 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-base disabled:opacity-50"
                />
                <div className="absolute right-2 top-2 bottom-2 flex items-center">
                  <button
                    type="button"
                    onClick={toggleListening}
                    disabled={!currentUser}
                    className={cn(
                      "w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200",
                      isListening ? "bg-rose-100 text-rose-600 animate-pulse" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                    )}
                    title={isListening ? "Stop Listening" : "Start Listening"}
                  >
                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isLoading || !currentUser}
                className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-100 flex-shrink-0"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>

        {/* Side Panels (Desktop) */}
        <AnimatePresence>
          {(showEMI || showRates || showHistory) && (
            <motion.aside
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className="hidden lg:block w-96 bg-white border-l border-neutral-200 overflow-y-auto p-6 space-y-8 shadow-2xl z-20"
            >
              {showEMI && <EMICalculator />}
              {showRates && <InterestRatesTable data={ratesData} />}
              {showHistory && currentUser && (
                <ChatHistory 
                  userId={currentUser.uid} 
                  onClose={() => setShowHistory(false)} 
                  onSelectMessage={handleSelectHistoryItem}
                />
              )}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Mobile Overlays */}
        <AnimatePresence>
          {(showEMI || showRates || showHistory) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => { setShowEMI(false); setShowRates(false); setShowHistory(false); }}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {(showEMI || showRates || showHistory) && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] p-6 pb-12 z-50 max-h-[90vh] overflow-y-auto shadow-2xl border-t border-neutral-200"
            >
              <div className="w-12 h-1.5 bg-neutral-200 rounded-full mx-auto mb-8" onClick={() => { setShowEMI(false); setShowRates(false); setShowHistory(false); }} />
              {showEMI && <EMICalculator />}
              {showRates && <div className="mt-2"><InterestRatesTable data={ratesData} /></div>}
              {showHistory && currentUser && (
                <ChatHistory 
                  userId={currentUser.uid} 
                  onClose={() => setShowHistory(false)} 
                  onSelectMessage={handleSelectHistoryItem}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Disclaimer />
    </div>
  );
}

export default function ChatInterface() {
  return (
    <ErrorBoundary>
      <ChatContent />
    </ErrorBoundary>
  );
}
