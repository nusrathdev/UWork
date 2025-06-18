import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form, useActionData } from "@remix-run/react";
import { getUserSession } from "~/utils/auth.server";
import { getUserWalletBalance } from "~/utils/wallet.server";
import { PayHereService } from "~/utils/payhere.server";
import { prisma } from "~/utils/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return redirect("/auth/login");
  }

  // Get user's current wallet balance
  const walletBalance = await getUserWalletBalance(userId);

  return json({ walletBalance, userId });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return redirect("/auth/login");
  }

  const formData = await request.formData();
  const amount = parseFloat(formData.get("amount")?.toString() || "0");

  if (!amount || amount <= 0) {
    return json({ error: "Please enter a valid amount" }, { status: 400 });
  }

  if (amount < 100) {
    return json({ error: "Minimum deposit amount is LKR 100" }, { status: 400 });
  }

  if (amount > 100000) {
    return json({ error: "Maximum deposit amount is LKR 100,000" }, { status: 400 });
  }

  try {
    // Get user information for PayHere
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
      },
    });

    if (!user) {
      return json({ error: "User not found" }, { status: 404 });
    }

    // Create PayHere payment for wallet deposit
    const orderId = `WALLET_${Date.now()}_${userId.slice(-8)}`;

    const payHereConfig = {
      merchantId: process.env.PAYHERE_MERCHANT_ID!,
      merchantSecret: process.env.PAYHERE_MERCHANT_SECRET!,
      mode: process.env.PAYHERE_MODE as 'sandbox' | 'live',
      currency: process.env.PAYHERE_CURRENCY || 'LKR',
      returnUrl: process.env.PAYHERE_RETURN_URL!,
      cancelUrl: process.env.PAYHERE_CANCEL_URL!,
      notifyUrl: process.env.PAYHERE_NOTIFY_URL!,
    };

    const payHereService = new PayHereService(payHereConfig);

    const paymentData = {
      orderId,
      amount,
      currency: payHereConfig.currency,
      items: `Wallet Deposit - LKR ${amount}`,
      firstName: user.name.split(' ')[0] || 'User',
      lastName: user.name.split(' ').slice(1).join(' ') || '',
      email: user.email,
      phone: '',
      address: '',
      city: '',
      country: 'Sri Lanka',
    };

    const hash = payHereService.generateHash(paymentData);

    // Return payment data for PayHere.js
    return json({
      success: true,
      paymentData: {
        sandbox: payHereConfig.mode === 'sandbox',
        merchant_id: payHereConfig.merchantId,
        return_url: payHereConfig.returnUrl,
        cancel_url: payHereConfig.cancelUrl, 
        notify_url: payHereConfig.notifyUrl,
        order_id: orderId,
        items: paymentData.items,
        amount: amount.toFixed(2),
        currency: paymentData.currency,
        hash: hash,
        first_name: paymentData.firstName,
        last_name: paymentData.lastName,
        email: paymentData.email,
        phone: paymentData.phone,
        address: paymentData.address,
        city: paymentData.city,
        country: paymentData.country,
        custom_1: 'WALLET_DEPOSIT',
        custom_2: userId,
      }
    });

  } catch (error) {
    console.error('PayHere deposit error:', error);
    return json(
      { error: "Failed to initialize payment. Please try again." },
      { status: 500 }
    );
  }
}

