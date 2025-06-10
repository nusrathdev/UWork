import React from 'react';

interface CardProps {
  title: string;
  content: string;
  footer?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, content, footer }) => {
  return (
    <div className="bg-white shadow-md rounded-lg p-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2">{content}</p>
      {footer && <div className="mt-4">{footer}</div>}
    </div>
  );
};

export default Card;