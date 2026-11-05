import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  X,
  Send,
  MessageSquare,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Tag,
  Phone,
  Mail,
  User as UserIcon,
  Store,
  RefreshCw,
  PlusCircle,
  ChevronRight,
  Flame,
  FileQuestion,
  Headphones,
} from 'lucide-react';
import { api } from '../api.ts';
import { SupportTicket, TicketCategory, TicketPriority, User, Supermarket } from '../types.ts';

interface CustomerHelpCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  currentSupermarket: Supermarket | null;
}

export const CustomerHelpCenterModal: React.FC<CustomerHelpCenterModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentSupermarket,
}) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // New Ticket Form State
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('TECHNICAL_ISSUE');
  const [priority, setPriority] = useState<TicketPriority>('NORMAL');
  const [message, setMessage] = useState('');
  const [customerEmail, setCustomerEmail] = useState(
    currentUser.email !== 'guest@smartcart.co.ke' ? currentUser.email : ''
  );
  const [customerName, setCustomerName] = useState(
    currentUser.name !== 'Guest Shopper' ? currentUser.name : ''
  );
  const [customerPhone, setCustomerPhone] = useState(currentUser.phone || '');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadTickets();
      if (currentUser.email && currentUser.email !== 'guest@smartcart.co.ke') {
        setCustomerEmail(currentUser.email);
      }
      if (currentUser.name && currentUser.name !== 'Guest Shopper') {
        setCustomerName(currentUser.name);
      }
      if (currentUser.phone) {
        setCustomerPhone(currentUser.phone);
      }
    }
  }, [isOpen, currentUser]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await api.getSupportTickets({
        customer_id: currentUser.id !== 'usr_guest' ? currentUser.id : undefined,
        customer_email: currentUser.email !== 'guest@smartcart.co.ke' ? currentUser.email : undefined,
      });
      if (res.success) {
        setTickets(res.tickets);
        // If an active ticket was selected, update its state
        if (selectedTicket) {
          const updated = res.tickets.find((t) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
      }
    } catch (e) {
      console.error('Failed to load support tickets:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const cleanEmail = customerEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFormError('Please enter a valid email address so the system admin can reply to you.');
      return;
    }
    if (!subject.trim()) {
      setFormError('Please describe the topic of your request in the subject line.');
      return;
    }
    if (!message.trim()) {
      setFormError('Please enter your question or issue description.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.createSupportTicket({
        customer_id: currentUser.id,
        customer_name: customerName.trim() || 'Shopper',
        customer_email: cleanEmail,
        customer_phone: customerPhone.trim() || undefined,
        supermarket_id: currentSupermarket?.id,
        supermarket_name: currentSupermarket?.name,
        subject: subject.trim(),
        category,
        priority,
        initial_message: message.trim(),
      });

      if (res.success && res.ticket) {
        setFormSuccess('Your ticket has been sent to the System Administrator! We will assist you promptly.');
        setSubject('');
        setMessage('');
        setIsCreatingNew(false);
        setSelectedTicket(res.ticket);
        loadTickets();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit support request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setSendingReply(true);
    try {
      const res = await api.sendSupportMessage({
        ticket_id: selectedTicket.id,
        message: replyText.trim(),
        sender: 'CUSTOMER',
        sender_name: currentUser.name || selectedTicket.customer_name,
        sender_email: currentUser.email || selectedTicket.customer_email,
      });

      if (res.success && res.ticket) {
        setSelectedTicket(res.ticket);
        setReplyText('');
        loadTickets();
      }
    } catch (e) {
      console.error('Failed to send message:', e);
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header with Appealing Supermarket Support Background Image */}
        <div className="relative overflow-hidden text-white p-4 sm:p-5 flex items-center justify-between shrink-0 bg-emerald-950">
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <img
              src="/supermarket_hero.jpg"
              alt="Help center supermarket backdrop"
              className="w-full h-full object-cover object-center filter brightness-[0.55] contrast-[1.1] scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-purple-950/95 via-emerald-950/92 to-slate-950/95" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black shadow-md">
              <LifeBuoy className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg tracking-tight leading-tight">
                  Customer Help Center
                </h3>
                <span className="text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
                  Direct Admin Line
                </span>
              </div>
              <p className="text-[11px] text-emerald-200">
                Connected directly to System Admin Hiram Mark Karanja &bull; +254115868897
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="relative z-10 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Direct Administrator Emergency & Inquiry Quick Contact Hub */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white p-3.5 px-4 border-b border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black shrink-0 shadow-sm">
              <Headphones className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold text-white text-xs">Hiram Mark Karanja</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 uppercase">System Admin</span>
              </div>
              <div className="flex items-center gap-2.5 text-[11px] text-emerald-200/90 font-mono mt-0.5 flex-wrap">
                <a href="mailto:hirammarkkaranja@gmail.com" className="hover:text-amber-300 hover:underline flex items-center gap-1">
                  <Mail className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>hirammarkkaranja@gmail.com</span>
                </a>
                <span>&bull;</span>
                <a href="tel:+254115868897" className="hover:text-amber-300 hover:underline flex items-center gap-1">
                  <Phone className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>+254115868897</span>
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="tel:+254115868897"
              className="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 border border-emerald-600 shadow-xs transition active:scale-95"
              title="Call System Admin Hiram Mark Karanja directly"
            >
              <Phone className="w-3 h-3 text-amber-300" />
              <span>Call Now</span>
            </a>
            <a
              href="https://wa.me/254115868897?text=Hello%20Hiram%20Mark%20Karanja,%20I%20am%20using%20SmartCart%20KE%20and%20need%20assistance."
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 border border-emerald-500 shadow-xs transition active:scale-95"
              title="Message Hiram Mark Karanja on WhatsApp"
            >
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Top Tab Bar: My Tickets vs Open Ticket */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedTicket(null);
                setIsCreatingNew(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                !isCreatingNew && !selectedTicket
                  ? 'bg-emerald-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Support Inbox ({tickets.length})</span>
            </button>

            {selectedTicket && !isCreatingNew && (
              <span className="text-xs font-extrabold text-slate-900 bg-amber-100 border border-amber-300 text-amber-950 px-2.5 py-1 rounded-xl truncate max-w-[200px]">
                {selectedTicket.subject}
              </span>
            )}
          </div>

          {!isCreatingNew && (
            <button
              onClick={() => {
                setIsCreatingNew(true);
                setSelectedTicket(null);
                setFormError('');
                setFormSuccess('');
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Contact System Admin</span>
            </button>
          )}
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-xs text-slate-800">
          {formSuccess && (
            <div className="p-3 mb-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          {/* VIEW 1: CREATING A NEW TICKET / MESSAGE TO ADMIN */}
          {isCreatingNew ? (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-950 leading-relaxed space-y-1">
                <div className="font-extrabold flex items-center gap-1.5 text-blue-900">
                  <Shield className="w-4 h-4 text-blue-700" />
                  <span>Send a Message to System Admin</span>
                </div>
                <p className="text-[11px] text-blue-800">
                  Whether you noticed a price discrepancy, had trouble scanning a barcode, have suggestions, or need account recovery help, our system administration team monitors this live line.
                </p>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateTicket} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Your Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Your Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. John Kamau"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Inquiry Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as TicketCategory)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    >
                      <option value="TECHNICAL_ISSUE">📱 Scanner / App Technical Issue</option>
                      <option value="PRICE_DISPUTE">🏷️ Price or Shelf Tag Discrepancy</option>
                      <option value="ACCOUNT_HELP">🔐 Account / Password / Points Help</option>
                      <option value="FEEDBACK">💡 Feature Request / Feedback</option>
                      <option value="EMERGENCY">🚨 Urgent Floor Dispute / Payment Help</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Urgency Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as TicketPriority)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    >
                      <option value="LOW">Low (General Query)</option>
                      <option value="NORMAL">Normal (Standard Assistance)</option>
                      <option value="HIGH">High (Active Shopping Issue)</option>
                      <option value="URGENT">Urgent (Immediate Help Required)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Subject / Summary <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Milk barcode scanned KSh 65 instead of advertised KSh 58"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Detailed Message <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide details about what you experienced, which supermarket branch or aisle you are in, and how the admin can assist you..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white font-extrabold shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    {loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5 text-amber-300" />
                    )}
                    <span>Submit to System Admin</span>
                  </button>
                </div>
              </form>
            </div>
          ) : selectedTicket ? (
            /* VIEW 2: ACTIVE TICKET THREAD & CONVERSATION */
            <div className="space-y-4 animate-in fade-in flex flex-col h-full">
              {/* Ticket Top Meta */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Ticket #{selectedTicket.id.slice(-6)} • {selectedTicket.category.replace('_', ' ')}
                    </span>
                    <h4 className="font-extrabold text-sm text-slate-900">{selectedTicket.subject}</h4>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                      selectedTicket.status === 'RESOLVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedTicket.status === 'REPLIED'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedTicket.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
                  {selectedTicket.supermarket_name && (
                    <span className="flex items-center gap-1">
                      <Store className="w-3 h-3 text-emerald-700" />
                      {selectedTicket.supermarket_name}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(selectedTicket.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Message Thread */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {selectedTicket.messages.map((m) => {
                  const isAdmin = m.sender === 'SYSTEM_ADMIN';
                  return (
                    <div
                      key={m.id}
                      className={`p-3 rounded-2xl text-xs space-y-1 border ${
                        isAdmin
                          ? 'bg-blue-50/90 border-blue-200 text-blue-950 ml-4'
                          : 'bg-slate-50 border-slate-200 text-slate-800 mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold flex items-center gap-1">
                          {isAdmin ? (
                            <>
                              <Shield className="w-3 h-3 text-blue-700" />
                              <span className="text-blue-900 font-extrabold">System Administrator</span>
                            </>
                          ) : (
                            <>
                              <UserIcon className="w-3 h-3 text-slate-500" />
                              <span className="text-slate-800 font-bold">{m.sender_name}</span>
                            </>
                          )}
                        </span>
                        <span className="text-slate-400 font-mono">
                          {new Date(m.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
                    </div>
                  );
                })}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="flex gap-2 pt-2 border-t border-slate-100">
                <input
                  type="text"
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a reply to the System Administrator..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
                <button
                  type="submit"
                  disabled={sendingReply}
                  className="px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {sendingReply ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Reply</span>
                </button>
              </form>
            </div>
          ) : (
            /* VIEW 3: INBOX / LIST OF PREVIOUS TICKETS */
            <div className="space-y-3">
              {loading && tickets.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-700" />
                  <p>Loading help center requests...</p>
                </div>
              ) : tickets.length === 0 ? (
                <div className="py-8 px-4 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                    <Headphones className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">No Active Support Requests</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm mx-auto">
                      Have a question, barcode issue, or need help from the central management team?
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCreatingNew(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white font-extrabold text-xs shadow transition inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-amber-300" />
                    <span>Open New Support Request</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Recent Conversations ({tickets.length})
                  </p>
                  {tickets.map((t) => {
                    const lastMsg = t.messages[t.messages.length - 1];
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className="p-3 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                t.status === 'RESOLVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : t.status === 'REPLIED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {t.status}
                            </span>
                            <span className="text-xs font-black text-slate-900 truncate">
                              {t.subject}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            {lastMsg ? `${lastMsg.sender === 'SYSTEM_ADMIN' ? 'Admin: ' : 'You: '} ${lastMsg.message}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 group-hover:text-emerald-700 shrink-0">
                          <span className="text-[10px] font-mono">
                            {new Date(t.updated_at).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
