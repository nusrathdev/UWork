import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { getUsers } from '~/utils/db.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const users = await getUsers();
  return json(users);
};

export const action = async ({ request }: LoaderFunctionArgs) => {
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