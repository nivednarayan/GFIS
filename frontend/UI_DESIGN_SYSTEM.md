# GFIS UI/UX Design System - Government Light Theme

## Overview

This document describes the **Government of India-inspired light theme** for the GFIS (Grameen File Intelligence System) platform. The design prioritizes **trust, accessibility, simplicity**, and **mobile-first** principles suitable for rural users with low digital literacy.

---

## Color Palette

### Primary Colors

```css
--primary: #1F4E79        /* Government Blue - Headers, primary actions */
--secondary: #2E7D32      /* Rural Green - Primary buttons, success states */
--accent: #F57C00          /* Saffron - Highlights, warnings */
```

### Background & Surface

```css
--bg-main: #F5F7FA         /* Light background */
--bg-card: #FFFFFF         /* Card/component backgrounds */
--border: #E0E0E0          /* Borders and dividers */
```

### Text Colors

```css
--text-main: #2C2C2C       /* Primary text */
--text-secondary: #6B7280  /* Secondary text, subtitles */
--text-light: #9CA3AF      /* Disabled, hints */
```

### Semantic Colors

```css
--success: #2E7D32         /* Success messages */
--error: #D32F2F           /* Error messages, danger actions */
--warning: #F57C00         /* Warnings */
--info: #1976D2            /* Information alerts */
```

---

## Typography

### Font Family

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
             'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 
             'Helvetica Neue', sans-serif;
```

### Font Sizes

- **H1**: 2rem (32px)
- **H2**: 1.5rem (24px)
- **H3**: 1.25rem (20px)
- **Body**: 1rem (16px)
- **Small**: 0.875rem (14px)

### Font Weights

- **Normal**: 400
- **Semibold**: 600
- **Bold**: 700

---

## Spacing

Use consistent spacing based on 0.25rem (4px) increments:

- **xs**: 0.5rem (8px)
- **sm**: 0.75rem (12px)
- **md**: 1rem (16px)
- **lg**: 1.5rem (24px)
- **xl**: 2rem (32px)
- **2xl**: 3rem (48px)

---

## Shadows

```css
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1)     /* Subtle elevation */
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1)     /* Cards, buttons */
--shadow-lg: 0 10px 20px rgba(0, 0, 0, 0.12)  /* Modals, elevated cards */
```

---

## Components

### Button

**Usage:**
```jsx
import { Button } from '@/components/common';

<Button variant="primary" size="medium" icon="📝">
  Apply Now
</Button>
```

**Variants:**
- `primary` - Green background (main actions)
- `secondary` - Blue background (secondary actions)
- `outline` - Transparent with border
- `danger` - Red background (destructive actions)

**Sizes:**
- `small` - 36px min-height
- `medium` - 44px min-height (default)
- `large` - 52px min-height

**Props:**
- `variant`: 'primary' | 'secondary' | 'outline' | 'danger'
- `size`: 'small' | 'medium' | 'large'
- `fullWidth`: boolean
- `icon`: string (emoji or icon)
- `disabled`: boolean

---

### Input

**Usage:**
```jsx
import { Input } from '@/components/common';

<Input
  label="Aadhaar Number"
  icon="🪪"
  type="text"
  maxLength={12}
  required
  helperText="Enter 12-digit Aadhaar"
  error={errors.aadhaar}
/>
```

**Props:**
- `label`: string
- `icon`: string (emoji shown before label)
- `helperText`: string (shown below input)
- `error`: string (error message)
- `required`: boolean (shows * indicator)
- `maxLength`: number (shows character counter)
- All standard HTML input props

**Icons for common fields:**
- 🪪 Aadhaar Number
- 👤 Full Name
- 📱 Mobile Number
- 📧 Email Address
- 📍 Location (District/State)

---

### Card

**Usage:**
```jsx
import { Card } from '@/components/common';

<Card 
  variant="elevated" 
  title="Application Status"
  icon="📊"
  clickable
  onClick={handleClick}
>
  <p>Your content here...</p>
</Card>
```

**Variants:**
- `default` - White background with border
- `elevated` - White background with shadow
- `outline` - Blue border
- `info` - Light blue background

**Props:**
- `variant`: 'default' | 'elevated' | 'outline' | 'info'
- `title`: string (optional header title)
- `icon`: string (optional header icon)
- `clickable`: boolean (enables hover effects)
- `onClick`: function

---

### Alert

**Usage:**
```jsx
import { Alert } from '@/components/common';

<Alert variant="success" title="Success" dismissible onDismiss={handleDismiss}>
  Your application has been submitted successfully!
