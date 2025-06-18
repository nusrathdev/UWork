import { prisma } from './db.server';

// Define wallet enums locally until Prisma client is fully updated
export enum WalletTransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW', 
  PAYMENT_SENT = 'PAYMENT_SENT',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  REFUND = 'REFUND',
  FEE = 'FEE'
}

export enum WithdrawalStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export interface WalletDepositData {
  userId: string;
  amount: number;
  currency?: string;
  payhereOrderId?: string;
  paymentData?: any;
}

export interface WithdrawalRequestData {
  userId: string;
  amount: number;
  bankAccount: {
    accountNumber: string;
    bankName: string;
    accountHolderName: string;
    branchCode?: string;
  };
}

// Get user's wallet balance
export async function getUserWalletBalance(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletBalance: true }
  });
  
  return user?.walletBalance || 0;
}

// Add money to wallet (deposit)
export async function addToWallet(data: WalletDepositData) {
  return await prisma.$transaction(async (tx) => {
    // Get current balance
    const user = await tx.user.findUnique({
      where: { id: data.userId },
      select: { walletBalance: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const currentBalance = user.walletBalance;
    const newBalance = currentBalance + data.amount;

    // Update user balance
    await tx.user.update({
      where: { id: data.userId },
      data: { walletBalance: newBalance }
    });

    // Create transaction record
    const transaction = await tx.walletTransaction.create({
      data: {
        userId: data.userId,
        type: WalletTransactionType.DEPOSIT,
        amount: data.amount,
        currency: data.currency || 'LKR',
        description: `Wallet deposit via PayHere`,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        payhereOrderId: data.payhereOrderId,
        paymentData: data.paymentData ? JSON.stringify(data.paymentData) : null,
      }
    });

    return { transaction, oldBalance: currentBalance, newBalance };
  });
}

// Deduct money from wallet (for payments)
export async function deductFromWallet(
  userId: string, 
  amount: number, 
  description: string,
  referenceId?: string
) {
  return await prisma.$transaction(async (tx) => {
    // Get current balance
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const currentBalance = user.walletBalance;
    
    if (currentBalance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    const newBalance = currentBalance - amount;

    // Update user balance
    await tx.user.update({
      where: { id: userId },
      data: { walletBalance: newBalance }
    });

    // Create transaction record
    const transaction = await tx.walletTransaction.create({
      data: {
        userId: userId,
        type: WalletTransactionType.PAYMENT_SENT,
        amount: amount,
        currency: 'LKR',
        description: description,
        referenceId: referenceId,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
      }
    });

    return { transaction, oldBalance: currentBalance, newBalance };
  });
}

// Add money to wallet (for receiving payments)
export async function addToWalletFromPayment(
  userId: string, 
  amount: number, 
  description: string,
  referenceId?: string
) {
  return await prisma.$transaction(async (tx) => {
    // Get current balance
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const currentBalance = user.walletBalance;
    const newBalance = currentBalance + amount;

    // Update user balance
    await tx.user.update({
      where: { id: userId },
      data: { walletBalance: newBalance }
    });

    // Create transaction record
    const transaction = await tx.walletTransaction.create({
      data: {
        userId: userId,
        type: WalletTransactionType.PAYMENT_RECEIVED,
        amount: amount,
        currency: 'LKR',
        description: description,
        referenceId: referenceId,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
      }
    });

    return { transaction, oldBalance: currentBalance, newBalance };
  });
}

// Create withdrawal request
export async function createWithdrawalRequest(data: WithdrawalRequestData) {
  // Check if user has sufficient balance
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { walletBalance: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.walletBalance < data.amount) {
    throw new Error('Insufficient wallet balance');
  }

  // Create withdrawal request
  const withdrawal = await prisma.withdrawalRequest.create({
    data: {
      userId: data.userId,
      amount: data.amount,
      bankAccount: JSON.stringify(data.bankAccount),
      status: WithdrawalStatus.PENDING,
    }
  });

  return withdrawal;
}

// Process withdrawal (admin function)
export async function processWithdrawal(
  withdrawalId: string, 
  status: WithdrawalStatus,
  adminNotes?: string,
  transactionId?: string
) {
  return await prisma.$transaction(async (tx) => {
    const withdrawal = await tx.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: { user: true }
    });

    if (!withdrawal) {
      throw new Error('Withdrawal request not found');
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new Error('Withdrawal already processed');
    }

    // Update withdrawal status
    await tx.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        status,
        processedAt: new Date(),
        completedAt: status === WithdrawalStatus.COMPLETED ? new Date() : null,
        adminNotes,
        transactionId,
      }
    });

    // If completed, deduct from wallet
    if (status === WithdrawalStatus.COMPLETED) {
      const currentBalance = withdrawal.user.walletBalance;
      const newBalance = currentBalance - withdrawal.amount;

      await tx.user.update({
        where: { id: withdrawal.userId },
        data: { walletBalance: newBalance }
      });

      // Create transaction record
      await tx.walletTransaction.create({
        data: {
          userId: withdrawal.userId,
          type: WalletTransactionType.WITHDRAW,
          amount: withdrawal.amount,
          currency: withdrawal.currency,
          description: `Withdrawal to bank account`,
          referenceId: withdrawalId,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
        }
      });
    }

    return withdrawal;
  });
}

