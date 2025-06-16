// Quick test to verify wallet system is working
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testWallet() {
  try {
    console.log('🧪 Testing wallet system...\n');
    
    // Test 1: Check if users have wallet balances
    const usersWithWallets = await prisma.user.findMany({
      select: {
        name: true,
        email: true,
        walletBalance: true
      },
      take: 5
    });
    
    console.log('📊 Users with wallet balances:');
    usersWithWallets.forEach(user => {
      console.log(`  ${user.name}: LKR ${user.walletBalance?.toLocaleString() || 0}`);
    });
    
    // Test 2: Check wallet transactions
    const transactions = await prisma.walletTransaction.count();
    console.log(`\n💳 Total wallet transactions: ${transactions}`);
    
    // Test 3: Check withdrawal requests  
    const withdrawals = await prisma.withdrawalRequest.count();
    console.log(`💸 Total withdrawal requests: ${withdrawals}`);
    
    // Test 4: Sample transaction
    const sampleTransaction = await prisma.walletTransaction.findFirst({
      include: {
        user: {
          select: { name: true }
        }
      }
    });
    
    if (sampleTransaction) {
      console.log(`\n🔄 Sample transaction:`);
      console.log(`  User: ${sampleTransaction.user.name}`);
      console.log(`  Type: ${sampleTransaction.type}`);
      console.log(`  Amount: LKR ${sampleTransaction.amount}`);
      console.log(`  Description: ${sampleTransaction.description}`);
    }
    
    console.log('\n✅ Wallet system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Wallet test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWallet();
