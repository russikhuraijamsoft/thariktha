import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { 
  Plus, 
  Search, 
  FileCheck, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Calendar, 
  Smartphone, 
  User, 
  Users, 
  Activity, 
  X, 
  Paperclip, 
  Layers, 
  Grid, 
  Trash2, 
  ChevronRight, 
  Send, 
  FolderOpen, 
  Filter, 
  Award, 
  Sparkles,
  ClipboardList,
  Eye,
  CheckCircle2,
  Lock,
  ArrowUpDown
} from 'lucide-react';
import { db, isCloudConnected } from '../firebase';
import { useAuth } from '../context/AuthContext';

// --- TYPES FOR SEED DATA & BACKWARDS COMPATIBILITY ---
export interface OrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  category: 'jersey' | 'pants' | 'caps' | 'bat' | 'pads' | 'gloves';
  sizes?: {
    S: number;
    M: number;
    L: number;
    XL: number;
    XXL: number;
  };
  playerRoster?: {
    name: string;
    number: string;
    size: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  }[];
}

export interface AttachmentItem {
  id: string;
  name: string;
  url: string;
  size: string;
  uploadedAt: string;
}

export interface OrderComment {
  id: string;
  author: string;
  role: string;
  comment: string;
  timestamp: string;
}

export interface ERPOrderExtended {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  teamId?: string;
  teamName?: string;
  branchId: string;
  orderType: string;
  status: 'draft' | 'pending' | 'manufacturing' | 'printing' | 'ready' | 'delivered' | 'canceled';
  workflowStatus: 'Inquiry' | 'Design Approval' | 'Fabric Cutting' | 'Printing' | 'Stitching' | 'Quality Check' | 'Packed' | 'Delivered';
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid';
  orderItems: OrderItem[];
  totalAmount: number;
  advancePayment: number;
  remainingPayment: number;
  assignedStaffId?: string;
  assignedStaffName?: string;
  promisedDate: string; // YYYY-MM-DD
  notes: string;
  attachments: AttachmentItem[];
  comments: OrderComment[];
  createdAt: any; // Timestamp or ISO-string
  updatedAt: any;
}

// 8 Workflow Steps mapped to Database Schema constraints
export const WORKFLOW_STEPS = [
  'Inquiry',
  'Design Approval',
  'Fabric Cutting',
  'Printing',
  'Stitching',
  'Quality Check',
  'Packed',
  'Delivered'
] as const;

export type WorkflowStatusType = typeof WORKFLOW_STEPS[number];

