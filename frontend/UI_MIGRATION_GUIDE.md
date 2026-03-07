# GFIS UI Migration Guide

## Migrating from Old Theme to Government Light Theme

This guide helps developers update existing components to use the new government-themed design system.

---

## Quick Color Reference

### Before → After

| Old | New Variable | Color |
|-----|--------------|-------|
| `#667eea` (purple) | `var(--primary)` | #1F4E79 (blue) |
| `#764ba2` (purple) | `var(--secondary)` | #2E7D32 (green) |
| `linear-gradient(...)` | `var(--secondary)` | Solid green |
| `#f5f7fb` | `var(--bg-main)` | #F5F7FA |
| `#ffffff` | `var(--bg-card)` | #FFFFFF |
| `#333`, `#444` | `var(--text-main)` | #2C2C2C |
| `#666`, `#999` | `var(--text-secondary)` | #6B7280 |

---

## Step 1: Update CSS Variables

### Replace Direct Color Values

**Before:**
```css
.button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}
```

**After:**
```css
.button {
  background: var(--secondary);
  color: white;
}
```

### Use Standard Shadows

**Before:**
```css
.card {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}
```

**After:**
```css
.card {
  box-shadow: var(--shadow-lg);
}
```

---

## Step 2: Update Button Styles

### Old Button

**Before:**
```jsx
<button className="login-button" onClick={handleClick}>
  Login
</button>
```

```css
.login-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 0.9rem;
  border-radius: 8px;
  color: white;
}
```

### New Button

**After:**
```jsx
import { Button } from '@/components/common';

<Button variant="primary" onClick={handleClick}>
  Login
</Button>
```

Or keep custom CSS but update colors:
```css
.login-button {
  background: var(--secondary);
  padding: 1rem;
  border-radius: 6px;
  color: white;
  box-shadow: var(--shadow-sm);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
```

---

## Step 3: Update Form Inputs

### Old Input

**Before:**
```jsx
<div className="form-group">
  <label htmlFor="aadhaar">Aadhaar Number *</label>
  <input
    id="aadhaar"
    type="text"
    value={aadhaar}
    onChange={(e) => setAadhaar(e.target.value)}
  />
</div>
```

### New Input

**Option 1: Use Input Component**
```jsx
import { Input } from '@/components/common';

<Input
  label="Aadhaar Number"
  icon="🪪"
  value={aadhaar}
  onChange={(e) => setAadhaar(e.target.value)}
  maxLength={12}
  required
/>
```

**Option 2: Update Existing CSS**
```jsx
<div className="form-group aadhaar-field">
  <label htmlFor="aadhaar">Aadhaar Number *</label>
  <input
    id="aadhaar"
    type="text"
    value={aadhaar}
    onChange={(e) => setAadhaar(e.target.value)}
  />
  <span className="char-count">{aadhaar.length}/12</span>
</div>
```

Add icon styling to CSS:
```css
.form-group.aadhaar-field label::before {
  content: '🪪';
  margin-right: 0.5rem;
}
```

---

## Step 4: Update Page Backgrounds

### Login/Signup Pages

**Before:**
```css
.login-page {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

**After:**
```css
.login-page {
  background: var(--bg-main);
  position: relative;
}

/* Add subtle pattern */
.login-page::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    linear-gradient(90deg, rgba(31, 78, 121, 0.02) 1px, transparent 1px),
    linear-gradient(rgba(31, 78, 121, 0.02) 1px, transparent 1px);
  background-size: 50px 50px;
  pointer-events: none;
}
```

---

## Step 5: Update Cards

### Old Card

**Before:**
```jsx
<div className="dashboard-card">
  <h3>Apply for Schemes</h3>
  <p>Start a new application</p>
  <Link to="/apply">Apply Now</Link>
</div>
```

```css
.dashboard-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
```

### New Card

**Option 1: Use Card Component**
```jsx
import { Card, Button } from '@/components/common';

<Card variant="elevated" title="Apply for Schemes" icon="📝" clickable>
  <p>Start a new application</p>
  <Button variant="primary">Apply Now</Button>
</Card>
```

**Option 2: Update CSS**
```css
.dashboard-card {
  background: var(--bg-card);
  padding: 2rem;
  border-radius: 8px;
  box-shadow: var(--shadow-md);
  border: 2px solid var(--border);
  transition: all 0.3s ease;
}

.dashboard-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-lg);
  border-color: var(--primary);
}
```

---

## Step 6: Update Alerts/Messages

### Old Alert

**Before:**
```jsx
{error && <div className="alert alert-error">{error}</div>}
```

```css
.alert-error {
  background-color: #fef2f2;
  color: #991b1b;
  padding: 1rem;
  border-radius: 8px;
}
```

### New Alert

**Option 1: Use Alert Component**
```jsx
import { Alert } from '@/components/common';

