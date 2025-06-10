import React from 'react';

interface ButtonProps {
  onClick: () => void;
  label: string;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ onClick, label, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {label}
    </button>
  );
};

export default Button;