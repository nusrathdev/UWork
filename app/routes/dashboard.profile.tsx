import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData, useActionData, useNavigation } from "@remix-run/react";
import { requireUserId } from "~/utils/auth.server";
import { db } from "~/utils/db.server";

interface LoaderData {
  user: {
    id: string;
    name: string;
    email: string;
    studentId: string;
    university: string;
    course: string;
    year: number;
    skills: string[];
    bio: string | null;
    rating: number;
    createdAt: string;
  };
  stats: {
    projectsPosted: number;
    projectsCompleted: number;
    applicationsSubmitted: number;
    applicationsAccepted: number;
  };
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    reviewer: {
      name: string;
      university: string;
    };
  }>;
}

interface ActionData {
  errors?: {
    name?: string;
    bio?: string;
    skills?: string;
  };
  success?: boolean;
}

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await requireUserId(request);

  const userRaw = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      studentId: true,
      university: true,
      course: true,
      year: true,
      skills: true,
      bio: true,
      rating: true,
      createdAt: true,
    },
  });

  if (!userRaw) {
    throw new Response("User not found", { status: 404 });
  }

  // Ensure skills is an array and createdAt is a string
  const user = {
    ...userRaw,
    skills: Array.isArray(userRaw.skills)
      ? userRaw.skills
      : typeof userRaw.skills === "string"
        ? userRaw.skills.split(",").map((s: string) => s.trim()).filter((s: string) => s.length > 0)
        : [],
    createdAt: typeof userRaw.createdAt === "string"
      ? userRaw.createdAt
      : userRaw.createdAt instanceof Date
        ? userRaw.createdAt.toISOString()
        : "",
  };

  // Get user statistics
  const projectsPosted = await db.project.count({
    where: { ownerId: userId },
  });

  const projectsCompleted = await db.project.count({
    where: { ownerId: userId, status: "COMPLETED" },
  });

  const applicationsSubmitted = await db.application.count({
    where: { userId },
  });

  const applicationsAccepted = await db.application.count({
    where: { userId, status: "ACCEPTED" },
  });

  // Get reviews
  const reviewsRaw = await db.review.findMany({
    where: { revieweeId: userId },
    include: {
      reviewer: {
        select: {
          name: true,
          university: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Convert createdAt to string
  const reviews = reviewsRaw.map((review) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: typeof review.createdAt === "string"
      ? review.createdAt
      : review.createdAt instanceof Date
        ? review.createdAt.toISOString()
        : "",
    reviewer: review.reviewer,
  }));

  return json<LoaderData>({
    user,
    stats: {
      projectsPosted,
      projectsCompleted,
      applicationsSubmitted,
      applicationsAccepted,
    },
    reviews,
  });
};

export const action: ActionFunction = async ({ request }) => {
  const userId = await requireUserId(request);
  const formData = await request.formData();

  const name = formData.get("name");
  const bio = formData.get("bio");
  const skillsString = formData.get("skills");

  const errors: ActionData["errors"] = {};

  if (!name || typeof name !== "string") {
    errors.name = "Name is required";
  }

  if (bio && typeof bio !== "string") {
    errors.bio = "Bio must be text";
  }

  if (!skillsString || typeof skillsString !== "string") {
    errors.skills = "Skills are required";
  }

  if (Object.keys(errors).length > 0) {
    return json<ActionData>({ errors }, { status: 400 });
  }

  const skills = typeof skillsString === "string"
    ? skillsString.split(",").map(skill => skill.trim()).filter(skill => skill.length > 0)
    : [];

  await db.user.update({
    where: { id: userId },
    data: {
      name: name as string,
      bio: bio as string || null,
      skills: skills.join(","),
    },
  });

  return json<ActionData>({ success: true });
};

export default function Profile() {
  const { user, stats, reviews } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

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
    "Translation",
    "Research",
    "Marketing",
    "Accounting",
    "Programming",
    "Project Management",
    "SEO",
    "Database Design",
    "Machine Learning",
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-2 text-gray-600">Manage your profile information and skills</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Form */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Profile Information</h2>
            </div>
            <Form method="post" className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    defaultValue={user.name}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {actionData?.errors?.name && (
                    <div className="text-red-500 text-sm mt-1">{actionData.errors.name}</div>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={user.email}
                    disabled
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label htmlFor="studentId" className="block text-sm font-medium text-gray-700">
                    Student ID
                  </label>
                  <input
                    type="text"
                    id="studentId"
                    value={user.studentId}
                    disabled
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="university" className="block text-sm font-medium text-gray-700">
                    University
                  </label>
                  <input
                    type="text"
                    id="university"
                    value={user.university}
                    disabled
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="course" className="block text-sm font-medium text-gray-700">
                    Course/Major
                  </label>
                  <input
                    type="text"
                    id="course"
                    value={user.course}
                    disabled
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                    Year of Study
                  </label>
                  <input
                    type="text"
                    id="year"
                    value={`Year ${user.year}`}
                    disabled
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  defaultValue={user.bio || ""}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Tell others about yourself, your experience, and what you're passionate about..."
                />
                {actionData?.errors?.bio && (
                  <div className="text-red-500 text-sm mt-1">{actionData.errors.bio}</div>
                )}
              </div>

              <div>
                <label htmlFor="skills" className="block text-sm font-medium text-gray-700">
                  Skills *
                </label>
                <input
                  type="text"
                  id="skills"
                  name="skills"
                  defaultValue={user.skills.join(", ")}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Web Development, UI/UX Design, JavaScript"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Enter skills separated by commas
                </p>
                {actionData?.errors?.skills && (
                  <div className="text-red-500 text-sm mt-1">{actionData.errors.skills}</div>
                )}

                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">Add Skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {commonSkills.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => {
                          const skillsInput = document.getElementById("skills") as HTMLInputElement;
                          const currentSkills = skillsInput.value.split(",").map(s => s.trim()).filter(s => s);
                          if (!currentSkills.includes(skill)) {
                            skillsInput.value = currentSkills.length > 0 
                              ? `${currentSkills.join(", ")}, ${skill}`
                              : skill;
                          }
                        }}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full border border-gray-300"
                      >
                        + {skill}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50"
                >
                  {isSubmitting ? "Updating..." : "Update Profile"}
                </button>
              </div>

              {actionData?.success && (
                <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                  Profile updated successfully!
                </div>
              )}
            </Form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats Card */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Statistics</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Projects Posted</span>
                <span className="text-sm font-medium">{stats.projectsPosted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Projects Completed</span>
                <span className="text-sm font-medium">{stats.projectsCompleted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Applications Submitted</span>
                <span className="text-sm font-medium">{stats.applicationsSubmitted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Applications Accepted</span>
                <span className="text-sm font-medium">{stats.applicationsAccepted}</span>
              </div>
              <div className="flex justify-between border-t pt-4">
                <span className="text-sm text-gray-600">Overall Rating</span>
                <div className="flex items-center">
                  <span className="text-yellow-400">★</span>
                  <span className="text-sm font-medium ml-1">{user.rating.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rating Card */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Reviews</h3>
            </div>
            <div className="p-6">
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-l-4 border-yellow-400 pl-4">
                      <div className="flex items-center space-x-1 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={`text-sm ${
                              i < review.rating ? "text-yellow-400" : "text-gray-300"
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-700 mb-2">{review.comment}</p>
                      )}
                      <div className="text-xs text-gray-500">
                        <p>{review.reviewer.name}</p>
                        <p>{review.reviewer.university}</p>
                        <p>{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No reviews yet</p>
              )}
            </div>
          </div>

          {/* Member Since */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">Member Since</h3>
              <p className="text-sm text-gray-600 mt-2">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}