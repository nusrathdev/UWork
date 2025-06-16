#!/usr/bin/env node

/**
 * Comprehensive PayHere Integration Test
 * 
 * This script tests the complete payment flow including:
 * 1. Database connections and schema
 * 2. PayHere hash generation and validation
 * 3. Payment creation and processing
 * 4. Escrow management
 * 5. Work submission workflow
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// PayHere test configuration
const testConfig = {
  merchantId: "1221149", // PayHere sandbox merchant ID
  merchantSecret: "MzE2NDUzOTM4NzE2MzQ0ODY0NDIyNjE1MDgwMTI1NzQzOTM2Nzk=", // PayHere sandbox secret
  mode: "sandbox",
  currency: "LKR",
  returnUrl: "http://localhost:3000/payment/success",
  cancelUrl: "http://localhost:3000/payment/cancel",
  notifyUrl: "http://localhost:3000/api/payment/notify"
};

// Test payment data
const testPayment = {
  orderId: `TEST_${Date.now()}`,
  amount: 5000.00,
  currency: "LKR",
  items: "Freelance Project Payment",
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  phone: "+94771234567",
  address: "123 Test Street",
  city: "Colombo",
  country: "Sri Lanka"
};

console.log('🚀 Starting PayHere Integration Test...\n');

async function testDatabaseConnection() {
  console.log('📊 Testing database connection...');
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test basic queries
    const userCount = await prisma.user.count();
    const projectCount = await prisma.project.count();
    const applicationCount = await prisma.application.count();
    
    console.log(`   Users: ${userCount}`);
    console.log(`   Projects: ${projectCount}`);
    console.log(`   Applications: ${applicationCount}`);
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

function generatePayHereHash(paymentData) {
  const { merchantId, merchantSecret } = testConfig;
  const { orderId, amount, currency } = paymentData;
  
  // PayHere hash format: merchant_id + order_id + amount + currency + md5(merchant_secret)
  const merchantSecretHash = crypto
    .createHash('md5')
    .update(merchantSecret)
    .digest('hex')
    .toUpperCase();
  
  const hashString = `${merchantId}${orderId}${amount.toFixed(2)}${currency}${merchantSecretHash}`;
  
  return crypto
    .createHash('md5')
    .update(hashString)
    .digest('hex')
    .toUpperCase();
}

function testPayHereHashGeneration() {
  console.log('\n🔐 Testing PayHere hash generation...');
  
  try {
    const hash = generatePayHereHash(testPayment);
    console.log('✅ Hash generation successful');
    console.log(`   Order ID: ${testPayment.orderId}`);
    console.log(`   Amount: ${testPayment.amount.toFixed(2)} ${testPayment.currency}`);
    console.log(`   Generated Hash: ${hash}`);
    
    // Verify hash is the correct format (32 char uppercase hex)
    const isValidHash = /^[A-F0-9]{32}$/.test(hash);
    console.log(`   Hash Format Valid: ${isValidHash ? '✅' : '❌'}`);
    
    return isValidHash;
  } catch (error) {
    console.error('❌ Hash generation failed:', error.message);
    return false;
  }
}

async function testPaymentCreation() {
  console.log('\n💳 Testing payment creation...');
  
  try {
    // Find or create test users
    let client = await prisma.user.findFirst({
      where: { email: 'testclient@example.com' }
    });
    
    if (!client) {
      client = await prisma.user.create({
        data: {
          email: 'testclient@example.com',
          password: 'hashedpassword',
          name: 'Test Client',
          studentId: 'TC001',
          university: 'Test University',
          course: 'Computer Science',
          year: 3,
          skills: 'Project Management'
        }
      });
      console.log('   Created test client user');
    }
    
    let freelancer = await prisma.user.findFirst({
      where: { email: 'testfreelancer@example.com' }
    });
    
    if (!freelancer) {
      freelancer = await prisma.user.create({
        data: {
          email: 'testfreelancer@example.com',
          password: 'hashedpassword',
          name: 'Test Freelancer',
          studentId: 'TF001',
          university: 'Test University',
          course: 'Software Engineering',
          year: 4,
          skills: 'React, Node.js, TypeScript'
        }
      });
      console.log('   Created test freelancer user');
    }
    
    // Create test project and application if they don't exist
    let project = await prisma.project.findFirst({
      where: { 
        title: 'Test PayHere Integration Project',
        ownerId: client.id
      }
    });
    
    if (!project) {
      project = await prisma.project.create({
        data: {
          title: 'Test PayHere Integration Project',
          description: 'A test project for PayHere payment integration',
          budget: 5000.00,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          skills: 'React, Node.js',
          ownerId: client.id,
          status: 'IN_PROGRESS'
        }
      });
      console.log('   Created test project');
    }
    
    let application = await prisma.application.findFirst({
      where: {
        projectId: project.id,
        freelancerId: freelancer.id
      }
    });
    
    if (!application) {
      application = await prisma.application.create({
        data: {
          projectId: project.id,
          freelancerId: freelancer.id,
          coverMessage: 'Test application for PayHere integration',
          proposedBudget: 5000.00,
          status: 'APPROVED'
        }
      });
      console.log('   Created test application');
    }
      // Create test payment
    console.log('   Attempting to create payment...');
    console.log('   Available Prisma models:', Object.keys(prisma));
    
    const payment = await prisma.payment.create({
      data: {
        orderId: testPayment.orderId,
        applicationId: application.id,
        payerId: client.id,
        receiverId: freelancer.id,
        amount: testPayment.amount,
        currency: testPayment.currency,
        status: 'PENDING',
        paymentType: 'PROJECT_PAYMENT'
      }
    });
    
    console.log('✅ Payment creation successful');
    console.log(`   Payment ID: ${payment.id}`);
    console.log(`   Order ID: ${payment.orderId}`);
    console.log(`   Amount: ${payment.amount} ${payment.currency}`);
    
    return { payment, client, freelancer, project, application };
  } catch (error) {
    console.error('❌ Payment creation failed:', error.message);
    return null;
  }
}

async function testEscrowRelease(paymentId) {
  console.log('\n🏦 Testing escrow release creation...');
  
  try {
    const escrowRelease = await prisma.escrowRelease.create({
      data: {
        paymentId: paymentId,
        releaseStatus: 'PENDING',
        autoReleaseDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
      }
    });
    
    console.log('✅ Escrow release creation successful');
    console.log(`   Escrow ID: ${escrowRelease.id}`);
    console.log(`   Auto-release date: ${escrowRelease.autoReleaseDate?.toISOString()}`);
    
    return escrowRelease;
  } catch (error) {
    console.error('❌ Escrow release creation failed:', error.message);
    return null;
  }
}

async function testWorkSubmission(applicationId, freelancerId) {
  console.log('\n📝 Testing work submission creation...');
  
  try {
    const workSubmission = await prisma.workSubmission.create({
      data: {
        applicationId: applicationId,
        title: 'Test Work Submission',
        description: 'This is a test work submission for PayHere integration',
        fileUrls: JSON.stringify(['http://example.com/test-file.pdf']),
        submittedBy: freelancerId,
        status: 'PENDING_REVIEW'
      }
    });
    
    console.log('✅ Work submission creation successful');
    console.log(`   Submission ID: ${workSubmission.id}`);
    console.log(`   Status: ${workSubmission.status}`);
    
    return workSubmission;
  } catch (error) {
    console.error('❌ Work submission creation failed:', error.message);
    return null;
  }
}

async function testMilestoneCreation(paymentId) {
  console.log('\n🎯 Testing milestone creation...');
  
  try {
    const milestone = await prisma.milestone.create({
      data: {
        paymentId: paymentId,
        title: 'Test Milestone',
        description: 'Complete the initial development phase',
        amount: 2500.00,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: 'PENDING'
      }
    });
    
    console.log('✅ Milestone creation successful');
    console.log(`   Milestone ID: ${milestone.id}`);
    console.log(`   Amount: ${milestone.amount}`);
    console.log(`   Due date: ${milestone.dueDate?.toISOString()}`);
    
    return milestone;
  } catch (error) {
    console.error('❌ Milestone creation failed:', error.message);
    return null;
  }
}

function testEnvironmentConfiguration() {
  console.log('\n⚙️ Testing environment configuration...');
  
  const envFile = path.join(process.cwd(), '.env');
  const envExampleFile = path.join(process.cwd(), '.env.example');
  
  console.log(`   .env file exists: ${fs.existsSync(envFile) ? '✅' : '❌'}`);
  console.log(`   .env.example file exists: ${fs.existsSync(envExampleFile) ? '✅' : '❌'}`);
  
  // Check required environment variables
  const requiredVars = [
    'DATABASE_URL',
    'PAYHERE_MERCHANT_ID',
    'PAYHERE_MERCHANT_SECRET',
    'PAYHERE_MODE',
    'PAYHERE_CURRENCY'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log(`   Missing environment variables: ${missingVars.join(', ')}`);
    console.log('   ℹ️  Copy .env.example to .env and configure your PayHere credentials');
  } else {
    console.log('   ✅ All required environment variables present');
  }
  
  return missingVars.length === 0;
}

async function runComprehensiveTest() {
  let success = true;
  
  // Test 1: Environment Configuration
  const envConfigOk = testEnvironmentConfiguration();
  success = success && envConfigOk;
  
  // Test 2: Database Connection
  const dbOk = await testDatabaseConnection();
  success = success && dbOk;
  
  if (!dbOk) {
    console.log('\n❌ Skipping remaining tests due to database connection failure');
    return false;
  }
  
  // Test 3: PayHere Hash Generation
  const hashOk = testPayHereHashGeneration();
  success = success && hashOk;
  
  // Test 4: Payment Creation
  const paymentResult = await testPaymentCreation();
  const paymentOk = paymentResult !== null;
  success = success && paymentOk;
  
  if (paymentResult) {
    // Test 5: Escrow Release
    const escrowOk = await testEscrowRelease(paymentResult.payment.id) !== null;
    success = success && escrowOk;
    
    // Test 6: Work Submission
    const workSubmissionOk = await testWorkSubmission(
      paymentResult.application.id, 
      paymentResult.freelancer.id
    ) !== null;
    success = success && workSubmissionOk;
    
    // Test 7: Milestone Creation
    const milestoneOk = await testMilestoneCreation(paymentResult.payment.id) !== null;
    success = success && milestoneOk;
  }
  
  return success;
}

async function main() {
  try {
    const allTestsPassed = await runComprehensiveTest();
    
    console.log('\n' + '='.repeat(50));
    if (allTestsPassed) {
      console.log('🎉 All PayHere integration tests passed!');
      console.log('\nNext steps:');
      console.log('1. Configure your PayHere credentials in .env file');
      console.log('2. Test the payment flow in the web application');
      console.log('3. Test webhook notifications from PayHere');
      console.log('4. Deploy to production environment');
    } else {
      console.log('❌ Some tests failed. Please check the errors above.');
      console.log('\nCommon issues:');
      console.log('- Database connection problems');
      console.log('- Missing environment variables');
      console.log('- Schema not up to date (run `npx prisma db push`)');
    }
    console.log('='.repeat(50));
  } catch (error) {
    console.error('💥 Test execution failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
main().catch(console.error);
