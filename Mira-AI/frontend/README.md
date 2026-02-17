# MIRA AI - Legacy Software Modernization Platform

A professional SaaS web application for analyzing and modernizing legacy software projects. Built with React 18, Tailwind CSS, and React Router.

## Features

### 🎯 Complete Analysis Flow (5 Steps)

1. **Landing Page** - Marketing page with feature highlights
2. **Authentication** - Login, Signup, and Password Reset
3. **Dashboard** - Overview of analyses and quick actions
4. **Step 1: Project Input** - Legacy project details submission
5. **Step 2: Analysis** - Automated code analysis with detailed report
6. **Step 3: Stack Selection** - Choose target stack and integrations
7. **Step 4: Conversion** - Automated code conversion process
8. **Step 5: Testing** - Automated testing and validation
9. **Step 6: Download** - Download converted code and documentation

### 🛠 Tech Stack

- **React 18** - Modern React with hooks
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Context API** - Global state management
- **Vite** - Fast build tool and dev server

### 📦 Project Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── DashboardLayout.jsx
│   │   ├── PublicLayout.jsx
│   │   ├── Navbar.jsx
│   │   └── Sidebar.jsx
│   ├── ui/
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Card.jsx
│   │   ├── Badge.jsx
│   │   ├── Select.jsx
│   │   ├── TextArea.jsx
│   │   ├── FileUpload.jsx
│   │   ├── Checkbox.jsx
│   │   ├── Alert.jsx
│   │   ├── Loading.jsx
│   │   └── ProgressBar.jsx
│   └── ProtectedRoute.jsx
├── contexts/
│   ├── AuthContext.jsx
│   └── AnalysisContext.jsx
├── pages/
│   ├── LandingPage.jsx
│   ├── LoginPage.jsx
│   ├── SignupPage.jsx
│   ├── ForgotPasswordPage.jsx
│   ├── DashboardPage.jsx
│   ├── NewAnalysisPage.jsx
│   ├── AnalyzingPage.jsx
│   ├── AnalysisReportPage.jsx
│   ├── StackSelectionPage.jsx
│   ├── ConversionPage.jsx
│   ├── TestingPage.jsx
│   ├── DownloadPage.jsx
│   ├── ReportsPage.jsx
│   └── SettingsPage.jsx
├── utils/
│   ├── mockData.js
│   ├── validation.js
│   └── format.js
├── App.jsx
├── main.jsx
└── index.css
```

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Usage

### Authentication

The app uses mock authentication. Any email/password combination will work for login. User sessions are stored in localStorage.

```javascript
// Mock login - any credentials work
email: test@example.com
password: password123
```

### Analysis Flow

1. **Create Account** - Sign up or login
2. **Start Analysis** - Click "Start New Analysis" from dashboard
3. **Fill Form** - Provide project details, repo URL, traffic info
4. **Wait for Analysis** - Automated analysis takes ~10 seconds (mocked)
5. **Review Report** - Edit and customize analysis findings
6. **Select Stack** - Choose Django (MVP), configure integrations
7. **Conversion** - Automated conversion process (~15 seconds)
8. **Testing** - Automated test execution
9. **Download** - Get converted code and documentation

### Backend Integration Points

All backend integration points are clearly marked with comments:

```javascript
// TODO: Replace with actual API call
// const response = await fetch('/api/endpoint', { method: 'POST', body: data });
```

Key integration points:

- **AuthContext.jsx** - Login, signup, password reset
- **AnalysisContext.jsx** - All analysis operations
- File uploads (documentation, database backups)
- Download functionality

## UI Components

### Reusable Components

All UI components are in `src/components/ui/`:

- **Button** - Multiple variants (primary, secondary, outline, ghost, danger)
- **Input** - Text input with validation and error states
- **Select** - Dropdown with disabled options support
- **TextArea** - Multi-line text input
- **Card** - Container with consistent styling
- **Badge** - Status indicators with color variants
- **Alert** - Notification messages
- **FileUpload** - Drag-and-drop file upload
- **ProgressBar** - Progress indicator
- **Loading** - Loading spinner and full-screen loader

### Layouts

- **PublicLayout** - For landing, login, signup pages
- **DashboardLayout** - For authenticated pages with sidebar

## State Management

### AuthContext

Manages user authentication state:

```javascript
const { user, login, signup, logout, isAuthenticated } = useAuth();
```

### AnalysisContext

Manages analysis workflow:

```javascript
const { 
  currentAnalysis, 
  startAnalysis, 
  getAnalysisReport,
  saveStackSelection,
  startConversion,
  runTests,
  getDownloadLinks 
} = useAnalysis();
```

## Styling

### Tailwind Configuration

Custom theme with primary color palette:

```javascript
primary: {
  50: '#f0f9ff',
  // ... through 900
}
```

### Custom CSS Classes

- `.btn-primary` - Primary button style
- `.btn-secondary` - Secondary button style
- `.input-field` - Form input style
- `.card` - Card container style

## Routes

### Public Routes

- `/` - Landing page
- `/login` - Login page
- `/signup` - Signup page
- `/forgot-password` - Password reset

### Protected Routes

- `/dashboard` - Main dashboard
- `/analysis/new` - Create new analysis
- `/analysis/:id/analyzing` - Analysis in progress
- `/analysis/:id/report` - Analysis report
- `/analysis/:id/stack-selection` - Stack selection
- `/analysis/:id/converting` - Code conversion
- `/analysis/:id/testing` - Testing phase
- `/analysis/:id/download` - Download results
- `/reports` - All reports
- `/settings` - User settings

## Mock Data

All mock data is in `src/utils/mockData.js`:

- Mock users
- Mock analyses
- Mock analysis reports
- Stack recommendations

## Validation

Client-side validation utilities in `src/utils/validation.js`:

- Email validation
- Password validation
- URL validation
- Form validation

## Design Philosophy

### Professional & Clean

- Minimal use of emojis (only in non-critical UI elements)
- Consistent spacing and typography
- Linear/Vercel/Stripe-inspired design
- Professional color scheme
- Clear visual hierarchy

### Responsive Design

- Desktop-first approach
- Tablet-friendly layouts
- Mobile considerations in flex/grid layouts

### Accessibility

- Semantic HTML
- Proper labels and ARIA attributes
- Keyboard navigation support
- Focus states on interactive elements

## Development Notes

### No Backend Required

Everything runs client-side with mock data. Perfect for:

- UI/UX testing
- Frontend development
- Prototype demonstrations
- Design reviews

### Easy Backend Integration

All backend calls are mocked with clear TODO comments. Simply:

1. Find the TODO comment
2. Replace mock code with actual fetch/axios call
3. Handle responses appropriately

### Performance

- Fast load times with Vite
- Code splitting with React Router
- Optimized Tailwind CSS (production build)

## Future Enhancements

- FastAPI and NestJS stack options
- Mobile app project types
- Desktop app project types
- Advanced customization options
- Team collaboration features
- Real-time conversion updates
- Analytics dashboard

---

Built with modern React for legacy software modernization
