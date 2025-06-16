import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form } from "@remix-run/react";
import { getUserSession } from "~/utils/auth.server";
import { getUserPayments, updateEscrowRelease } from "~/utils/payment.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return redirect("/auth/login");
  }

  try {
    const payments = await getUserPayments(userId);
    return json({ payments, userId });
  } catch (error) {
    console.error("Error loading payments:", error);
    // Return empty payments if there's an error (tables might not exist yet)
    const payments = {
      paidPayments: [],
      receivedPayments: [],
    };
    return json({ payments, userId });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return redirect("/auth/login");
  }

  const formData = await request.formData();
  const action = formData.get("action")?.toString();
  const paymentId = formData.get("paymentId")?.toString();

  if (!action || !paymentId) {
    return json({ error: "Missing required fields" }, { status: 400 });
  }
  try {
    switch (action) {
      case "request_release":
        // Freelancer requests payment release
        await updateEscrowRelease(paymentId, { freelancerRequest: true });
        break;
      case "approve_release":
        // Client approves payment release
        await updateEscrowRelease(paymentId, { 
          clientApproval: true, 
          releaseStatus: "RELEASED" 
        });
        break;
      case "dispute":
        // Mark payment as disputed
        await updateEscrowRelease(paymentId, { releaseStatus: "DISPUTED" });
        break;
    }

    return json({ success: true, message: "Action completed successfully" });
  } catch (error) {
    console.error("Escrow action error:", error);
    return json({ error: "Failed to process action" }, { status: 500 });
  }
}

export default function PaymentsPage() {
  const { payments, userId } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  // Type guards for action responses
  const isSuccessResponse = (data: any): data is { success: boolean; message: string } => {
    return data && typeof data === 'object' && 'success' in data;
  };

  const isErrorResponse = (data: any): data is { error: string } => {
    return data && typeof data === 'object' && 'error' in data;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Payments & Escrow</h1>

        {/* Success/Error Messages */}
        {actionData && isSuccessResponse(actionData) && actionData.success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{actionData.message}</p>
          </div>
        )}
        
        {actionData && isErrorResponse(actionData) && actionData.error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{actionData.error}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Payments Made (Client View) */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-blue-600">💳 Payments Made</h2>
            {payments.paidPayments.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto h-16 w-16 text-gray-300 mb-4">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                  </svg>
                </div>
                <p className="text-gray-600">No payments made yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Payments you make to freelancers will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {payments.paidPayments.map((payment: any) => (
                  <div key={payment.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">{payment.application.project.title}</h3>
                        <p className="text-sm text-gray-600">
                          To: {payment.receiver.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg">LKR {payment.amount.toFixed(2)}</p>
                        <span className={`px-2 py-1 rounded text-xs ${
                          payment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {payment.status}
                        </span>
                      </div>
                    </div>
                    
                    {payment.escrowRelease && (
                      <div className="mt-3 p-3 bg-gray-50 rounded">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Escrow Status:</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            payment.escrowRelease.releaseStatus === 'RELEASED' ? 'bg-green-100 text-green-800' :
                            payment.escrowRelease.releaseStatus === 'DISPUTED' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {payment.escrowRelease.releaseStatus}
                          </span>
                        </div>
                        
                        {payment.escrowRelease.freelancerRequest && !payment.escrowRelease.clientApproval && (
                          <div className="mt-2">
                            <p className="text-sm text-orange-600 mb-2">
                              ⏳ Freelancer has requested payment release
                            </p>
                            <Form method="post" className="inline">
                              <input type="hidden" name="paymentId" value={payment.id} />
                              <input type="hidden" name="action" value="approve_release" />
                              <button
                                type="submit"
                                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 mr-2"
                              >
                                Approve Release
                              </button>
                            </Form>
                            <Form method="post" className="inline">
                              <input type="hidden" name="paymentId" value={payment.id} />
                              <input type="hidden" name="action" value="dispute" />
                              <button
                                type="submit"
                                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                              >
                                Dispute
                              </button>
                            </Form>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payments Received (Freelancer View) */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-green-600">💰 Payments Received</h2>
            {payments.receivedPayments.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto h-16 w-16 text-gray-300 mb-4">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-gray-600">No payments received yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Payments from clients will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {payments.receivedPayments.map((payment: any) => (
                  <div key={payment.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">{payment.application.project.title}</h3>
                        <p className="text-sm text-gray-600">
                          From: {payment.payer.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg">LKR {payment.amount.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">
                          You receive: LKR {(payment.amount * 0.95).toFixed(2)}
                        </p>
                        <span className={`px-2 py-1 rounded text-xs ${
                          payment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {payment.status}
                        </span>
                      </div>
                    </div>
                    
                    {payment.escrowRelease && (
                      <div className="mt-3 p-3 bg-gray-50 rounded">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Escrow Status:</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            payment.escrowRelease.releaseStatus === 'RELEASED' ? 'bg-green-100 text-green-800' :
                            payment.escrowRelease.releaseStatus === 'DISPUTED' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {payment.escrowRelease.releaseStatus}
                          </span>
                        </div>
                        
                        {payment.escrowRelease.releaseStatus === 'PENDING' && !payment.escrowRelease.freelancerRequest && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-600 mb-2">
                              Work completed? Request payment release:
                            </p>
                            <Form method="post">
                              <input type="hidden" name="paymentId" value={payment.id} />
                              <input type="hidden" name="action" value="request_release" />
                              <button
                                type="submit"
                                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                              >
                                Request Release
                              </button>
                            </Form>
                          </div>
                        )}
                        
                        {payment.escrowRelease.freelancerRequest && !payment.escrowRelease.clientApproval && (
                          <p className="text-sm text-orange-600 mt-2">
                            ⏳ Waiting for client approval
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Information Panel */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">How Escrow Works</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-blue-700">
            <div>
              <div className="font-medium mb-1">1. Payment Made</div>
              <p>Client pays for the project. Funds are held securely in escrow.</p>
            </div>
            <div>
              <div className="font-medium mb-1">2. Work Completed</div>
              <p>Freelancer completes the work and requests payment release.</p>
            </div>
            <div>
              <div className="font-medium mb-1">3. Payment Released</div>
              <p>Client approves the work and funds are released to the freelancer.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
