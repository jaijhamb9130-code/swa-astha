// ==========================================
// SWA-ASTHA Pharmacy Portal - Mock Data
// ==========================================

// --- Types ---

export type MedicineStatus = "in-stock" | "low-stock" | "expiring-soon" | "expired"
export type OrderStatus = "pending" | "accepted" | "out-for-delivery" | "delivered" | "rejected"
export type OrderType = "delivery" | "pickup"
export type DeliveryAgentStatus = "active" | "idle" | "out-for-delivery"
export type StaffRole = "owner" | "manager" | "billing-staff" | "inventory-staff"
export type NotificationType = "order" | "low-stock" | "expiry" | "prescription"

export interface Medicine {
  id: string
  name: string
  brand: string
  genericName: string
  category: string
  batchNumber: string
  expiryDate: string
  quantity: number
  purchasePrice: number
  sellingPrice: number
  lowStockThreshold: number
  status: MedicineStatus
}

export interface OrderItem {
  medicineId: string
  medicineName: string
  quantity: number
  price: number
}

export interface Order {
  id: string
  patientName: string
  patientPhone: string
  items: OrderItem[]
  total: number
  type: OrderType
  status: OrderStatus
  prescriptionRequired: boolean
  timestamp: string
  deliveryAgentId?: string
}

export interface Wholesaler {
  id: string
  name: string
  contact: string
  email: string
  address: string
  categories: string[]
  totalOrders: number
  lastOrderDate: string
}

export interface DeliveryAgent {
  id: string
  name: string
  phone: string
  status: DeliveryAgentStatus
  currentOrderId?: string
  completedToday: number
  avatar: string
}

export interface Staff {
  id: string
  name: string
  role: StaffRole
  email: string
  phone: string
  lastActive: string
  avatar: string
}

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: string
  read: boolean
}

export interface BillingRecord {
  id: string
  invoiceNumber: string
  patientName: string
  items: OrderItem[]
  subtotal: number
  gstAmount: number
  total: number
  date: string
  paymentMethod: string
}

export interface SalesData {
  date: string
  sales: number
  orders: number
}

export interface RevenueExpense {
  month: string
  revenue: number
  expense: number
}

export interface ActivityLog {
  id: string
  staffName: string
  action: string
  timestamp: string
}

// --- Dashboard Summary ---

export const dashboardSummary = {
  todaySales: 48750,
  todaySalesChange: 12.5,
  totalOrders: 34,
  pendingOrders: 8,
  completedOrders: 26,
  lowStockCount: 7,
  expiringSoonCount: 4,
}

// --- Medicines ---

