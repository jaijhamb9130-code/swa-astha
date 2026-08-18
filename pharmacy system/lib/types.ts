export type DoctorUser = {
  _id: string
  name: string
  phone: string
  email?: string
  registrationNumber: string
  specialization?: string
  degree?: string
  experience?: string
  clinicName?: string
  city?: string
  gender?: "male" | "female" | "other"
  languages?: string[]
  about?: string
  isVerified: boolean
  verificationStatus: "pending" | "under_review" | "approved" | "rejected"
  verificationNotes?: string
}

export type PharmacyUser = {
  _id: string
  pharmacyId: string
  name: string
  ownerName: string
  ownerPhone: string
  email?: string
  licenseNumber: string
  address?: { street?: string; city?: string; state?: string; pincode?: string }
  location?: { type: "Point"; coordinates: [number, number] }
  isVerified: boolean
  verificationStatus: "pending" | "under_review" | "approved" | "rejected"
  verificationDocuments?: {
    license?: string
    gst?: string
    ownerIdProof?: string
    shopPhoto?: string
  }
}

export type PatientRecord = {
  id: string
  title: string
  category: string
  type: string
  source: string
  recordDate?: string
  createdAt: string
  meta?: any
  doctorNotes?: string
}

export type PatientLookup = {
  success: true
  found: boolean
  message?: string
  patient?: any
  records?: PatientRecord[]
}

export type ChatMessage = {
  _id: string
  doctor: string
  patient: string
  senderRole: "doctor" | "patient"
  text: string
  createdAt: string
  readByDoctor: boolean
  readByPatient: boolean
}

export type ChatThread = {
  doctorId?: string
  patientId?: string
  doctor?: { name: string; specialization?: string; clinic?: string; city?: string }
  patient?: { name: string; patientCode: string; age?: number; gender?: string }
  lastMessage: { text: string; at: string; senderRole: "doctor" | "patient" } | null
  unread: number
}

export type Batch = {
  _id: string
  pharmacy: string
  brandName: string
  salt?: string
  strength?: string
  manufacturer?: string
  batchNumber: string
  quantity: number
  mrp: number
  sellingPrice?: number
  expiryDate: string
  supplier?: string
  createdAt: string
}

export type PharmacyOrder = {
  _id: string
  orderId: string
  patient: string
  patientId: string
  pharmacy: string
  pharmacyName?: string
  items: Array<{ name: string; price: number; quantity: number }>
  totalAmount: number
  status: "pending" | "accepted" | "preparing" | "out_for_delivery" | "delivered" | "cancelled"
  paymentStatus: "pending" | "paid" | "refunded" | "failed"
  deliveryAddress?: { street?: string; city?: string; state?: string; pincode?: string }
  createdAt: string
}