{error && (
  <Alert variant="error">
    {error}
  </Alert>
)}
```

**Option 2: Update CSS with Icon**
```css
.alert-error {
  background-color: #FEF2F2;
  color: #991B1B;
  border-left: 5px solid var(--error);
  padding: 1rem 1.25rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.alert-error::before {
  content: '⚠️';
  font-size: 1.25rem;
}
```

---

## Step 7: Update Header/Navbar

### Add Tricolor Accent

```css
.app-header {
  position: relative;
  background: var(--bg-card);
  box-shadow: var(--shadow-sm);
}

/* Tricolor accent bar */
.app-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(
    to right,
    #FF9933 0%, #FF9933 33.33%,
    #FFFFFF 33.33%, #FFFFFF 66.66%,
    #138808 66.66%, #138808 100%
  );
}
```

### Update Navigation Links

**Before:**
```css
.app-nav a {
  color: #1f4ed8;
  background: #f0f4ff;
}
```

**After:**
```css
.app-nav a {
  color: var(--text-main);
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.app-nav a:hover {
  background: #F0F9FF;
  color: var(--primary);
  border-color: var(--primary);
}

.app-nav a.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
```

---

## Step 8: Add Government Branding Elements

### Logo Enhancement

```jsx
<div className="header-logo">
  <img src={logo} alt="GFIS Logo" />
  <div>
    <h1>GFIS</h1>
    <small>Government of India</small>
  </div>
</div>
```

### Add Government Badge

```jsx
<div className="gov-badge">
  <p>
    <span className="emblem">🇮🇳</span>
    <span>Government of India Portal</span>
  </p>
</div>
```

```css
.gov-badge {
  text-align: center;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 2px solid var(--border);
}

.gov-badge p {
  color: var(--text-light);
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.gov-badge .emblem {
  font-size: 1.5rem;
}
```

---

## Step 9: Update Border Styles

### Card/Container Borders

**Before:**
```css
border-top: 4px solid #667eea;
```

**After:**
```css
border-top: 5px solid var(--primary);
border-bottom: 3px solid var(--accent); /* Optional saffron accent */
```

---

## Step 10: Mobile Responsiveness

Ensure all components are mobile-friendly:

```css
@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    gap: 1rem;
  }

  .dashboard-cards {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .page {
    padding: 1.5rem;
  }

  .card-button {
    width: 100%;
  }
}
```

---

## Common Patterns

### Complete Login Page Example

```jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input, Button, Alert } from '@/components/common';
import logo from '@/assets/logo.png';
import './Login.css';

function Login() {
  const [aadhaar, setAadhaar] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <section className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-logo">
            <img src={logo} alt="GFIS Logo" />
          </div>
          
          <h2>Citizen Login</h2>
          <p className="login-subtitle">Access GFIS Services with Aadhaar</p>

          {error && <Alert variant="error">{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <Input
              label="Aadhaar Number"
              icon="🪪"
              type="text"
              value={aadhaar}
              onChange={(e) => setAadhaar(e.target.value)}
              maxLength={12}
              required
            />

            <Button 
              variant="primary" 
              type="submit" 
              fullWidth 
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="login-footer">
            <p>Don't have an account? <Link to="/signup">Sign up</Link></p>
          </div>

          <div className="gov-badge">
            <p>
              <span className="emblem">🇮🇳</span>
              <span>Government of India Portal</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
```

---

## Checklist

Use this checklist when migrating a component:

- [ ] Replace purple gradients with solid green (`var(--secondary)`)
- [ ] Update all colors to use CSS variables
- [ ] Replace shadows with standard variables (`var(--shadow-*)`)
- [ ] Add icon emojis to form labels
- [ ] Update border colors (`var(--border)`, `var(--primary)`)
- [ ] Add government branding (🇮🇳, tricolor)
- [ ] Ensure mobile responsiveness
- [ ] Test accessibility (keyboard nav, screen reader)
- [ ] Use uppercase + letter-spacing for buttons
- [ ] Add hover effects (transform, shadow)
- [ ] Verify WCAG AA color contrast
- [ ] Update button min-height to 44px

---

## Testing

After migration, test:

1. **Visual appearance** - Matches government theme
2. **Responsiveness** - Works on mobile (320px+)
3. **Accessibility** - Keyboard navigation, screen reader
4. **Color contrast** - All text meets WCAG AA
5. **Touch targets** - Minimum 44x44px
6. **Browser compatibility** - Chrome, Firefox, Safari, Edge

---

## Questions?

Refer to:
- [UI_DESIGN_SYSTEM.md](./UI_DESIGN_SYSTEM.md) - Complete design system documentation
- `frontend/src/index.css` - CSS variable definitions
- `frontend/src/components/common/` - Reusable components

---

**Last Updated:** March 5, 2026
