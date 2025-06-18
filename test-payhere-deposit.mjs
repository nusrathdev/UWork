// Test PayHere Deposit Configuration
import crypto from 'crypto';
import { config } from 'dotenv';

config();

console.log('🧪 Testing PayHere Deposit Configuration...\n');

// Test environment variables
console.log('📋 Environment Variables:');
console.log(`PAYHERE_MERCHANT_ID: ${process.env.PAYHERE_MERCHANT_ID || '❌ MISSING'}`);
console.log(`PAYHERE_MERCHANT_SECRET: ${process.env.PAYHERE_MERCHANT_SECRET ? '✅ SET (' + process.env.PAYHERE_MERCHANT_SECRET.length + ' chars)' : '❌ MISSING'}`);
console.log(`PAYHERE_MODE: ${process.env.PAYHERE_MODE || '❌ MISSING'}`);
console.log(`PAYHERE_CURRENCY: ${process.env.PAYHERE_CURRENCY || '❌ MISSING'}`);
console.log(`PAYHERE_RETURN_URL: ${process.env.PAYHERE_RETURN_URL || '❌ MISSING'}`);
console.log(`PAYHERE_CANCEL_URL: ${process.env.PAYHERE_CANCEL_URL || '❌ MISSING'}`);
console.log(`PAYHERE_NOTIFY_URL: ${process.env.PAYHERE_NOTIFY_URL || '❌ MISSING'}`);

// Test hash generation with sample data
if (process.env.PAYHERE_MERCHANT_ID && process.env.PAYHERE_MERCHANT_SECRET) {
    console.log('\n🔐 Testing Hash Generation:');
    
    const merchantId = process.env.PAYHERE_MERCHANT_ID;
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
    const orderId = 'WALLET_TEST_12345';
    const amount = 1000.00;
    const currency = 'LKR';
    
    // Step 1: Hash the merchant secret
    const merchantSecretHash = crypto
        .createHash('md5')
        .update(merchantSecret)
        .digest('hex')
        .toUpperCase();
    
    // Step 2: Format amount exactly as PayHere documentation
    const formattedAmount = amount.toFixed(2);
    
    // Step 3: Create the hash string
    const hashString = `${merchantId}${orderId}${formattedAmount}${currency}${merchantSecretHash}`;
    
    // Step 4: Generate final hash
    const finalHash = crypto
        .createHash('md5')
        .update(hashString)
        .digest('hex')
        .toUpperCase();
    
    console.log(`Merchant ID: ${merchantId}`);
    console.log(`Order ID: ${orderId}`);
    console.log(`Amount: ${formattedAmount}`);
    console.log(`Currency: ${currency}`);
    console.log(`Merchant Secret Hash: ${merchantSecretHash}`);
    console.log(`Hash String: ${hashString}`);
    console.log(`Final Hash: ${finalHash}`);
    
    // Test with the exact format from PayHere documentation
    console.log('\n🧮 Verifying with PayHere Documentation Format:');
    
    // PHP equivalent: number_format($amount, 2, '.', '')
    const phpFormattedAmount = parseFloat(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).replace(/,/g, '');
    
    console.log(`PHP Formatted Amount: ${phpFormattedAmount}`);
    
    if (formattedAmount === phpFormattedAmount) {
        console.log('✅ Amount formatting matches PHP number_format');
    } else {
        console.log('⚠️  Amount formatting difference detected');
        console.log(`   JavaScript: ${formattedAmount}`);
        console.log(`   PHP format: ${phpFormattedAmount}`);
    }
    
    // Generate sample payment data for testing
    console.log('\n💳 Sample Payment Data:');
    const samplePayment = {
        sandbox: process.env.PAYHERE_MODE === 'sandbox',
        merchant_id: merchantId,
        return_url: process.env.PAYHERE_RETURN_URL,
        cancel_url: process.env.PAYHERE_CANCEL_URL,
        notify_url: process.env.PAYHERE_NOTIFY_URL,
        order_id: orderId,
        items: `Wallet Deposit - LKR ${amount}`,
        amount: formattedAmount,
        currency: currency,
        hash: finalHash,
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        phone: '0771234567',
        address: 'Test Address',
        city: 'Colombo',
        country: 'Sri Lanka',
        custom_1: 'WALLET_DEPOSIT',
        custom_2: 'test_user_id'
    };
    
    console.log(JSON.stringify(samplePayment, null, 2));
    
} else {
    console.log('\n❌ Cannot test hash generation - missing merchant credentials');
}

// Test PayHere URLs
console.log('\n🌐 PayHere URLs:');
const mode = process.env.PAYHERE_MODE || 'sandbox';
const checkoutUrl = mode === 'sandbox' 
    ? 'https://sandbox.payhere.lk/pay/checkout'
    : 'https://www.payhere.lk/pay/checkout';

console.log(`Mode: ${mode}`);
console.log(`Checkout URL: ${checkoutUrl}`);

console.log('\n✅ PayHere configuration test complete!');

// Test validation checklist
console.log('\n📝 Pre-deployment Checklist:');
console.log('□ Merchant ID configured');
console.log('□ Merchant Secret updated for domain');
console.log('□ Domain authorized in PayHere dashboard');
console.log('□ Return/Cancel/Notify URLs are accessible');
console.log('□ Hash generation follows PayHere format');
console.log('□ Amount formatting is correct (X.XX)');
console.log('\n💡 If PayHere.js is stuck loading, check:');
console.log('   1. Browser console for JavaScript errors');
console.log('   2. Network tab for failed requests');
console.log('   3. PayHere script loading from https://www.payhere.lk/lib/payhere.js');
console.log('   4. Domain authorization in PayHere dashboard');
console.log('   5. Merchant Secret matches the one for your domain');
