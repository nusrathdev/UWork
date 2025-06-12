import { json } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import ProjectCard from '~/components/ProjectCard';
import { prisma } from '~/utils/db.server';
import type { LoaderFunctionArgs } from '@remix-run/node';

export async function loader({ request }: LoaderFunctionArgs) {
  const projects = await prisma.project.findMany({
    include: {
      owner: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });
  return json({ projects });
}

const Projects = () => {
  const { projects } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Your Projects</h1>
      <Link to="/projects/new">Create New Project</Link>
      <div className="project-list">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} onClick={() => {}} />
        ))}
      </div>
    </div>
  );
};

export default Projects;