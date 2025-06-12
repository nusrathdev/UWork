import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { useEffect } from "react";
import { prisma } from "~/utils/db.server";
import { getUserSession, logout } from "~/utils/auth.server";
import { getUserChats } from "~/utils/chat.server";

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
      }),      prisma.project.findMany({
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
            orderBy: { createdAt: "desc" },
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
    }    // Return complete data with activity checks
    const now = new Date();
    const recentCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
    
    const recentlyUpdatedApplications = applications.filter(app => 
      new Date(app.updatedAt) > recentCutoff && 
      new Date(app.updatedAt) > new Date(app.createdAt)
    );

    // Find recent applications to user's projects
    const recentApplicationsToMyProjects = projects.flatMap(project => 
      project.applications.filter((app: any) => 
        new Date(app.createdAt) > recentCutoff
      )
    );

    return json({ 
      user, 
      projects, 
      applications, 
      chats,
      recentlyUpdatedApplications,
      recentApplicationsToMyProjects
    });
  } catch (error) {
    console.error("Dashboard loader error:", error);
    throw error;
  }
}

export default function Dashboard() {
  const { user, projects, applications, chats, recentlyUpdatedApplications, recentApplicationsToMyProjects } = useLoaderData<typeof loader>();

  // Auto-refresh every 2 minutes to check for updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if there might be pending applications or recent activity
      if (projects.some((p: any) => p.applications.some((a: any) => a.status === 'PENDING')) || 
          applications.some((a: any) => a.status === 'PENDING')) {
        window.location.reload();
      }
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(interval);
  }, [projects, applications]);

  // Auto-refresh every 2 minutes to check for updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if there might be pending applications or recent activity
      if (projects.some((p: any) => p.applications.some((a: any) => a.status === 'PENDING')) || 
          applications.some((a: any) => a.status === 'PENDING')) {
        window.location.reload();
      }
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(interval);
  }, [projects, applications]);

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
  }  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">            <div className="flex justify-between items-center mb-4">
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome to Your Dashboard
              </h1>
              <div className="flex space-x-2">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Check for Updates
                </button>
              </div>
            </div>
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
        </div>        <div className="mt-8">
          {/* Recent Activity Notifications */}
          {(recentlyUpdatedApplications.length > 0 || recentApplicationsToMyProjects.length > 0) && (
            <div className="mb-6 space-y-4">
              {/* Notifications for freelancers about their application updates */}
              {recentlyUpdatedApplications.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    🔔 Your Application Updates ({recentlyUpdatedApplications.length})
                  </h3>
                  <div className="space-y-2">
                    {recentlyUpdatedApplications.map((app: any) => (
                      <div key={app.id} className="text-sm text-blue-800">
                        Your application for "{app.project.title}" was{" "}
                        <span className={`font-semibold ${
                          app.status === 'APPROVED' ? 'text-green-700' : 
                          app.status === 'REJECTED' ? 'text-red-700' : 'text-yellow-700'
                        }`}>
                          {app.status.toLowerCase()}
                        </span>
                        {" "}on {new Date(app.updatedAt).toLocaleDateString()} at{" "}
                        {new Date(app.updatedAt).toLocaleTimeString()}
                        {app.status === 'APPROVED' && (
                          <Link
                            to={`/chat/${app.id}`}
                            className="ml-2 text-green-600 hover:text-green-700 underline"
                          >
                            Start chatting →
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notifications for project owners about new applications */}
              {recentApplicationsToMyProjects.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    📝 New Applications to Your Projects ({recentApplicationsToMyProjects.length})
                  </h3>
                  <div className="space-y-2">
                    {recentApplicationsToMyProjects.map((app: any) => (
                      <div key={app.id} className="text-sm text-green-800">
                        <span className="font-semibold">{app.freelancer.name}</span> applied to "{app.project?.title || 'your project'}" 
                        {" "}on {new Date(app.createdAt).toLocaleDateString()} at{" "}
                        {new Date(app.createdAt).toLocaleTimeString()}
                        <Link
                          to={`/projects/${app.project?.id || app.projectId}`}
                          className="ml-2 text-green-600 hover:text-green-700 underline"
                        >
                          Review application →
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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
                    <div className="flex justify-between items-center">                      <div>
                        <h3 className="font-medium">{chat.projectTitle}</h3>
                        <p className="text-gray-600 text-sm">With: {chat.otherUserName}</p>
                        {chat.lastMessage && (
                          <p className="text-gray-500 text-xs mt-1">
                            Last: {chat.lastMessage.slice(0, 50)}...
                          </p>
                        )}
                      </div>
                      <Link
                        to={`/chat/${chat.applicationId}`}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                      >
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                        Open Chat
                      </Link>
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
                        <p className="text-gray-600 text-sm">Client: {application.project.owner.name}</p>                        <p className="text-sm mt-1">
                          <span className="font-medium">Your Bid:</span> ${application.proposedBudget} | 
                          <span className="font-medium"> Status:</span> 
                          <span className={`ml-1 px-2 py-1 rounded text-xs ${
                            application.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            application.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {application.status}
                            {/* Show if recently updated */}
                            {new Date(application.updatedAt).getTime() > new Date(application.createdAt).getTime() && 
                             new Date(application.updatedAt).getTime() > (Date.now() - 24 * 60 * 60 * 1000) && (
                              <span className="ml-1 text-xs">🆕</span>
                            )}
                          </span>
                        </p>
                      </div>                      <div className="flex space-x-2">                        <Link
                          to={`/projects/${application.project.id}`}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                        >
                          View Project
                        </Link>
                        {application.status === 'APPROVED' && (
                          <Link
                            to={`/chat/${application.id}`}
                            className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                          >
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                            </svg>
                            Chat
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}          </div>        </div>
      </div>      {/* Chat Box */}
    </div>
  );
}