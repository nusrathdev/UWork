import { json, LoaderFunction } from 'remix';
import { getProjects } from '~/models/project.server';

export const loader: LoaderFunction = async () => {
  const projects = await getProjects();
  return json(projects);
};

export const action: LoaderFunction = async ({ request }) => {
  const formData = new URLSearchParams(await request.text());
  const newProject = {
    title: formData.get('title'),
    description: formData.get('description'),
    // Add other project fields as necessary
  };
  // Logic to save the new project to the database
  // await createProject(newProject);
  return json(newProject, { status: 201 });
};