export const medicines: Medicine[] = [
  { id: "MED001", name: "Paracetamol 500mg", brand: "Crocin", genericName: "Paracetamol", category: "Analgesic", batchNumber: "B2025-001", expiryDate: "2027-03-15", quantity: 450, purchasePrice: 18, sellingPrice: 25, lowStockThreshold: 50, status: "in-stock" },
  { id: "MED002", name: "Amoxicillin 250mg", brand: "Mox", genericName: "Amoxicillin", category: "Antibiotic", batchNumber: "B2025-012", expiryDate: "2026-08-20", quantity: 120, purchasePrice: 45, sellingPrice: 65, lowStockThreshold: 30, status: "in-stock" },
  { id: "MED003", name: "Cetirizine 10mg", brand: "Cetzine", genericName: "Cetirizine", category: "Antihistamine", batchNumber: "B2025-023", expiryDate: "2027-01-10", quantity: 300, purchasePrice: 12, sellingPrice: 18, lowStockThreshold: 40, status: "in-stock" },
  { id: "MED004", name: "Omeprazole 20mg", brand: "Omez", genericName: "Omeprazole", category: "Antacid", batchNumber: "B2024-089", expiryDate: "2026-04-05", quantity: 15, purchasePrice: 30, sellingPrice: 48, lowStockThreshold: 25, status: "low-stock" },
  { id: "MED005", name: "Metformin 500mg", brand: "Glycomet", genericName: "Metformin", category: "Antidiabetic", batchNumber: "B2025-045", expiryDate: "2027-06-30", quantity: 200, purchasePrice: 22, sellingPrice: 35, lowStockThreshold: 40, status: "in-stock" },
  { id: "MED006", name: "Azithromycin 500mg", brand: "Azithral", genericName: "Azithromycin", category: "Antibiotic", batchNumber: "B2025-056", expiryDate: "2026-03-28", quantity: 8, purchasePrice: 65, sellingPrice: 95, lowStockThreshold: 20, status: "expiring-soon" },
  { id: "MED007", name: "Ibuprofen 400mg", brand: "Brufen", genericName: "Ibuprofen", category: "Analgesic", batchNumber: "B2025-067", expiryDate: "2027-09-12", quantity: 180, purchasePrice: 15, sellingPrice: 22, lowStockThreshold: 30, status: "in-stock" },
  { id: "MED008", name: "Atorvastatin 10mg", brand: "Atorva", genericName: "Atorvastatin", category: "Statin", batchNumber: "B2024-078", expiryDate: "2026-05-18", quantity: 90, purchasePrice: 55, sellingPrice: 80, lowStockThreshold: 25, status: "in-stock" },
  { id: "MED009", name: "Pantoprazole 40mg", brand: "Pan-D", genericName: "Pantoprazole", category: "Antacid", batchNumber: "B2025-034", expiryDate: "2027-02-28", quantity: 5, purchasePrice: 38, sellingPrice: 55, lowStockThreshold: 20, status: "low-stock" },
  { id: "MED010", name: "Amlodipine 5mg", brand: "Amlopress", genericName: "Amlodipine", category: "Antihypertensive", batchNumber: "B2025-091", expiryDate: "2027-11-20", quantity: 160, purchasePrice: 28, sellingPrice: 42, lowStockThreshold: 30, status: "in-stock" },
  { id: "MED011", name: "Ciprofloxacin 500mg", brand: "Ciplox", genericName: "Ciprofloxacin", category: "Antibiotic", batchNumber: "B2024-102", expiryDate: "2026-03-10", quantity: 12, purchasePrice: 50, sellingPrice: 72, lowStockThreshold: 20, status: "expiring-soon" },
  { id: "MED012", name: "Losartan 50mg", brand: "Losacar", genericName: "Losartan", category: "Antihypertensive", batchNumber: "B2025-113", expiryDate: "2027-07-25", quantity: 140, purchasePrice: 32, sellingPrice: 48, lowStockThreshold: 30, status: "in-stock" },
  { id: "MED013", name: "Ranitidine 150mg", brand: "Rantac", genericName: "Ranitidine", category: "Antacid", batchNumber: "B2024-050", expiryDate: "2026-01-15", quantity: 3, purchasePrice: 20, sellingPrice: 32, lowStockThreshold: 15, status: "expired" },
  { id: "MED014", name: "Doxycycline 100mg", brand: "Doxt", genericName: "Doxycycline", category: "Antibiotic", batchNumber: "B2025-124", expiryDate: "2027-04-10", quantity: 80, purchasePrice: 40, sellingPrice: 60, lowStockThreshold: 20, status: "in-stock" },
  { id: "MED015", name: "Montelukast 10mg", brand: "Montair", genericName: "Montelukast", category: "Respiratory", batchNumber: "B2025-135", expiryDate: "2027-08-05", quantity: 10, purchasePrice: 48, sellingPrice: 70, lowStockThreshold: 15, status: "low-stock" },
  { id: "MED016", name: "Clopidogrel 75mg", brand: "Clopilet", genericName: "Clopidogrel", category: "Antiplatelet", batchNumber: "B2025-146", expiryDate: "2027-10-22", quantity: 95, purchasePrice: 58, sellingPrice: 85, lowStockThreshold: 20, status: "in-stock" },
  { id: "MED017", name: "Levothyroxine 50mcg", brand: "Thyronorm", genericName: "Levothyroxine", category: "Thyroid", batchNumber: "B2025-157", expiryDate: "2027-05-14", quantity: 6, purchasePrice: 35, sellingPrice: 52, lowStockThreshold: 15, status: "low-stock" },
  { id: "MED018", name: "Diclofenac 50mg", brand: "Voveran", genericName: "Diclofenac", category: "Analgesic", batchNumber: "B2025-168", expiryDate: "2027-12-01", quantity: 220, purchasePrice: 14, sellingPrice: 20, lowStockThreshold: 30, status: "in-stock" },
  { id: "MED019", name: "Vitamin D3 60K IU", brand: "D-Rise", genericName: "Cholecalciferol", category: "Supplement", batchNumber: "B2025-179", expiryDate: "2026-04-10", quantity: 50, purchasePrice: 75, sellingPrice: 110, lowStockThreshold: 15, status: "expiring-soon" },
  { id: "MED020", name: "Multivitamin Tablets", brand: "Supradyn", genericName: "Multivitamin", category: "Supplement", batchNumber: "B2025-190", expiryDate: "2027-09-30", quantity: 350, purchasePrice: 85, sellingPrice: 125, lowStockThreshold: 25, status: "in-stock" },
]

