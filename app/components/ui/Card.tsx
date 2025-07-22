import React from 'react';

interface CardProps {
  title?: string;
  content?: string;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ 
  title, 
  content, 
  footer, 
  children, 
  className = '' 
}) => {
  const baseClasses = 'bg-white shadow-sm rounded-lg border border-gray-200';
  const finalClassName = `${baseClasses} ${className}`;

  return (
    <div className={finalClassName}>
      {title && (
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>
      )}
      
      {content && (
        <div className="px-4 py-3">
          <p className="text-gray-700">{content}</p>
        </div>
      )}
      
      {children && (
        <div className={title || content ? '' : 'w-full h-full'}>
          {children}
        </div>
      )}
      
      {footer && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;