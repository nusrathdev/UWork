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
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Find Your Next Project
              </h1>
              <p className="text-lg text-gray-600">
                Discover opportunities that match your skills and interests
              </p>
            </div>
            {user && (
              <Link
                to="/projects/new"
                className="inline-flex items-center bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Post a Job
              </Link>
            )}
          </div>

          {/* Filters Bar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input 
                  type="text" 
                  placeholder="Search projects..." 
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option>All Categories</option>
                <option>Web Development</option>
                <option>Mobile Apps</option>
                <option>Design</option>
                <option>Writing</option>
              </select>
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option>Any Budget</option>
                <option>$0 - $500</option>
                <option>$500 - $1000</option>
                <option>$1000+</option>
              </select>
              <button className="text-green-600 hover:text-green-700 text-sm font-medium">
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">No projects available yet</h3>
              <p className="text-gray-600 mb-6">
                Be the first to post a project and start building something amazing!
              </p>
              {user && (
                <Link
                  to="/projects/new"
                  className="inline-flex items-center bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Post the First Project
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {projects.map((project: any) => (
              <div
                key={project.id}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200 hover:border-green-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <Link
                      to={`/projects/${project.id}`}
                      className="block group"
                    >
                      <h3 className="text-xl font-semibold text-gray-900 group-hover:text-green-600 transition-colors mb-2">
                        {project.title}
                      </h3>
                    </Link>
                    <p className="text-gray-600 mb-4 leading-relaxed">
                      {project.description.length > 200 
                        ? `${project.description.slice(0, 200)}...` 
                        : project.description
                      }
                    </p>
                    
                    {/* Skills Tags */}
                    {project.skills && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.skills.split(',').map((skill: string, index: number) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                          >
                            {skill.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-6 text-right">
                    <div className="text-2xl font-bold text-green-600 mb-2">
                      ${project.budget.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500 mb-4">
                      Fixed Price
                    </div>
                    <Link
                      to={`/projects/${project.id}`}
                      className="inline-flex items-center bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                      View Details
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Posted by {project.owner.name}
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {project.applications?.length || 0} proposals
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Posted {new Date(project.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}