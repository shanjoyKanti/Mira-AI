/**
 * Language, Framework, and Version Configuration - synced with backend version_ladder.py
 */

export const SUPPORTED_LANGUAGES = {
  php: {
    name: 'PHP',
    icon: '🐘',
    versions: [
      '4.0','4.1','4.2','4.3','4.4',
      '5.0','5.1','5.2','5.3','5.4','5.5','5.6',
      '7.0','7.1','7.2','7.3','7.4',
      '8.0','8.1','8.2','8.3','8.4','8.5',
    ],
    frameworks: ['Laravel', 'Symfony', 'CodeIgniter', 'Yii'],
    description: 'Server-side scripting language',
  },
  python: {
    name: 'Python',
    icon: '🐍',
    versions: ['3.5','3.6','3.7','3.8','3.9','3.10','3.11','3.12','3.13','3.14'],
    frameworks: ['Django', 'Flask', 'FastAPI', 'Pyramid'],
    description: 'General-purpose high-level language',
  },
  javascript: {
    name: 'JavaScript / Node.js',
    icon: '⚡',
    versions: ['14','16','18','20','21','22'],
    frameworks: ['React', 'Angular', 'Vue', 'Next.js', 'NestJS', 'Svelte', 'Express', 'Nuxt.js'],
    description: 'Multi-platform scripting language',
  },
  typescript: {
    name: 'TypeScript',
    icon: '📘',
    versions: [
      '3.8','3.9',
      '4.0','4.1','4.2','4.3','4.4','4.5','4.6','4.7','4.8','4.9',
      '5.0','5.1','5.2','5.3','5.4','5.5','5.6','5.7',
    ],
    frameworks: ['React', 'Angular', 'Next.js', 'NestJS', 'Vue'],
    description: 'Typed superset of JavaScript',
  },
  java: {
    name: 'Java',
    icon: '☕',
    versions: ['11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26'],
    frameworks: ['Spring Boot', 'Spring Framework', 'Jakarta EE', 'Quarkus'],
    description: 'Enterprise-grade object-oriented language',
  },
  dotnet: {
    name: '.NET',
    icon: '🔷',
    versions: ['4.7.2','4.8','5.0','6.0','7.0','8.0','9.0','10.0'],
    frameworks: ['ASP.NET Core', 'Entity Framework Core', 'Blazor'],
    description: 'Microsoft .NET platform',
  },
  csharp: {
    name: 'C#',
    icon: '🎮',
    versions: ['9.0','10.0','11.0','12.0','13.0','14.0'],
    frameworks: ['ASP.NET Core', 'Entity Framework Core', 'Blazor'],
    description: 'Modern object-oriented language by Microsoft',
  },
  golang: {
    name: 'Go (Golang)',
    icon: '🐹',
    versions: ['1.17','1.18','1.19','1.20','1.21','1.22','1.23','1.24','1.25','1.26'],
    frameworks: ['Gin', 'Echo', 'Fiber', 'Beego'],
    description: 'Compiled language for concurrent programming',
  },
  kotlin: {
    name: 'Kotlin',
    icon: '🎯',
    versions: ['1.5','1.6','1.7','1.8','1.9','2.0','2.1'],
    frameworks: ['Ktor', 'Kotlin Multiplatform', 'Jetpack Compose'],
    description: 'Modern JVM language with Java interoperability',
  },
  rust: {
    name: 'Rust',
    icon: '🦀',
    versions: ['1.50','1.60','1.65','1.70','1.75','1.80','1.85','1.88'],
    frameworks: ['Actix Web', 'Axum', 'Rocket'],
    description: 'Memory-safe systems programming language',
  },
  scala: {
    name: 'Scala',
    icon: '🔺',
    versions: ['2.11','2.12','2.13','3.0','3.1','3.2','3.3','3.4'],
    frameworks: ['Play Framework', 'Apache Pekko (Akka)'],
    description: 'Functional and object-oriented JVM language',
  },
  swift: {
    name: 'Swift',
    icon: '🐦',
    versions: ['5.0','5.1','5.2','5.3','5.4','5.5','5.6','5.7','5.8','5.9','6.0'],
    frameworks: ['Vapor', 'UIKit'],
    description: 'Apple iOS/macOS programming language',
  },
  dart: {
    name: 'Dart / Flutter',
    icon: '🎯',
    versions: ['2.0','2.5','2.10','2.15','2.17','2.18','2.19','3.0','3.1','3.2','3.3','3.4'],
    frameworks: ['Flutter'],
    description: 'Google Dart language & Flutter framework',
  },
  elixir: {
    name: 'Elixir',
    icon: '💜',
    versions: ['1.10','1.11','1.12','1.13','1.14','1.15','1.16'],
    frameworks: ['Phoenix'],
    description: 'Functional language on the Erlang VM',
  },
  haskell: {
    name: 'Haskell',
    icon: '🔣',
    versions: ['8.8','8.10','9.0','9.2','9.4','9.6','9.8','9.10'],
    frameworks: [],
    description: 'Purely functional programming language',
  },
};

