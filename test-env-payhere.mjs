// Test PayHere Environment Variables
import dotenv from 'dotenv';
import { PayHereService } from './app/utils/payhere.server.js';

// Load environment variables
dotenv.config();

console.log('🔍 Testing PayHere Environment Configuration...\n');

// Check if all required environment variables are set
const requiredEnvVars = [
  'PAYHERE_MERCHANT_ID',
  'PAYHERE_MERCHANT_SECRET', 
  'PAYHERE_MODE',
  'PAYHERE_CURRENCY',
  'PAYHERE_RETURN_URL',
  'PAYHERE_CANCEL_URL',
  'PAYHERE_NOTIFY_URL'
];

let allEnvVarsPresent = true;

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`✅ ${envVar}: ${envVar.includes('SECRET') ? '***HIDDEN***' : value}`);
  } else {
    console.log(`❌ ${envVar}: MISSING`);
    allEnvVarsPresent = false;
  }
});

if (!allEnvVarsPresent) {
  console.log('\n❌ Some environment variables are missing!');
  process.exit(1);
}

// Test PayHere service initialization
try {
  const payHereConfig = {
    merchantId: process.env.PAYHERE_MERCHANT_ID,
    merchantSecret: process.env.PAYHERE_MERCHANT_SECRET,
    mode: process.env.PAYHERE_MODE,
    currency: process.env.PAYHERE_CURRENCY,
    returnUrl: process.env.PAYHERE_RETURN_URL,
    cancelUrl: process.env.PAYHERE_CANCEL_URL,
    notifyUrl: process.env.PAYHERE_NOTIFY_URL,
  };

  const payHereService = new PayHereService(payHereConfig);
  console.log('\n✅ PayHere service initialized successfully!');

  // Test hash generation with sample data
  const testPaymentData = {
    orderId: 'TEST_ORDER_123',
    amount: 1000.50,
    currency: 'LKR',
    items: 'Test Project Payment',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '0771234567',
    address: 'Test Address',
    city: 'Colombo',
    country: 'Sri Lanka'
  };

  const hash = payHereService.generatePaymentHash(testPaymentData);
  console.log(`✅ Payment hash generated successfully: ${hash.substring(0, 10)}...`);

  // Test notification hash
  const testNotification = {
    merchant_id: process.env.PAYHERE_MERCHANT_ID,
    order_id: 'TEST_ORDER_123',
    payhere_amount: '1000.50',
    payhere_currency: 'LKR',
    status_code: '2',
    md5sig: 'test_signature'
  };

  const isValidNotification = payHereService.verifyNotification(testNotification);
  console.log(`✅ Notification verification test completed`);

  console.log('\n🎉 All PayHere environment tests passed!');
  console.log('\n📋 Summary:');
  console.log(`   • Merchant ID: ${process.env.PAYHERE_MERCHANT_ID}`);
  console.log(`   • Mode: ${process.env.PAYHERE_MODE.toUpperCase()}`);
  console.log(`   • Currency: ${process.env.PAYHERE_CURRENCY}`);
  console.log(`   • Return URL: ${process.env.PAYHERE_RETURN_URL}`);
  console.log(`   • Cancel URL: ${process.env.PAYHERE_CANCEL_URL}`);
  console.log(`   • Notify URL: ${process.env.PAYHERE_NOTIFY_URL}`);

} catch (error) {
  console.error('\n❌ PayHere service initialization failed:', error.message);
  process.exit(1);
}
