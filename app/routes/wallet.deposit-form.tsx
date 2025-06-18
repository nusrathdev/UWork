import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form, useActionData } from "@remix-run/react";
import { getUserSession } from "~/utils/auth.server";
import { getUserWalletBalance } from "~/utils/wallet.server";
import { payHereService } from "~/utils/payhere.server";
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

    const paymentData = {
      orderId,
      amount,
      currency: 'LKR',
      items: `Wallet Deposit - LKR ${amount}`,
      firstName: user.name.split(' ')[0] || 'User',
      lastName: user.name.split(' ').slice(1).join(' ') || '',
      email: user.email,
      phone: '',
      address: '',
      city: '',
      country: 'Sri Lanka',
    };

    const formData = payHereService.preparePaymentForm(paymentData);

    // Return form data for direct form submission
    return json({
      success: true,
      formData,
      checkoutUrl: payHereService.getCheckoutUrl(),
      orderId,
      amount
    });

  } catch (error) {
    console.error('PayHere deposit error:', error);
    return json(
      { error: "Failed to initialize payment. Please try again." },
      { status: 500 }
    );
  }
}

export default function WalletDepositForm() {
  const { walletBalance } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">💳 Wallet Deposit</h1>
          <p className="text-gray-600">Add funds to your wallet (Form Method)</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <h2 className="font-medium text-blue-800 mb-1">Current Balance</h2>
          <p className="text-2xl font-bold text-blue-900">LKR {walletBalance.toLocaleString()}</p>
        </div>        {/* Deposit Form */}
        {!(actionData && 'success' in actionData && actionData.success) && (
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
                <li>• Secure payment via PayHere Gateway</li>
                <li>• Minimum deposit: LKR 100</li>
                <li>• Maximum deposit: LKR 100,000</li>
                <li>• Instant wallet credit after payment</li>
              </ul>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              💳 Proceed to PayHere
            </button>
          </Form>
        )}        {/* Quick Amount Buttons */}
        {!(actionData && 'success' in actionData && actionData.success) && (
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
        )}

        {/* PayHere Form Submission */}
        {actionData && 'success' in actionData && actionData.success && actionData.formData && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h3 className="font-medium text-green-800 mb-2">Payment Ready!</h3>
              <p className="text-sm text-green-700 mb-3">
                Click the button below to complete your deposit of LKR {actionData.amount} via PayHere.
              </p>
              <div className="text-xs text-green-600">
                <p>Order ID: {actionData.orderId}</p>
              </div>
            </div>

            {/* Auto-submit form to PayHere */}
            <form 
              method="post" 
              action={actionData.checkoutUrl}
              className="space-y-2"
            >
              {Object.entries(actionData.formData).map(([key, value]) => (
                <input
                  key={key}
                  type="hidden"
                  name={key}
                  value={value as string}
                />
              ))}
              
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium"
              >
                🚀 Complete Payment at PayHere
              </button>
            </form>

            <div className="text-center">
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                ← Start Over
              </button>
            </div>
          </div>
        )}

        {/* Alternative Options */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-3">Having issues?</p>
          <div className="space-y-2">
            <a
              href="/wallet/deposit-js"
              className="block w-full text-center py-2 px-4 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
            >
              Try PayHere.js Version
            </a>
            <a
              href="/wallet"
              className="block w-full text-center py-2 px-4 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
            >
              ← Back to Wallet
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
