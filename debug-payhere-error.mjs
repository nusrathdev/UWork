import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PayHere configuration (matching .env)
const PAYHERE_CONFIG = {
  merchantId: '4OVxzM0PLRQ4JFnJecjqk43Xi',
  merchantSecret: '4TsZMkxZfWf49dBKrpnxuo4qAYIYm1g1M8MS9U2IPXlo',
  mode: 'sandbox',
  currency: 'LKR',
  returnUrl: 'http://localhost:5173/payment/success',
  cancelUrl: 'http://localhost:5173/payment/cancel',
  notifyUrl: 'http://localhost:5173/api/payment/notify',
};

function generatePayHereHash(paymentData) {
  const { merchantId, merchantSecret } = PAYHERE_CONFIG;
  const { orderId, amount, currency } = paymentData;
  
  // Step 1: Hash merchant secret
  const merchantSecretHash = crypto
    .createHash('md5')
    .update(merchantSecret)
    .digest('hex')
    .toUpperCase();
  
  console.log('🔐 Merchant Secret Hash:', merchantSecretHash);
  
  // Step 2: Create hash string
  const hashString = `${merchantId}${orderId}${amount.toFixed(2)}${currency}${merchantSecretHash}`;
  console.log('📝 Hash String:', hashString);
  
  // Step 3: Final hash
  const finalHash = crypto
    .createHash('md5')
    .update(hashString)
    .digest('hex')
    .toUpperCase();
  
  console.log('🔒 Final Hash:', finalHash);
  
  return finalHash;
}

async function debugWalletDeposit() {
  try {    console.log('🚀 DEBUG: Wallet Deposit PayHere Integration');
    console.log('='.repeat(50));
    
    // Get a test user
    const user = await prisma.user.findFirst({
      select: {
        id: true,
        name: true,
        email: true,
      }
    });
    
    if (!user) {
      console.log('❌ No users found in database');
      return;
    }
    
    console.log('👤 Test User:', {
      id: user.id,
      name: user.name,
      email: user.email
    });
    
    // Create test payment data (matching wallet.deposit.tsx logic)
    const amount = 1000.00;
    const orderId = `WALLET_DEPOSIT_${Date.now()}_${user.id.slice(-6)}`;
    
    const paymentData = {
      orderId: orderId,
      amount: amount,
      currency: 'LKR',
      items: 'Wallet Deposit',
      firstName: user.name.split(' ')[0] || 'User',
      lastName: user.name.split(' ').slice(1).join(' ') || 'Deposit',
      email: user.email,
      phone: '0771234567',
      address: 'Colombo',
      city: 'Colombo',
      country: 'Sri Lanka'
    };
    
    console.log('\n💳 Payment Data:');
    console.log(JSON.stringify(paymentData, null, 2));
    
    // Generate hash
    const hash = generatePayHereHash(paymentData);
    
    // Create complete form data
    const formData = {
      merchant_id: PAYHERE_CONFIG.merchantId,
      return_url: PAYHERE_CONFIG.returnUrl,
      cancel_url: PAYHERE_CONFIG.cancelUrl,
      notify_url: PAYHERE_CONFIG.notifyUrl,
      order_id: paymentData.orderId,
      items: paymentData.items,
      currency: paymentData.currency,
      amount: paymentData.amount.toFixed(2),
      first_name: paymentData.firstName,
      last_name: paymentData.lastName,
      email: paymentData.email,
      phone: paymentData.phone,
      address: paymentData.address,
      city: paymentData.city,
      country: paymentData.country,
      hash: hash,
      custom_1: user.id,
      custom_2: 'WALLET_DEPOSIT'
    };
    
    console.log('\n📋 Complete Form Data:');
    console.log(JSON.stringify(formData, null, 2));
    
    // Validate form data
    console.log('\n✅ Validation Checks:');
    console.log('- Merchant ID length:', PAYHERE_CONFIG.merchantId.length);
    console.log('- Amount format:', typeof formData.amount, formData.amount);
    console.log('- Currency:', formData.currency);
    console.log('- Hash length:', formData.hash.length);
    console.log('- Required fields present:', {
      merchant_id: !!formData.merchant_id,
      order_id: !!formData.order_id,
      amount: !!formData.amount,
      currency: !!formData.currency,
      hash: !!formData.hash,
      first_name: !!formData.first_name,
      last_name: !!formData.last_name,
      email: !!formData.email,
    });
    
    // Check URLs accessibility
    console.log('\n🌐 URL Configuration:');
    console.log('- Return URL:', PAYHERE_CONFIG.returnUrl);
    console.log('- Cancel URL:', PAYHERE_CONFIG.cancelUrl);
    console.log('- Notify URL:', PAYHERE_CONFIG.notifyUrl);
    
    console.log('\n🔍 Possible Issues with Error 081916062526:');
    console.log('1. Merchant credentials may be invalid/expired');
    console.log('2. Notify URL must be publicly accessible (not localhost)');
    console.log('3. Sandbox vs Live mode mismatch');
    console.log('4. Special characters in form data');
    console.log('5. PayHere server-side validation failures');
    
    console.log('\n💡 Recommendations:');
    console.log('1. Use ngrok to make localhost publicly accessible');
    console.log('2. Verify merchant credentials in PayHere dashboard');
    console.log('3. Test with minimal form data first');
    console.log('4. Check PayHere documentation for required field formats');
    
    // Test with ngrok URL if available
    const ngrokUrl = process.env.NGROK_URL;
    if (ngrokUrl) {
      console.log('\n🚇 Ngrok Configuration:');
      const ngrokFormData = {
        ...formData,
        return_url: `${ngrokUrl}/payment/success`,
        cancel_url: `${ngrokUrl}/payment/cancel`,
        notify_url: `${ngrokUrl}/api/payment/notify`
      };
      console.log('Updated URLs:', {
        return_url: ngrokFormData.return_url,
        cancel_url: ngrokFormData.cancel_url,
        notify_url: ngrokFormData.notify_url
      });
    } else {
      console.log('\n🚇 To test with publicly accessible URLs:');
      console.log('1. Install ngrok: npm install -g ngrok');
      console.log('2. Run: ngrok http 5173');
      console.log('3. Update PAYHERE_*_URL in .env with ngrok URLs');
    }
    
  } catch (error) {
    console.error('❌ Debug Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugWalletDeposit();
