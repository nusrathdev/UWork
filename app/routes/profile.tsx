import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import React from 'react';
import { useLoaderData, Link, Form, useFetcher } from '@remix-run/react';
import { getUserSession } from '~/utils/auth.server';
import { getUserById, updateUser } from '../models/user.server';
export async function action({ request }: ActionFunctionArgs) {
  const url = new URL(request.url);
  if (url.searchParams.get('inlineEdit') === '1') {
    const session = await getUserSession(request);
    const userId = session.get("userId");
    if (!userId || typeof userId !== "string") {
      return json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const bio = formData.get('bio') as string;
    const skills = formData.get('skills') as string;
    try {
      await updateUser(userId, { name, bio, skills });
      return json({ success: true, message: "Profile updated!" });
    } catch (error) {
      return json({ success: false, message: "Failed to update profile." }, { status: 400 });
    }
  }
  return json({ success: false, message: "Invalid request" }, { status: 400 });
}
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { SkillSelector } from '../components/ui/SkillSelector';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const session = await getUserSession(request);
    const userId = session.get("userId");
    
    if (!userId || typeof userId !== "string") {
      throw new Response("Unauthorized", { status: 401 });
    }
    const user = await getUserById(userId);
    
    if (!user) {
      throw new Response('User not found', { status: 404 });
    }

    // Simple stats for now
    const stats = {
      completedProjects: 0,
      totalEarnings: 0,
      averageRating: 4.5,
      totalReviews: 0
    };

    return json({
      user,
      stats,
      recentWork: []
    });
  } catch (error) {
    console.error('Profile loader error:', error);
    // For debugging, let's return a simple response if there's an error
    return json({
      user: {
        name: 'Test User',
        email: 'test@example.com',
        course: 'Computer Science',
        university: 'Test University',
        studentId: 'TEST123',
        bio: 'This is a test profile',
        skills: 'JavaScript, React, Node.js',
        year: 3
      },
      stats: {
        completedProjects: 0,
        totalEarnings: 0,
        averageRating: 4.5,
        totalReviews: 0
      },
      recentWork: []
    });
  }
}

export default function Profile() {
  const { user, stats, recentWork } = useLoaderData<typeof loader>();
  const [editMode, setEditMode] = React.useState(false);
  const [formState, setFormState] = React.useState({
    name: user.name,
    bio: user.bio || '',
    skills: user.skills ? user.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : []
  });
  const fetcher = useFetcher();
  const skillsArray = editMode ? formState.skills : (user.skills ? user.skills.split(',').map((s: string) => s.trim()) : []);

  // Handle input changes
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  }
  function handleSkillsChange(skills: string[]) {
    setFormState({ ...formState, skills });
  }

  // Handle save (submit form)
  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    // Save as comma-separated string for backend
    fetcher.submit({ ...formState, skills: formState.skills.join(',') }, { method: 'post', action: '/profile?inlineEdit=1' });
  }

  // If fetcher is done and successful, exit edit mode
  React.useEffect(() => {
    if (fetcher.data && typeof fetcher.data === 'object' && 'success' in fetcher.data && fetcher.data.success) {
      setEditMode(false);
    }
  }, [fetcher.data]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
            {editMode ? (
              <div className="space-x-2">
                <button
                  className="inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 px-4 py-2 text-sm"
                  onClick={handleSave}
                  disabled={fetcher.state === 'submitting'}
                >
                  Save
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gray-400 hover:bg-gray-500 text-white focus:ring-gray-500 px-4 py-2 text-sm"
                  onClick={() => {
                    setEditMode(false);
                    setFormState({
                      name: user.name,
                      bio: user.bio || '',
                      skills: user.skills ? user.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : []
                    });
                  }}
                  disabled={fetcher.state === 'submitting'}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 px-4 py-2 text-sm"
                onClick={() => setEditMode(true)}
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {fetcher.data && typeof fetcher.data === 'object' && 'message' in fetcher.data && (
          <div className={`mb-6 p-4 rounded-md ${'success' in fetcher.data && fetcher.data.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            {fetcher.data.message as string}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Overview */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                {editMode ? (
                  <input
                    type="text"
                    name="name"
                    value={formState.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-2xl font-bold text-gray-900 mb-2"
                  />
                ) : (
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{user.name}</h2>
                )}
                <p className="text-gray-600 mb-2">{user.course} Student</p>
                <p className="text-sm text-gray-500 mb-4">{user.university}</p>
                
                <div className="flex items-center justify-center mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-5 h-5 ${i < Math.floor(stats.averageRating || 0) ? 'fill-current' : 'fill-gray-300'}`}
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-gray-600">
                    {(stats.averageRating || 0).toFixed(1)} ({stats.totalReviews} reviews)
                  </span>
                </div>

                {editMode ? (
                  <textarea
                    name="bio"
                    value={formState.bio}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm leading-relaxed mt-2"
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  user.bio && (
                    <p className="text-gray-700 text-sm leading-relaxed">{user.bio}</p>
                  )
                )}
              </div>

              {/* Quick Stats */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{stats.completedProjects}</div>
                    <div className="text-sm text-gray-500">Projects</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">Rs.{stats.totalEarnings.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">Earned</div>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Contact Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    {user.email}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                    </svg>
                    {user.studentId}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Skills Section */}
            <Card className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Skills</h3>
              {editMode ? (
                <SkillSelector
                  value={formState.skills}
                  onChange={handleSkillsChange}
                  placeholder="Add a skill..."
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skillsArray.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
              {!editMode && skillsArray.length === 0 && (
                <p className="text-gray-500 text-sm">No skills added yet.</p>
              )}
            </Card>

            {/* Work History Section */}
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Work History</h3>
                <span className="text-sm text-gray-500">
                  {stats.completedProjects} completed projects
                </span>
              </div>
              
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No completed projects</h3>
                <p className="mt-1 text-sm text-gray-500">Start applying to projects to build your work history.</p>
                <div className="mt-6">
                  <Link to="/projects">
                    <Button variant="primary">
                      Browse Projects
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>

            {/* Education Section */}
            <Card className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Education</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900">{user.course}</h4>
                    <p className="text-gray-600">{user.university}</p>
                    <p className="text-sm text-gray-500">Year {user.year}</p>
                    <p className="text-sm text-gray-500">Student ID: {user.studentId}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}