// --- Orders ---

export const orders: Order[] = [
  { id: "ORD001", patientName: "Rajesh Kumar", patientPhone: "+91 98765 43210", items: [{ medicineId: "MED001", medicineName: "Paracetamol 500mg", quantity: 2, price: 25 }, { medicineId: "MED003", medicineName: "Cetirizine 10mg", quantity: 1, price: 18 }], total: 68, type: "delivery", status: "pending", prescriptionRequired: false, timestamp: "2026-02-22T09:30:00" },
  { id: "ORD002", patientName: "Priya Sharma", patientPhone: "+91 87654 32109", items: [{ medicineId: "MED002", medicineName: "Amoxicillin 250mg", quantity: 3, price: 65 }, { medicineId: "MED004", medicineName: "Omeprazole 20mg", quantity: 1, price: 48 }], total: 243, type: "pickup", status: "accepted", prescriptionRequired: true, timestamp: "2026-02-22T10:15:00" },
  { id: "ORD003", patientName: "Amit Patel", patientPhone: "+91 76543 21098", items: [{ medicineId: "MED005", medicineName: "Metformin 500mg", quantity: 2, price: 35 }, { medicineId: "MED008", medicineName: "Atorvastatin 10mg", quantity: 1, price: 80 }], total: 150, type: "delivery", status: "out-for-delivery", prescriptionRequired: true, timestamp: "2026-02-22T08:45:00", deliveryAgentId: "DA001" },
  { id: "ORD004", patientName: "Sunita Devi", patientPhone: "+91 65432 10987", items: [{ medicineId: "MED007", medicineName: "Ibuprofen 400mg", quantity: 1, price: 22 }], total: 22, type: "pickup", status: "delivered", prescriptionRequired: false, timestamp: "2026-02-22T07:20:00" },
  { id: "ORD005", patientName: "Mohammed Ali", patientPhone: "+91 54321 09876", items: [{ medicineId: "MED006", medicineName: "Azithromycin 500mg", quantity: 1, price: 95 }, { medicineId: "MED009", medicineName: "Pantoprazole 40mg", quantity: 1, price: 55 }], total: 150, type: "delivery", status: "delivered", prescriptionRequired: true, timestamp: "2026-02-21T16:30:00", deliveryAgentId: "DA002" },
  { id: "ORD006", patientName: "Kavita Reddy", patientPhone: "+91 43210 98765", items: [{ medicineId: "MED010", medicineName: "Amlodipine 5mg", quantity: 2, price: 42 }, { medicineId: "MED012", medicineName: "Losartan 50mg", quantity: 2, price: 48 }], total: 180, type: "delivery", status: "pending", prescriptionRequired: true, timestamp: "2026-02-22T11:00:00" },
  { id: "ORD007", patientName: "Vikram Singh", patientPhone: "+91 32109 87654", items: [{ medicineId: "MED014", medicineName: "Doxycycline 100mg", quantity: 2, price: 60 }], total: 120, type: "pickup", status: "accepted", prescriptionRequired: true, timestamp: "2026-02-22T10:45:00" },
  { id: "ORD008", patientName: "Neha Gupta", patientPhone: "+91 21098 76543", items: [{ medicineId: "MED020", medicineName: "Multivitamin Tablets", quantity: 1, price: 125 }, { medicineId: "MED019", medicineName: "Vitamin D3 60K IU", quantity: 2, price: 110 }], total: 345, type: "delivery", status: "rejected", prescriptionRequired: false, timestamp: "2026-02-21T14:20:00" },
  { id: "ORD009", patientName: "Arun Verma", patientPhone: "+91 10987 65432", items: [{ medicineId: "MED016", medicineName: "Clopidogrel 75mg", quantity: 1, price: 85 }, { medicineId: "MED005", medicineName: "Metformin 500mg", quantity: 1, price: 35 }], total: 120, type: "delivery", status: "out-for-delivery", prescriptionRequired: true, timestamp: "2026-02-22T09:00:00", deliveryAgentId: "DA003" },
  { id: "ORD010", patientName: "Deepa Nair", patientPhone: "+91 09876 54321", items: [{ medicineId: "MED018", medicineName: "Diclofenac 50mg", quantity: 3, price: 20 }, { medicineId: "MED001", medicineName: "Paracetamol 500mg", quantity: 2, price: 25 }], total: 110, type: "pickup", status: "delivered", prescriptionRequired: false, timestamp: "2026-02-22T08:10:00" },
]

