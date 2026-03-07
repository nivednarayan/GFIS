import React from 'react';
import './Button.css';

/**
 * Government-themed Button Component
 * @param {string} variant - 'primary', 'secondary', 'outline', 'danger'
 * @param {string} size - 'small', 'medium', 'large'
 * @param {boolean} fullWidth - Makes button full width
 * @param {string} icon - Emoji or icon to display
 */
function Button({ 
  children, 
  variant = 'primary', 
  size = 'medium',
  fullWidth = false,
  icon = null,
  type = 'button',
  disabled = false,
  onClick,
  className = '',
  ...props 
}) {
  const buttonClass = [
    'gov-button',
    `gov-button--${variant}`,
    `gov-button--${size}`,
    fullWidth ? 'gov-button--full' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button 
      type={type}
      className={buttonClass}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {icon && <span className="gov-button__icon">{icon}</span>}
      {children}
    </button>
  );
}

export default Button;
