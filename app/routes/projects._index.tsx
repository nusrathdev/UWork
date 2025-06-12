import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import { prisma } from '~/utils/db.server';
import { getUserSession } from "~/utils/auth.server";
import ProjectCard from '~/components/ProjectCard';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    console.log("Projects loader starting...");
    const session = await getUserSession(request);
    const userId = session.get("userId");
    console.log("User ID from session:", userId);

    // Get user data if logged in
    let user = null;
    if (userId && typeof userId === "string") {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
      console.log("User found:", !!user);
    }

    // Load all projects with owner information
    console.log("Loading projects...");
    const projects = await prisma.project.findMany({
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        applications: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    
    console.log("Projects loaded:", projects.length);
    console.log("First project:", projects[0]);

    return json({ projects, user });
  } catch (error) {
    console.error("Projects loader error:", error);
    return json({ projects: [], user: null });
  }
}

export default function ProjectsIndex() {
  const { projects, user } = useLoaderData<typeof loader>();
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Browse Projects
            </h1>
            {user && (
              <Link
                to="/projects/new"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Post New Project
              </Link>
            )}
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg mb-4">No projects available yet.</p>
              {user && (
                <Link
                  to="/projects/new"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-block"
                >
                  Post the First Project
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project: any) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="block hover:transform hover:scale-105 transition-all duration-200"
                >
                  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {project.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {project.description}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-green-600">
                        ${project.budget}
                      </span>
                      <span className="text-sm text-gray-500">
                        {project.applications?.length || 0} applications
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-500">
                        By: {project.owner.name}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}