export default function WalletDepositJS() {
  const { walletBalance } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">💳 Wallet Deposit</h1>
          <p className="text-gray-600">Add funds to your wallet via PayHere.js</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <h2 className="font-medium text-blue-800 mb-1">Current Balance</h2>
          <p className="text-2xl font-bold text-blue-900">LKR {walletBalance.toLocaleString()}</p>
        </div>

        <Form method="post" className="space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Deposit Amount (LKR)
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              min="100"
              max="100000"
              step="0.01"
              placeholder="Enter amount (min: 100, max: 100,000)"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {actionData && 'error' in actionData && actionData.error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{actionData.error}</p>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <h3 className="font-medium text-yellow-800 mb-2">Payment Information:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Secure payment via PayHere JavaScript SDK</li>
              <li>• Minimum deposit: LKR 100</li>
              <li>• Maximum deposit: LKR 100,000</li>
              <li>• Instant wallet credit after payment</li>
            </ul>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            💳 Deposit via PayHere.js
          </button>
        </Form>

        {/* Quick Amount Buttons */}
        <div className="mt-6">
          <p className="text-sm text-gray-600 mb-3">Quick amounts:</p>
          <div className="grid grid-cols-3 gap-2">
            {[500, 1000, 2500, 5000, 10000, 25000].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => {
                  const input = document.getElementById('amount') as HTMLInputElement;
                  if (input) input.value = amount.toString();
                }}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
              >
                {amount.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      </div>      {/* PayHere.js Integration */}
      {actionData && 'success' in actionData && actionData.success && actionData.paymentData && (
        <>
          {/* Loading Overlay */}
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg text-center max-w-md mx-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Initializing Payment</h3>
              <p className="text-gray-600 mb-4">Please wait while we load the PayHere payment gateway...</p>
              <div className="text-sm text-gray-500 mb-4">
                <p>Amount: LKR {actionData.paymentData.amount}</p>
                <p>Order ID: {actionData.paymentData.order_id}</p>
              </div>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Cancel Payment
              </button>
            </div>
          </div>

          {/* PayHere Script and Payment Initialization */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                console.log('🚀 PayHere.js integration started');
                
                // Load PayHere script dynamically
                function loadPayHereScript() {
                  return new Promise((resolve, reject) => {
                    // Check if already loaded
                    if (typeof window.payhere !== 'undefined' && window.payhere) {
                      console.log('✅ PayHere already loaded');
                      resolve();
                      return;
                    }
                    
                    console.log('📦 Loading PayHere script...');
                    const script = document.createElement('script');
                    script.src = 'https://www.payhere.lk/lib/payhere.js';
                    script.async = true;
                    
                    script.onload = function() {
                      console.log('✅ PayHere script loaded');
                      // Wait a bit for the script to initialize
                      setTimeout(() => {
                        if (typeof window.payhere !== 'undefined' && window.payhere) {
                          resolve();
                        } else {
                          reject(new Error('PayHere object not available after script load'));
                        }
                      }, 500);
                    };
                    
                    script.onerror = function() {
                      console.error('❌ Failed to load PayHere script');
                      reject(new Error('Failed to load PayHere script'));
                    };
                    
                    document.head.appendChild(script);
                  });
                }
                
                // Initialize payment
                async function initializePayment() {
                  try {
                    // Load PayHere script
                    await loadPayHereScript();
                    
                    console.log('🔧 Setting up PayHere callbacks...');
                    
                    // Payment completed successfully
                    window.payhere.onCompleted = function(orderId) {
                      console.log('✅ Payment completed! Order ID:', orderId);
                      alert('🎉 Payment successful!\\n\\nYour wallet will be credited within a few minutes.\\n\\nOrder ID: ' + orderId);
                      window.location.href = '/wallet';
                    };

                    // Payment dismissed by user
                    window.payhere.onDismissed = function() {
                      console.log('❌ Payment cancelled by user');
                      alert('Payment was cancelled.\\n\\nYou can try again anytime.');
                      window.location.reload();
                    };

                    // Payment error occurred
                    window.payhere.onError = function(error) {
                      console.error('❌ PayHere Error:', error);
                      
                      let errorMsg = 'Payment failed: ' + error;
                      
                      // Handle specific error types based on PayHere documentation
                      if (typeof error === 'string') {
                        if (error.toLowerCase().includes('hash')) {
                          errorMsg = 'Payment validation failed. Please contact support.\\n\\nError: Invalid hash signature';
                        } else if (error.toLowerCase().includes('merchant')) {
                          errorMsg = 'Merchant configuration error. Please contact support.\\n\\nError: ' + error;
                        } else if (error.toLowerCase().includes('amount')) {
                          errorMsg = 'Invalid payment amount. Please try again.\\n\\nError: ' + error;
                        } else if (error.toLowerCase().includes('domain')) {
                          errorMsg = 'Domain not authorized. Please contact support.\\n\\nError: ' + error;
                        }
                      }
                      
                      alert(errorMsg);
                      window.location.reload();
                    };

                    // Get payment data
                    const paymentData = ${JSON.stringify(actionData.paymentData)};
                    console.log('💳 Payment data prepared:', paymentData);
                    
                    // Validate critical payment fields before starting
                    const requiredFields = ['merchant_id', 'amount', 'currency', 'order_id', 'hash', 'first_name', 'last_name', 'email'];
                    const missingFields = requiredFields.filter(field => !paymentData[field]);
                    
                    if (missingFields.length > 0) {
                      throw new Error('Missing required fields: ' + missingFields.join(', '));
                    }
                    
                    // Validate amount format (should be X.XX)
                    const amountRegex = /^\\d+\\.\\d{2}$/;
                    if (!amountRegex.test(paymentData.amount)) {
                      throw new Error('Invalid amount format: ' + paymentData.amount + ' (should be X.XX)');
                    }
                    
                    console.log('🎯 Starting PayHere payment...');
                    console.log('   Merchant ID: ' + paymentData.merchant_id);
                    console.log('   Amount: LKR ' + paymentData.amount);
                    console.log('   Order ID: ' + paymentData.order_id);
                    console.log('   Sandbox Mode: ' + paymentData.sandbox);
                    console.log('   Hash: ' + paymentData.hash.substring(0, 8) + '...');
                    
                    // Start the payment
                    window.payhere.startPayment(paymentData);
                    
                  } catch (error) {
                    console.error('❌ Payment initialization error:', error);
                    alert('Payment initialization failed:\\n' + error.message + '\\n\\nPlease try again or contact support if the issue persists.');
                    window.location.reload();
                  }
                }
                
                // Start the initialization process
                initializePayment();
              `
            }}
          />
        </>
      )}
    </div>
  );
}
