import React from 'react';

function Button({ children, type = 'button', ...props }) {
  return (
    <button type={type} {...props}>
      {children}
    </button>
  );
}

export default Button;
