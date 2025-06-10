import { useEffect, useState } from 'react';
import { Link } from 'remix';
import { getProjects } from '~/models/project.server';
import ProjectCard from '~/components/ProjectCard';

const ProjectsIndex = () => {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const fetchProjects = async () => {
      const data = await getProjects();
      setProjects(data);
    };

    fetchProjects();
  }, []);

  return (
    <div>
      <h1>Available Projects</h1>
      <div className="project-list">
        {projects.map((project) => (
          <Link to={`/projects/${project.id}`} key={project.id}>
            <ProjectCard project={project} />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ProjectsIndex;