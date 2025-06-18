import { prisma } from './db.server';
import { PaymentStatus, EscrowStatus } from '@prisma/client';

export interface CreatePaymentData {
  applicationId: string;
  payerId: string;
  receiverId: string;
  amount: number;
  currency?: string;
}

export async function createPayment(data: CreatePaymentData) {
  const orderId = `UW-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return await prisma.payment.create({
    data: {
      orderId,
      applicationId: data.applicationId,
      payerId: data.payerId,
      receiverId: data.receiverId,
      amount: data.amount,
      currency: data.currency || 'LKR',
      status: 'PENDING',
    },
    include: {
      application: {
        include: {
          project: true,
          freelancer: true,
        },
      },
      payer: true,
      receiver: true,
    },
  });
}

export async function updatePaymentStatus(
  orderId: string,
  status: PaymentStatus,
  paymentData?: any
) {
  return await prisma.payment.update({
    where: { orderId },
    data: {
      status,
      paymentData: paymentData ? JSON.stringify(paymentData) : undefined,
      updatedAt: new Date(),
    },
  });
}

export async function getPaymentByOrderId(orderId: string) {
  return await prisma.payment.findUnique({
    where: { orderId },
    include: {
      application: {
        include: {
          project: true,
          freelancer: true,
        },
      },
      payer: true,
      receiver: true,
      escrowRelease: true,
    },
  });
}

export async function getPaymentsByApplication(applicationId: string) {
  return await prisma.payment.findMany({
    where: { applicationId },
    include: {
      payer: true,
      receiver: true,
      escrowRelease: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createEscrowRelease(paymentId: string) {
  return await prisma.escrowRelease.create({
    data: {
      paymentId,
      releaseStatus: 'PENDING',
    },
  });
}

export async function updateEscrowRelease(
  paymentId: string,
  data: {
    clientApproval?: boolean;
    freelancerRequest?: boolean;
    adminApproval?: boolean;
    releaseStatus?: EscrowStatus;
  }
) {
  const escrowRelease = await prisma.escrowRelease.update({
    where: { paymentId },
    data: {
      ...data,
      updatedAt: new Date(),
      releaseDate: data.releaseStatus === EscrowStatus.RELEASED ? new Date() : undefined,
    },
  });
  // If payment is released, update payment status
  if (data.releaseStatus === EscrowStatus.RELEASED) {
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.COMPLETED },
    });
  }

  return escrowRelease;
}

export async function getUserPayments(userId: string) {
  const [paidPayments, receivedPayments] = await Promise.all([
    prisma.payment.findMany({
      where: { payerId: userId },
      include: {
        application: {
          include: {
            project: true,
            freelancer: true,
          },
        },
        receiver: true,
        escrowRelease: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.payment.findMany({
      where: { receiverId: userId },
      include: {
        application: {
          include: {
            project: true,
          },
        },
        payer: true,
        escrowRelease: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { paidPayments, receivedPayments };
}

export async function calculatePlatformFee(amount: number): Promise<number> {
  // Platform takes 5% fee
  return amount * 0.05;
}

export async function calculateFreelancerAmount(amount: number): Promise<number> {
  const platformFee = await calculatePlatformFee(amount);
  return amount - platformFee;
}
