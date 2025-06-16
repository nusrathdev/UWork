// Debug Payment Options - Check Application Status
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugPaymentOptions() {
  try {
    console.log('🔍 Debugging Payment Options...\n');
    
    // Get all applications with their status
    const applications = await prisma.application.findMany({
      include: {
        project: {
          select: {
            title: true,
            owner: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        freelancer: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Found ${applications.length} applications:\n`);

    applications.forEach((app, index) => {
      console.log(`${index + 1}. Application ID: ${app.id}`);
      console.log(`   Project: ${app.project.title}`);
      console.log(`   Project Owner: ${app.project.owner.name} (${app.project.owner.email})`);
      console.log(`   Freelancer: ${app.freelancer.name} (${app.freelancer.email})`);
      console.log(`   Status: ${app.status} ${app.status === 'APPROVED' ? '✅' : '❌'}`);
      console.log(`   Budget: $${app.proposedBudget}`);
      console.log(`   Created: ${app.createdAt.toLocaleDateString()}`);
      console.log('   ---\n');
    });

    // Check approved applications specifically
    const approvedApps = applications.filter(app => app.status === 'APPROVED');
    console.log(`✅ Approved Applications: ${approvedApps.length}`);
    
    if (approvedApps.length === 0) {
      console.log('❌ No approved applications found!');
      console.log('💡 To see payment options, you need to:');
      console.log('   1. Create a project');
      console.log('   2. Apply to the project (as freelancer)');
      console.log('   3. Approve the application (as project owner)');
      console.log('   4. Go to dashboard to see "Make Payment" button');
    } else {
      console.log('✅ You should see "Make Payment" buttons on your dashboard for these approved applications!');
    }

    // Check existing payments
    const payments = await prisma.payment.findMany({
      include: {
        application: {
          select: {
            id: true,
            project: {
              select: {
                title: true
              }
            }
          }
        },
        payer: {
          select: {
            name: true
          }
        },
        receiver: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`\n💳 Found ${payments.length} existing payments:`);
    payments.forEach((payment, index) => {
      console.log(`${index + 1}. Payment ID: ${payment.id}`);
      console.log(`   Project: ${payment.application.project.title}`);
      console.log(`   From: ${payment.payer.name} → To: ${payment.receiver.name}`);
      console.log(`   Amount: ${payment.currency} ${payment.amount}`);
      console.log(`   Status: ${payment.status}`);
      console.log('   ---');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPaymentOptions().catch(console.error);