/**
 * Version Ladders - step-by-step migration paths (synced with backend version_ladder.py)
 */
export const VERSION_LADDERS = {
  php: {
    name: 'PHP Version Ladder',
    ladder: [
      '4.0','4.1','4.2','4.3','4.4',
      '5.0','5.1','5.2','5.3','5.4','5.5','5.6',
      '7.0','7.1','7.2','7.3','7.4',
      '8.0','8.1','8.2','8.3','8.4','8.5',
    ],
  },
  laravel: {
    name: 'Laravel Framework Ladder',
    ladder: ['4.2','5.0','5.1','5.2','5.3','5.4','5.5','5.6','5.7','5.8','6','7','8','9','10','11','12'],
  },
  symfony: {
    name: 'Symfony Ladder',
    ladder: ['4.4','5.0','5.4','6.0','6.4','7.0','7.2','7.4','8.0'],
  },
  python: {
    name: 'Python Version Ladder',
    ladder: ['3.5','3.6','3.7','3.8','3.9','3.10','3.11','3.12','3.13','3.14'],
  },
  django: {
    name: 'Django Framework Ladder',
    ladder: ['3.0','3.1','3.2','4.0','4.1','4.2','5.0','5.1','5.2','6.0'],
  },
  javascript: {
    name: 'Node.js Version Ladder',
    ladder: ['14','16','18','20','21','22'],
  },
  react: { name: 'React Ladder', ladder: ['15','16','17','18','19'] },
  angular: { name: 'Angular Ladder', ladder: ['12','13','14','15','16','17','18','19','20','21'] },
  vue: { name: 'Vue.js Ladder', ladder: ['2','3','3.1','3.2','3.3','3.4'] },
  nextjs: { name: 'Next.js Ladder', ladder: ['11','12','13','14','15'] },
  nestjs: { name: 'NestJS Ladder', ladder: ['8','9','10','11'] },
  typescript: {
    name: 'TypeScript Ladder',
    ladder: ['3.8','3.9','4.0','4.1','4.2','4.3','4.4','4.5','4.6','4.7','4.8','4.9','5.0','5.1','5.2','5.3','5.4','5.5','5.6','5.7'],
  },
  java: { name: 'Java Version Ladder', ladder: ['11','17','21','25','26'] },
  springboot: { name: 'Spring Boot Ladder', ladder: ['2.5','2.6','2.7','3.0','3.1','3.2','3.3','3.4','3.5','4.0'] },
  dotnet: { name: '.NET Ladder', ladder: ['4.7.2','4.8','5.0','6.0','7.0','8.0','9.0','10.0'] },
  csharp: { name: 'C# Ladder', ladder: ['9.0','10.0','11.0','12.0','13.0','14.0'] },
  golang: { name: 'Go Ladder', ladder: ['1.17','1.18','1.19','1.20','1.21','1.22','1.23','1.24','1.25','1.26'] },
  kotlin: { name: 'Kotlin Ladder', ladder: ['1.5','1.6','1.7','1.8','1.9','2.0','2.1'] },
  rust: { name: 'Rust Ladder', ladder: ['1.50','1.55','1.60','1.65','1.70','1.75','1.80','1.85','1.88'] },
  scala: { name: 'Scala Ladder', ladder: ['2.11','2.12','2.13','3.0','3.1','3.2','3.3','3.4'] },
  swift: { name: 'Swift Ladder', ladder: ['5.0','5.1','5.2','5.3','5.4','5.5','5.6','5.7','5.8','5.9','6.0'] },
  dart: { name: 'Dart Ladder', ladder: ['2.0','2.5','2.10','2.15','2.17','2.18','2.19','3.0','3.1','3.2','3.3','3.4'] },
  elixir: { name: 'Elixir Ladder', ladder: ['1.10','1.11','1.12','1.13','1.14','1.15','1.16'] },
};