// --- Wholesalers ---

export const wholesalers: Wholesaler[] = [
  { id: "WS001", name: "MedSupply India Pvt Ltd", contact: "+91 98888 77766", email: "orders@medsupply.in", address: "45, Pharma Hub, MG Road, Mumbai", categories: ["Antibiotic", "Analgesic", "Antacid"], totalOrders: 156, lastOrderDate: "2026-02-20" },
  { id: "WS002", name: "HealthCare Distributors", contact: "+91 87777 66655", email: "supply@healthcare-dist.com", address: "12, Industrial Area, Sector 5, Pune", categories: ["Antihypertensive", "Statin", "Antidiabetic"], totalOrders: 89, lastOrderDate: "2026-02-18" },
  { id: "WS003", name: "PharmaCorp Wholesale", contact: "+91 76666 55544", email: "bulk@pharmacorp.in", address: "78, Medicine Lane, Hyderabad", categories: ["Supplement", "Respiratory", "Thyroid"], totalOrders: 64, lastOrderDate: "2026-02-15" },
  { id: "WS004", name: "GenericMeds Trading Co", contact: "+91 65555 44433", email: "trade@genericmeds.co", address: "23, Wholesale Market, Delhi", categories: ["Antibiotic", "Antihistamine", "Analgesic"], totalOrders: 210, lastOrderDate: "2026-02-21" },
  { id: "WS005", name: "BioPharm Supplies", contact: "+91 54444 33322", email: "info@biopharm.in", address: "56, Life Sciences Park, Bengaluru", categories: ["Antiplatelet", "Antihypertensive", "Supplement"], totalOrders: 42, lastOrderDate: "2026-02-10" },
]

// --- Delivery Agents ---

export const deliveryAgents: DeliveryAgent[] = [
  { id: "DA001", name: "Ravi Shankar", phone: "+91 99887 76655", status: "out-for-delivery", currentOrderId: "ORD003", completedToday: 5, avatar: "RS" },
  { id: "DA002", name: "Suresh Babu", phone: "+91 88776 65544", status: "active", completedToday: 7, avatar: "SB" },
  { id: "DA003", name: "Manoj Tiwari", phone: "+91 77665 54433", status: "out-for-delivery", currentOrderId: "ORD009", completedToday: 4, avatar: "MT" },
  { id: "DA004", name: "Kiran Yadav", phone: "+91 66554 43322", status: "idle", completedToday: 3, avatar: "KY" },
]

// --- Staff ---

export const staff: Staff[] = [
  { id: "ST001", name: "Dr. Ramesh Gupta", role: "owner", email: "ramesh@swa-astha.com", phone: "+91 99999 88888", lastActive: "2026-02-22T11:30:00", avatar: "RG" },
  { id: "ST002", name: "Anita Sharma", role: "manager", email: "anita@swa-astha.com", phone: "+91 88888 77777", lastActive: "2026-02-22T11:25:00", avatar: "AS" },
  { id: "ST003", name: "Prakash Joshi", role: "billing-staff", email: "prakash@swa-astha.com", phone: "+91 77777 66666", lastActive: "2026-02-22T11:20:00", avatar: "PJ" },
  { id: "ST004", name: "Meena Kumari", role: "inventory-staff", email: "meena@swa-astha.com", phone: "+91 66666 55555", lastActive: "2026-02-22T10:45:00", avatar: "MK" },
  { id: "ST005", name: "Sanjay Patel", role: "billing-staff", email: "sanjay@swa-astha.com", phone: "+91 55555 44444", lastActive: "2026-02-22T09:30:00", avatar: "SP" },
]