// Get wallet transactions
export async function getWalletTransactions(userId: string, limit = 50) {
  return await prisma.walletTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

// Get withdrawal requests
export async function getWithdrawalRequests(userId: string) {
  return await prisma.withdrawalRequest.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

// Get all pending withdrawals (admin function)
export async function getPendingWithdrawals() {
  return await prisma.withdrawalRequest.findMany({
    where: { status: WithdrawalStatus.PENDING },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          walletBalance: true,
        }
      }
    },
    orderBy: { createdAt: 'asc' },
  });
}

// Transfer money from one wallet to another (for project payments)
export async function transferBetweenWallets(
  fromUserId: string,
  toUserId: string, 
  amount: number,
  description: string,
  referenceId?: string
) {
  return await prisma.$transaction(async (tx) => {
    // Get sender's current balance
    const sender = await tx.user.findUnique({
      where: { id: fromUserId },
      select: { walletBalance: true }
    });

    if (!sender) {
      throw new Error('Sender not found');
    }

    if (sender.walletBalance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    // Get receiver's current balance
    const receiver = await tx.user.findUnique({
      where: { id: toUserId },
      select: { walletBalance: true }
    });

    if (!receiver) {
      throw new Error('Receiver not found');
    }

    // Calculate new balances
    const senderNewBalance = sender.walletBalance - amount;
    const receiverNewBalance = receiver.walletBalance + amount;

    // Update sender's balance
    await tx.user.update({
      where: { id: fromUserId },
      data: { walletBalance: senderNewBalance }
    });

    // Update receiver's balance  
    await tx.user.update({
      where: { id: toUserId },
      data: { walletBalance: receiverNewBalance }
    });

    // Create sender transaction (debit)
    await tx.walletTransaction.create({
      data: {
        userId: fromUserId,
        type: WalletTransactionType.PAYMENT_SENT,
        amount: -amount, // Negative for outgoing
        currency: 'LKR',
        description: `${description} (sent to user)`,
        referenceId,
        balanceBefore: sender.walletBalance,
        balanceAfter: senderNewBalance
      }
    });

    // Create receiver transaction (credit)
    const receiverTransaction = await tx.walletTransaction.create({
      data: {
        userId: toUserId,
        type: WalletTransactionType.PAYMENT_RECEIVED,
        amount: amount, // Positive for incoming
        currency: 'LKR',
        description: `${description} (received from user)`,
        referenceId,
        balanceBefore: receiver.walletBalance,
        balanceAfter: receiverNewBalance
      }
    });

    return {
      senderBalance: senderNewBalance,
      receiverBalance: receiverNewBalance,
      transaction: receiverTransaction
    };
  });
}
