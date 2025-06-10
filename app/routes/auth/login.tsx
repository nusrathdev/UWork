import { useState } from 'react';
import { Link } from 'remix';
import { Button } from '~/components/ui/Button';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Add login logic here
    // If login fails, setError('Login failed');
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <form onSubmit={handleSubmit} className="w-80">
        <div className="mb-4">
          <label htmlFor="email" className="block mb-2">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border rounded w-full py-2 px-3"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="password" className="block mb-2">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border rounded w-full py-2 px-3"
            required
          />
        </div>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <Button label="Login" onClick={handleSubmit} />
      </form>
      <p className="mt-4">
        Don't have an account? <Link to="/auth/register" className="text-blue-500">Register here</Link>
      </p>
    </div>
  );
};

export default Login;