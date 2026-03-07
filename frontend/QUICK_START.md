# GFIS Government Theme - Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide shows you how to start using the new government-themed UI components immediately.

---

## 1. Import the Components

```jsx
// Import individual components
import { Button, Card, Input, Alert } from '@/components/common';

// Or import all at once
import * as UI from '@/components/common';
```

---

## 2. Basic Usage Examples

### Button

```jsx
// Primary button (green)
<Button variant="primary" onClick={handleClick}>
  Submit Application
</Button>

// With icon
<Button variant="primary" icon="📝">
  Apply Now
</Button>

// Full width
<Button variant="primary" fullWidth>
  Continue
</Button>

// Different variants
<Button variant="secondary">Secondary Action</Button>
<Button variant="outline">Cancel</Button>
<Button variant="danger">Delete</Button>

// Different sizes
<Button size="small">Small</Button>
<Button size="medium">Medium (default)</Button>
<Button size="large">Large</Button>
```

---

### Input Field

```jsx
// Simple input
<Input
  label="Full Name"
  icon="👤"
  value={name}
  onChange={(e) => setName(e.target.value)}
  required
/>

// With character counter (Aadhaar)
<Input
  label="Aadhaar Number"
  icon="🪪"
  type="text"
  value={aadhaar}
  onChange={(e) => setAadhaar(e.target.value)}
  maxLength={12}
  required
/>

// With helper text
<Input
  label="Email Address"
  icon="📧"
  type="email"
  helperText="Optional: for application updates"
/>

// With error
<Input
  label="Mobile Number"
  icon="📱"
  type="tel"
  value={mobile}
  onChange={(e) => setMobile(e.target.value)}
  maxLength={10}
  error={errors.mobile}
  required
/>
```

---

### Card

```jsx
// Basic card
<Card>
  <h3>My Content</h3>
  <p>Some text here...</p>
</Card>

// Card with title and icon
<Card title="Application Status" icon="📊">
  <p>Your application is under review</p>
</Card>

// Elevated card (more shadow)
<Card variant="elevated">
  <p>Important information</p>
</Card>

// Clickable card
<Card 
  variant="elevated" 
  clickable
  onClick={() => navigate('/apply')}
>
  <h3>Apply for Schemes</h3>
  <p>Click to start application</p>
</Card>

// Info card (blue background)
<Card variant="info">
  <p>This is informational content</p>
</Card>
```

---

### Alert

```jsx
// Success message
<Alert variant="success">
  Application submitted successfully!
</Alert>

// Error message
<Alert variant="error">
  Please fill in all required fields
</Alert>

// Warning
<Alert variant="warning">
  Your session will expire soon
</Alert>

// Info
<Alert variant="info">
  Use Aadhaar for quick verification
</Alert>

// With title
<Alert variant="success" title="Success!">
  Your application has been submitted
</Alert>

// Dismissible
<Alert 
  variant="info" 
  dismissible 
  onDismiss={() => setShowAlert(false)}
>
  This message can be closed
</Alert>
```

---

## 3. Form Example

Complete form with validation:

```jsx
import React, { useState } from 'react';
import { Input, Button, Alert } from '@/components/common';

function ApplicationForm() {
  const [formData, setFormData] = useState({
    aadhaar: '',
    fullName: '',
    mobile: '',
    email: ''
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
    // Clear error when user types
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.aadhaar || formData.aadhaar.length !== 12) {
      newErrors.aadhaar = 'Please enter valid 12-digit Aadhaar';
    }
    
    if (!formData.fullName || formData.fullName.length < 3) {
      newErrors.fullName = 'Name must be at least 3 characters';
    }
    
    if (!formData.mobile || formData.mobile.length !== 10) {
      newErrors.mobile = 'Please enter valid 10-digit mobile';
    }
    
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Submit form
    console.log('Submitting:', formData);
    setSuccess(true);
  };

  return (
    <form onSubmit={handleSubmit}>
      {success && (
        <Alert variant="success" dismissible onDismiss={() => setSuccess(false)}>
          Form submitted successfully!
        </Alert>
      )}

      <Input
        label="Aadhaar Number"
        icon="🪪"
        type="text"
        value={formData.aadhaar}
        onChange={handleChange('aadhaar')}
        maxLength={12}
        error={errors.aadhaar}
        required
      />

      <Input
        label="Full Name"
        icon="👤"
        type="text"
        value={formData.fullName}
        onChange={handleChange('fullName')}
        error={errors.fullName}
        required
      />

      <Input
        label="Mobile Number"
        icon="📱"
        type="tel"
        value={formData.mobile}
        onChange={handleChange('mobile')}
        maxLength={10}
        error={errors.mobile}
        required
      />

      <Input
        label="Email Address"
        icon="📧"
        type="email"
        value={formData.email}
        onChange={handleChange('email')}
        helperText="Optional: for email notifications"
      />

      <Button variant="primary" type="submit" fullWidth>
        Submit Application
      </Button>
    </form>
  );
}
```

---

## 4. Dashboard/Card Grid Example

```jsx
import { Card, Button } from '@/components/common';

function Dashboard() {
  return (
    <div className="dashboard">
      <h2>Welcome to GFIS</h2>
      
      <div className="dashboard-cards">
        <Card 
          variant="elevated" 
          title="Apply for Schemes" 
          icon="📝"
          clickable
        >
          <p>Discover schemes you're eligible for</p>
          <Button variant="primary">Start Application</Button>
        </Card>

        <Card 
          variant="elevated" 
          title="Application Status" 
          icon="📊"
          clickable
        >
          <p>Track your submitted applications</p>
          <Button variant="secondary">View Status</Button>
        </Card>

        <Card 
          variant="elevated" 
          title="Risk Prediction" 
          icon="🎯"
          clickable
        >
          <p>Check success probability</p>
          <Button variant="outline">Analyze</Button>
        </Card>
      </div>

      {/* Info cards */}
      <div className="info-section">
        <Card variant="info">
          <h4>🌾 About GFIS</h4>
          <p>
            GFIS helps rural citizens access government schemes 
            through AI-powered assistance.
          </p>
        </Card>
      </div>
    </div>
  );
}
```

Add this CSS for the grid:

```css
.dashboard-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
}

@media (max-width: 768px) {
  .dashboard-cards {
    grid-template-columns: 1fr;
  }
}
```

---

## 5. Common Field Icons

Use these emojis for consistent iconography:

```jsx
// Identity
🪪 Aadhaar Number
👤 Full Name / Person
📛 Name Tag

// Contact
📱 Mobile Number
📞 Phone
📧 Email
📬 Postal Address

// Location
📍 Location / District / State
🏠 Address
🏛️ Government Office

// Documents
📄 Document
📋 Application
📝 Form / Apply
📊 Status / Analytics

// Actions
✅ Success / Approved
❌ Failed / Rejected
⚠️ Warning / Alert
ℹ️ Information
🔒 Security / Privacy
🌾 Rural / Agriculture
💰 Income / Financial
🎓 Education / Scholarship