// High-fidelity vector images mockups for user simulation upload
const VECTOR_JERSEY_TEMPLATES = [
  { id: 't1', name: 'Melbourne Green Elite', url: 'https://images.unsplash.com/photo-1578269174936-2709b5a5e065?w=400&auto=format&fit=crop&q=80', tag: 'Cricket Jersey' },
  { id: 't2', name: 'Lord\'s Golden Ribbon', url: 'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?w=400&auto=format&fit=crop&q=80', tag: 'Cricket Jersey' },
  { id: 't3', name: 'Cobras Platinum Sublimation', url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&auto=format&fit=crop&q=80', tag: 'Limited Edition' },
  { id: 't4', name: 'Classic Leather Willow Cleve', url: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&auto=format&fit=crop&q=80', tag: 'Bat Design Layout' },
];

export const OrdersView: React.FC<{ branchScope: 'Melbourne Closets' | 'London Closets'; profile: any }> = ({ branchScope, profile }) => {
  const { staffMembers } = useAuth();
  
  const sumSizes = (sizes: Record<string, number> | undefined, defaultVal = 0): number => {
    if (!sizes) return defaultVal;
    return (sizes.S || 0) + (sizes.M || 0) + (sizes.L || 0) + (sizes.XL || 0) + (sizes.XXL || 0);
  };
  
  // Realtime lists
  const [orders, setOrders] = useState<ERPOrderExtended[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // View states
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [filterWorkflow, setFilterWorkflow] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ERPOrderExtended | null>(null);
  
  // Modal states
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [draggedOver, setDraggedOver] = useState(false);
  const [selectedDesignTemplate, setSelectedDesignTemplate] = useState<string | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<keyof ERPOrderExtended>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // New Order Form state
  const [newOrder, setNewOrder] = useState<{
    customerName: string;
    phone: string;
    teamName: string;
    orderType: string;
    promisedDate: string;
    advancePayment: number;
    notes: string;
    items: OrderItem[];
    attachments: AttachmentItem[];
    assignedStaffId: string;
  }>({
    customerName: '',
    phone: '',
    teamName: '',
    orderType: 'Custom Jersey',
    promisedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days due default
    advancePayment: 0,
    notes: '',
    items: [
      {
        id: '1',
        name: 'Platinum sublimated tournament shirt',
        price: 45.00,
        qty: 1,
        category: 'jersey',
        sizes: { S: 0, M: 1, L: 0, XL: 0, XXL: 0 },
        playerRoster: []
      }
    ],
    attachments: [],
    assignedStaffId: ''
  });

  // Current item builder indices inside create form
  const [currentItemIndex, setCurrentItemIndex] = useState<number>(0);
  const [rosterName, setRosterName] = useState('');
  const [rosterNumber, setRosterNumber] = useState('');
  const [rosterSize, setRosterSize] = useState<'S' | 'M' | 'L' | 'XL' | 'XXL'>('M');

  // --- ERROR HANDLING PRIMITIVE ---
  enum OperationType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    LIST = 'list',
    GET = 'get',
    WRITE = 'write',
  }

  interface FirestoreErrorInfo {
    error: string;
    operationType: OperationType;
    path: string | null;
    authInfo: {
      userId?: string | null;
      email?: string | null;
    }
  }

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: profile?.uid || 'offline-sim',
        email: profile?.email || 'unauthenticated'
      },
      operationType,
      path
    };
    console.error('Firestore Error Payload Context: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  // Convert workflow state of 8 steps to Base Status valid in firestore.rules Schema Check
  const getBaseStatus = (workflow: WorkflowStatusType): 'draft' | 'pending' | 'manufacturing' | 'printing' | 'ready' | 'delivered' | 'canceled' => {
    switch (workflow) {
      case 'Inquiry':
        return 'draft';
      case 'Design Approval':
        return 'pending';
      case 'Fabric Cutting':
        return 'manufacturing';
      case 'Printing':
        return 'printing';
      case 'Stitching':
        return 'manufacturing';
      case 'Quality Check':
        return 'ready';
      case 'Packed':
        return 'ready';
      case 'Delivered':
        return 'delivered';
      default:
        return 'pending';
    }
  };

  // --- SNAPSHOT LISTENER WITH LOCAL STORAGE FALLBACK ---
  const fetchOrdersFromAzure = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/orders');
      if (response.ok) {
        const list = await response.json();
        
        // Match/merge with extended details from local storage if available
        const localExtKey = `tott_cricket_closet_orders_extended_${branchScope}`;
        const cachedExtended = localStorage.getItem(localExtKey);
        let mapCached: Record<string, any> = {};
        if (cachedExtended) {
          try {
            mapCached = JSON.parse(cachedExtended);
          } catch (e) {
            console.error("Failed to parse cached extended orders map:", e);
          }
        }

        const mergedList: ERPOrderExtended[] = list.map((order: any) => {
          const ext = mapCached[order.id] || {};
          return {
            id: order.id,
            customerId: order.customerId || 'CUST-001',
            customerName: order.customerName || 'Standard Client',
            phone: order.phone || ext.phone || '+61-491-570-156',
            teamName: order.teamName || ext.teamName || 'VCA Super Giants',
            branchId: order.branchId || branchScope,
            orderType: order.orderType || ext.orderType || 'Sublimation Jerseys',
            status: order.status || 'pending',
            workflowStatus: ext.workflowStatus || 'Inquiry',
            paymentStatus: order.paymentStatus || 'unpaid',
            orderItems: ext.orderItems || [
              { id: '1', name: order.itemSummary || 'Custom Willow Gear', price: order.totalAmount, qty: 1, category: 'bat' }
            ],
            totalAmount: order.totalAmount || 0,
            advancePayment: ext.advancePayment || 0,
            remainingPayment: order.totalAmount - (ext.advancePayment || 0),
            comments: ext.comments || [
              { id: '1', author: 'System Sync', role: 'BOT', comment: order.notes || 'Order load synced from database.', timestamp: order.createdAt || new Date().toISOString() }
            ],
            attachments: ext.attachments || [],
            assignedStaffId: ext.assignedStaffId || '',
            orderDate: order.promisedDate || new Date().toISOString(),
            createdAt: order.createdAt || new Date().toISOString(),
            updatedAt: order.createdAt || new Date().toISOString()
          } as unknown as ERPOrderExtended;
        });

        // Filter by active branchScope
        const filtered = mergedList.filter(o => o.branchId === branchScope || o.branchId === `${branchScope} Closets`);
        setOrders(filtered);
      } else {
        console.warn("Failed fetching orders from REST, falling back to local files.");
        loadLocalFallbacks();
      }
    } catch (err) {
      console.error("Orders REST Fetch error:", err);
      loadLocalFallbacks();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersFromAzure();
  }, [branchScope]);

  const loadLocalFallbacks = () => {
    setIsLoading(true);
    const local = localStorage.getItem(`tott_cricket_closet_orders_${branchScope}`);
    if (local) {
      try {
        setOrders(JSON.parse(local));
      } catch (e) {
        console.error("Failed to parse local cached orders list:", e);
        // Fall back to seed orders below
        seedOrders();
      }
    } else {
      seedOrders();
    }
  };

  const seedOrders = () => {
      // Seed original custom orders
      const seed: ERPOrderExtended[] = [
        {
          id: "TOTT-2026-9501",
          customerId: "CUST-001",
          customerName: "Manipur Cricket Academy (Imphal)",
          phone: "+91-385-2441011",
          teamName: "MCA Super Giants",
          branchId: "Melbourne Closets",
          orderType: "Sublimation Jerseys",
          status: "pending",
          workflowStatus: "Design Approval",
          paymentStatus: "partially_paid",
          totalAmount: 900.00,
          advancePayment: 450.00,
          remainingPayment: 450.00,
          promisedDate: "2026-06-12",
          notes: "Neon green sublimation stripes on gold base. Heavy moisture-wick fabric requested.",
          assignedStaffId: "staff_printer_sarah",
          assignedStaffName: "Sarah Printworks",
          attachments: [
            { id: '1', name: 'Imphal_Neon_Stripes_Vector.png', url: VECTOR_JERSEY_TEMPLATES[0].url, size: '2.4 MB', uploadedAt: '10 hours ago' }
          ],
          comments: [
            { id: 'c1', author: 'Biren Singh', role: 'Super Admin', comment: 'Client confirmed double collar seam.', timestamp: '2026-05-24 14:22' }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          orderItems: [
            {
              id: 'item1',
              name: 'Sublimated Academy Shirt',
              qty: 20,
              price: 45.00,
              category: 'jersey',
              sizes: { S: 5, M: 8, L: 5, XL: 2, XXL: 0 },
              playerRoster: [
                { name: 'Chungkham', number: '49', size: 'M' },
                { name: 'Laishram', number: '31', size: 'L' }
              ]
            }
          ]
        },
        {
          id: "TOTT-2026-9502",
          customerId: "CUST-002",
          customerName: "Imphal Eastern Youth Sports Club",
          phone: "+91-385-2442221",
          teamName: "Imphal Eastern Division A",
          branchId: "Melbourne Closets",
          orderType: "Complete Cricket Kit",
          status: "printing",
          workflowStatus: "Printing",
          paymentStatus: "paid",
          totalAmount: 1350.00,
          advancePayment: 1350.00,
          remainingPayment: 0,
          promisedDate: "2026-06-15",
          notes: "Heavy sublimation. Matching yellow side stitches. Numbers on sleeves 3 inch tall.",
          assignedStaffId: "staff_printer_sarah",
          assignedStaffName: "Sarah Printworks",
          attachments: [
            { id: '2', name: 'Imphal_Eastern_Ribbon_Spec.png', url: VECTOR_JERSEY_TEMPLATES[1].url, size: '1.8 MB', uploadedAt: '1 day ago' }
          ],
          comments: [],
          createdAt: new Date(Date.now() - 48*60*60*1000).toISOString(),
          updatedAt: new Date().toISOString(),
          orderItems: [
            {
              id: 'item2',
              name: 'Platinum sublimated tournament shirt',
              qty: 30,
              price: 45.00,
              category: 'jersey',
              sizes: { S: 10, M: 10, L: 5, XL: 4, XXL: 1 },
              playerRoster: []
            }
          ]
        }
      ];
      localStorage.setItem(`tott_cricket_closet_orders_${branchScope}`, JSON.stringify(seed));
      setOrders(seed);
      setIsLoading(false);
  };

  // --- CREATE NEW ORDER ---
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const orderId = `TOTT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const totalItemsCount = newOrder.items.reduce((total, item) => {
      if (item.sizes) {
        return total + sumSizes(item.sizes as Record<string, number>, 0);
      }
      return total + item.qty;
    }, 0);
    
    const calculatedSumPrice = newOrder.items.reduce((sum, item) => {
      const itemsQty = item.sizes ? sumSizes(item.sizes as Record<string, number>, 0) : item.qty;
      return sum + (item.price * itemsQty);
    }, 0);

    const staffObj = staffMembers.find(s => s.uid === newOrder.assignedStaffId);
    const assignedName = staffObj ? staffObj.name : 'Unassigned';

    const cleanBaseStatus = getBaseStatus('Inquiry');

    const orderPayload: ERPOrderExtended = {
      id: orderId,
      customerId: profile?.uid || 'offline-user-uid',
      customerName: newOrder.customerName || 'Walk-in Athlete',
      phone: newOrder.phone || 'N/A',
      teamName: newOrder.teamName || 'Independent',
      branchId: branchScope,
      orderType: newOrder.orderType,
      status: cleanBaseStatus,
      workflowStatus: 'Inquiry',
      paymentStatus: newOrder.advancePayment === 0 ? 'unpaid' : (newOrder.advancePayment >= calculatedSumPrice ? 'paid' : 'partially_paid'),
      orderItems: newOrder.items,
      totalAmount: calculatedSumPrice,
      advancePayment: Number(newOrder.advancePayment) || 0,
      remainingPayment: Math.max(0, calculatedSumPrice - (Number(newOrder.advancePayment) || 0)),
      promisedDate: newOrder.promisedDate,
      notes: newOrder.notes,
      assignedStaffId: newOrder.assignedStaffId || undefined,
      assignedStaffName: assignedName,
      attachments: newOrder.attachments,
      comments: [
        {
          id: 'c_init',
          author: profile?.name || 'In-store Clerk',
          role: profile?.roleId ? profile.roleId.toUpperCase() : 'STAFF',
          comment: `Order registered under initial status Inquiry. Balance due: ₹${Math.max(0, calculatedSumPrice - (Number(newOrder.advancePayment) || 0)).toFixed(2)}.`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orderId,
          customerId: orderPayload.customerId || 'CUST-001',
          totalAmount: orderPayload.totalAmount,
          status: orderPayload.status,
          notes: orderPayload.notes || 'Custom Order Design',
          paymentStatus: orderPayload.paymentStatus,
          promisedDate: orderPayload.promisedDate
        })
      });

      if (response.ok) {
        for (const item of orderPayload.orderItems) {
          const qty = item.sizes ? sumSizes(item.sizes as Record<string, number>, 0) : item.qty;
          await fetch('/api/orderitems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemId: `ITEM-${Math.floor(1000 + Math.random() * 9000)}`,
              orderId: orderId,
              sku: (item as any).sku || item.id || `SKU-${item.name.substring(0,3).toUpperCase()}`,
              quantity: qty || 1,
              unitPrice: item.price || 45.00
            })
          });
        }
      }

      // Save custom extended fields (comments, attachments etc) in local storage extended mapping
      const localExtKey = `tott_cricket_closet_orders_extended_${branchScope}`;
      const cachedExtended = localStorage.getItem(localExtKey);
      let mapCached: Record<string, any> = {};
      if (cachedExtended) {
        try {
          mapCached = JSON.parse(cachedExtended);
        } catch (e) {
          console.error("Failed to parse local cached extended map on write:", e);
        }
      }
      mapCached[orderId] = {
        phone: orderPayload.phone,
        teamName: orderPayload.teamName,
        orderType: orderPayload.orderType,
        orderItems: orderPayload.orderItems,
        advancePayment: orderPayload.advancePayment,
        comments: orderPayload.comments,
        attachments: orderPayload.attachments,
        assignedStaffId: orderPayload.assignedStaffId,
        workflowStatus: orderPayload.workflowStatus
      };
      localStorage.setItem(localExtKey, JSON.stringify(mapCached));

      await fetchOrdersFromAzure();
    } catch (err) {
      console.error("Failed storing order in Azure, falling back locally:", err);
      const updated = [orderPayload, ...orders];
      localStorage.setItem(`tott_cricket_closet_orders_${branchScope}`, JSON.stringify(updated));
      setOrders(updated);
    }

    // Reset Form
    setNewOrder({
      customerName: '',
      phone: '',
      teamName: '',
      orderType: 'Custom Jersey',
      promisedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      advancePayment: 0,
      notes: '',
      items: [
        {
          id: '1',
          name: 'Platinum sublimated tournament shirt',
          price: 45.00,
          qty: 1,
          category: 'jersey',
          sizes: { S: 0, M: 1, L: 0, XL: 0, XXL: 0 },
          playerRoster: []
        }
      ],
      attachments: [],
      assignedStaffId: ''
    });
    setSelectedDesignTemplate(null);
    setIsNewOrderModalOpen(false);
  };

  const saveOrderExtendedDetailsLocally = (orderId: string, updatedFields: Partial<ERPOrderExtended>) => {
    const localExtKey = `tott_cricket_closet_orders_extended_${branchScope}`;
    const cachedExtended = localStorage.getItem(localExtKey);
    let mapCached: Record<string, any> = {};
    try {
      mapCached = cachedExtended ? JSON.parse(cachedExtended) : {};
    } catch (err) {
      mapCached = {};
    }
    mapCached[orderId] = {
      ...(mapCached[orderId] || {}),
      ...updatedFields
    };
    localStorage.setItem(localExtKey, JSON.stringify(mapCached));
  };

  // --- TRANSITION WORKFLOW STEP & CALCULATE BASE STATUS IN SYNC ---
  const handleTransitionWorkflow = async (orderId: string, targetStep: WorkflowStatusType) => {
    const updatedBaseStatus = getBaseStatus(targetStep);
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return;

    const updatedLogComment: OrderComment = {
      id: `comment_${Date.now()}`,
      author: profile?.name || 'Operations Desk',
      role: profile?.roleId ? profile.roleId.toUpperCase() : 'OPERATOR',
      comment: `Advanced manufacturing pipeline to: ${targetStep}.`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    const newComments = [...(orderToUpdate.comments || []), updatedLogComment];

    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: updatedBaseStatus })
      });
      saveOrderExtendedDetailsLocally(orderId, {
        workflowStatus: targetStep,
        comments: newComments
      });
      await fetchOrdersFromAzure();
      
      // Update selectedOrder details in view state if currently focused
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          status: updatedBaseStatus,
          workflowStatus: targetStep,
          comments: newComments
        });
      }
    } catch (err) {
      console.error("Failed executing transition workflow REST put:", err);
      const updatedList = orders.map(o => {
        if (o.id === orderId) {
          const mod = {
            ...o,
            workflowStatus: targetStep,
            status: updatedBaseStatus,
            comments: newComments,
            updatedAt: new Date().toISOString()
          };
          if (selectedOrder?.id === orderId) {
            setSelectedOrder(mod);
          }
          return mod;
        }
        return o;
      });
      setOrders(updatedList);
    }
  };

  // --- ADD IN-APP COMMENTS ---
  const [commentText, setCommentText] = useState('');
  const handlePostComment = async (orderId: string) => {
    if (!commentText.trim()) return;
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return;

    const newComment: OrderComment = {
      id: `comment_${Date.now()}`,
      author: profile?.name || 'Branch Clerk',
      role: profile?.roleId ? profile.roleId.toUpperCase() : 'STAFF',
      comment: commentText.trim(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    const newComments = [...(orderToUpdate.comments || []), newComment];

    try {
      saveOrderExtendedDetailsLocally(orderId, {
        comments: newComments
      });
      await fetchOrdersFromAzure();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          comments: newComments
        });
      }
    } catch (err) {
      console.error(err);
    }
    setCommentText('');
  };

  // --- MANUAL PAYMENTS UPDATE ---
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const handleUpdatePayment = async (orderId: string) => {
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return;

    const updatedAdvance = Number(orderToUpdate.advancePayment) + Number(paymentAmount);
    const updatedRemaining = Math.max(0, orderToUpdate.totalAmount - updatedAdvance);
    const calculatedPaymentStatus: 'unpaid' | 'partially_paid' | 'paid' = 
      updatedAdvance >= orderToUpdate.totalAmount ? 'paid' : (updatedAdvance > 0 ? 'partially_paid' : 'unpaid');

    const newComment: OrderComment = {
      id: `comment_${Date.now()}`,
      author: profile?.name || 'Financial Desk',
      role: 'FINANCE',
      comment: `Registered payment installment of ₹${Number(paymentAmount).toFixed(2)}. Total Advance: ₹${updatedAdvance.toFixed(2)}. Remaining due: ₹${updatedRemaining.toFixed(2)}.`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    const newComments = [...(orderToUpdate.comments || []), newComment];

    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: calculatedPaymentStatus === 'paid' ? 'ready' : orderToUpdate.status })
      });
      saveOrderExtendedDetailsLocally(orderId, {
        advancePayment: updatedAdvance,
        comments: newComments
      });
      await fetchOrdersFromAzure();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          advancePayment: updatedAdvance,
          remainingPayment: updatedRemaining,
          paymentStatus: calculatedPaymentStatus,
          comments: newComments
        });
      }
    } catch (err) {
      console.error(err);
    }
    setPaymentAmount(0);
  };

  // Simulated drag and drop uploads
  const handleMockDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOver(false);
    
    // Choose a random default template as uploaded file
    const randTmp = VECTOR_JERSEY_TEMPLATES[Math.floor(Math.random() * VECTOR_JERSEY_TEMPLATES.length)];
    const newAttach: AttachmentItem = {
      id: `attach_${Date.now()}`,
      name: `custom_inksheet_${Math.floor(100 + Math.random()*900)}.png`,
      url: randTmp.url,
      size: `${(Math.random() * 2 + 1).toFixed(1)} MB`,
      uploadedAt: 'Just now'
    };

    setNewOrder(prev => ({
      ...prev,
      attachments: [...prev.attachments, newAttach]
    }));
  };

  const handleAddTemplateAsAttachment = (url: string, name: string) => {
    const newAttach: AttachmentItem = {
      id: `attach_${Date.now()}`,
      name: `${name.replace(/\s+/g, '_')}_blueprint.png`,
      url,
      size: '1.4 MB',
      uploadedAt: 'Just now'
    };
    setNewOrder(prev => ({
      ...prev,
      attachments: [...prev.attachments, newAttach]
    }));
    setSelectedDesignTemplate(name);
  };

  // Handle sizes increment/decrement
  const handleSizeChange = (itemIdx: number, size: 'S' | 'M' | 'L' | 'XL' | 'XXL', value: number) => {
    setNewOrder(prev => {
      const copyItems = [...prev.items];
      const targetItem = copyItems[itemIdx];
      if (targetItem.sizes) {
        const nextVal = Math.max(0, (targetItem.sizes[size] || 0) + value);
        targetItem.sizes = { ...targetItem.sizes, [size]: nextVal };
        // calculate summed basic quantity for backwards validation
        targetItem.qty = sumSizes(targetItem.sizes as Record<string, number>, 0);
      }
      return { ...prev, items: copyItems };
    });
  };

  // Handle Roster items list builder
  const handleAddRoster = (itemIdx: number) => {
    if (!rosterName.trim()) return;
    setNewOrder(prev => {
      const copyItems = [...prev.items];
      const targetItem = copyItems[itemIdx];
      
      const updatedRoster = [...(targetItem.playerRoster || []), {
        name: rosterName.trim(),
        number: rosterNumber.trim() || 'NO#',
        size: rosterSize
      }];

      targetItem.playerRoster = updatedRoster;
      
      // Auto increment size matrix if not already set, to match roster count
      if (targetItem.sizes) {
        targetItem.sizes[rosterSize] = (targetItem.sizes[rosterSize] || 0) + 1;
        targetItem.qty = sumSizes(targetItem.sizes as Record<string, number>, 0);
      }

      return { ...prev, items: copyItems };
    });
    setRosterName('');
    setRosterNumber('');
  };

  const handleRemoveRoster = (itemIdx: number, rosterIdx: number) => {
    setNewOrder(prev => {
      const copyItems = [...prev.items];
      const targetItem = copyItems[itemIdx];
      if (targetItem.playerRoster) {
        const removed = targetItem.playerRoster[rosterIdx];
        const nextRoster = targetItem.playerRoster.filter((_, idx) => idx !== rosterIdx);
        targetItem.playerRoster = nextRoster;
        
        // Decrement size count
        if (targetItem.sizes && targetItem.sizes[removed.size as 'S' | 'M' | 'L' | 'XL' | 'XXL'] > 0) {
          targetItem.sizes[removed.size as 'S' | 'M' | 'L' | 'XL' | 'XXL'] -= 1;
          targetItem.qty = sumSizes(targetItem.sizes as Record<string, number>, 0);
        }
      }
      return { ...prev, items: copyItems };
    });
  };

  // Add multiple custom items support in form
  const handleAddNewItem = () => {
    const nextIdx = newOrder.items.length + 1;
    setNewOrder(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `${nextIdx}`,
          name: `Additional Custom Item ${nextIdx}`,
          price: 35.00,
          qty: 1,
          category: 'jersey',
          sizes: { S: 0, M: 1, L: 0, XL: 0, XXL: 0 },
          playerRoster: []
        }
      ]
    }));
    setCurrentItemIndex(newOrder.items.length);
  };

  const handleRemoveItem = (idx: number) => {
    if (newOrder.items.length <= 1) return;
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
    setCurrentItemIndex(0);
  };

  // Filters & Search logic
  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (o.teamName && o.teamName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      o.orderType.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesWorkflow = filterWorkflow === 'All' || o.workflowStatus === filterWorkflow;
    return matchesSearch && matchesWorkflow;
  });

  // Calculate stats for local tracking panel
  const totalFinancialOverage = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const remainingFinanceDue = orders.reduce((sum, o) => sum + o.remainingPayment, 0);
  const totalBilletActiveOrders = orders.length;
  const inquiryCount = orders.filter(o => o.workflowStatus === 'Inquiry').length;
  const inManufacturingCount = orders.filter(o => ['Fabric Cutting', 'Printing', 'Stitching'].includes(o.workflowStatus)).length;

  return (
    <div className="bg-neutral-50 rounded-3xl min-h-[85vh] text-[#1A1A1A] flex flex-col overflow-hidden font-sans border border-neutral-200">
      
      {/* 1. APPLET LIGHT HEADER */}
      <div className="bg-white px-8 py-6 border-b border-neutral-150 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#E5B84B] font-bold">
            <Award className="w-4 h-4 text-[#E5B84B]" />
            <span>Cricket Closet Custom Studio</span>
          </div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight mt-1 flex items-center gap-2">
            Order Management Console
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
              {branchScope}
            </span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            End-to-end athlete personalization, size matrixing, team order files, and realtime mill sync.
          </p>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Synchronized status led */}
          <div className="px-3 py-1.5 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center gap-2 text-xs font-mono font-bold text-neutral-600">
            <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-500'}`}></span>
            <span>{isCloudConnected ? 'Firestore Synchronized' : 'Local PWA Cache'}</span>
          </div>

          <button 
            onClick={() => setIsNewOrderModalOpen(true)}
            className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#E5B84B] hover:text-neutral-950 text-[#E5B84B] font-mono text-xs font-bold uppercase tracking-wider rounded-xl border border-[#E5B84B]/30 hover:border-transparent cursor-pointer transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Custom Order</span>
          </button>
        </div>
      </div>

      {/* 2. SUMMARY METRIC PILES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-8 pt-6">
        <div className="bg-white p-5 rounded-2xl border border-neutral-150 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono text-neutral-500 uppercase font-black tracking-wider">Total Sales (Branch)</span>
            <span className="p-1 px-1.5 text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-mono font-bold">Active</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-black font-mono text-[#1A1A1A]">₹{totalFinancialOverage.toFixed(2)}</span>
            <span className="text-[11px] text-neutral-400 font-mono">Accumulated</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-150 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono text-neutral-500 uppercase font-black tracking-wider">Total Collections Due</span>
            <span className="p-1 px-1.5 text-[9px] bg-amber-50 text-amber-700 border border-amber-200 rounded font-mono font-bold">Balance</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-black font-mono text-[#E5B84B]">₹{remainingFinanceDue.toFixed(2)}</span>
            <span className="text-[11px] text-neutral-400 font-mono">Uncollected</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-150 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono text-neutral-500 uppercase font-black tracking-wider">Running Orders Pipeline</span>
            <span className="p-1 px-1.5 text-[9px] bg-blue-50 text-blue-700 border border-blue-200 rounded font-mono font-bold">Specs</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-black font-mono text-neutral-800">{totalBilletActiveOrders} Active</span>
            <span className="text-[11px] text-neutral-400 font-mono">Total tracked</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-150 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono text-neutral-500 uppercase font-black tracking-wider">In-Production Phase</span>
            <span className="p-1 px-1.5 text-[9px] bg-neutral-100 text-neutral-700 border border-neutral-200 rounded font-mono font-bold">Mill</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-black font-mono text-neutral-800">{inManufacturingCount}</span>
            <span className="text-[11px] text-neutral-400 font-mono">{inquiryCount} new inquiries</span>
          </div>
        </div>
      </div>

      {/* 3. CONTROLS BAR: SEARCH, VIEWS TOGGLE AND WORKFLOW FILTERS */}
      <div className="mx-8 mt-6 p-4 bg-white border border-neutral-200 rounded-2xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* View selector buttons */}
          <div className="bg-neutral-100 p-1 rounded-lg flex gap-1 border border-neutral-200">
            <button 
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase font-bold transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-neutral-900 border border-neutral-200/50' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              Roster Table
            </button>
            <button 
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase font-bold transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-neutral-900 border border-neutral-200/50' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              8-Step Board
            </button>
          </div>

          <div className="h-6 w-[1px] bg-neutral-200 hidden md:block"></div>

          {/* Workflow Filter pill buttons */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-[500px] no-scrollbar">
            <span className="text-[10px] text-neutral-450 font-mono font-bold uppercase mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Workflow:
            </span>
            <button
              onClick={() => setFilterWorkflow('All')}
              className={`px-2.5 py-1 text-[11px] font-mono rounded-full font-bold transition-all border ${filterWorkflow === 'All' ? 'bg-[#1A1A1A] text-white border-transparent' : 'bg-neutral-55 hover:bg-neutral-100 text-neutral-600 border-neutral-200'}`}
            >
              All
            </button>
            {WORKFLOW_STEPS.map(step => (
              <button
                key={step}
                onClick={() => setFilterWorkflow(step)}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-full font-bold transition-all border whitespace-nowrap ${filterWorkflow === step ? 'bg-[#E5B84B] text-neutral-950 border-transparent font-black' : 'bg-neutral-55 hover:bg-neutral-100 text-neutral-600 border-neutral-200'}`}
              >
                {step}
              </button>
            ))}
          </div>
        </div>

        {/* Search input field */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Order ID, Client club, items..."
            className="w-full bg-neutral-50 hover:bg-neutral-100/50 focus:bg-white text-xs border border-neutral-250 p-2.5 pl-9 rounded-xl text-neutral-800 placeholder-neutral-405 focus:outline-none focus:ring-1 focus:ring-[#E5B84B]"
          />
        </div>
      </div>

      {/* 4. MAIN INTERACTIVE CONTENT GRID (TABLE OR BOARD) */}
      <div className="mx-8 my-6 flex-1 flex flex-col select-none">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-20 flex flex-col items-center justify-center space-y-4"
            >
              <div className="w-8 h-8 rounded-full border-2 border-neutral-300 border-t-[#E5B84B] animate-spin"></div>
              <span className="text-xs font-mono font-bold text-neutral-500 uppercase tracking-widest">Parsing Closet Custom Orders...</span>
            </motion.div>
          ) : filteredOrders.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white p-16 rounded-3xl border border-neutral-150 text-center flex flex-col items-center justify-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full border border-neutral-200 flex items-center justify-center bg-neutral-50">
                <FolderOpen className="w-6 h-6 text-neutral-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-neutral-800">No matching athlete orders found</h4>
                <p className="text-xs text-neutral-400 max-w-xs">There are no custom athletic specification orders cataloged matching the selected branch or criteria.</p>
              </div>
              <button 
                onClick={() => setIsNewOrderModalOpen(true)}
                className="px-4 py-2 bg-neutral-900 text-[#E5B84B] rounded-lg text-xs font-mono font-bold uppercase hover:bg-neutral-850"
              >
                Specify first order
              </button>
            </motion.div>
          ) : viewMode === 'list' ? (
            // --- VIEW MODE A: LISTING ROSTER TABLE ---
            <motion.div 
              key="list-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white border border-neutral-200 rounded-2.5xl overflow-hidden shadow-sm"
              id="orders-matrix-container"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-150 text-neutral-500 font-mono text-[10px] uppercase font-bold tracking-wider">
                      <th className="px-6 py-4.5">Order ID</th>
                      <th className="px-6 py-4.5">Athletes & Customer Name</th>
                      <th className="px-6 py-4.5">Personalized Wear</th>
                      <th className="px-6 py-4.5">Mill Timeline</th>
                      <th className="px-6 py-4.5">PWA Step Workflow</th>
                      <th className="px-6 py-4.5">Total Sale</th>
                      <th className="px-6 py-4.5">Collected / Balance</th>
                      <th className="px-6 py-4.5 text-right">Specsheet Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-150 font-sans text-neutral-800">
                    {filteredOrders.map(order => {
                      const calculatedRemaining = Math.max(0, order.totalAmount - order.advancePayment);
                      const isOverdue = new Date(order.promisedDate) < new Date() && order.workflowStatus !== 'Delivered';
                      return (
                        <tr key={order.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-mono font-bold text-xs text-black block tracking-tight">
                              {order.id}
                            </span>
                            <span className="text-[9px] font-mono font-medium text-neutral-400 uppercase py-0.5 px-1 bg-neutral-100 rounded border border-neutral-150">
                              {order.orderType}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-xs text-neutral-900">{order.customerName}</div>
                            {order.teamName && (
                              <div className="text-[10px] text-neutral-500 font-mono flex items-center gap-1 mt-0.5">
                                <Users className="w-3.5 h-3.5 text-[#E5B84B]" />
                                <span>{order.teamName}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs text-neutral-700 max-w-[200px] truncate">
                              {order.orderItems.map(i => `${i.qty}x ${i.name}`).join(', ')}
                            </div>
                            <div className="flex gap-1.5 mt-1.5 flex-wrap">
                              {order.orderItems.map(item => {
                                if (item.sizes) {
                                  return Object.entries(item.sizes as Record<string, number>).filter(([_, v]) => v > 0).map(([k, v]) => (
                                    <span key={k} className="text-[9px] font-mono bg-neutral-100 border border-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded font-black">
                                      {k}:{v}
                                    </span>
                                  ));
                                }
                                return null;
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1 text-xs text-neutral-800">
                              <Calendar className="w-3.5 h-3.5 text-neutral-420" />
                              <span className={isOverdue ? 'text-red-650 font-bold' : ''}>
                                {order.promisedDate}
                              </span>
                            </div>
                            {isOverdue && (
                              <span className="text-[8px] font-mono font-black uppercase text-red-600 bg-red-50 border border-red-200 rounded px-1 py-0.1 ml-1.5 tracking-wider animate-pulse">
                                DELAY RISK
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-extrabold uppercase tracking-widest ${
                              order.workflowStatus === 'Delivered' ? 'bg-neutral-200 text-neutral-700' :
                              order.workflowStatus === 'Quality Check' || order.workflowStatus === 'Packed' ? 'bg-emerald-100 text-emerald-850 border border-emerald-300' :
                              'bg-amber-100 text-amber-850 border border-amber-300'
                            }`}>
                              ● {order.workflowStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-mono font-black text-neutral-900 block">
                              ₹{order.totalAmount.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold font-mono text-emerald-600">
                                Paid: ₹{order.advancePayment.toFixed(2)}
                              </span>
                              {calculatedRemaining > 0 ? (
                                <span className="text-[10px] text-red-500 font-mono font-bold mt-0.5">
                                  Bal: ₹{calculatedRemaining.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-250 font-bold uppercase rounded px-1 py-0.2 mt-0.5 inline-block w-fit">
                                  Cleared
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => setSelectedOrder(order)}
                              className="p-1.5 px-3 bg-[#1A1A1A] hover:bg-[#E5B84B] text-[#E5B84B] hover:text-neutral-950 font-mono text-[10px] uppercase font-bold tracking-wide rounded-lg border border-[#E5B84B]/20 hover:border-transparent cursor-pointer transition-all inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5 text-neutral-450 hover:text-inherit" />
                              <span>Custom Spec</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            // --- VIEW MODE B: 8-STEP WORKFLOW KANBAN BOARD ---
            <motion.div 
              key="kanban-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 overflow-x-auto pb-4 flex gap-4 min-h-[500px]"
            >
              {WORKFLOW_STEPS.map(column => {
                const columnOrders = filteredOrders.filter(o => o.workflowStatus === column);
                return (
                  <div key={column} className="min-w-[260px] max-w-[280px] flex-1 bg-[#F5F5F5] p-3.5 rounded-2xl flex flex-col h-fit max-h-[70vh] border border-[#E5E5E5]">
                    
                    {/* Column Header */}
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-mono text-neutral-600 font-black uppercase tracking-wider block">
                        {column}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-200 text-neutral-600">
                        {columnOrders.length}
                      </span>
                    </div>

                    {/* Column Body Cards list */}
                    <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1 scrollbar-thin">
                      {columnOrders.length === 0 ? (
                        <div className="py-12 text-center text-[10px] font-mono font-bold text-neutral-400 border border-dashed border-neutral-300 rounded-xl bg-white/50">
                          Empty Lane
                        </div>
                      ) : (
                        columnOrders.map(order => {
                          const calculatedRemaining = Math.max(0, order.totalAmount - order.advancePayment);
                          return (
                            <div 
                              key={order.id}
                              onClick={() => setSelectedOrder(order)}
                              className="bg-white p-3.5 rounded-xl border border-neutral-150 shadow-sm cursor-pointer hover:shadow-md hover:border-[#E5B84B]/40 hover:scale-[1.01] transition-all space-y-2.5 text-left"
                            >
                              <div className="flex justify-between items-start">
                                <span className="font-mono font-black text-xs text-[#1A1A1A]">
                                  {order.id}
                                </span>
                                <span className="text-[8px] font-mono font-black tracking-wide text-neutral-400 bg-neutral-100 rounded px-1.5 py-0.5 border border-neutral-200">
                                  {order.orderType}
                                </span>
                              </div>

                              <div>
                                <h5 className="text-[11px] font-bold text-neutral-800 line-clamp-1">{order.customerName}</h5>
                                {order.teamName && (
                                  <span className="text-[9px] text-neutral-500 font-mono block mt-0.5 truncate">{order.teamName}</span>
                                )}
                              </div>

                              <p className="text-[9px] font-mono text-neutral-500 line-clamp-2 bg-neutral-50 p-1.5 rounded">
                                {order.orderItems.map(i => `${i.qty}x ${i.name}`).join(', ')}
                              </p>

                              <div className="flex justify-between items-center pt-2 border-t border-neutral-100">
                                <div className="text-[9px] font-mono text-neutral-500 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-neutral-400" />
                                  <span>{order.promisedDate}</span>
                                </div>
                                <div className="text-right flex flex-col">
                                  <span className="text-[10px] font-mono font-bold text-[#1A1A1A]">₹{order.totalAmount.toFixed(2)}</span>
                                  {calculatedRemaining > 0 && (
                                    <span className="text-[8px] font-mono text-neutral-400 leading-none">Bal: ₹{calculatedRemaining.toFixed(2)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 5. MODAL C: CREATE CUSTOM ORDER FORM SPEC SHEET */}
      <AnimatePresence>
        {isNewOrderModalOpen && (
          <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-sm flex items-center justify-center p-4" id="modal-order-maker">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#E5B84B]/30 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-4.5 bg-neutral-900 border-b border-[#E5B84B]/20 flex items-center justify-between text-white">
                <h3 className="font-mono text-xs font-black tracking-widest text-[#E5B84B] uppercase flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#E5B84B]" />
                  <span>Specify Custom Athletic Order Draft</span>
                </h3>
                <button 
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="text-neutral-400 hover:text-white font-mono text-xs cursor-pointer p-1 rounded hover:bg-neutral-800"
                >
                  ✕ Close
                </button>
              </div>

              {/* Form client body */}
              <form onSubmit={handleCreateOrder} className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 text-neutral-700">
                
                {/* LHS: Customer + General Attributes */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="p-4 bg-neutral-50/50 border border-neutral-200 rounded-2xl space-y-3.5 text-left">
                    <span className="text-[10px] font-mono text-neutral-500 font-bold uppercase tracking-wider block">1. CRM Client Allocation</span>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-600 font-bold uppercase">Customer Name *</label>
                      <input 
                        type="text" 
                        required
                        value={newOrder.customerName}
                        onChange={(e) => setNewOrder(prev => ({ ...prev, customerName: e.target.value }))}
                        placeholder="e.g. Camberwell Lions FC Coordinator"
                        className="w-full bg-white border border-neutral-250 rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#E5B84B] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-600 font-bold uppercase">Contact Phone</label>
                        <input 
                          type="text" 
                          value={newOrder.phone}
                          onChange={(e) => setNewOrder(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="+61-491-..."
                          className="w-full bg-white border border-neutral-250 rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#E5B84B] focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-600 font-bold uppercase">Associated Team</label>
                        <input 
                          type="text" 
                          value={newOrder.teamName}
                          onChange={(e) => setNewOrder(prev => ({ ...prev, teamName: e.target.value }))}
                          placeholder="e.g. Camberwell Lions CC"
                          className="w-full bg-white border border-neutral-250 rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#E5B84B] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-neutral-50/50 border border-neutral-200 rounded-2xl space-y-3.5 text-left">
                    <span className="text-[10px] font-mono text-neutral-500 font-bold uppercase tracking-wider block">2. Manufacturing Parameters</span>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-600 font-bold uppercase">Order Category</label>
                        <select 
                          value={newOrder.orderType}
                          onChange={(e) => setNewOrder(prev => ({ ...prev, orderType: e.target.value }))}
                          className="w-full bg-white border border-neutral-250 rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#E5B84B] focus:outline-none"
                        >
                          <option value="Sublimation Jerseys">Sublimation Jerseys</option>
                          <option value="Custom Pants">Custom Pants</option>
                          <option value="Complete Cricket Kit">Complete Cricket Kit</option>
                          <option value="Custom Pads">Custom Pads</option>
                          <option value="Custom Bat Molding">Custom Bat Molding</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-600 font-bold uppercase">Due Promised Date</label>
                        <input 
                          type="date" 
                          required
                          value={newOrder.promisedDate}
                          onChange={(e) => setNewOrder(prev => ({ ...prev, promisedDate: e.target.value }))}
                          className="w-full bg-white border border-neutral-250 rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#E5B84B] focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-600 font-bold uppercase">Assign Craftsman Staff</label>
                      <select 
                        value={newOrder.assignedStaffId}
                        onChange={(e) => setNewOrder(prev => ({ ...prev, assignedStaffId: e.target.value }))}
                        className="w-full bg-white border border-neutral-250 rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#E5B84B] focus:outline-none"
                      >
                        <option value="">-- No Assigner specified --</option>
                        {staffMembers.map(staff => (
                          <option key={staff.uid} value={staff.uid}>{staff.name} ({staff.roleId})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-600 font-bold uppercase">Advance payment received (₹)</label>
                      <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        value={newOrder.advancePayment}
                        onChange={(e) => setNewOrder(prev => ({ ...prev, advancePayment: Number(e.target.value) }))}
                        placeholder="e.g. 150.00"
                        className="w-full bg-white border border-neutral-250 rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#E5B84B] focus:outline-none font-mono font-bold"
                      />
                    </div>

                    <div className="space-y-1 col-span-2">
                      <label className="text-[10px] text-neutral-600 font-bold uppercase block">Core Order Milling Notes</label>
                      <textarea 
                        value={newOrder.notes}
                        onChange={(e) => setNewOrder(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Enter precise grain measurements, handle shape, or branding specifications..."
                        rows={2}
                        className="w-full bg-white border border-neutral-250 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-[#E5B84B]"
                      />
                    </div>
                  </div>
                </div>

                {/* RHS: Item builder, Size matrix and Player tables */}
                <div className="lg:col-span-7 space-y-4">
                  
                  {/* MULTI ITEM SUPPORT */}
                  <div className="p-4 bg-neutral-50/50 border border-neutral-200 rounded-2xl text-left">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-mono text-neutral-500 font-bold uppercase tracking-wider block">3. Multi-Item Specifications Builder</span>
                      
                      <button 
                        type="button"
                        onClick={handleAddNewItem}
                        className="text-[10px] bg-neutral-900 text-[#E5B84B] px-2 py-1.5 rounded uppercase font-bold hover:bg-neutral-800"
                      >
                        + Add Sibling Item
                      </button>
                    </div>

                    {/* Left inline tab-list of items */}
                    <div className="flex gap-2 overflow-x-auto pb-2 border-b border-neutral-200">
                      {newOrder.items.map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-1 shrink-0">
                          <button 
                            type="button"
                            onClick={() => setCurrentItemIndex(idx)}
                            className={`px-3 py-1 text-xs font-mono rounded font-bold whitespace-nowrap ${currentItemIndex === idx ? 'bg-[#E5B84B] text-neutral-950 font-black border border-transparent' : 'bg-white border border-neutral-200 text-neutral-500'}`}
                          >
                            Item {idx + 1}: {item.category}
                          </button>
                          {newOrder.items.length > 1 && (
                            <button 
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Current Active Item Spec Details */}
                    {newOrder.items[currentItemIndex] && (
                      <div className="pt-3 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] text-neutral-600 font-bold uppercase">Item Name description</label>
                            <input 
                              type="text" 
                              required
                              value={newOrder.items[currentItemIndex].name}
                              onChange={(e) => {
                                const newName = e.target.value;
                                setNewOrder(prev => {
                                  const c = [...prev.items];
                                  c[currentItemIndex].name = newName;
                                  return { ...prev, items: c };
                                });
                              }}
                              className="w-full bg-white border border-neutral-250 rounded-lg p-2 text-xs focus:ring-[#E5B84B]"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] text-neutral-600 font-bold uppercase">Price per Item</label>
                              <input 
                                type="number" 
                                min="0"
                                step="0.5"
                                value={newOrder.items[currentItemIndex].price}
                                onChange={(e) => {
                                  const p = Number(e.target.value);
                                  setNewOrder(prev => {
                                    const c = [...prev.items];
                                    c[currentItemIndex].price = p;
                                    return { ...prev, items: c };
                                  });
                                }}
                                className="w-full bg-white border border-neutral-250 rounded-lg p-2 text-xs focus:ring-[#E5B84B] font-mono font-bold"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-neutral-600 font-bold uppercase">Total Qty</label>
                              <input 
                                type="number" 
                                readOnly
                                value={newOrder.items[currentItemIndex].sizes ? sumSizes(newOrder.items[currentItemIndex].sizes as Record<string, number>, 0) : newOrder.items[currentItemIndex].qty}
                                className="w-full bg-neutral-100 border border-neutral-200 rounded-lg p-2 text-xs font-mono font-bold"
                              />
                            </div>
                          </div>
                        </div>

                        {/* JERSEY SIZING MATRIX */}
                        <div className="p-3 bg-white border border-neutral-200 rounded-xl">
                          <label className="text-[10px] text-[#E5B84B] font-black uppercase tracking-wider block mb-2">4. Sublimation / Uniform Jersey Size Matrix</label>
                          <div className="grid grid-cols-5 gap-2">
                            {(['S', 'M', 'L', 'XL', 'XXL'] as const).map(sz => (
                              <div key={sz} className="text-center p-2 bg-neutral-50 rounded-lg border border-neutral-200">
                                <span className="text-[10px] font-bold text-neutral-500 block mb-1">{sz} size</span>
                                <div className="flex items-center justify-between gap-1 mt-1">
                                  <button 
                                    type="button"
                                    onClick={() => handleSizeChange(currentItemIndex, sz, -1)}
                                    className="px-1.5 py-0.5 rounded bg-white hover:bg-neutral-200 text-xs font-black border"
                                  >
                                    -
                                  </button>
                                  <span className="text-xs font-mono font-black text-black">
                                    {newOrder.items[currentItemIndex].sizes?.[sz] || 0}
                                  </span>
                                  <button 
                                    type="button"
                                    onClick={() => handleSizeChange(currentItemIndex, sz, 1)}
                                    className="px-1.5 py-0.5 rounded bg-white hover:bg-neutral-200 text-xs font-black border"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* PLAYER NAME/NUMBER MANAGEMENT */}
                        <div className="p-3 bg-white border border-neutral-200 rounded-xl">
                          <label className="text-[10px] text-[#E5B84B] font-black uppercase tracking-wider block mb-2">5. Player Custom Name & Numbers Roster</label>
                          
                          <div className="grid grid-cols-12 gap-2 items-end mb-3 bg-neutral-100 p-2 rounded-lg">
                            <div className="col-span-5">
                              <span className="text-[9px] font-bold text-neutral-500 block mb-1">Player print name</span>
                              <input 
                                type="text"
                                placeholder="e.g. Bradman"
                                value={rosterName}
                                onChange={(e) => setRosterName(e.target.value)}
                                className="w-full bg-white border rounded-lg p-1.5 text-xs text-black"
                              />
                            </div>
                            <div className="col-span-3">
                              <span className="text-[9px] font-bold text-neutral-500 block mb-1">Number</span>
                              <input 
                                type="text"
                                placeholder="99"
                                value={rosterNumber}
                                onChange={(e) => setRosterNumber(e.target.value)}
                                className="w-full bg-white border rounded-lg p-1.5 text-xs text-black font-mono font-bold"
                              />
                            </div>
                            <div className="col-span-3">
                              <span className="text-[9px] font-bold text-neutral-500 block mb-1">Size</span>
                              <select 
                                value={rosterSize} 
                                onChange={(e) => setRosterSize(e.target.value as any)}
                                className="w-full bg-white border rounded-lg p-1.5 text-xs text-black"
                              >
                                <option value="S">S</option>
                                <option value="M">M</option>
                                <option value="L">L</option>
                                <option value="XL">XL</option>
                                <option value="XXL">XXL</option>
                              </select>
                            </div>
                            <div className="col-span-1">
                              <button 
                                type="button"
                                onClick={() => handleAddRoster(currentItemIndex)}
                                className="w-full bg-neutral-900 hover:bg-[#E5B84B] text-white hover:text-black py-2 rounded-lg text-xs font-mono font-bold text-center"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Existing Roster list */}
                          <div className="max-h-[140px] overflow-y-auto divide-y font-mono text-[10px]">
                            {(!newOrder.items[currentItemIndex].playerRoster || newOrder.items[currentItemIndex].playerRoster?.length === 0) ? (
                              <div className="text-center py-4 text-neutral-450 italic">No personalized custom names registered. Sizes are aggregated in size matrix.</div>
                            ) : (
                              newOrder.items[currentItemIndex].playerRoster?.map((pt, rIdx) => (
                                <div key={pt.name + rIdx} className="py-1.5 flex justify-between items-center">
                                  <div className="flex gap-2">
                                    <span className="text-[9px] bg-neutral-100 px-1 py-0.5 rounded text-neutral-500 uppercase">#{rIdx + 1}</span>
                                    <span className="font-extrabold text-neutral-800">{pt.name}</span>
                                    <span className="text-neutral-400">({pt.size})</span>
                                  </div>
                                  <div className="flex gap-4 items-center">
                                    <span className="font-black text-[#E5B84B]">{pt.number}</span>
                                    <button 
                                      type="button"
                                      onClick={() => handleRemoveRoster(currentItemIndex, rIdx)}
                                      className="text-red-500 hover:text-red-700 font-bold"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                      </div>
                    )}
                  </div>

                  {/* FILE UPLOADS SECTION */}
                  <div className="p-4 bg-neutral-50/50 border border-neutral-200 rounded-2xl text-left space-y-3">
                    <span className="text-[10px] font-mono text-neutral-500 font-bold uppercase tracking-wider block">6. Custom Design Templates & Blueprint uploads</span>
                    
                    {/* Simulated Select Templates */}
                    <div className="grid grid-cols-4 gap-2.5">
                      {VECTOR_JERSEY_TEMPLATES.map(vector => {
                        const isChosen = selectedDesignTemplate === vector.name;
                        return (
                          <div 
                            key={vector.id} 
                            onClick={() => handleAddTemplateAsAttachment(vector.url, vector.name)}
                            className={`p-1.5 rounded-xl border bg-white cursor-pointer hover:border-[#E5B84B] transition-all relative ${isChosen ? 'border-[#E5B84B] ring-1 ring-[#E5B84B]' : 'border-neutral-250'}`}
                          >
                            <img src={vector.url} alt={vector.name} className="w-full h-14 object-cover rounded-lg" referrerPolicy="no-referrer" />
                            <div className="text-[9px] font-mono font-bold mt-1.5 truncate text-neutral-800">{vector.name}</div>
                            {isChosen && (
                              <span className="absolute top-1 right-1 bg-[#E5B84B] text-neutral-950 p-0.5 rounded text-[8px] font-mono font-black">ACTIVE</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Interactive Drop area standard */}
                    <div 
                      onDragOver={(e) => { e.preventDefault(); setDraggedOver(true); }}
                      onDragLeave={() => setDraggedOver(false)}
                      onDrop={handleMockDrop}
                      className={`p-5 rounded-xl border border-dashed text-center transition-all ${draggedOver ? 'bg-[#E5B84B]/10 border-[#E5B84B]' : 'bg-white border-neutral-250'}`}
                    >
                      <Paperclip className="w-5 h-5 mx-auto text-[#E5B84B]" />
                      <span className="text-[10px] text-neutral-500 block mt-2 font-mono">
                        Drag & Drop sublimation vector blueprints or mock file attachments here to auto-stitch
                      </span>
                      <span className="text-[9px] text-[#E5B84B] font-bold block mt-1 uppercase">OR CHOOSE STATIC TEMPLATE ABOVE</span>
                    </div>

                    {/* Created attachments rows */}
                    {newOrder.attachments.length > 0 && (
                      <div className="divide-y border border-neutral-200 rounded-xl bg-white p-2">
                        {newOrder.attachments.map(at => (
                          <div key={at.id} className="py-2.5 flex justify-between items-center text-[10px] font-mono">
                            <div className="flex gap-2 items-center">
                              <FileCheck className="w-4 h-4 text-emerald-600" />
                              <span className="font-bold text-neutral-800 text-[11px] truncate max-w-[150px]">{at.name}</span>
                              <span className="text-neutral-400">({at.size})</span>
                            </div>
                            <button 
                              type="button"
                              onClick={() => setNewOrder(prev => ({ ...prev, attachments: prev.attachments.filter(x => x.id !== at.id) }))}
                              className="text-red-500 font-bold hover:text-red-700"
                            >
                              ✕ Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

              </form>

              {/* Action Buttons */}
              <div className="px-6 py-4 bg-neutral-950 border-t border-neutral-800 flex justify-between items-center text-white">
                <div className="text-left">
                  <span className="text-[9px] text-neutral-450 font-mono block">Estimated calculated cost sum</span>
                  <span className="text-base font-black text-[#E5B84B] font-mono leading-none">
                    ${newOrder.items.reduce((sum, item) => {
                      const qty = item.sizes ? sumSizes(item.sizes as Record<string, number>, 0) : item.qty;
                      return sum + (item.price * qty);
                    }, 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setIsNewOrderModalOpen(false)}
                    className="px-4 py-2 text-xs font-mono font-bold bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 rounded-lg cursor-pointer"
                  >
                    Cancel Draft
                  </button>
                  <button 
                    type="button"
                    onClick={handleCreateOrder}
                    className="px-4 py-2 text-xs font-mono font-black bg-[#E5B84B] text-neutral-950 rounded-lg cursor-pointer hover:bg-yellow-500 flex items-center gap-1.5"
                  >
                    <span>Store custom spec</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. MODAL D: DETAILED CUSTOMER SPEC SHEET SLIDE PANEL */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-sm flex justify-end" id="modal-order-specs">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white border-l border-neutral-300 w-full max-w-2xl max-h-screen overflow-y-auto shadow-2xl flex flex-col text-neutral-800 text-left"
            >
              {/* Slide header */}
              <div className="px-6 py-5 bg-neutral-950 text-white border-b border-neutral-850 flex items-center justify-between">
                <div>
                  <h4 className="font-mono text-sm font-black text-[#E5B84B] tracking-widest">{selectedOrder.id} SPEC DETAILS</h4>
                  <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Specifications registered for custom sports sublimation wear.</p>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-850 rounded font-mono text-xs cursor-pointer"
                >
                  ✕ Close panel
                </button>
              </div>

              {/* Status workflow Timeline Indicator bar */}
              <div className="px-6 py-4 bg-[#F9F9F9] border-b border-neutral-200">
                <span className="text-[10px] text-neutral-500 font-mono uppercase font-black tracking-wider block mb-2">Process workflow status lights</span>
                <div className="flex justify-between items-center gap-1.5 overflow-x-auto pb-2 scrollbar-dotted">
                  {WORKFLOW_STEPS.map((step, idx) => {
                    const stepIdx = WORKFLOW_STEPS.indexOf(selectedOrder.workflowStatus);
                    const isActive = step === selectedOrder.workflowStatus;
                    const isCompleted = idx < stepIdx;
                    return (
                      <div 
                        key={step} 
                        onClick={() => handleTransitionWorkflow(selectedOrder.id, step)}
                        className={`flex flex-col items-center flex-1 min-w-[70px] cursor-pointer group`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[9px] font-black border transition-all ${
                          isActive ? 'bg-[#E5B84B] text-neutral-950 border-transparent scale-110 shadow-md shadow-[#E5B84B]/30' :
                          isCompleted ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          'bg-neutral-100 text-neutral-400 border-neutral-250 group-hover:bg-neutral-200'
                        }`}>
                          {isCompleted ? '✓' : idx + 1}
                        </div>
                        <span className={`text-[8px] font-mono uppercase mt-1 text-center font-black truncate max-w-[70px] ${
                          isActive ? 'text-[#E5B84B]' : isCompleted ? 'text-emerald-700' : 'text-neutral-400'
                        }`}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Slide Body */}
              <div className="p-6 space-y-6 flex-1">
                
                {/* 2-Column Overview Info cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-150 text-left">
                    <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest block">Client Coordinator</span>
                    <span className="font-extrabold text-neutral-900 block mt-0.5 text-xs">{selectedOrder.customerName}</span>
                    <span className="text-[10px] font-mono text-neutral-500 block mt-1">{selectedOrder.phone}</span>
                    {selectedOrder.teamName && (
                      <span className="text-[10px] font-mono text-[#E5B84B] font-bold block mt-1.5 uppercase">Team: {selectedOrder.teamName}</span>
                    )}
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-150 text-left">
                    <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest block">Milling parameters</span>
                    <span className="font-extrabold text-[#1A1A1A] block mt-0.5 text-xs">{selectedOrder.orderType}</span>
                    <span className="text-[10px] font-mono text-red-650 block mt-1.5 font-bold">Promised: {selectedOrder.promisedDate}</span>
                    <span className="text-[10px] font-mono text-neutral-500 block mt-1">Assigned: {selectedOrder.assignedStaffName || 'Unassigned'}</span>
                  </div>
                </div>

                {/* Billing Summary Piles */}
                <div className="bg-[#FFFDF6] border border-[#E5B84B]/20 p-4 rounded-xl flex justify-between items-center text-left">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider block">Total specification invoice</span>
                    <span className="text-xl font-mono font-black text-[#1A1A1A]">₹{selectedOrder.totalAmount.toFixed(2)}</span>
                  </div>

                  <div className="space-y-1 text-center">
                    <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider block">Advance Paid</span>
                    <span className="text-base font-mono font-bold text-emerald-600 block">₹{selectedOrder.advancePayment.toFixed(2)}</span>
                  </div>

                  <div className="space-y-1 text-right">
                    <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider block">Remaining balance</span>
                    <span className="text-base font-mono font-black text-red-650 block">₹{selectedOrder.remainingPayment.toFixed(2)}</span>
                  </div>
                </div>

                {/* Sublimation Sub-Items & Size Matrix view */}
                <div className="space-y-3 text-left">
                  <h5 className="text-[11px] font-mono uppercase font-black text-neutral-600 tracking-wider">Order Specifications (Sublimation and size distribution)</h5>
                  <div className="space-y-4">
                    {selectedOrder.orderItems?.map((item, itemIdx) => (
                      <div key={item.id || itemIdx} className="p-4 bg-white border border-neutral-200 rounded-xl space-y-3.5">
                        <div className="flex justify-between items-center border-b pb-2">
                          <div>
                            <span className="text-xs font-bold text-neutral-900 block">{item.name}</span>
                            <span className="text-[9px] font-mono text-neutral-400 capitalize">Category: {item.category}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono font-extrabold text-black block">₹{item.price.toFixed(2)} / unit</span>
                            <span className="text-[10px] text-neutral-500 font-mono">Aggregated Total: {item.qty} units</span>
                          </div>
                        </div>

                        {/* Sizes matrix row */}
                        {item.sizes && (
                          <div className="p-2.5 bg-[#FAF9F6] border rounded-lg">
                            <span className="text-[9px] font-mono text-neutral-500 font-bold uppercase tracking-wider block mb-1.5">Sizing Distribution Matrix</span>
                            <div className="grid grid-cols-5 gap-1.5 text-center">
                              {Object.entries(item.sizes).map(([sz, qty]) => (
                                <div key={sz} className="p-1.5 bg-white border border-neutral-150 rounded-md">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase block">{sz}</span>
                                  <span className="text-[11px] font-bold text-neutral-800 font-mono mt-0.5">{qty}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Player customization lists */}
                        {item.playerRoster && item.playerRoster.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-mono text-neutral-500 font-bold uppercase tracking-wider block">Custom printed rosters</span>
                            <div className="border border-neutral-200 rounded-lg overflow-hidden divide-y text-[10px] font-mono">
                              <div className="grid grid-cols-3 bg-neutral-105 p-2 font-black text-neutral-600">
                                <span>Player Name</span>
                                <span>Roster Jersey #</span>
                                <span className="text-right">Roster size</span>
                              </div>
                              {item.playerRoster.map((player, rIdx) => (
                                <div key={rIdx} className="grid grid-cols-3 p-2 hover:bg-neutral-100">
                                  <span className="font-extrabold text-neutral-800">{player.name}</span>
                                  <span className="font-black text-[#E5B84B]">{player.number}</span>
                                  <span className="text-right uppercase">{player.size}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick financial clearing updates */}
                {selectedOrder.remainingPayment > 0 && (
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-end gap-3 text-left">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] text-neutral-500 font-bold uppercase font-mono block">Recieve Billing payment clearing installment</label>
                      <input 
                        type="number"
                        min="0"
                        value={paymentAmount || ''}
                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                        placeholder="e.g. 100.00"
                        className="w-full bg-white border rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#E5B84B] font-mono font-bold"
                      />
                    </div>
                    <button 
                      onClick={() => handleUpdatePayment(selectedOrder.id)}
                      className="px-4 py-2 bg-neutral-900 hover:bg-[#E5B84B] text-white hover:text-black font-mono font-bold text-xs uppercase rounded-lg border cursor-pointer"
                    >
                      Clear balance
                    </button>
                  </div>
                )}

                {/* Core Design files vector Blueprints */}
                <div className="text-left space-y-2">
                  <h5 className="text-[11px] font-mono uppercase font-black text-neutral-600 tracking-wider">Sublimation Artwork & design attachment blueprints</h5>
                  {selectedOrder.attachments && selectedOrder.attachments.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3.5">
                      {selectedOrder.attachments.map(att => (
                        <div key={att.id} className="p-2.5 bg-white border rounded-xl shadow-sm text-left relative flex gap-2.5 items-center">
                          <img src={att.url} alt={att.name} className="w-12 h-12 object-cover rounded-md" referrerPolicy="no-referrer" />
                          <div className="overflow-hidden min-w-0">
                            <span className="text-[10px] font-bold text-neutral-900 block truncate">{att.name}</span>
                            <span className="text-[9px] font-mono text-neutral-400 block">{att.size} • {att.uploadedAt}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center rounded-xl border border-dashed text-xs text-neutral-400">No vector layout designs attached onto this custom specification sheet document.</div>
                  )}
                </div>

                {/* Interactive Notes Logs and in-line commentary stream */}
                <div className="space-y-3 text-left">
                  <h5 className="text-[11px] font-mono uppercase font-black text-neutral-600 tracking-wider">Activity timeline commentary</h5>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {selectedOrder.comments?.map(log => (
                      <div key={log.id} className="p-2.5 bg-[#FAF9F6] border border-neutral-150 rounded-lg text-left">
                        <div className="flex justify-between items-center text-[9px] font-mono text-neutral-500 mb-1">
                          <span className="font-extrabold text-neutral-700">{log.author} ({log.role})</span>
                          <span>{log.timestamp}</span>
                        </div>
                        <p className="text-[10px] text-neutral-800 leading-normal">{log.comment}</p>
                      </div>
                    ))}
                    {(!selectedOrder.comments || selectedOrder.comments.length === 0) && (
                      <p className="text-[10px] italic text-neutral-400 text-center py-2">No comments logged. Add operational logs below.</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Comment on grain finishing, color matching or delay..."
                      className="flex-1 bg-white border border-neutral-250 p-2 rounded-lg text-xs focus:ring-[#E5B84B] focus:outline-none focus:ring-1"
                    />
                    <button 
                      onClick={() => handlePostComment(selectedOrder.id)}
                      className="p-2 bg-neutral-905 hover:bg-[#E5B84B] hover:text-black text-white rounded-lg transition-colors cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>

              {/* Slider Bottom actions */}
              <div className="p-5 bg-neutral-900 text-white border-t border-neutral-800 flex justify-between">
                <div>
                  <span className="text-[9px] text-neutral-400 font-mono block">Sync state</span>
                  <span className="text-[10px] text-emerald-450 font-mono uppercase font-black tracking-wide flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Realtime Online
                  </span>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      if (confirm("Verify action: Delete custom orders from master ledger?")) {
                        try {
                          await fetch(`/api/orders/${selectedOrder.id}`, {
                            method: 'DELETE'
                          });
                          await fetchOrdersFromAzure();
                        } catch (err) {
                          console.error("Failed to delete order from Azure:", err);
                          const updated = orders.filter(o => o.id !== selectedOrder.id);
                          localStorage.setItem(`tott_cricket_closet_orders_${branchScope}`, JSON.stringify(updated));
                          setOrders(updated);
                        }
                        setSelectedOrder(null);
                      }
                    }}
                    className="px-3.5 py-1.5 border border-red-950 text-red-500 hover:bg-red-950/20 rounded-lg text-xs font-mono font-bold cursor-pointer transition-colors"
                  >
                    Archive Spec
                  </button>
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="px-3.5 py-1.5 bg-[#E5B84B] hover:bg-yellow-500 text-neutral-950 rounded-lg text-xs font-mono font-black uppercase cursor-pointer"
                  >
                    Close Sheet
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
