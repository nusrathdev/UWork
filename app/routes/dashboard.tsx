import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { useState } from "react";
import { prisma } from "~/utils/db.server";
import { getUserSession, logout } from "~/utils/auth.server";
import { getUserChats } from "~/utils/chat.server";
import Navigation from "~/components/Navigation";
import { ChatButton } from "~/components/ChatButton";
import { ChatBox } from "~/components/ChatBox";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const session = await getUserSession(request);
    const userId = session.get("userId");

    console.log("Dashboard loader - userId:", userId);    if (!userId || typeof userId !== "string") {
      console.log("No userId found, redirecting to login");
      return redirect("/auth/login");
    }    // Load user data with their projects and applications
    const [user, projects, applications, chats] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
      }),
      prisma.project.findMany({
        where: { ownerId: userId },
        include: {
          applications: {
            include: {
              freelancer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.application.findMany({
        where: { freelancerId: userId },
        include: {
          project: {
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      getUserChats(userId),
    ]);console.log("Dashboard loader - user found:", !!user);    if (!user) {
      console.log("User not found in database - clearing session and redirecting to login");
      // Clear the invalid session and redirect to login
      return logout(request);
    }    // Return complete data
    return json({ 
      user, 
      projects, 
      applications, 
      chats 
    });
  } catch (error) {
    console.error("Dashboard loader error:", error);
    throw error;
  }
}

export default function Dashboard() {
  const { user, projects, applications, chats } = useLoaderData<typeof loader>();
  const [openChatId, setOpenChatId] = useState<string | null>(null);

  // Handle case where user is null
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No User Session Found</h1>
          <p className="text-gray-600 mb-4">Please log in to access your dashboard.</p>
          <Link
            to="/auth/login"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to Your Dashboard
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Here you can manage your projects and profile.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/dashboard/projects"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors text-center block"
            >
              View Projects
            </Link>
            <Link
              to="/dashboard/profile"
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:green-blue-700 transition-colors text-center block"
            >
              Edit Profile
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Profile Summary</h2>              <div className="space-y-2">
                <p><span className="font-medium">University:</span> {user.university || 'Not specified'}</p>
                <p><span className="font-medium">Skills:</span> {typeof user.skills === 'string' ? JSON.parse(user.skills || '[]').join(', ') : 'No skills listed'}</p>
                <p><span className="font-medium">Rating:</span> ★ {user.rating?.toFixed(1) || '0.0'} ({user.reviewCount || 0} reviews)</p>
              </div>
              <Link
                to="/dashboard/profile"
                className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Edit Profile
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Projects Posted:</span>
                  <span className="font-semibold">{projects.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Applications Sent:</span>
                  <span className="font-semibold">{applications.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Chats:</span>
                  <span className="font-semibold">{chats.length}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  to="/projects/new"
                  className="block w-full bg-green-600 text-white text-center px-4 py-2 rounded-md hover:bg-green-700"
                >
                  Post New Project
                </Link>
                <Link
                  to="/projects"
                  className="block w-full bg-blue-600 text-white text-center px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Browse Projects
                </Link>
              </div>
            </div>
          </div>          {/* Active Chats */}
          {chats.length > 0 && (
            <div className="mt-8 bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Active Chats</h2>
              <div className="space-y-4">
                {chats.map((chat: any) => (
                  <div key={chat.id} className="border border-gray-200 rounded-md p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{chat.projectTitle}</h3>
                        <p className="text-gray-600 text-sm">With: {chat.otherUserName}</p>
                        {chat.lastMessage && (
                          <p className="text-gray-500 text-xs mt-1">
                            Last: {chat.lastMessage.slice(0, 50)}...
                          </p>
                        )}
                      </div>
                      <ChatButton
                        onClick={() => setOpenChatId(chat.applicationId)}
                        hasUnreadMessages={false}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Your Projects */}
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Your Projects</h2>
            {projects.length === 0 ? (
              <p className="text-gray-600">You haven't posted any projects yet.</p>
            ) : (              <div className="space-y-4">
                {projects.map((project: any) => (
                  <div key={project.id} className="border border-gray-200 rounded-md p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{project.title}</h3>
                        <p className="text-gray-600 text-sm">{project.description.slice(0, 100)}...</p>                        <p className="text-sm mt-1">
                          <span className="font-medium">Budget:</span> ${project.budget} | 
                          <span className="font-medium"> Applications:</span> {project.applications?.length || 0} |
                          <span className="font-medium"> Status:</span> {project.status || 'OPEN'}
                        </p>
                      </div>
                      <Link
                        to={`/projects/${project.id}`}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Your Applications */}
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Your Applications</h2>
            {applications.length === 0 ? (
              <p className="text-gray-600">You haven't applied to any projects yet.</p>
            ) : (              <div className="space-y-4">
                {applications.map((application: any) => (
                  <div key={application.id} className="border border-gray-200 rounded-md p-4">
                    <div className="flex justify-between items-start">                      <div className="flex-1">
                        <h3 className="font-medium">{application.project.title}</h3>
                        <p className="text-gray-600 text-sm">Client: {application.project.owner.name}</p>
                        <p className="text-sm mt-1">
                          <span className="font-medium">Your Bid:</span> ${application.proposedBudget} | 
                          <span className="font-medium"> Status:</span> 
                          <span className={`ml-1 px-2 py-1 rounded text-xs ${
                            application.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            application.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {application.status}
                          </span>
                        </p>
                      </div>                      <div className="flex space-x-2">
                        <Link
                          to={`/projects/${application.project.id}`}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                        >
                          View Project
                        </Link>
                        {application.status === 'APPROVED' && (
                          <ChatButton
                            onClick={() => setOpenChatId(application.id)}
                            hasUnreadMessages={false}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}          </div>        </div>
      </div>      {/* Chat Box */}
      {openChatId && (() => {
        // Find the application data for the opened chat
        const application = applications.find((app: any) => app.id === openChatId);
        const chatSummary = chats.find((chat: any) => chat.applicationId === openChatId);
        
        if (!application && !chatSummary) return null;

        // Determine project title and other user name
        let projectTitle = "Project";
        let otherUserName = "User";
        
        if (application) {
          projectTitle = application.project.title;
          // For applications, the current user is the freelancer, so other user is the project owner
          otherUserName = application.project.owner.name;
        } else if (chatSummary) {
          projectTitle = chatSummary.projectTitle;
          otherUserName = chatSummary.otherUserName;
        }
        
        return (
          <ChatBox
            messages={[]} // Messages will be loaded by ChatBox component
            currentUserId={user.id}
            applicationId={openChatId}
            isOpen={true}
            onClose={() => setOpenChatId(null)}
            projectTitle={projectTitle}
            otherUserName={otherUserName}
          />
        );
      })()}
    </div>
  );
}