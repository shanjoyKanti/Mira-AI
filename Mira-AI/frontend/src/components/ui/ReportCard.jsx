import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from './Badge';
import { Button } from './Button';
import api from '../../utils/api';

const RISK_BADGE = {
  Low: 'success',
  Medium: 'warning',
  High: 'danger',
  Critical: 'danger',
  'Not Applicable': 'default',
  'Not Assessed': 'default',
  'Medium Risk': 'warning',
  'Low Risk': 'success',
  'High Risk': 'danger',
  'Critical Risk': 'danger',
  'Conforming': 'success',
  'Partially Conforming': 'warning',
  'Non-Conforming': 'danger',
};

const MarkdownViewer = ({ mdPreview }) => (
  <div className="mt-6 border-t border-gray-100 pt-6 text-gray-700">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-xl font-bold text-gray-900 mb-3 mt-5 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-semibold text-gray-800 mb-2 mt-5 border-b border-gray-100 pb-1">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold text-gray-700 mb-1.5 mt-4">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-sm text-gray-700 mb-3 leading-relaxed">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside space-y-1 mb-3 text-sm text-gray-700">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-1 mb-3 text-sm text-gray-700">{children}</ol>
        ),
        li: ({ children }) => <li className="text-sm text-gray-700">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-gray-900">{children}</strong>
        ),
        em: ({ children }) => <em className="italic text-gray-600">{children}</em>,
        hr: () => <hr className="my-4 border-gray-200" />,
        table: ({ children }) => (
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full text-sm border border-gray-200 rounded-lg">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
        th: ({ children }) => (
          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-sm text-gray-700 border-b border-gray-100">{children}</td>
        ),
        tr: ({ children }) => <tr className="even:bg-gray-50">{children}</tr>,
        code: ({ children }) => (
          <code className="bg-gray-100 text-primary-700 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary-300 pl-4 italic text-gray-600 my-3">{children}</blockquote>
        ),
      }}
    >
      {mdPreview}
    </ReactMarkdown>
  </div>
);

/** Picks the right score + risk fields regardless of report type */
const getScoreInfo = (c) => {
  if (c.security_score != null) return { score: c.security_score, label: 'Security Score', risk: c.overall_risk_level };
  if (c.owasp_score != null) return { score: c.owasp_score, label: 'OWASP Score', risk: c.overall_compliance_level };
  if (c.compliance_score != null) return { score: c.compliance_score, label: 'Compliance Score', risk: c.overall_compliance_status };
  if (c.maturity_score != null) return { score: c.maturity_score, label: 'Maturity Score', risk: c.overall_conformity_level };
  return { score: null, label: 'Score', risk: null };
};

/**
 * ReportCard â€” shows a collapsible report with View / Download buttons.
 * Props:
 *   reportKey   â€” e.g. "generic_security"
 *   report      â€” single entry from analysisResult.report.security_reports[key]
 *   projectName â€” used as fallback filename
 *   reportId    â€” report.report_id; passed to GET /analyze/reports/{reportId}/download
 */
export const ReportCard = ({ reportKey, report, projectName, reportId, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [downloadingFormat, setDownloadingFormat] = useState(null);

  const handleDownload = async (format = 'html') => {
    setDownloadingFormat(format);
    try {
      const response = await api.get(`/analyze/reports/${reportId}/download`, {
        params: { format },
        responseType: 'blob',
      });
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = response.headers['content-disposition'];
      const filename = disposition
        ? disposition.split('filename=').pop().replace(/["']/g, '').trim()
        : `${report.report_label ?? reportId}.${format}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloadingFormat(null);
    }
  };

  const Spinner = () => (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white">

        {/* Report info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary-600" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{report.report_label}</p>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <Badge variant="completed">Ready</Badge>
              {(() => {
                const c = report.content ?? {};
                const { score, label, risk } = getScoreInfo(c);
                return (
                  <>
                    {risk && <Badge variant={RISK_BADGE[risk] ?? 'default'}>{risk}</Badge>}
                    {score != null && (
                      <span className="text-xs text-gray-500">
                        {label}: <strong className="text-gray-900">{score}/100</strong>
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center"
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse report' : 'View report'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span className="ml-1">{expanded ? 'Collapse' : 'View'}</span>
          </Button>

          <div className="flex items-center gap-1.5">
            {[
              { fmt: 'html', label: 'HTML' },
              { fmt: 'pdf',  label: 'PDF'  },
              { fmt: 'docx', label: 'DOCX' },
            ].map(({ fmt, label }) => (
              <Button
                key={fmt}
                variant="secondary"
                size="sm"
                className="flex items-center"
                onClick={() => handleDownload(fmt)}
                disabled={downloadingFormat !== null}
                aria-label={`Download ${report.report_label} as ${label}`}
              >
                {downloadingFormat === fmt ? <Spinner /> : <Download className="w-4 h-4" aria-hidden="true" />}
                <span className="ml-1.5">{label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Expandable markdown preview */}
      {expanded && (
        <div className="px-4 pb-6 bg-white border-t border-gray-100">
          {report.md_preview
            ? <MarkdownViewer mdPreview={report.md_preview} />
            : <p className="mt-6 text-sm text-gray-400 italic">No preview available for this report.</p>
          }
        </div>
      )}
    </div>
  );
};


// Updated by Shanjoy Kanti on 2026-03-06
// Added: New feature implementation

// Updated by Moshiur Rahman on 2026-04-02
// Added: New feature implementation
