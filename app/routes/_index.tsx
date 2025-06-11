import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "StudentFreelance - Connect with fellow students" },
    { name: "description", content: "A platform for students to find and offer freelance services" },
  ];
};

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Welcome to StudentFreelance
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Connect with fellow students for freelance projects
          </p>
          <div className="space-x-4">
            <Link
              to="/auth/register"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              Get Started
            </Link>
            <Link
              to="/projects"
              className="bg-white hover:bg-gray-50 text-blue-600 px-6 py-3 rounded-lg font-medium border border-blue-600"
            >
              Browse Projects
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}