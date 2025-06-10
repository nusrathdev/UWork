import React from 'react';

interface UserProfileProps {
  user: {
    name: string;
    email: string;
    bio?: string;
    profilePicture?: string;
  };
}

const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  return (
    <div className="user-profile">
      {user.profilePicture && (
        <img src={user.profilePicture} alt={`${user.name}'s profile`} className="profile-picture" />
      )}
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      {user.bio && <p className="bio">{user.bio}</p>}
    </div>
  );
};

export default UserProfile;