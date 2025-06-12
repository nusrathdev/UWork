import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { getProjects } from '~/utils/db.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const projects = await getProjects();
  return json(projects);
};

export const action = async ({ request }: LoaderFunctionArgs) => {
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