// --- Notifications ---

export const notifications: Notification[] = [
  { id: "N001", type: "order", title: "New Order Received", message: "Order #ORD001 from Rajesh Kumar - 2 items", timestamp: "2026-02-22T09:30:00", read: false },
  { id: "N002", type: "low-stock", title: "Low Stock Alert", message: "Omeprazole 20mg (Omez) - Only 15 units remaining", timestamp: "2026-02-22T09:00:00", read: false },
  { id: "N003", type: "expiry", title: "Expiry Warning", message: "Azithromycin 500mg batch B2025-056 expires on 28 Mar 2026", timestamp: "2026-02-22T08:30:00", read: false },
  { id: "N004", type: "order", title: "Order Delivered", message: "Order #ORD005 delivered by Suresh Babu", timestamp: "2026-02-21T17:00:00", read: true },
  { id: "N005", type: "prescription", title: "Prescription Pending", message: "Order #ORD006 from Kavita Reddy needs prescription verification", timestamp: "2026-02-22T11:05:00", read: false },
  { id: "N006", type: "low-stock", title: "Low Stock Alert", message: "Pantoprazole 40mg (Pan-D) - Only 5 units remaining", timestamp: "2026-02-22T07:45:00", read: true },
  { id: "N007", type: "order", title: "New Order Received", message: "Order #ORD006 from Kavita Reddy - 2 items", timestamp: "2026-02-22T11:00:00", read: false },
  { id: "N008", type: "expiry", title: "Medicine Expired", message: "Ranitidine 150mg batch B2024-050 has expired", timestamp: "2026-02-22T06:00:00", read: true },
]

// --- Billing Records ---

export const billingRecords: BillingRecord[] = [
  { id: "BIL001", invoiceNumber: "INV-2026-0142", patientName: "Sunita Devi", items: [{ medicineId: "MED007", medicineName: "Ibuprofen 400mg", quantity: 1, price: 22 }], subtotal: 22, gstAmount: 3.96, total: 25.96, date: "2026-02-22", paymentMethod: "Cash" },
  { id: "BIL002", invoiceNumber: "INV-2026-0141", patientName: "Deepa Nair", items: [{ medicineId: "MED018", medicineName: "Diclofenac 50mg", quantity: 3, price: 20 }, { medicineId: "MED001", medicineName: "Paracetamol 500mg", quantity: 2, price: 25 }], subtotal: 110, gstAmount: 19.8, total: 129.80, date: "2026-02-22", paymentMethod: "UPI" },
  { id: "BIL003", invoiceNumber: "INV-2026-0140", patientName: "Mohammed Ali", items: [{ medicineId: "MED006", medicineName: "Azithromycin 500mg", quantity: 1, price: 95 }, { medicineId: "MED009", medicineName: "Pantoprazole 40mg", quantity: 1, price: 55 }], subtotal: 150, gstAmount: 27.00, total: 177.00, date: "2026-02-21", paymentMethod: "Card" },
  { id: "BIL004", invoiceNumber: "INV-2026-0139", patientName: "Amit Patel", items: [{ medicineId: "MED005", medicineName: "Metformin 500mg", quantity: 2, price: 35 }, { medicineId: "MED008", medicineName: "Atorvastatin 10mg", quantity: 1, price: 80 }], subtotal: 150, gstAmount: 27.00, total: 177.00, date: "2026-02-22", paymentMethod: "UPI" },
  { id: "BIL005", invoiceNumber: "INV-2026-0138", patientName: "Priya Sharma", items: [{ medicineId: "MED002", medicineName: "Amoxicillin 250mg", quantity: 3, price: 65 }], subtotal: 195, gstAmount: 35.10, total: 230.10, date: "2026-02-22", paymentMethod: "Cash" },
]

// --- Sales Data (last 30 days) ---

export const salesData: SalesData[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(2026, 1, 22)
  date.setDate(date.getDate() - (29 - i))
  const baseSales = 35000 + Math.floor(Math.random() * 25000)
  const baseOrders = 20 + Math.floor(Math.random() * 20)
  return {
    date: date.toISOString().split("T")[0],
    sales: baseSales,
    orders: baseOrders,
  }
})

