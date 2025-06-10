import { useEffect, useState } from 'react';
import { Link } from 'remix';
import ProjectCard from '~/components/ProjectCard';
import { getProjects } from '~/models/project.server';

const Projects = () => {
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