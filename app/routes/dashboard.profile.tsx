import { useState } from 'react';
import UserProfile from '../components/UserProfile';
import Button from '../components/ui/Button';

const Profile = () => {
  const [user, setUser] = useState({
    name: '',
    email: '',
    bio: '',
  });

  const handleEdit = () => {
    // Logic to handle editing the user profile
  };

  return (
    <div className="profile-container">
      <h1>Your Profile</h1>
      <UserProfile user={user} />
      <Button label="Edit Profile" onClick={handleEdit} />
    </div>
  );
};

export default Profile;