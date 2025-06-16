// Test Current Payment System
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCurrentPaymentSystem() {
  try {
    console.log('🔍 Testing Current Payment System...\n');
    
    // Check existing applications and payments
    const applications = await prisma.application.findMany({
      where: { status: 'APPROVED' },
      include: {
        project: {
          select: {
            title: true,
            owner: { select: { name: true, email: true } }
          }
        },
        freelancer: {
          select: { name: true, email: true }
        }
      }
    });

    console.log(`✅ Found ${applications.length} approved applications ready for payment:\n`);

    applications.forEach((app, i) => {
      console.log(`${i + 1}. Project: "${app.project.title}"`);
      console.log(`   Owner: ${app.project.owner.name} (${app.project.owner.email})`);
      console.log(`   Freelancer: ${app.freelancer.name} (${app.freelancer.email})`);
      console.log(`   Budget: LKR ${app.proposedBudget}`);
      console.log(`   Payment URL: http://localhost:5173/payment/${app.id}`);
      console.log('   ---');
    });

    // Check existing payments
    const payments = await prisma.payment.findMany({
      include: {
        application: {
          select: {
            project: { select: { title: true } }
          }
        },
        payer: { select: { name: true } },
        receiver: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\n💳 Found ${payments.length} existing payments:\n`);

    payments.forEach((payment, i) => {
      console.log(`${i + 1}. Order: ${payment.orderId}`);
      console.log(`   Project: ${payment.application.project.title}`);
      console.log(`   From: ${payment.payer.name} → To: ${payment.receiver.name}`);
      console.log(`   Amount: ${payment.currency} ${payment.amount}`);
      console.log(`   Status: ${payment.status}`);
      console.log(`   Created: ${payment.createdAt.toLocaleDateString()}`);
      console.log('   ---');
    });

    console.log('\n🎯 **How to Test:**');
    console.log('1. Start your dev server: npm run dev');
    console.log('2. Go to: http://localhost:5173/dashboard');
    console.log('3. Login as project owner to see "Make Payment" buttons');
    console.log('4. Or use direct payment URLs shown above');
    console.log('5. Complete payment via PayHere sandbox');
    console.log('6. Check payment status at: http://localhost:5173/payments');

    console.log('\n🧪 **PayHere Test Cards:**');
    console.log('• Visa: 4916217501611292');
    console.log('• MasterCard: 5413110000000000');
    console.log('• Any future expiry date and CVV');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCurrentPaymentSystem();
