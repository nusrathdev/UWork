import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { requireUserId } from "~/utils/auth.server";
import { db } from "~/utils/db.server";

interface LoaderData {
  user: {
    id: string;
    name: string;
    email: string;
    university: string;
    course: string;
    year: number;
    rating: number;
  };
  stats: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalApplications: number;
  };
  recentProjects: Array<{
    id: string;
    title: string;
    budget: number;
    status: string;
    createdAt: string;
    _count: {
      applications: number;
    };
  }>;
  recentApplications: Array<{
    id: string;
    status: string;
    proposedBudget: number;
    createdAt: string;
    project: {
      id: string;
      title: string;
      budget: number;
    };
  }>;
}

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await requireUserId(request);
  
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      university: true,
      course: true,
      year: true,
      rating: true,
    },
  });

  if (!user) {
    throw new Response("User not found", { status: 404 });
  }

  // Get user statistics
  const totalProjects = await db.project.count({
    where: { ownerId: userId },
  });

  const activeProjects = await db.project.count({
    where: { ownerId: userId, status: "OPEN" },
  });

  const completedProjects = await db.project.count({
    where: { ownerId: userId, status: "COMPLETED" },
  });

  const totalApplications = await db.application.count({
    where: { userId },
  });

  // Get recent projects
  const recentProjectsRaw = await db.project.findMany({
    where: { ownerId: userId },
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { applications: true },
      },
    },
  });

  const recentProjects = recentProjectsRaw.map((project) => ({
    id: project.id,
    title: project.title,
    budget: project.budget,
    status: project.status,
    createdAt: project.createdAt.toISOString(),
    _count: project._count,
  }));

  // Get recent applications
  const recentApplicationsRaw = await db.application.findMany({
    where: { userId },
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          budget: true,
        },
      },
    },
  });

  const recentApplications = recentApplicationsRaw.map((application) => ({
    id: application.id,
    status: application.status,
    proposedBudget: application.proposedBudget,
    createdAt: application.createdAt.toISOString(),
    project: application.project,
  }));

  return json<LoaderData>({
    user,
    stats: {
      totalProjects,
      activeProjects,
      completedProjects,
      totalApplications,
    },
    recentProjects,
    recentApplications,
  });
};

export default function Dashboard() {
  const { user, stats, recentProjects, recentApplications } = useLoaderData<LoaderData>();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user.name}!
        </h1>
        <p className="mt-2 text-gray-600">
          {user.course}, Year {user.year} at {user.university}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-semibold">P</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Projects
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalProjects}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-semibold">A</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Projects
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.activeProjects}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-semibold">C</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Completed
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.completedProjects}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-semibold">A</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Applications
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalApplications}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/projects/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
          >
            Post New Project
          </Link>
          <Link
            to="/projects"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium"
          >
            Browse Projects
          </Link>
          <Link
            to="/dashboard/profile"
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium"
          >
            Edit Profile
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Projects */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Your Recent Projects</h3>
          </div>
          <div className="p-6">
            {recentProjects.length > 0 ? (
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <div key={project.id} className="border-l-4 border-blue-400 pl-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <Link
                          to={`/projects/${project.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          {project.title}
                        </Link>
                        <p className="text-sm text-gray-500">
                          Budget: ${project.budget} • {project._count.applications} applications
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(project.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        project.status === 'OPEN' ? 'bg-green-100 text-green-800' :
                        project.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                        project.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No projects yet.{" "}
                <Link to="/projects/new" className="text-blue-600 hover:text-blue-800">
                  Create your first project
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Recent Applications */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Your Recent Applications</h3>
          </div>
          <div className="p-6">
            {recentApplications.length > 0 ? (
              <div className="space-y-4">
                {recentApplications.map((application) => (
                  <div key={application.id} className="border-l-4 border-green-400 pl-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <Link
                          to={`/projects/${application.project.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          {application.project.title}
                        </Link>
                        <p className="text-sm text-gray-500">
                          Your bid: ${application.proposedBudget} (Project budget: ${application.project.budget})
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(application.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        application.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        application.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {application.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No applications yet.{" "}
                <Link to="/projects" className="text-blue-600 hover:text-blue-800">
                  Browse available projects
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}