// --- Revenue vs Expense (last 6 months) ---

export const revenueExpenseData: RevenueExpense[] = [
  { month: "Sep", revenue: 285000, expense: 195000 },
  { month: "Oct", revenue: 310000, expense: 205000 },
  { month: "Nov", revenue: 295000, expense: 200000 },
  { month: "Dec", revenue: 340000, expense: 220000 },
  { month: "Jan", revenue: 320000, expense: 210000 },
  { month: "Feb", revenue: 365000, expense: 230000 },
]

// --- Top Selling Medicines ---

export const topSellingMedicines = [
  { name: "Paracetamol 500mg", unitsSold: 856, revenue: 21400 },
  { name: "Cetirizine 10mg", unitsSold: 642, revenue: 11556 },
  { name: "Amoxicillin 250mg", unitsSold: 534, revenue: 34710 },
  { name: "Omeprazole 20mg", unitsSold: 498, revenue: 23904 },
  { name: "Metformin 500mg", unitsSold: 467, revenue: 16345 },
  { name: "Ibuprofen 400mg", unitsSold: 423, revenue: 9306 },
  { name: "Amlodipine 5mg", unitsSold: 389, revenue: 16338 },
  { name: "Multivitamin Tablets", unitsSold: 356, revenue: 44500 },
]

// --- Stock Health ---

export const stockHealth = {
  healthy: 12,
  lowStock: 4,
  expiringSoon: 3,
  expired: 1,
}

// --- Activity Log ---

export const activityLog: ActivityLog[] = [
  { id: "AL001", staffName: "Prakash Joshi", action: "Generated invoice INV-2026-0142 for Sunita Devi", timestamp: "2026-02-22T11:20:00" },
  { id: "AL002", staffName: "Meena Kumari", action: "Updated stock for Paracetamol 500mg (+500 units)", timestamp: "2026-02-22T10:45:00" },
  { id: "AL003", staffName: "Anita Sharma", action: "Accepted order ORD002 from Priya Sharma", timestamp: "2026-02-22T10:20:00" },
  { id: "AL004", staffName: "Sanjay Patel", action: "Generated invoice INV-2026-0141 for Deepa Nair", timestamp: "2026-02-22T09:50:00" },
  { id: "AL005", staffName: "Meena Kumari", action: "Added new medicine: Vitamin D3 60K IU", timestamp: "2026-02-22T09:15:00" },
  { id: "AL006", staffName: "Dr. Ramesh Gupta", action: "Approved prescription for order ORD003", timestamp: "2026-02-22T08:50:00" },
  { id: "AL007", staffName: "Anita Sharma", action: "Assigned delivery agent Ravi Shankar to ORD003", timestamp: "2026-02-22T08:55:00" },
  { id: "AL008", staffName: "Prakash Joshi", action: "Generated invoice INV-2026-0140 for Mohammed Ali", timestamp: "2026-02-21T16:35:00" },
]

// --- Category list ---

export const medicineCategories = [
  "Analgesic",
  "Antibiotic",
  "Antihistamine",
  "Antacid",
  "Antidiabetic",
  "Antihypertensive",
  "Antiplatelet",
  "Respiratory",
  "Statin",
  "Supplement",
  "Thyroid",
]

// --- Helper functions ---

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const day = String(d.getUTCDate()).padStart(2, "0")
  const month = MONTHS_SHORT[d.getUTCMonth()]
  const year = d.getUTCFullYear()
  return `${day} ${month} ${year}`
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const h = d.getUTCHours()
  const m = String(d.getUTCMinutes()).padStart(2, "0")
  const period = h >= 12 ? "pm" : "am"
  const hour12 = h % 12 || 12
  return `${String(hour12).padStart(2, "0")}:${m} ${period}`
}

export function formatDateTime(dateStr: string): string {
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "delivered":
    case "in-stock":
    case "active":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
    case "pending":
    case "idle":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
    case "accepted":
    case "low-stock":
      return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400"
    case "out-for-delivery":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400"
    case "rejected":
    case "expired":
    case "expiring-soon":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function getStatusLabel(status: string): string {
  return status
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}
