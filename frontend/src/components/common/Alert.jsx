import React from 'react';
import './Alert.css';

/**
 * Government-themed Alert Component
 * @param {string} variant - 'success', 'error', 'warning', 'info'
 * @param {string} title - Optional alert title
 * @param {boolean} dismissible - Shows close button
 */
function Alert({ 
  children,
  variant = 'info',
  title = null,
  dismissible = false,
  onDismiss,
  className = '',
  ...props 
}) {
  const icons = {
    success: '✅',
    error: '⚠️',
    warning: '⚡',
    info: 'ℹ️'
  };

  return (
    <div 
      className={`gov-alert gov-alert--${variant} ${className}`}
      role="alert"
      {...props}
    >
      <div className="gov-alert__icon">{icons[variant]}</div>
      
      <div className="gov-alert__content">
        {title && <div className="gov-alert__title">{title}</div>}
        <div className="gov-alert__message">{children}</div>
      </div>

      {dismissible && (
        <button 
          className="gov-alert__close"
          onClick={onDismiss}
          aria-label="Close alert"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default Alert;
