import React from 'react';

interface Project {
  id: string;
  title: string;
  description: string;
  budget: number;
  deadline: string;
}

interface ProjectCardProps {
  project: Project;
  onClick: (id: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  return (
    <div className="border rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow duration-200" onClick={() => onClick(project.id)}>
      <h3 className="text-lg font-semibold">{project.title}</h3>
      <p className="text-gray-700">{project.description}</p>
      <div className="mt-2">
        <span className="text-sm text-gray-500">Budget: ${project.budget}</span>
        <span className="text-sm text-gray-500 ml-4">Deadline: {project.deadline}</span>
      </div>
    </div>
  );
};

export default ProjectCard;