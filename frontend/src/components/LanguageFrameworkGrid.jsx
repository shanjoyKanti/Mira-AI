import { SUPPORTED_LANGUAGES, getFrameworksForLanguage } from '../utils/languageConfig';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export const LanguageFrameworkGrid = () => {
  const [expandedLang, setExpandedLang] = useState(null);

  const toggleLanguage = (lang) => {
    setExpandedLang(expandedLang === lang ? null : lang);
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Supported Languages & Frameworks</h2>
        <p className="text-gray-600">Mira AI supports 25+ languages with 51+ major frameworks</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(SUPPORTED_LANGUAGES).map(([langKey, langData]) => {
          const frameworks = getFrameworksForLanguage(langKey);
          const isExpanded = expandedLang === langKey;

          return (
            <div
              key={langKey}
              className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition"
            >
              {/* Language Header */}
              <button
                onClick={() => toggleLanguage(langKey)}
                className="w-full p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{langData.icon}</span>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{langData.name}</p>
                    <p className="text-xs text-gray-600">{langData.description}</p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-white">
                  {/* Versions */}
                  <div className="p-4 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 mb-2">Supported Versions</p>
                    <div className="flex flex-wrap gap-2">
                      {langData.versions.map((version) => (
                        <span
                          key={version}
                          className="inline-block px-2.5 py-1 bg-blue-100 text-blue-900 text-xs font-medium rounded"
                        >
                          {version}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Frameworks */}
                  {frameworks.length > 0 ? (
                    <div className="p-4">
                      <p className="text-sm font-semibold text-gray-900 mb-2">Popular Frameworks</p>
                      <div className="flex flex-wrap gap-1.5">
                        {frameworks.slice(0, 6).map((fw) => (
                          <span key={fw} className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-medium">
                            {fw}
                          </span>
                        ))}
                        {frameworks.length > 6 && (
                          <span className="text-xs text-gray-500">+{frameworks.length - 6} more</span>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Statistics */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <p className="text-sm font-medium text-blue-900 mb-1">Supported Languages</p>
          <p className="text-3xl font-bold text-blue-900">{Object.keys(SUPPORTED_LANGUAGES).length}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
          <p className="text-sm font-medium text-purple-900 mb-1">Total Frameworks</p>
          <p className="text-3xl font-bold text-purple-900">51+</p>
        </div>
        <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-6 rounded-lg border border-pink-200">
          <p className="text-sm font-medium text-pink-900 mb-1">Version Paths</p>
          <p className="text-3xl font-bold text-pink-900">100+</p>
        </div>
      </div>
    </div>
  );
};

// Dev: Shanjoy Kanti - 2026-04-24
