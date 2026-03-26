import React, { useState, useEffect } from 'react';
import { Search, Calendar, Trash2, X, Clock, MessageSquare, Filter, ChevronDown, Trash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, query, where, orderBy, getDocs, deleteDoc, doc, limit } from '../firebase';
import { cn } from '../lib/utils';

interface HistoryItem {
  id: string;
  query: string;
  response: string;
  timestamp: any;
}

interface Props {
  userId: string;
  onClose: () => void;
  onSelectMessage: (query: string, response: string) => void;
}

export default function ChatHistory({ userId, onClose, onSelectMessage }: Props) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'queries'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const querySnapshot = await getDocs(q);
      const items: HistoryItem[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as HistoryItem);
      });
      setHistory(items);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'queries', id));
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error("Error deleting history item:", error);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear all chat history?")) return;
    
    try {
      const deletePromises = history.map(item => deleteDoc(doc(db, 'queries', item.id)));
      await Promise.all(deletePromises);
      setHistory([]);
    } catch (error) {
      console.error("Error clearing history:", error);
    }
  };

  const filteredHistory = history.filter(item => {
    const matchesSearch = item.query.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.response.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (dateFilter === 'all') return true;

    const itemDate = item.timestamp?.toDate() || new Date();
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - itemDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (dateFilter === 'today') return diffDays <= 1;
    if (dateFilter === 'week') return diffDays <= 7;
    if (dateFilter === 'month') return diffDays <= 30;

    return true;
  });

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <Clock size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Chat History</h2>
            <p className="text-xs text-neutral-500 font-medium">{history.length} conversations saved</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input 
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="relative">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-all"
            >
              <Filter size={14} />
              <span>Filter: {dateFilter.charAt(0).toUpperCase() + dateFilter.slice(1)}</span>
              <ChevronDown size={14} className={cn("transition-transform", showFilters && "rotate-180")} />
            </button>
            
            <AnimatePresence>
              {showFilters && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 mt-2 w-40 bg-white border border-neutral-200 rounded-xl shadow-xl z-30 p-2"
                >
                  {(['all', 'today', 'week', 'month'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => { setDateFilter(f); setShowFilters(false); }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                        dateFilter === f ? "bg-indigo-50 text-indigo-600" : "text-neutral-600 hover:bg-neutral-50"
                      )}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {history.length > 0 && (
            <button 
              onClick={handleClearAll}
              className="flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all"
            >
              <Trash size={14} />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="text-sm font-medium">Loading history...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400 text-center px-6">
            <MessageSquare className="mb-4 opacity-20" size={48} />
            <p className="text-sm font-bold text-neutral-900 mb-1">No history found</p>
            <p className="text-xs">Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredHistory.map((item) => (
            <motion.div
              layout
              key={item.id}
              onClick={() => onSelectMessage(item.query, item.response)}
              className="group p-4 bg-white border border-neutral-200 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer relative"
            >
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                  {item.timestamp?.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <button 
                  onClick={(e) => handleDelete(item.id, e)}
                  className="p-1.5 text-neutral-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <h3 className="text-sm font-bold text-neutral-900 line-clamp-1 mb-1">{item.query}</h3>
              <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">{item.response}</p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function Loader2({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={cn("lucide lucide-loader-2", className)}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
