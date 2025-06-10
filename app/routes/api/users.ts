import { json, LoaderFunction } from 'remix';
import { getUsers } from '~/models/user.server';

export const loader: LoaderFunction = async () => {
  const users = await getUsers();
  return json(users);
};

export const action: LoaderFunction = async ({ request }) => {
  const formData = new URLSearchParams(await request.text());
  const userData = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  };
  
  // Add logic to create a new user
  // await createUser(userData);

  return json({ success: true });
};