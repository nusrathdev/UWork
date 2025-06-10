import { useState } from 'react';
import { useNavigate } from 'remix';
import Button from '~/components/ui/Button';
import Card from '~/components/ui/Card';

const NewProject = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const projectData = { title, description };

    // Call API to create a new project
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectData),
    });

    if (response.ok) {
      navigate('/projects');
    } else {
      // Handle error
      console.error('Failed to create project');
    }
  };

  return (
    <Card title="Create New Project">
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            Title:
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
        </div>
        <div>
          <label>
            Description:
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </label>
        </div>
        <Button label="Create Project" type="submit" />
      </form>
    </Card>
  );
};

export default NewProject;