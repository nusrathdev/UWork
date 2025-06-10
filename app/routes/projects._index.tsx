import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link, Form, useSearchParams } from "@remix-run/react";
import { getUserId } from "~/utils/auth.server";
import { db } from "~/utils/db.server";

interface LoaderData {
  projects: Array<{
    id: string;
    title: string;
    description: string;
    budget: number;
    deadline: string;
    skills: string[];
    status: string;
    createdAt: string;
    owner: {
      id: string;
      name: string;
      university: string;
      rating: number;
    };
    _count: {
      applications: number;
    };
  }>;
  currentUserId: string | null;
}

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const skill = url.searchParams.get("skill") || "";
  const minBudget = url.searchParams.get("minBudget") || "";
  const maxBudget = url.searchParams.get("maxBudget") || "";

  const currentUserId = await getUserId(request);

  const whereClause: any = {
    status: "OPEN",
  };

  if (search) {
    whereClause.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (skill) {
    whereClause.skills = {
      has: skill,
    };
  }

  if (minBudget && !isNaN(Number(minBudget))) {
    whereClause.budget = {
      ...whereClause.budget,
      gte: Number(minBudget),
    };
  }

  if (maxBudget && !isNaN(Number(maxBudget))) {
    whereClause.budget = {
      ...whereClause.budget,
      lte: Number(maxBudget),
    };
  }

  const projectsRaw = await db.project.findMany({
    where: whereClause,
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          university: true,
          rating: true,
        },
      },
      _count: {
        select: {
          applications: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const projects = projectsRaw.map((project) => ({
    ...project,
    createdAt: project.createdAt.toISOString(),
    deadline: project.deadline.toISOString(),
    skills: Array.isArray(project.skills)
      ? project.skills
      : typeof project.skills === "string"
        ? project.skills.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [],
  }));

  return json<LoaderData>({
    projects,
    currentUserId,
  });
};

export default function Projects() {
  const { projects, currentUserId } = useLoaderData<LoaderData>();
  const [searchParams] = useSearchParams();

  const commonSkills = [
    "Web Development",
    "Mobile Development",
    "UI/UX Design",
    "Graphic Design",
    "Content Writing",
    "Data Analysis",
    "Photography",
    "Video Editing",
    "Social Media",
    "Tutoring",
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Browse Projects</h1>
        <p className="mt-2 text-gray-600">Find freelance opportunities from fellow students</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <Form method="get" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                Search
              </label>
              <input
                type="text"
                id="search"
                name="search"
                defaultValue={searchParams.get("search") || ""}
                placeholder="Search projects..."
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="skill" className="block text-sm font-medium text-gray-700">
                Skill
              </label>
              <select
                id="skill"
                name="skill"
                defaultValue={searchParams.get("skill") || ""}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Skills</option>
                {commonSkills.map((skill) => (
                  <option key={skill} value={skill}>
                    {skill}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="minBudget" className="block text-sm font-medium text-gray-700">
                Min Budget
              </label>
              <input
                type="number"
                id="minBudget"
                name="minBudget"
                defaultValue={searchParams.get("minBudget") || ""}
                placeholder="0"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="maxBudget" className="block text-sm font-medium text-gray-700">
                Max Budget
              </label>
              <input
                type="number"
                id="maxBudget"
                name="maxBudget"
                defaultValue={searchParams.get("maxBudget") || ""}
                placeholder="1000"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
            >
              Apply Filters
            </button>
          </div>
        </Form>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div key={project.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                  {project.title}
                </h3>
                <span className="text-lg font-bold text-green-600">
                  ${project.budget}
                </span>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {project.description}
              </p>

              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {project.skills.slice(0, 3).map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                  {project.skills.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      +{project.skills.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                <span>Deadline: {new Date(project.deadline).toLocaleDateString()}</span>
                <span>{project._count.applications} applications</span>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">{project.owner.name}</p>
                  <p className="text-xs text-gray-500">{project.owner.university}</p>
                  <div className="flex items-center">
                    <span className="text-yellow-400">★</span>
                    <span className="text-xs text-gray-600 ml-1">
                      {project.owner.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
                <Link
                  to={`/projects/${project.id}`}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  View Details
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No projects found matching your criteria.</p>
          <Link
            to="/projects/new"
            className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium"
          >
            Post the First Project
          </Link>
        </div>
      )}
    </div>
  );
}