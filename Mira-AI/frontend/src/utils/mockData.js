// Mock user data
export const mockUsers = {
  'test@example.com': {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123'
  }
};

// Mock analysis data
export const mockAnalyses = [
  {
    id: '1',
    projectName: 'E-commerce Platform',
    projectType: 'webapp',
    legacyTech: 'php',
    traffic: 'high',
    concurrentUsers: 5000,
    repoUrl: 'https://github.com/example/ecommerce',
    status: 'completed',
    createdAt: '2026-01-05T10:00:00Z',
    updatedAt: '2026-01-05T14:30:00Z',
    selectedStack: 'django',
    integrations: {
      stripe: true,
      redis: true,
      email: true,
      other: 'AWS S3'
    }
  },
  {
    id: '2',
    projectName: 'Customer Portal',
    projectType: 'webapp',
    legacyTech: 'aspnet',
    traffic: 'medium',
    concurrentUsers: 1000,
    repoUrl: 'https://github.com/example/portal',
    status: 'converting',
    createdAt: '2026-01-04T09:00:00Z',
    updatedAt: '2026-01-06T11:20:00Z',
    selectedStack: 'django'
  }
];

// Mock analysis reports
export const mockReports = {
  '1': {
    analysisId: '1',
    projectHealth: 'medium',
    deprecatedDependencies: [
      { name: 'PHP 5.6', severity: 'high', recommendation: 'Upgrade to PHP 8+' },
      { name: 'MySQL 5.5', severity: 'medium', recommendation: 'Upgrade to MySQL 8.0' },
      { name: 'jQuery 1.x', severity: 'medium', recommendation: 'Replace with modern JavaScript' }
    ],
    securityIssues: [
      { type: 'SQL Injection', severity: 'critical', location: 'user.php:45' },
      { type: 'XSS Vulnerability', severity: 'high', location: 'comments.php:123' },
      { type: 'CSRF Token Missing', severity: 'medium', location: 'forms.php:89' }
    ],
    databaseIssues: [
      { issue: 'Missing indexes on foreign keys', impact: 'performance' },
      { issue: 'No query optimization', impact: 'scalability' },
      { issue: 'Deprecated storage engine', impact: 'compatibility' }
    ],
    migrationComplexity: 'medium',
    estimatedEffort: '4-6 weeks'
  },
  '2': {
    analysisId: '2',
    projectHealth: 'good',
    deprecatedDependencies: [
      { name: '.NET Framework 4.5', severity: 'high', recommendation: 'Migrate to .NET 6+' }
    ],
    securityIssues: [
      { type: 'Weak Authentication', severity: 'high', location: 'AuthController.cs:67' }
    ],
    databaseIssues: [
      { issue: 'N+1 query patterns detected', impact: 'performance' }
    ],
    migrationComplexity: 'low',
    estimatedEffort: '2-3 weeks'
  }
};

// Stack recommendations
export const stackRecommendations = {
  php: {
    recommended: 'django',
    alternatives: ['fastapi', 'nestjs'],
    reason: 'Django provides similar MVC architecture with better security and modern Python ecosystem'
  },
  aspnet: {
    recommended: 'django',
    alternatives: ['fastapi', 'nestjs'],
    reason: 'Django offers comparable enterprise features with cross-platform compatibility'
  },
  dotnet: {
    recommended: 'django',
    alternatives: ['fastapi', 'nestjs'],
    reason: 'Django provides robust ORM and admin interface similar to .NET ecosystem'
  }
};

// Mock reports list for Reports Dashboard
export const mockReportsList = [
  {
    id: 'rpt-001',
    projectName: 'E-commerce Platform',
    reportType: 'OWASP',
    status: 'completed',
    createdAt: '2026-01-05T10:00:00Z',
    updatedAt: '2026-01-08T14:30:00Z',
    author: 'Test User',
    findings: 12,
    critical: 3
  },
  {
    id: 'rpt-002',
    projectName: 'Customer Portal',
    reportType: 'Generic',
    status: 'draft',
    createdAt: '2026-01-04T09:00:00Z',
    updatedAt: '2026-01-08T11:20:00Z',
    author: 'Test User',
    findings: 8,
    critical: 1
  },
  {
    id: 'rpt-003',
    projectName: 'Mobile Banking App',
    reportType: 'PCI',
    status: 'completed',
    createdAt: '2026-01-03T14:30:00Z',
    updatedAt: '2026-01-07T16:45:00Z',
    author: 'Security Team',
    findings: 15,
    critical: 5
  },
  {
    id: 'rpt-004',
    projectName: 'HR Management System',
    reportType: 'ISO',
    status: 'failed',
    createdAt: '2026-01-02T08:00:00Z',
    updatedAt: '2026-01-02T09:15:00Z',
    author: 'Audit Team',
    findings: 0,
    critical: 0
  },
  {
    id: 'rpt-005',
    projectName: 'Internal Dashboard',
    reportType: 'Generic',
    status: 'draft',
    createdAt: '2026-01-01T13:00:00Z',
    updatedAt: '2026-01-06T10:30:00Z',
    author: 'Test User',
    findings: 5,
    critical: 0
  },
  {
    id: 'rpt-006',
    projectName: 'API Gateway',
    reportType: 'OWASP',
    status: 'completed',
    createdAt: '2025-12-30T11:00:00Z',
    updatedAt: '2026-01-04T15:20:00Z',
    author: 'DevOps Team',
    findings: 20,
    critical: 8
  },
  {
    id: 'rpt-007',
    projectName: 'Analytics Platform',
    reportType: 'Generic',
    status: 'completed',
    createdAt: '2025-12-28T16:00:00Z',
    updatedAt: '2026-01-03T12:00:00Z',
    author: 'Test User',
    findings: 10,
    critical: 2
  }
];

// Dev: Arafat Uddin - 2026-04-03

// Dev: Shanjoy Kanti - 2026-05-31