/** Get intermediate version steps from fromVersion to toVersion inclusive */
export const getVersionLadder = (language, fromVersion, toVersion) => {
  const key = language?.toLowerCase();
  const ladder = VERSION_LADDERS[key]?.ladder || [];
  if (!ladder.length) return [fromVersion, toVersion].filter(Boolean);
  const fromIdx = ladder.indexOf(fromVersion);
  const toIdx = ladder.indexOf(toVersion);
  if (fromIdx === -1 || toIdx === -1) return [fromVersion, toVersion].filter(Boolean);
  return ladder.slice(fromIdx, toIdx + 1);
};

export const getSupportedLanguages = () => Object.keys(SUPPORTED_LANGUAGES);

export const getFrameworksForLanguage = (language) =>
  (SUPPORTED_LANGUAGES[language?.toLowerCase()]?.frameworks || []);

export const getVersionsForLanguage = (language) =>
  (SUPPORTED_LANGUAGES[language?.toLowerCase()]?.versions || []);

export const getLanguageDetails = (language) =>
  SUPPORTED_LANGUAGES[language?.toLowerCase()] || null;

export const formatVersionLadder = (ladder) => ladder.join(' → ');

/** Map backend language keys → display names */
export const LANGUAGE_DISPLAY_NAMES = {
  php: 'PHP', python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript',
  java: 'Java', dotnet: '.NET', csharp: 'C#', golang: 'Go', kotlin: 'Kotlin',
  rust: 'Rust', scala: 'Scala', swift: 'Swift', dart: 'Dart', elixir: 'Elixir',
  haskell: 'Haskell', r: 'R', julia: 'Julia', cobol: 'COBOL', fortran: 'Fortran',
};

export const REPORT_TYPES = [
  {
    id: 'generic_security',
    label: 'Generic Security Analysis',
    description: 'Comprehensive security assessment covering all common vulnerabilities',
    icon: '🔒',
  },
  {
    id: 'owasp_top_10',
    label: 'OWASP Top 10',
    description: 'Analysis against the OWASP Top 10 security risks',
    icon: '🛡️',
  },
  {
    id: 'pci_dss',
    label: 'PCI DSS Compliance',
    description: 'Payment Card Industry Data Security Standard compliance check',
    icon: '💳',
  },
  {
    id: 'iso_27001',
    label: 'ISO 27001',
    description: 'Information security management system standard assessment',
    icon: '📋',
  },
  {
    id: 'project_analysis',
    label: 'Project Analysis',
    description: 'Comprehensive codebase analysis including architecture and quality',
    icon: '🔍',
  },
];

// Updated by Arafat Uddin on 2026-03-01
// Added: New feature implementation

// Updated by Mohiuzzaman Anik on 2026-04-23
// Added: New feature implementation

// Updated by Arafat Uddin on 2026-05-09
// Added: New feature implementation

// Dev: Moshiur Rahman - 2026-05-12
