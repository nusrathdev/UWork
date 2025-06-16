import { type ActionFunctionArgs, type LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData, Link } from "@remix-run/react";
import { getUserSession } from "~/utils/auth.server";
import { getUserWalletBalance, createWithdrawalRequest } from "~/utils/wallet.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return redirect("/auth/login");
  }
  
  const balance = await getUserWalletBalance(userId);
  
  return json({ balance });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return redirect("/auth/login");
  }
  
  const formData = await request.formData();
  
  const amount = parseFloat(formData.get("amount") as string);
  const bankName = formData.get("bankName") as string;
  const accountNumber = formData.get("accountNumber") as string;
  const accountHolderName = formData.get("accountHolderName") as string;
  const branchCode = formData.get("branchCode") as string;
  
  if (!amount || amount <= 0) {
    return json({ error: "Please enter a valid amount" }, { status: 400 });
  }
  
  if (!bankName || !accountNumber || !accountHolderName) {
    return json({ error: "Please fill in all bank details" }, { status: 400 });
  }
    try {
    const withdrawal = await createWithdrawalRequest({
      userId,
      amount,
      bankAccount: {
        bankName,
        accountNumber,
        accountHolderName,
        branchCode
      }
    });
    
    return redirect(`/wallet?success=withdrawal_requested&id=${withdrawal.id}`);
  } catch (error) {
    return json({ 
      error: (error as Error).message || "Failed to create withdrawal request" 
    }, { status: 400 });
  }
}

export default function WalletWithdraw() {
  const { balance } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Link to="/wallet" className="text-blue-600 hover:text-blue-800">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Withdraw Funds</h1>
        </div>
        <p className="text-gray-600">
          Request to withdraw funds from your wallet to your bank account
        </p>
      </div>      {/* Available Balance */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Available Balance</p>
          <p className="text-3xl font-bold text-gray-900">
            LKR {balance.toLocaleString()}
          </p>
        </div>
      </div>      {/* Withdrawal Form */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Withdrawal Details</h2>
          
          {actionData?.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{actionData.error}</p>
            </div>
          )}
          
          <Form method="post" className="space-y-6">
            {/* Amount */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Withdrawal Amount (LKR)
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                min="100"
                max={balance}
                step="0.01"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter amount to withdraw"
              />
              <p className="mt-1 text-sm text-gray-500">
                Minimum withdrawal: LKR 100. Maximum: LKR {balance.toLocaleString()}
              </p>
            </div>

            {/* Bank Details */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Bank Account Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Name
                  </label>
                  <select
                    id="bankName"
                    name="bankName"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Bank</option>
                    <option value="Commercial Bank">Commercial Bank of Ceylon</option>
                    <option value="People's Bank">People's Bank</option>
                    <option value="Bank of Ceylon">Bank of Ceylon</option>
                    <option value="Hatton National Bank">Hatton National Bank</option>
                    <option value="Sampath Bank">Sampath Bank</option>
                    <option value="Nations Trust Bank">Nations Trust Bank</option>
                    <option value="DFCC Bank">DFCC Bank</option>
                    <option value="Seylan Bank">Seylan Bank</option>
                    <option value="Union Bank">Union Bank</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="branchCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Branch Code (Optional)
                  </label>
                  <input
                    type="text"
                    id="branchCode"
                    name="branchCode"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 001"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  id="accountNumber"
                  name="accountNumber"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your account number"
                />
              </div>
              
              <div className="mt-4">
                <label htmlFor="accountHolderName" className="block text-sm font-medium text-gray-700 mb-2">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  id="accountHolderName"
                  name="accountHolderName"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter account holder name as per bank records"
                />
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">Important Notes:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Withdrawal requests are processed within 1-3 business days</li>
                <li>• A processing fee of 2% or minimum LKR 50 may apply</li>
                <li>• Ensure your bank details are correct to avoid delays</li>
                <li>• You will receive an email confirmation once processed</li>
              </ul>
            </div>            {/* Submit Button */}
            <div className="flex space-x-4 pt-6">
              <button
                type="submit"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Request Withdrawal
              </button>
              <Link to="/wallet">
                <button 
                  type="button" 
                  className="px-6 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-medium rounded-md transition-colors"
                >
                  Cancel
                </button>
              </Link>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
