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
      }
    });

    if (!user) {
      return json({ error: "User not found" }, { status: 404 });
    }

    // Create PayHere payment for wallet deposit
    const orderId = `WALLET_DEPOSIT_${Date.now()}_${userId.slice(-6)}`;
    
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
        custom_1: userId,
        custom_2: 'WALLET_DEPOSIT'
      }
    });

  } catch (error) {
    console.error('Wallet deposit error:', error);
    return json({ error: "Failed to initiate payment" }, { status: 500 });
  }
}

export default function WalletDepositJS() {
  const { walletBalance } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Deposit to Wallet</h1>
        
        {/* Current Balance */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="text-center">
            <p className="text-sm text-blue-600 font-medium">Current Wallet Balance</p>
            <p className="text-2xl font-bold text-blue-800">LKR {walletBalance.toFixed(2)}</p>
          </div>
        </div>

        {/* PayHere.js Notice */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="text-center">
            <p className="text-sm text-green-600 font-medium">🎉 Using PayHere JavaScript SDK</p>
            <p className="text-xs text-green-500">Bypasses domain authorization issues</p>
          </div>
        </div>

        {/* Deposit Form */}
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
      </div>      {/* PayHere.js Script and Logic */}
      {actionData && 'success' in actionData && actionData.success && actionData.paymentData && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Starting PayHere payment...</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
            <script
            dangerouslySetInnerHTML={{
              __html: `
                console.log('Loading PayHere.js...');
                
                // Load PayHere script dynamically
                if (!window.payhere) {
                  var script = document.createElement('script');
                  script.src = 'https://www.payhere.lk/lib/payhere.js';
                  script.onload = function() {
                    console.log('PayHere.js loaded successfully');
                    if (window.payhere) {
                      initializePayment();
                    } else {
                      console.error('PayHere.js loaded but payhere object not available');
                      alert('PayHere initialization failed. Please try again.');
                    }
                  };
                  script.onerror = function() {
                    console.error('Failed to load PayHere.js');
                    alert('Failed to load PayHere. Please check your internet connection.');
                  };
                  document.head.appendChild(script);
                } else {
                  console.log('PayHere.js already loaded');
                  initializePayment();
                }
                
                function initializePayment() {
                  try {
                    console.log('Initializing PayHere payment...');
                    
                    // Check if payhere is available
                    if (!window.payhere) {
                      throw new Error('PayHere.js not loaded');
                    }
                    
                    // PayHere event handlers
                    window.payhere.onCompleted = function onCompleted(orderId) {
                      console.log("Payment completed. OrderID:" + orderId);
                      alert("Payment completed! Redirecting to wallet...");
                      window.location.href = "/wallet";
                    };

                    window.payhere.onDismissed = function onDismissed() {
                      console.log("Payment dismissed");
                      alert("Payment was cancelled");
                      window.location.reload();
                    };

                    window.payhere.onError = function onError(error) {
                      console.log("PayHere Error:" + error);
                      alert("Payment error: " + error);
                      window.location.reload();
                    };

                    // Payment data
                    var payment = ${JSON.stringify(actionData.paymentData)};
                    console.log('Payment data:', payment);
                    
                    // Start payment with delay
                    setTimeout(function() {
                      console.log('Starting PayHere payment...');
                      window.payhere.startPayment(payment);
                    }, 2000);
                    
                  } catch (error) {
                    console.error('Error initializing payment:', error);
                    alert('Error initializing payment: ' + error.message);
                  }
                }
              `
            }}
          />
        </>
      )}
    </div>
  );
}
