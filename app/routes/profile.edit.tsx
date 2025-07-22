import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { useLoaderData, Form, useActionData, Link } from '@remix-run/react';
import { getUserSession } from '~/utils/auth.server';
import { getUserById, updateUser } from '../models/user.server';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  
  if (!userId || typeof userId !== "string") {
    throw new Response("Unauthorized", { status: 401 });
  }
  
  const user = await getUserById(userId);
  
  if (!user) {
    throw new Response('User not found', { status: 404 });
  }

  return json({ user });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  
  if (!userId || typeof userId !== "string") {
    throw new Response("Unauthorized", { status: 401 });
  }
  
  const formData = await request.formData();
  
  const name = formData.get('name') as string;
  const bio = formData.get('bio') as string;
  const skills = formData.get('skills') as string;
  
  try {
    await updateUser(userId, {
      name,
      bio,
      skills,
    });
    
    return json({ success: true, message: 'Profile updated successfully!' });
  } catch (error) {
    return json({ success: false, message: 'Failed to update profile. Please try again.' }, { status: 400 });
  }
}

export default function EditProfile() {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
            <Link to="/profile">
              <Button variant="secondary">
                Back to Profile
              </Button>
            </Link>
          </div>
        </div>

        {/* Success/Error Messages */}
        {actionData?.message && (
          <div className={`mb-6 p-4 rounded-md ${
            actionData.success 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {actionData.message}
          </div>
        )}

        {/* Edit Form */}
        <Card className="p-6">
          <Form method="post" className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    defaultValue={user.name}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email (Read-only)
                  </label>
                  <input
                    type="email"
                    id="email"
                    defaultValue={user.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Education Information (Read-only) */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Education Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="university" className="block text-sm font-medium text-gray-700 mb-2">
                    University (Read-only)
                  </label>
                  <input
                    type="text"
                    id="university"
                    defaultValue={user.university}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                  />
                </div>

                <div>
                  <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-2">
                    Course (Read-only)
                  </label>
                  <input
                    type="text"
                    id="course"
                    defaultValue={user.course}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                  />
                </div>

                <div>
                  <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-2">
                    Student ID (Read-only)
                  </label>
                  <input
                    type="text"
                    id="studentId"
                    defaultValue={user.studentId}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                  />
                </div>

                <div>
                  <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
                    Year (Read-only)
                  </label>
                  <input
                    type="number"
                    id="year"
                    defaultValue={user.year}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                rows={4}
                defaultValue={user.bio || ''}
                placeholder="Tell us about yourself, your experience, and what makes you unique..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Write a brief description about yourself and your expertise.
              </p>
            </div>

            {/* Skills */}
            <div>
              <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-2">
                Skills
              </label>
              <input
                type="text"
                id="skills"
                name="skills"
                defaultValue={user.skills}
                placeholder="JavaScript, React, Node.js, Python, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter your skills separated by commas.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
              >
                Save Changes
              </Button>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
}
