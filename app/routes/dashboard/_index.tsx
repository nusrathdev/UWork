import { Link } from "@remix-run/react";
import Navigation from "~/components/Navigation";

export default function DashboardIndex() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
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
      </div>
    </div>
  );
}