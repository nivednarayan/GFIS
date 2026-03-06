import React from 'react';
import './Input.css';

/**
 * Government-themed Input Component
 * @param {string} label - Input label
 * @param {string} icon - Emoji or icon to display
 * @param {string} helperText - Helper text below input
 * @param {string} error - Error message
 * @param {boolean} required - Shows required indicator
 * @param {number} maxLength - Character limit (shows counter if provided)
 */
function Input({ 
  label,
  icon = null,
  helperText = null,
  error = null,
  required = false,
  maxLength = null,
  value = '',
  id,
  className = '',
  ...props 
}) {
  const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  const showCharCount = maxLength && (props.type === 'text' || props.type === 'tel');

  return (
    <div className={`gov-input ${className}`}>
      {label && (
        <label htmlFor={inputId} className="gov-input__label">
          {icon && <span className="gov-input__icon">{icon}</span>}
          {label}
          {required && <span className="gov-input__required">*</span>}
        </label>
      )}
      
      <div className="gov-input__wrapper">
        <input
          id={inputId}
          className={`gov-input__field ${error ? 'gov-input__field--error' : ''}`}
          value={value}
          maxLength={maxLength}
          required={required}
          {...props}
        />
        {showCharCount && (
          <span className="gov-input__count">
            {value.length}/{maxLength}
          </span>
        )}
      </div>

      {error && (
        <span className="gov-input__error">⚠️ {error}</span>
      )}
      
      {helperText && !error && (
        <span className="gov-input__helper">{helperText}</span>
      )}
    </div>
  );
}

export default Input;
