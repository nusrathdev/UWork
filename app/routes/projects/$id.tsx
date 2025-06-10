import { useLoaderData } from 'remix';
import { getProject } from '~/models/project.server';

export const loader = async ({ params }) => {
  const projectId = params.id;
  const project = await getProject(projectId);
  if (!project) {
    throw new Response('Project not found', { status: 404 });
  }
  return project;
};

export default function ProjectDetail() {
  const project = useLoaderData();

  return (
    <div>
      <h1>{project.title}</h1>
      <p>{project.description}</p>
      <p>Posted by: {project.user.name}</p>
      <p>Budget: {project.budget}</p>
      <p>Deadline: {project.deadline}</p>
      {/* Additional project details can be displayed here */}
    </div>
  );
}