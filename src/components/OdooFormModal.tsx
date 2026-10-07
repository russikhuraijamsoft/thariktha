import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Check, Printer, FileText, Send, Paperclip, 
  Clock, User, Boxes, CreditCard, Truck, AlertCircle,
  MessageSquare, Calendar, ChevronRight, Tag, ShieldCheck,
  Edit2, Trash2, Plus
} from 'lucide-react';

export interface OdooFormRecord {
  id: string;
  type: 'order' | 'product' | 'job' | 'customer' | 'repair';
  title: string;
  subtitle?: string;
  status: string;
  stages: string[];
  totalAmount?: number;
  data: Record<string, any>;
  chatterLogs?: Array<{
    id: string;
    author: string;
    type: 'message' | 'note' | 'activity' | 'status_change';
    body: string;
    timestamp: string;
  }>;
}

interface OdooFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: OdooFormRecord | null;
  onStatusChange?: (newStatus: string) => void;
  onSave?: (updatedData: any) => void;
  onAddChatterLog?: (type: 'message' | 'note', body: string) => void;
  onPrint?: () => void;
}

export const OdooFormModal: React.FC<OdooFormModalProps> = ({
  isOpen,
  onClose,
  record,
  onStatusChange,
  onSave,
  onAddChatterLog,
  onPrint
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'specs' | 'financials' | 'notes'>('details');
  const [chatterInput, setChatterInput] = useState('');
  const [chatterMode, setChatterMode] = useState<'message' | 'note'>('note');

  if (!isOpen || !record) return null;

  const currentStageIndex = record.stages.findIndex(
    s => s.toLowerCase() === record.status.toLowerCase()
  );

  const handlePostChatter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatterInput.trim()) return;
    if (onAddChatterLog) {
      onAddChatterLog(chatterMode, chatterInput);
    }
    setChatterInput('');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-8 p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm"
        />

        {/* Odoo Standard Document Form Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          className="relative w-full max-w-5xl bg-[#1e232a] text-neutral-100 rounded-2xl shadow-2xl border border-neutral-700/80 overflow-hidden z-10 flex flex-col max-h-[92vh]"
        >
          {/* Top Control Bar (Action Buttons + Status Bar Ribbon) */}
          <div className="px-5 py-3.5 bg-[#171b22] border-b border-neutral-700/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Left Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  if (onStatusChange && record.stages.length > 1) {
                    const nextStage = record.stages[Math.min(record.stages.length - 1, (currentStageIndex + 1) || 1)];
                    onStatusChange(nextStage);
                  }
                }}
                className="px-3 py-1.5 bg-[#714B67] hover:bg-[#86597a] text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                Confirm / Advance Stage
              </button>

              {onPrint && (
                <button
                  onClick={onPrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium border border-neutral-700 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium border border-neutral-700/60 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Right: Odoo Status Bar (Chevron Pipeline Ribbon) */}
            <div className="flex items-center bg-[#12151b] border border-neutral-700 rounded-lg overflow-x-auto p-0.5">
              {record.stages.map((stage, idx) => {
                const isActive = idx === currentStageIndex || stage.toLowerCase() === record.status.toLowerCase();
                const isPassed = currentStageIndex > -1 && idx < currentStageIndex;

                return (
                  <button
                    key={stage}
                    onClick={() => onStatusChange && onStatusChange(stage)}
                    className={`flex items-center gap-1 px-3 py-1 text-xs font-medium transition cursor-pointer whitespace-nowrap rounded-md ${
                      isActive
                        ? 'bg-[#714B67] text-white shadow-xs font-semibold'
                        : isPassed
                        ? 'text-neutral-300 hover:text-white'
                        : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    {isPassed && <Check className="w-3 h-3 text-emerald-400" />}
                    <span>{stage}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Document Body Area */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
            
            {/* Main Form Sheet */}
            <div className="flex-1 bg-[#252b34] border border-neutral-700/80 rounded-xl p-6 shadow-sm flex flex-col">
              
              {/* Header of the Sheet (Title & Smart Buttons) */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pb-5 border-b border-neutral-700/70">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-[#d97706] uppercase">
                    {record.type.toUpperCase()} DOCUMENT
                  </span>
                  <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">
                    {record.title}
                  </h1>
                  {record.subtitle && (
                    <p className="text-xs text-neutral-400 mt-0.5">{record.subtitle}</p>
                  )}
                </div>

                {/* Odoo Smart Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1f26] border border-neutral-700 rounded-lg text-xs">
                    <Boxes className="w-4 h-4 text-emerald-400" />
                    <div className="text-left">
                      <div className="text-[10px] text-neutral-400 leading-tight">Stock on Hand</div>
                      <div className="font-bold text-white">24 Units</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1f26] border border-neutral-700 rounded-lg text-xs">
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    <div className="text-left">
                      <div className="text-[10px] text-neutral-400 leading-tight">Invoice Status</div>
                      <div className="font-bold text-white">{record.data.paymentStatus || 'Confirmed'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary Key-Value Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 py-5 border-b border-neutral-700/70 text-xs">
                <div>
                  <span className="text-neutral-400 block text-[11px] mb-1">Customer / Club</span>
                  <strong className="text-white text-sm font-semibold">
                    {record.data.customerName || record.data.name || 'Standard Client'}
                  </strong>
                </div>

                <div>
                  <span className="text-neutral-400 block text-[11px] mb-1">Branch / Location</span>
                  <strong className="text-white">
                    {record.data.branchId || record.data.branch || 'Melbourne Closets'}
                  </strong>
                </div>

                <div>
                  <span className="text-neutral-400 block text-[11px] mb-1">Date Created</span>
                  <strong className="text-white font-mono">
                    {record.data.createdAt || new Date().toISOString().split('T')[0]}
                  </strong>
                </div>

                {record.totalAmount !== undefined && (
                  <div>
                    <span className="text-neutral-400 block text-[11px] mb-1">Total Valuation</span>
                    <strong className="text-amber-400 text-sm font-mono font-bold">
                      ₹{record.totalAmount.toLocaleString()}
                    </strong>
                  </div>
                )}

                {record.data.promisedDate && (
                  <div>
                    <span className="text-neutral-400 block text-[11px] mb-1">Promised Delivery</span>
                    <strong className="text-neutral-200 font-mono">
                      {record.data.promisedDate}
                    </strong>
                  </div>
                )}

                {record.data.sku && (
                  <div>
                    <span className="text-neutral-400 block text-[11px] mb-1">Internal SKU</span>
                    <strong className="text-purple-300 font-mono">
                      {record.data.sku}
                    </strong>
                  </div>
                )}
              </div>

              {/* Notebook Tab Bar */}
              <div className="flex items-center gap-1 border-b border-neutral-700/70 pt-4">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`px-4 py-2 text-xs font-medium border-b-2 transition cursor-pointer ${
                    activeTab === 'details'
                      ? 'border-[#714B67] text-white font-semibold'
                      : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  Lines & Quantities
                </button>
                <button
                  onClick={() => setActiveTab('specs')}
                  className={`px-4 py-2 text-xs font-medium border-b-2 transition cursor-pointer ${
                    activeTab === 'specs'
                      ? 'border-[#714B67] text-white font-semibold'
                      : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  Technical Specifications
                </button>
                <button
                  onClick={() => setActiveTab('financials')}
                  className={`px-4 py-2 text-xs font-medium border-b-2 transition cursor-pointer ${
                    activeTab === 'financials'
                      ? 'border-[#714B67] text-white font-semibold'
                      : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  Accounting & Pricing
                </button>
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`px-4 py-2 text-xs font-medium border-b-2 transition cursor-pointer ${
                    activeTab === 'notes'
                      ? 'border-[#714B67] text-white font-semibold'
                      : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  Internal Notes
                </button>
              </div>

              {/* Notebook Tab Contents */}
              <div className="py-4 flex-1 text-xs">
                {activeTab === 'details' && (
                  <div className="space-y-4">
                    <div className="bg-[#1b2027] border border-neutral-700/70 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#14181e] text-neutral-400 border-b border-neutral-700">
                          <tr>
                            <th className="py-2 px-3">Item / Description</th>
                            <th className="py-2 px-3">Quantity</th>
                            <th className="py-2 px-3">Unit Price</th>
                            <th className="py-2 px-3 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800 text-neutral-200">
                          <tr>
                            <td className="py-2.5 px-3 font-medium">
                              {record.data.itemSummary || record.data.name || record.title}
                            </td>
                            <td className="py-2.5 px-3 font-mono">1</td>
                            <td className="py-2.5 px-3 font-mono">
                              ₹{(record.totalAmount || record.data.price || 450).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-white">
                              ₹{(record.totalAmount || record.data.price || 450).toLocaleString()}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end pr-2 text-xs">
                      <div className="w-48 space-y-1 font-mono">
                        <div className="flex justify-between text-neutral-400">
                          <span>Untaxed Total:</span>
                          <span>₹{(record.totalAmount || 450).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-neutral-400">
                          <span>GST (18%):</span>
                          <span>Included</span>
                        </div>
                        <div className="flex justify-between font-bold text-white pt-1 border-t border-neutral-700">
                          <span>Total Amount:</span>
                          <span className="text-amber-400">₹{(record.totalAmount || 450).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'specs' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-[#1b2027] border border-neutral-700/70 rounded-lg space-y-2">
                      <h4 className="font-semibold text-white">Bat & Wood Craft Specs</h4>
                      <p className="text-neutral-400"><strong>Willow Grade:</strong> {record.data.specs?.willowGrade || 'Grade-1 English Willow'}</p>
                      <p className="text-neutral-400"><strong>Target Weight:</strong> {record.data.specs?.weight || '2lb 8oz'}</p>
                      <p className="text-neutral-400"><strong>Handle Contour:</strong> {record.data.specs?.handleType || 'Round / Oval Hybrid'}</p>
                      <p className="text-neutral-400"><strong>Grip Coating:</strong> {record.data.specs?.gripColor || 'Pitch Gold Grip'}</p>
                    </div>

                    <div className="p-3 bg-[#1b2027] border border-neutral-700/70 rounded-lg space-y-2">
                      <h4 className="font-semibold text-white">Quality Assurance & Grain</h4>
                      <p className="text-neutral-400"><strong>Grain Regularity:</strong> 8-10 Straight English Grains</p>
                      <p className="text-neutral-400"><strong>Sweetspot Press:</strong> 3.8mm Camber Profile</p>
                      <p className="text-neutral-400"><strong>Surface Finish:</strong> Hand-burnished raw linseed oil</p>
                      <p className="text-neutral-400"><strong>Laser Logo:</strong> Talk of the Town Crest Engraved</p>
                    </div>
                  </div>
                )}

                {activeTab === 'financials' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-[#1b2027] border border-neutral-700/70 rounded-lg space-y-2">
                      <h4 className="font-semibold text-white">Payment Terms & Ledger Status</h4>
                      <p className="text-neutral-400"><strong>Payment Status:</strong> <span className="text-amber-400 uppercase font-semibold">{record.data.paymentStatus || 'Pending'}</span></p>
                      <p className="text-neutral-400"><strong>Payment Method:</strong> Bank Wire / POS Cashier Terminal</p>
                      <p className="text-neutral-400"><strong>Invoiced Date:</strong> {record.data.createdAt || 'Today'}</p>
                    </div>
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="space-y-2">
                    <label className="text-neutral-400 block text-xs">Internal Workshop Remarks</label>
                    <div className="p-3 bg-[#1b2027] border border-neutral-700/70 rounded-lg text-neutral-300 font-mono text-xs">
                      {record.data.notes || 'Standard manufacturing and dispatch workflow active. Verify balance prior to customer pickup.'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Odoo Standard Chatter Panel */}
            <div className="w-full lg:w-80 bg-[#252b34] border border-neutral-700/80 rounded-xl p-4 flex flex-col justify-between">
              <div>
                {/* Chatter Toolbar */}
                <div className="flex items-center gap-1.5 pb-3 border-b border-neutral-700/70 mb-3">
                  <button
                    type="button"
                    onClick={() => setChatterMode('message')}
                    className={`px-2.5 py-1 text-xs rounded-md transition cursor-pointer font-medium ${
                      chatterMode === 'message'
                        ? 'bg-[#714B67] text-white'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Send Message
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatterMode('note')}
                    className={`px-2.5 py-1 text-xs rounded-md transition cursor-pointer font-medium ${
                      chatterMode === 'note'
                        ? 'bg-[#714B67] text-white'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Log Note
                  </button>
                </div>

                {/* Chatter Input Box */}
                <form onSubmit={handlePostChatter} className="mb-4">
                  <textarea
                    rows={2}
                    value={chatterInput}
                    onChange={(e) => setChatterInput(e.target.value)}
                    placeholder={chatterMode === 'message' ? "Send message to customer / team..." : "Log an internal note..."}
                    className="w-full bg-[#171b22] border border-neutral-700 rounded-lg p-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#714B67] resize-none"
                  />
                  <div className="flex justify-end mt-1.5">
                    <button
                      type="submit"
                      disabled={!chatterInput.trim()}
                      className="px-3 py-1 bg-[#714B67] disabled:opacity-40 hover:bg-[#86597a] text-white text-xs font-semibold rounded-md transition cursor-pointer"
                    >
                      Post
                    </button>
                  </div>
                </form>

                {/* Activity Timeline Feed */}
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                    Audit Trail & Messages
                  </div>

                  {record.chatterLogs && record.chatterLogs.length > 0 ? (
                    record.chatterLogs.map((log) => (
                      <div key={log.id} className="text-xs space-y-1 border-l-2 border-[#714B67] pl-2.5 py-0.5">
                        <div className="flex items-center justify-between text-[10px] text-neutral-400">
                          <span className="font-semibold text-neutral-200">{log.author}</span>
                          <span>{log.timestamp}</span>
                        </div>
                        <p className="text-neutral-300 leading-relaxed text-[11px]">{log.body}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs space-y-2">
                      <div className="border-l-2 border-emerald-500 pl-2.5 py-0.5 text-xs">
                        <div className="flex items-center justify-between text-[10px] text-neutral-400">
                          <span className="font-semibold text-neutral-200">System Sentry</span>
                          <span>Just now</span>
                        </div>
                        <p className="text-neutral-300 text-[11px]">Record confirmed in stage: {record.status}</p>
                      </div>

                      <div className="border-l-2 border-neutral-600 pl-2.5 py-0.5 text-xs">
                        <div className="flex items-center justify-between text-[10px] text-neutral-400">
                          <span className="font-semibold text-neutral-200">Admin</span>
                          <span>Today</span>
                        </div>
                        <p className="text-neutral-300 text-[11px]">Initialized order specification into cloud database.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Quick Follower info */}
              <div className="pt-3 border-t border-neutral-700/60 flex items-center justify-between text-[11px] text-neutral-400 mt-4">
                <span>Followers: 3 members</span>
                <span className="text-emerald-400 font-medium">● Sync Live</span>
              </div>
            </div>

          </div>

          {/* Footer Bar */}
          <div className="px-6 py-3 bg-[#171b22] border-t border-neutral-700/80 flex items-center justify-between text-xs text-neutral-400">
            <div>
              Odoo Enterprise Sheet · ID: <span className="font-mono text-white">{record.id}</span>
            </div>
            <button
              onClick={onClose}
              className="text-xs text-neutral-300 hover:text-white"
            >
              Close Window
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