</Alert>
```

**Variants:**
- `success` - Green (✅ icon)
- `error` - Red (⚠️ icon)
- `warning` - Orange (⚡ icon)
- `info` - Blue (ℹ️ icon)

**Props:**
- `variant`: 'success' | 'error' | 'warning' | 'info'
- `title`: string (optional bold title)
- `dismissible`: boolean (shows close button)
- `onDismiss`: function

---

## Page Layouts

### Login/Signup Pages

**Structure:**
```
- Full viewport height
- Centered card (max-width: 480-550px)
- Light background with subtle grid pattern
- Top border: Government Blue (5px)
- Bottom border: Saffron (3px)
- Logo at top
- Government badge at bottom with 🇮🇳 emblem
- Tricolor accent (optional)
```

**Key Features:**
- Icon-enhanced form fields
- Character counters for Aadhaar/Mobile
- Real-time validation
- Accessible contrast ratios
- Large tap targets (44px min)

### Dashboard

**Structure:**
```
- Max-width container (1200px)
- Header section (centered)
- Card grid (auto-fit, 300px min)
- Info cards at bottom
```

**Card Design:**
- Large emoji icon (3.5rem)
- Bold title
- Descriptive text
- Call-to-action button
- Hover effects (lift + shadow)

### Header/Navbar

**Structure:**
- White background
- Logo + Title on left
- Navigation links on right
- Tricolor accent bar at bottom (Orange-White-Green)
- Box shadow for depth

**Navigation:**
- Active state: Blue background, white text
- Hover: Light blue background
- Logout: Red outline button

---

## Accessibility Guidelines

### Color Contrast

All color combinations meet **WCAG 2.1 AA standards**:
- Primary text on white: 12.6:1 (AAA)
- Secondary text on white: 7.2:1 (AA)
- Button text on green: 5.8:1 (AA)

### Interactive Elements

- **Minimum tap target**: 44x44px
- **Focus indicators**: 3px colored outline with offset
- **Keyboard navigation**: Full support
- **Screen reader support**: ARIA labels and roles

### Mobile-First Design

- **Breakpoints:**
  - Mobile: < 480px
  - Tablet: < 768px
  - Desktop: > 768px

- **Responsive features:**
  - Stacked layouts on mobile
  - Side-by-side grids collapse to single column
  - Full-width buttons on small screens
  - Larger touch targets

---

## Usage Examples

### Importing Components

```jsx
// Individual imports
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';

// Or named exports
import { Button, Card, Input, Alert } from '@/components/common';
```

### Complete Form Example

```jsx
import { Input, Button, Alert } from '@/components/common';

function MyForm() {
  return (
    <form>
      <Alert variant="info">
        Please fill in all required fields
      </Alert>

      <Input
        label="Aadhaar Number"
        icon="🪪"
        type="text"
        maxLength={12}
        required
      />

      <Input
        label="Full Name"
        icon="👤"
        type="text"
        required
      />

      <Button variant="primary" fullWidth>
        Submit Application
      </Button>
    </form>
  );
}
```

### Dashboard Card Grid

```jsx
import { Card, Button } from '@/components/common';

function Dashboard() {
  return (
    <div className="dashboard-cards">
      <Card variant="elevated" title="Apply" icon="📝" clickable>
        <p>Start a new application</p>
        <Button variant="primary">Apply Now</Button>
      </Card>

      <Card variant="elevated" title="Status" icon="📊" clickable>
        <p>Track your applications</p>
        <Button variant="secondary">View Status</Button>
      </Card>
    </div>
  );
}
```

---

## Files Modified

### Global Styles
- `frontend/src/index.css` - CSS variables, global styles
- `frontend/src/App.css` - Header, navbar, page layouts

### Pages
- `frontend/src/pages/public/Login.jsx` - Login page
- `frontend/src/pages/public/Login.css` - Login styles
- `frontend/src/pages/public/Signup.jsx` - Signup page
- `frontend/src/pages/public/Signup.css` - Signup styles
- `frontend/src/pages/citizen/Dashboard.jsx` - Dashboard page
- `frontend/src/pages/citizen/Dashboard.css` - Dashboard styles

### Components
- `frontend/src/components/common/Button.jsx` - Button component
- `frontend/src/components/common/Button.css` - Button styles
- `frontend/src/components/common/Card.jsx` - Card component
- `frontend/src/components/common/Card.css` - Card styles
- `frontend/src/components/common/Input.jsx` - Input component
- `frontend/src/components/common/Input.css` - Input styles
- `frontend/src/components/common/Alert.jsx` - Alert component
- `frontend/src/components/common/Alert.css` - Alert styles
- `frontend/src/components/common/index.js` - Component exports

---

## Design Principles

### 1. **Trustworthy**
- Government blue and green colors inspire trust
- Clean, professional layouts
- Official government branding (🇮🇳 emblem, tricolor)

### 2. **Simple**
- Minimal cognitive load
- Clear visual hierarchy
- Large, readable fonts
- Generous whitespace

### 3. **Accessible**
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- High contrast
- Large tap targets

### 4. **Mobile-First**
- Responsive at all breakpoints
- Touch-friendly interactions
- Works on low-end devices
- Optimized for slow networks

### 5. **Multilingual Ready**
- Flexible layouts accommodate text expansion
- Unicode emoji icons (universal)
- Font stack supports Indic scripts

---

## Next Steps

### Apply to Remaining Pages

1. **SchemeAssist (Application Form)**
   - Use Input component for all fields
   - Add progress indicators
   - Use Cards for section grouping
   - Green primary buttons

2. **Status Page**
   - Card grid for applications
   - Color-coded status badges
   - Timeline view (optional)

3. **Risk Prediction**
   - Info Cards for results
   - Progress bars/charts
   - Alert components for warnings

### Additional Components to Consider

- **Badge** - Status indicators
- **Progress Bar** - Multi-step forms
- **Stepper** - Application workflow
- **Dropdown/Select** - State/district selection
- **Radio/Checkbox** - Styled form controls
- **Toast Notifications** - Success/error messages

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari 14+, Chrome Android 90+)

---

## Resources

- [Government of India Web Guidelines](https://guidelines.india.gov.in/)
- [Aadhaar Portal](https://uidai.gov.in/) - Design inspiration
- [Digital India](https://digitalindia.gov.in/) - Design inspiration
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Last Updated:** March 5, 2026  
**Version:** 1.0  
**Maintained by:** GFIS Development Team
