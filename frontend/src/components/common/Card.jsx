import React from 'react';
import './Card.css';

/**
 * Government-themed Card Component
 * @param {string} variant - 'default', 'elevated', 'outline', 'info'
 * @param {boolean} clickable - Makes card hoverable/clickable
 * @param {string} title - Optional card title
 * @param {string} icon - Optional emoji or icon
 */
function Card({ 
  children, 
  variant = 'default',
  clickable = false,
  title = null,
  icon = null,
  className = '',
  onClick,
  ...props 
}) {
  const cardClass = [
    'gov-card',
    `gov-card--${variant}`,
    clickable ? 'gov-card--clickable' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={cardClass}
      onClick={clickable ? onClick : undefined}
      {...props}
    >
      {(title || icon) && (
        <div className="gov-card__header">
          {icon && <span className="gov-card__icon">{icon}</span>}
          {title && <h3 className="gov-card__title">{title}</h3>}
        </div>
      )}
      <div className="gov-card__content">
        {children}
      </div>
    </div>
  );
}

export default Card;
