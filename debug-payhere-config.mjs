// Debug script to test PayHere configuration
import { PayHereService } from './app/utils/payhere.server.js';

const payHereConfig = {
  merchantId: process.env.PAYHERE_MERCHANT_ID || '4OVxzM0PLRQ4JFnJecjqk43Xi',
  merchantSecret: process.env.PAYHERE_MERCHANT_SECRET || '4TsZMkxZfWf49dBKrpnxuo4qAYIYm1g1M8MS9U2IPXlo',
  mode: 'sandbox',
  currency: 'LKR',
  returnUrl: 'http://localhost:5173/payment/success',
  cancelUrl: 'http://localhost:5173/payment/cancel',
  notifyUrl: 'http://localhost:5173/api/payment/notify',
};

const payHereService = new PayHereService(payHereConfig);

// Test payment data
const testPayment = {
  orderId: 'WALLET_DEPOSIT_' + Date.now(),
  amount: 1000,
  currency: 'LKR',
  items: 'Wallet Deposit',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '0771234567',
  address: 'Colombo',
  city: 'Colombo',
  country: 'Sri Lanka'
};

console.log('🧪 Testing PayHere Configuration...\n');

console.log('📋 Config:');
console.log(`Merchant ID: ${payHereConfig.merchantId}`);
console.log(`Mode: ${payHereConfig.mode}`);
console.log(`Currency: ${payHereConfig.currency}`);
console.log(`Checkout URL: ${payHereService.getCheckoutUrl()}`);

console.log('\n💳 Test Payment:');
console.log(`Order ID: ${testPayment.orderId}`);
console.log(`Amount: ${testPayment.amount}`);
console.log(`Email: ${testPayment.email}`);

const hash = payHereService.generateHash(testPayment);
console.log(`\n🔐 Generated Hash: ${hash}`);

const formData = payHereService.preparePaymentForm(testPayment);
console.log('\n📝 PayHere Form Data:');
console.log(JSON.stringify(formData, null, 2));

console.log('\n✅ PayHere configuration test completed!');
console.log('\n🔍 If you see error 081916062526, check:');
console.log('- Merchant credentials are correct');
console.log('- Hash generation is working');
console.log('- All required fields are present');
console.log('- URLs are accessible from PayHere servers');
