import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { LanguageFrameworkGrid } from '../components/LanguageFrameworkGrid';
import { SUPPORTED_LANGUAGES, VERSION_LADDERS } from '../utils/languageConfig';
import { Code2, GitBranch, Zap, Shield } from 'lucide-react';

export const ReferenceGuidePage = () => {
  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Language & Framework Reference
          </h1>
          <p className="text-gray-600">
            Complete guide to all supported languages, frameworks, and version migration paths
          </p>
        </header>

        {/* Key Features */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 space-y-3">
            <div className="p-3 bg-blue-100 rounded-lg w-fit">
              <Code2 className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">25+ Languages</h3>
            <p className="text-sm text-gray-600">Support for PHP, Python, JavaScript, Java, Go, Rust, C#, Kotlin and more</p>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="p-3 bg-purple-100 rounded-lg w-fit">
              <GitBranch className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">51+ Frameworks</h3>
            <p className="text-sm text-gray-600">Laravel, Django, React, Spring Boot, and many more enterprise frameworks</p>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="p-3 bg-green-100 rounded-lg w-fit">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Stepwise Migration</h3>
            <p className="text-sm text-gray-600">Automatic version ladder enforcement - no skipping versions</p>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="p-3 bg-orange-100 rounded-lg w-fit">
              <Shield className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900">AI-Powered</h3>
            <p className="text-sm text-gray-600">RAG-based documentation and LLM-powered code transformation</p>
          </Card>
        </div>

        {/* Language & Framework Grid */}
        <Card className="p-6">
          <LanguageFrameworkGrid />
        </Card>

        {/* Version Ladders */}
        <Card className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Version Ladders</h2>
            <p className="text-gray-600 mb-6">Direct migration paths showing step-by-step version progression</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(VERSION_LADDERS).map(([key, ladder]) => (
              <div
                key={key}
                className="p-4 rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-white"
              >
                <h3 className="font-semibold text-gray-900 mb-3">{ladder.name}</h3>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {ladder.ladder.map((version, idx) => (
                      <div key={version} className="flex items-center">
                        <span className="px-3 py-1 bg-blue-100 text-blue-900 text-sm font-medium rounded-full">
                          {version}
                        </span>
                        {idx < ladder.ladder.length - 1 && (
                          <span className="mx-2 text-gray-400">→</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {ladder.ladder.length > 1 && (
                    <p className="text-xs text-gray-600 mt-2">
                      {ladder.ladder.length} step{ladder.ladder.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* How It Works */}
        <Card className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">How Mira AI Works</h2>
            <p className="text-gray-600 mb-6">The 4-step code modernization process</p>
          </div>

          <div className="space-y-4">
            <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold mr-3">
                  1
                </span>
                Structure & Language Analysis
              </h3>
              <p className="text-gray-700 mt-2">
                Scans your project structure, automatically detects the language, framework, and current version using AI and RAG patterns. Creates a version upgrade path (e.g., PHP 7.2 → 8.3).
              </p>
            </div>

            <div className="p-4 border-l-4 border-purple-500 bg-purple-50">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white text-sm font-bold mr-3">
                  2
                </span>
                Upgrade Analysis (Simple)
              </h3>
              <p className="text-gray-700 mt-2">
                Runs a SonarQube scan to identify code quality issues and analyzes them with AI to extract actionable insights and recommendations.
              </p>
            </div>

            <div className="p-4 border-l-4 border-green-500 bg-green-50">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white text-sm font-bold mr-3">
                  3
                </span>
                Upgrade Analysis (with User Input)
              </h3>
              <p className="text-gray-700 mt-2">
                Same as Step 2, but incorporates your specific requirements and focus areas (security, performance, compatibility) for more tailored improvements.
              </p>
            </div>

            <div className="p-4 border-l-4 border-orange-500 bg-orange-50">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-600 text-white text-sm font-bold mr-3">
                  4
                </span>
                Code Modernization
              </h3>
              <p className="text-gray-700 mt-2">
                LLM rewrites each file stage by stage, one version hop at a time (e.g., PHP 7.2→7.3, then 7.3→7.4). Includes syntax checking and error correction loops.
              </p>
            </div>
          </div>
        </Card>

        {/* Key Features */}
        <Card className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">🔍 Automatic Detection</h3>
              <p className="text-gray-700">
                Automatically detects language, framework, and current version using AI-powered pattern matching
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">🛡️ Staged Migration</h3>
              <p className="text-gray-700">
                Version upgrades happen one step at a time with full syntax validation at each stage
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">📚 RAG-Powered</h3>
              <p className="text-gray-700">
                Uses official migration documentation via RAG to provide accurate, version-specific guidance
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">🔄 Error Recovery</h3>
              <p className="text-gray-700">
                Automatic retry loops (up to 3x) if syntax issues are detected during transformation
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">🔐 SSH-Only</h3>
              <p className="text-gray-700">
                Your code never leaves your server. Mira downloads, transforms, and re-uploads via SSH
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">⚡ Performance Optimized</h3>
              <p className="text-gray-700">
                Caches transformation docs locally and uses vector search for fast, relevant guidance
              </p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

// Updated by Arafat Uddin on 2026-03-20
// Added: New feature implementation
