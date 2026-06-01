import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Truck,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  FileText,
  PackageCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  Star,
  TrendingUp,
  Settings,
  Filter,
} from 'lucide-react';
import { Supplier, PurchaseOrder, GoodsReceipt } from '../types/procurement';
import {
  supplierService,
  purchaseOrderService,
  goodsReceiptService,
  generateSupplierCode,
  generatePONumber,
  generateGRNumber,
  calculatePOTotals,
} from '../services/procurementService';
import { db, isCloudConnected } from '../firebase';

type TabType = 'suppliers' | 'purchaseOrders' | 'goodsReceipts';

interface SupplierFormData {
  supplierCode: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstNumber: string;
  address: string;
  paymentTerms: string;
  leadTimeDays: number;
  rating: number;
  status: 'Active' | 'Inactive';
}

export const ProcurementView: React.FC<{
  branchScope: 'Melbourne Closets' | 'London Closets';
  profile: any;
}> = ({ branchScope, profile }) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('suppliers');
  
  // Data state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  
  // Form state
  const [supplierForm, setSupplierForm] = useState<SupplierFormData>({
    supplierCode: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstNumber: '',
    address: '',
    paymentTerms: 'Net 30',
    leadTimeDays: 7,
    rating: 5,
    status: 'Active',
  });

  // Load initial data
  useEffect(() => {
    loadSuppliers();
    loadPurchaseOrders();
    loadGoodsReceipts();
  }, [branchScope]);

  const loadSuppliers = async () => {
    try {
      setIsLoading(true);
      const data = await supplierService.getSuppliersByBranch(branchScope);
      setSuppliers(data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPurchaseOrders = async () => {
    try {
      const data = await purchaseOrderService.getPurchaseOrdersByBranch(branchScope);
      setPurchaseOrders(data);
    } catch (error) {
      console.error('Error loading POs:', error);
    }
  };

  const loadGoodsReceipts = async () => {
    try {
      const data = await goodsReceiptService.getGoodsReceiptsByBranch(branchScope);
      setGoodsReceipts(data);
    } catch (error) {
      console.error('Error loading GRs:', error);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const newSupplier: Omit<Supplier, 'id'> = {
        ...supplierForm,
        branchId: branchScope,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      if (selectedSupplier) {
        await supplierService.updateSupplier(selectedSupplier.id, newSupplier);
      } else {
        if (!supplierForm.supplierCode) {
          supplierForm.supplierCode = generateSupplierCode();
        }
        await supplierService.createSupplier(newSupplier);
      }
      
      await loadSuppliers();
      setSupplierModalOpen(false);
      setSelectedSupplier(null);
      resetSupplierForm();
    } catch (error) {
      console.error('Error saving supplier:', error);
      alert('Failed to save supplier');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    
    try {
      setIsLoading(true);
      await supplierService.deleteSupplier(supplierId);
      await loadSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      alert('Failed to delete supplier');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setSupplierForm({
      supplierCode: supplier.supplierCode,
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      gstNumber: supplier.gstNumber,
      address: supplier.address,
      paymentTerms: supplier.paymentTerms,
      leadTimeDays: supplier.leadTimeDays,
      rating: supplier.rating,
      status: supplier.status,
    });
    setSupplierModalOpen(true);
  };

  const resetSupplierForm = () => {
    setSupplierForm({
      supplierCode: '',
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      gstNumber: '',
      address: '',
      paymentTerms: 'Net 30',
      leadTimeDays: 7,
      rating: 5,
      status: 'Active',
    });
  };

  // Filter suppliers
  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchesSearch =
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.supplierCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus =
      statusFilter === 'all' || supplier.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate KPIs
  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.status === 'Active').length;
  const totalPOs = purchaseOrders.length;
  const openPOs = purchaseOrders.filter(po => ['draft', 'submitted', 'confirmed', 'partial_received'].includes(po.status)).length;
  const totalGRs = goodsReceipts.length;
  const pendingGRs = goodsReceipts.filter(gr => ['draft', 'received', 'inspected'].includes(gr.status)).length;

  return (
    <div className="space-y-6" id="procurement-view-component">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-[#e3dec9] shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded bg-blue-500/10 text-blue-600">
              <Truck className="w-5 h-5 stroke-[2]" />
            </span>
            <span className="font-mono text-xs font-bold uppercase text-blue-500 bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/20">
              Procurement
            </span>
            <span className="text-[10px] font-mono text-neutral-400">
              Target Branch: {branchScope}
            </span>
          </div>
          <h2 className="text-xl font-black text-neutral-900 tracking-tight mt-1.5 font-sans">
            Supplier & Purchase Management
          </h2>
          <p className="text-xs text-neutral-500 font-sans mt-0.5">
            Manage suppliers, create purchase orders, and track goods receipts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl border border-[#e3dec9] bg-[#f4f3eb] flex items-center gap-2 text-[11px] font-mono">
            <span className={`w-2.5 h-2.5 rounded-full ${isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
            <span className="text-neutral-700 font-bold">
              {isCloudConnected ? 'Firebase Online' : 'Offline Mode'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#e3dec9] shadow-sm">
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">Total Suppliers</span>
          <div className="text-2xl font-black text-neutral-900 mt-1.5">{totalSuppliers}</div>
          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
            <CheckCircle className="w-3 h-3" />
            {activeSuppliers} Active
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e3dec9] shadow-sm">
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">Purchase Orders</span>
          <div className="text-2xl font-black text-neutral-900 mt-1.5">{totalPOs}</div>
          <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" />
            {openPOs} Open
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e3dec9] shadow-sm">
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">Goods Receipts</span>
          <div className="text-2xl font-black text-neutral-900 mt-1.5">{totalGRs}</div>
          <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1 mt-1">
            <PackageCheck className="w-3 h-3" />
            {pendingGRs} Pending
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-[#e3dec9] shadow-sm flex gap-1 p-1">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex-1 px-4 py-2.5 rounded-lg font-mono text-xs font-bold uppercase transition-all ${
            activeTab === 'suppliers'
              ? 'bg-blue-500 text-white'
              : 'bg-transparent text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          Suppliers
        </button>
        <button
          onClick={() => setActiveTab('purchaseOrders')}
          className={`flex-1 px-4 py-2.5 rounded-lg font-mono text-xs font-bold uppercase transition-all ${
            activeTab === 'purchaseOrders'
              ? 'bg-blue-500 text-white'
              : 'bg-transparent text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          Purchase Orders
        </button>
        <button
          onClick={() => setActiveTab('goodsReceipts')}
          className={`flex-1 px-4 py-2.5 rounded-lg font-mono text-xs font-bold uppercase transition-all ${
            activeTab === 'goodsReceipts'
              ? 'bg-blue-500 text-white'
              : 'bg-transparent text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          Goods Receipts
        </button>
      </div>

      {/* SUPPLIERS TAB */}
      {activeTab === 'suppliers' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-4"
        >
          {/* Search and Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-[#e3dec9] shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search suppliers by name, code, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-[#e1dec9] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-sans"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-[#e1dec9] rounded-xl px-3 py-2.5 text-xs font-mono bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <button
                onClick={() => {
                  setSelectedSupplier(null);
                  resetSupplierForm();
                  setSupplierModalOpen(true);
                }}
                className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-mono text-xs uppercase font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add Supplier
              </button>
            </div>
          </div>

          {/* Suppliers Table */}
          <div className="bg-white rounded-2xl border border-[#e3dec9] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-[#e3dec9]">
                  <tr className="text-xs font-mono text-slate-500 font-bold">
                    <th className="px-6 py-4">Supplier Code</th>
                    <th className="px-6 py-4">Company Name</th>
                    <th className="px-6 py-4">Contact Person</th>
                    <th className="px-6 py-4">Email / Phone</th>
                    <th className="px-6 py-4">Payment Terms</th>
                    <th className="px-6 py-4">Rating</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-mono text-sm">
                        <Truck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        No suppliers found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono font-bold text-blue-600">{supplier.supplierCode}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-neutral-900">{supplier.name}</div>
                          <span className="text-xs text-neutral-500 font-sans">{supplier.gstNumber}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-700">{supplier.contactPerson}</td>
                        <td className="px-6 py-4">
                          <div className="text-xs space-y-1">
                            <div className="flex items-center gap-1 text-neutral-700">
                              <Mail className="w-3.5 h-3.5" />
                              {supplier.email}
                            </div>
                            <div className="flex items-center gap-1 text-neutral-700">
                              <Phone className="w-3.5 h-3.5" />
                              {supplier.phone}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">
                            {supplier.paymentTerms}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < supplier.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                              supplier.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {supplier.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditSupplier(supplier)}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSupplier(supplier.id)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* PURCHASE ORDERS TAB */}
      {activeTab === 'purchaseOrders' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-white rounded-2xl p-8 border border-[#e3dec9] shadow-sm text-center"
        >
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-neutral-900 mb-1">Purchase Orders Module</h3>
          <p className="text-sm text-neutral-500 font-sans">
            Create and manage purchase orders from suppliers. Features include order creation, status tracking,
            and goods receipt integration.
          </p>
          <button className="mt-4 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-mono text-xs uppercase font-bold rounded-xl transition-all">
            Create Purchase Order
          </button>
        </motion.div>
      )}

      {/* GOODS RECEIPTS TAB */}
      {activeTab === 'goodsReceipts' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-white rounded-2xl p-8 border border-[#e3dec9] shadow-sm text-center"
        >
          <PackageCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-neutral-900 mb-1">Goods Receipts Module</h3>
          <p className="text-sm text-neutral-500 font-sans">
            Track receipt and inspection of goods from suppliers. Automatically updates inventory when goods are accepted.
          </p>
          <button className="mt-4 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-mono text-xs uppercase font-bold rounded-xl transition-all">
            Create Receipt
          </button>
        </motion.div>
      )}

      {/* Supplier Form Modal */}
      <AnimatePresence>
        {supplierModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSupplierModalOpen(false);
                setSelectedSupplier(null);
              }}
              className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-2xl border border-[#e3dec9] shadow-2xl p-6 relative z-50"
            >
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-lg font-black text-neutral-900">
                  {selectedSupplier ? `Edit: ${selectedSupplier.name}` : 'Add New Supplier'}
                </h3>
                <button
                  onClick={() => {
                    setSupplierModalOpen(false);
                    setSelectedSupplier(null);
                  }}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSupplier} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-mono font-bold uppercase text-slate-600">Supplier Code</label>
                    <input
                      type="text"
                      value={supplierForm.supplierCode}
                      onChange={(e) =>
                        setSupplierForm({ ...supplierForm, supplierCode: e.target.value })
                      }
                      placeholder="Auto-generated if empty"
                      className="w-full border border-[#e1dec9] rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-mono font-bold uppercase text-slate-600">Company Name *</label>
                    <input
                      type="text"
                      required
                      value={supplierForm.name}
                      onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                      className="w-full border border-[#e1dec9] rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono font-bold uppercase text-slate-600">Contact Person *</label>
                    <input
                      type="text"
                      required
                      value={supplierForm.contactPerson}
                      onChange={(e) =>
                        setSupplierForm({ ...supplierForm, contactPerson: e.target.value })
                      }
                      className="w-full border border-[#e1dec9] rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono font-bold uppercase text-slate-600">Phone *</label>
                    <input
                      type="tel"
                      required
                      value={supplierForm.phone}
                      onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                      className="w-full border border-[#e1dec9] rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono font-bold uppercase text-slate-600">Email *</label>
                    <input
                      type="email"
                      required
                      value={supplierForm.email}
                      onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                      className="w-full border border-[#e1dec9] rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono font-bold uppercase text-slate-600">GST Number *</label>
                    <input
                      type="text"
                      required
                      value={supplierForm.gstNumber}
                      onChange={(e) =>
                        setSupplierForm({ ...supplierForm, gstNumber: e.target.value })
                      }
                      className="w-full border border-[#e1dec9] rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-mono font-bold uppercase text-slate-600">Address *</label>
                    <textarea
                      required
                      value={supplierForm.address}
                      onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                      rows={2}
                      className="w-full border border-[#e1dec9] rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono font-bold uppercase text-slate-600">Payment Terms</label>
                    <select
                      value={supplierForm.paymentTerms}
                      onChange={(e) =>
                        setSupplierForm({ ...supplierForm, paymentTerms: e.target.value })
                      }
                      className="w-full border border-[#e1dec9] rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="COD">Cash on Delivery</option>
                      <option value="Net 15">Net 15</option>
                      <option value="Net 30">Net 30</option>
                      <option value="Net 45">Net 45</option>
                      <option value="Net 60">Net 60</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono font-bold uppercase text-slate-600">Lead Time (Days)</label>
                    <input
                      type="number"
                      min="1"
                      value={supplierForm.leadTimeDays}
                      onChange={(e) =>
                        setSupplierForm({ ...supplierForm, leadTimeDays: parseInt(e.target.value) })
                      }
                      className="w-full border border-[#e1dec9] rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono font-bold uppercase text-slate-600">Status</label>
                    <select
                      value={supplierForm.status}
                      onChange={(e) =>
                        setSupplierForm({ ...supplierForm, status: e.target.value as 'Active' | 'Inactive' })
                      }
                      className="w-full border border-[#e1dec9] rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setSupplierModalOpen(false);
                      setSelectedSupplier(null);
                      resetSupplierForm();
                    }}
                    className="px-4 py-2 text-slate-600 font-mono text-xs font-bold hover:bg-slate-50 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white font-mono text-xs font-bold uppercase rounded-xl transition-all disabled:opacity-50"
                  >
                    {selectedSupplier ? 'Update Supplier' : 'Create Supplier'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
