import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, MessageCircle } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { io, Socket } from 'socket.io-client';
import { api } from '../lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [replies, setReplies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user, accessToken } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && activeTicket) {
      // Connect to support namespace
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const baseUrl = apiUrl.replace(/\/api$/, '');
      const socket = io(`${baseUrl}/support`, {
        auth: { token: accessToken },
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join_ticket', { ticketId: activeTicket.id });
      });

      socket.on('new_message', (reply) => {
        setReplies((prev) => [...prev, reply]);
        scrollToBottom();
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [isOpen, activeTicket, accessToken]);

  useEffect(() => {
    if (isOpen && !activeTicket) {
      loadTickets();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }, 100);
  };

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const tickets = await api.get<any[]>('/support/my-tickets');
      if (tickets && tickets.length > 0) {
        // Find most recent open/in-progress ticket
        const active = tickets.find((t: any) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
        if (active) {
          setActiveTicket(active);
          setReplies(active.replies || []);
          scrollToBottom();
        }
      }
    } catch (error) {
      console.error('Failed to load tickets', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createTicket = async () => {
    setIsLoading(true);
    try {
      const ticket = await api.post('/support/tickets', {
        subject: 'Chat Support Request',
        message: 'Hello, I need assistance.',
        category: 'SUPPORT',
        priority: 'MEDIUM',
      });
      setActiveTicket(ticket);
      setReplies([]);
    } catch (error) {
      toast.error('Failed to start chat');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = () => {
    if (!message.trim() || !activeTicket || !socketRef.current) return;

    socketRef.current.emit('send_message', {
      ticketId: activeTicket.id,
      message: message.trim(),
    });

    setMessage('');
  };

  if (!user || user.role === 'ADMIN') return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-[350px] sm:w-[400px] h-[500px] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-indigo-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold">Customer Care</h3>
                  <div className="flex items-center gap-1.5 text-xs opacity-90">
                    <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></span>
                    Support is online
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Chat Body */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50"
            >
              {!activeTicket ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="h-16 w-16 bg-primary-50 rounded-full flex items-center justify-center text-primary-600">
                    <MessageCircle className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Need help?</h4>
                    <p className="text-sm text-gray-500 mt-1">Our team is ready to assist you with any questions or issues.</p>
                  </div>
                  <button
                    onClick={createTicket}
                    disabled={isLoading}
                    className="px-6 py-2.5 bg-primary-600 text-white rounded-full font-bold hover:shadow-lg hover:shadow-primary-500/30 transition-all disabled:opacity-50"
                  >
                    Start New Chat
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex justify-center">
                    <span className="px-3 py-1 bg-gray-200/50 rounded-full text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Ticket #{activeTicket.id.slice(-6)}
                    </span>
                  </div>
                  
                  {replies.map((reply: any, idx: number) => (
                    <div
                      key={idx}
                      className={`flex ${reply.isAdmin ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                          reply.isAdmin
                            ? 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                            : 'bg-primary-600 text-white rounded-tr-none'
                        }`}
                      >
                        <p>{reply.message}</p>
                        <p className={`text-[10px] mt-1 ${reply.isAdmin ? 'text-gray-400' : 'text-primary-100'}`}>
                          {format(new Date(reply.createdAt), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Input */}
            {activeTicket && (
              <div className="p-4 bg-white border-t border-gray-100">
                <div className="flex items-center gap-2 bg-gray-100 rounded-2xl p-2 pl-4">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!message.trim()}
                    className="h-8 w-8 bg-primary-600 text-white rounded-xl flex items-center justify-center hover:shadow-md transition-all disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 bg-gradient-to-r from-primary-600 to-indigo-600 rounded-full shadow-lg shadow-primary-500/30 flex items-center justify-center text-white relative"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold">
            1
          </span>
        )}
      </motion.button>
    </div>
  );
}
