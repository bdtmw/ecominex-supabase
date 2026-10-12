import { User } from "./user";

export interface UserMachine {
  _id: string;
  user: string | User;
  machine: string;
  assignedDate: Date;
  monthlyProfitAccumulated: number;
  status: "active" | "inactive";
  machineName: string;
  priceRange: number;
}



export interface AssignMachinePayload {
  userId: string;
  machineId: string;
}

export interface UpdateProfitPayload {
  userMachineId: string;
  profitAmount: number;
}

export interface ProfitUpdateStatus {
  userMachineId: string;
  userName: string;
  machineName: string;
  lastUpdateDate: Date;
  daysSinceLastUpdate: number;
  daysUntilNextUpdate: number;
  currentAccumulatedProfit: number;
  status: string;
}
export interface Transaction {
  _id: string;
  user: string;
  amount: number;
  transactionDate: Date | string;
  type: 'withdrawal' | 'profit' | 'MACHINE_PURCHASE' | 'MACHINE_SALE';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  details?: string;
  adminComment?: string;
  processedBy?: string;
  processedAt?: Date | string;
}
export interface WithdrawalResponse {
  message: string;
  transaction: Transaction;
  withdrawnAmount: number;
  remainingProfit: number;
  userEmail: string;
}
export interface WithdrawalPayload {
  email: string;
  amount: number;
}

export interface UserProfitSummary {
  userId: string;
  userEmail: string;
  userName: string;
  totalMachines: number;
  totalProfit: number;
  machines: {
    machineId: string;
    machineName: string;
    profit: number;
    assignedDate: string;
    lastProfitUpdate: string;
  }[];
}


export interface TransactionResponse {
  transactions: Transaction[];
  totalPages: number;
  currentPage: number;
  totalTransactions: number;
}
export interface UserMachineState {
  userMachines: UserMachine[];
  allUserMachines: UserMachine[];
  transactionData: {
    transactions: Transaction[];
    totalPages: number;
    currentPage: number;
    totalTransactions: number;
  };
  userProfit: UserProfitSummary | null;
  isLoading: boolean;
  error: string | null;
  selectedTransaction?: Transaction; // Optional: if you need to track selected transaction
  searchQuery?: string; // Optional: if you implement search
  statusFilter?: string; // Optional: if you implement filtering
}
export interface TransactionFilter {
  page?: number;
  limit?: number;
  status?: 'completed' | 'pending' | 'failed';
  type?: 'withdrawal' | 'deposit';
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}



export interface PurchaseResponse {
  message: string;
  assignments: UserMachine[];
  transaction: {
    totalCost: number;
    remainingBalance: number;
  };
}

export interface EligibilityResponse {
  canPurchase: boolean;
  userBalance: number;
  requiredAmount: number;
  shortfall: number;
  machine: {
    name: string;
    pricePerUnit: number;
    quantity: number;
  };
}

export interface PurchaseMachinePayload {
  userId: string;
  machineId: string;
  quantity?: number;
}


export interface SaleResponse {
  message: string;
  sale: {
    originalPrice: number;
    deduction: number;
    sellingPrice: number;
    machineDetails: {
      name: string;
      id: string;
    };
  };
  transaction: Transaction;
  newBalance: {
    total: number;
    main: number;
    mining: number;
  };
}


export interface MachineProfitPercentage {
  machineId: string;
  machineName: string;
  profit: number;
  percentage: string;
  monthlyProfitRate: number;
  lastUpdate: Date;
}

export interface ProfitPercentageResponse {
  machines: MachineProfitPercentage[];
  totalProfit: number;
  machineCount: number;
  timestamp: Date;
}