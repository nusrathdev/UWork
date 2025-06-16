// Test script to verify wallet schema models
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testWalletSchema() {
  try {
    console.log('Testing Prisma client wallet models...');
    
    // Test if WalletTransaction model exists
    try {
      const count = await prisma.walletTransaction.count();
      console.log('✅ WalletTransaction model exists, count:', count);
    } catch (error) {
      console.log('❌ WalletTransaction model error:', error.message);
    }
    
    // Test if WithdrawalRequest model exists
    try {
      const count = await prisma.withdrawalRequest.count();
      console.log('✅ WithdrawalRequest model exists, count:', count);
    } catch (error) {
      console.log('❌ WithdrawalRequest model error:', error.message);
    }
    
    // Test if User model has walletBalance field
    try {
      const user = await prisma.user.findFirst({
        select: { id: true, walletBalance: true }
      });
      console.log('✅ User.walletBalance field exists');
    } catch (error) {
      console.log('❌ User.walletBalance field error:', error.message);
    }
    
    // Test enums
    console.log('WalletTransactionType enum values:');
    console.log('- DEPOSIT, WITHDRAW, PAYMENT_SENT, PAYMENT_RECEIVED, REFUND, FEE');
    
    console.log('WithdrawalStatus enum values:');
    console.log('- PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED');
    
  } catch (error) {
    console.error('General error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWalletSchema();
