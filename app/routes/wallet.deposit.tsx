import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form, useActionData } from "@remix-run/react";
import { getUserSession } from "~/utils/auth.server";
import { getUserWalletBalance, addToWallet } from "~/utils/wallet.server";
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
    const orderId = `WALLET_DEPOSIT_${Date.now()}_${userId.slice(-6)}`;    const payHereConfig = {
      merchantId: process.env.PAYHERE_MERCHANT_ID!,
      merchantSecret: process.env.PAYHERE_MERCHANT_SECRET!,
      mode: process.env.PAYHERE_MODE as 'sandbox' | 'live',
      currency: process.env.PAYHERE_CURRENCY || 'LKR',
      returnUrl: process.env.PAYHERE_RETURN_URL!,
      cancelUrl: process.env.PAYHERE_CANCEL_URL!,
      notifyUrl: process.env.PAYHERE_NOTIFY_URL!,
    };

    const payHereService = new PayHereService(payHereConfig);    const paymentData = {
      orderId: orderId,
      amount: amount,
      currency: 'LKR',
      items: 'Wallet Deposit',
      firstName: user.name.split(' ')[0] || 'User',
      lastName: user.name.split(' ').slice(1).join(' ') || 'Deposit',
      email: user.email,
      phone: '0771234567', // Standard Sri Lankan format
      address: 'Colombo',
      city: 'Colombo',
      country: 'Sri Lanka'
    };

    const hash = payHereService.generateHash(paymentData);

    // Create PayHere form data
    const payHereFormData = {
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
      custom_1: userId, // Store user ID for processing
      custom_2: 'WALLET_DEPOSIT' // Identify as wallet deposit
    };

    return json({ 
      success: true, 
      payHereFormData,
      payHereUrl: payHereConfig.mode === 'sandbox' 
        ? 'https://sandbox.payhere.lk/pay/checkout' 
        : 'https://www.payhere.lk/pay/checkout'
    });

  } catch (error) {
    console.error('Wallet deposit error:', error);
    return json({ error: "Failed to initiate payment" }, { status: 500 });
  }
}

export default function WalletDeposit() {
  const { walletBalance } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  // If payment data is ready, auto-submit to PayHere
  if (actionData && 'success' in actionData && actionData.success && actionData.payHereFormData) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-center mb-4">Redirecting to Payment...</h2>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 mb-4">Please wait while we redirect you to PayHere...</p>
            
            {/* Auto-submit form to PayHere */}
            <form 
              method="POST" 
              action={actionData.payHereUrl}
              ref={(form) => {
                if (form) {
                  setTimeout(() => form.submit(), 1000);
                }
              }}
            >
              {Object.entries(actionData.payHereFormData).map(([key, value]) => (
                <input key={key} type="hidden" name={key} value={value as string} />
              ))}
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                Continue to Payment
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

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
          </div>          {actionData && 'error' in actionData && actionData.error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{actionData.error}</p>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <h3 className="font-medium text-yellow-800 mb-2">Payment Information:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Secure payment via PayHere</li>
              <li>• Minimum deposit: LKR 100</li>
              <li>• Maximum deposit: LKR 100,000</li>
              <li>• Instant wallet credit after payment</li>
            </ul>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            💳 Deposit via PayHere
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
      </div>
    </div>
  );
}
