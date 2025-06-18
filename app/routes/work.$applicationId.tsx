import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form, Link } from "@remix-run/react";
import { useState } from "react";
import { prisma } from "~/utils/db.server";
import { getUserSession } from "~/utils/auth.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return redirect("/auth/login");
  }

  const applicationId = params.applicationId;
  if (!applicationId) {
    throw new Error("Application ID is required");
  }

  // Get application with basic data for now
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      project: {
        include: { owner: true }
      },
      freelancer: true,
    },
  });

  if (!application) {
    throw new Error("Application not found");
  }

  // Check if user is authorized
  const isClient = application.project.ownerId === userId;
  const isFreelancer = application.freelancerId === userId;

  if (!isClient && !isFreelancer) {
    throw new Error("Unauthorized to view this application");
  }

  return json({ 
    application, 
    isClient, 
    isFreelancer,
    userId 
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return redirect("/auth/login");
  }

  const formData = await request.formData();
  const action = formData.get("action")?.toString();

  // For now, just return success messages since the full database schema isn't ready
  switch (action) {
    case "submit_work":
      return json({ success: true, message: "Work submitted successfully! Client will review your submission." });
    case "approve_work":
      return json({ success: true, message: "Work approved! Payment will be released to freelancer." });
    case "request_revision":
      return json({ success: true, message: "Revision requested. Freelancer will be notified." });
    default:
      return json({ error: "Invalid action" }, { status: 400 });
  }
}

export default function WorkPage() {
  const { application, isClient, isFreelancer } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);

  // Type guards for action responses
  const isSuccessResponse = (data: any): data is { success: boolean; message: string } => {
    return data && typeof data === 'object' && 'success' in data;
  };

  const isErrorResponse = (data: any): data is { error: string } => {
    return data && typeof data === 'object' && 'error' in data;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{application.project.title}</h1>
              <p className="text-gray-600">
                {isClient ? `Freelancer: ${application.freelancer.name}` : `Client: ${application.project.owner.name}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Budget</p>
              <p className="text-2xl font-bold text-green-600">LKR {application.proposedBudget.toFixed(2)}</p>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              application.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
              application.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {application.status}
            </span>
          </div>
        </div>

        {/* Success/Error Messages */}
        {actionData && isSuccessResponse(actionData) && actionData.success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-green-800">{actionData.message}</p>
            </div>
          </div>
        )}

        {actionData && isErrorResponse(actionData) && actionData.error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-800">{actionData.error}</p>
            </div>
          </div>
        )}

        {/* Upwork-style Workflow */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Project Workflow</h2>
          
          {/* Workflow Steps */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                application.status === 'APPROVED' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Application Approved</span>
            </div>
            <div className="flex-1 h-px bg-gray-300"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-yellow-500 text-white">
                2
              </div>
              <span className="ml-2 text-sm font-medium">Payment & Work</span>
            </div>
            <div className="flex-1 h-px bg-gray-300"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-300 text-gray-600">
                3
              </div>
              <span className="ml-2 text-sm font-medium">Work Delivered</span>
            </div>
            <div className="flex-1 h-px bg-gray-300"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-300 text-gray-600">
                4
              </div>
              <span className="ml-2 text-sm font-medium">Payment Released</span>
            </div>
          </div>

          {/* Current Step Details */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Current Step: Payment & Work Phase</h3>
            <div className="text-sm text-blue-800">
              {isClient && application.status === 'APPROVED' && (
                <div>
                  <p className="mb-2">✅ Your application has been approved!</p>
                  <p className="mb-2">💳 Next: Make secure payment to start the project</p>
                  <p>🔒 Payment will be held safely in escrow until work is completed</p>
                </div>
              )}
              {isFreelancer && application.status === 'APPROVED' && (
                <div>
                  <p className="mb-2">🎉 Congratulations! Your application was approved</p>
                  <p className="mb-2">⏳ Waiting for client to make payment</p>
                  <p>🚀 Once payment is made, you can start working on the project</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Client Actions */}
          {isClient && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-blue-600">🏢 Client Actions</h3>
              
              {application.status === 'APPROVED' && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">💳 Secure Payment</h4>
                    <p className="text-sm text-green-800 mb-3">
                      Make payment to start the project. Funds will be held in secure escrow.
                    </p>
                    <Link
                      to={`/payment/${application.id}`}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                      </svg>
                      Make Payment
                    </Link>
                  </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">💬 Communication</h4>                    <p className="text-sm text-blue-800 mb-3">
                      Stay in touch with your freelancer throughout the project.
                    </p>
                    <Link
                      to={`/messages?chat=${application.id}`}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                      </svg>
                      Open Chat
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Freelancer Actions */}
          {isFreelancer && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-green-600">👨‍💻 Freelancer Actions</h3>
              
              {application.status === 'APPROVED' && (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-900 mb-2">⏳ Waiting for Payment</h4>
                    <p className="text-sm text-yellow-800 mb-3">
                      Client needs to make payment before you can start working.
                    </p>
                    <div className="bg-yellow-100 rounded p-2">
                      <p className="text-xs text-yellow-800">
                        💡 Tip: Use this time to prepare and plan your approach to the project
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">💬 Stay Connected</h4>
                    <p className="text-sm text-blue-800 mb-3">
                      Communicate with your client about project details.                    </p>
                    <Link
                      to={`/messages?chat=${application.id}`}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                      </svg>
                      Open Chat
                    </Link>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">📤 Submit Work (Demo)</h4>
                    <p className="text-sm text-green-800 mb-3">
                      Once payment is made, you'll be able to submit your completed work.
                    </p>
                    <button
                      onClick={() => setShowSubmissionForm(true)}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Demo Submit Work
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* How Escrow Works */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-4">🔒 How Our Secure Escrow System Works</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                </svg>
              </div>
              <h3 className="font-medium mb-2">1. Client Pays</h3>
              <p className="text-sm text-gray-600">Client makes secure payment through PayHere gateway</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-medium mb-2">2. Funds Secured</h3>
              <p className="text-sm text-gray-600">Payment held safely in escrow until work is completed</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293 7.707a1 1 0 011.414 0L9 13.414V7a1 1 0 112 0v6.414l1.293-1.707a1 1 0 111.414 1.414l-3 4a1 1 0 01-1.414 0l-3-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-medium mb-2">3. Work Delivered</h3>
              <p className="text-sm text-gray-600">Freelancer completes and submits the work</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-medium mb-2">4. Payment Released</h3>
              <p className="text-sm text-gray-600">Client approves work and payment is released to freelancer</p>
            </div>
          </div>
        </div>

        {/* Demo Work Submission Modal */}
        {showSubmissionForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-lg font-semibold mb-4">Submit Your Work (Demo)</h3>
              <Form method="post" onSubmit={() => setShowSubmissionForm(false)}>
                <input type="hidden" name="action" value="submit_work" />
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Submission Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Brief title for your submission"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Work Description
                    </label>
                    <textarea
                      name="description"
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe what you've completed..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      File Links (optional)
                    </label>
                    <textarea
                      name="fileUrls"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Links to your work files..."
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowSubmissionForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Submit Work
                  </button>
                </div>
              </Form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
