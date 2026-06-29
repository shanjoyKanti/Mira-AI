import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
} from 'docx';
import { saveAs } from 'file-saver';

// ── helpers ────────────────────────────────────────────────────────────────

const h1 = text =>
  new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
  });

const h2 = text =>
  new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
  });

const body = text =>
  new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    spacing: { after: 120 },
  });

const bullet = text =>
  new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    bullet: { level: 0 },
    spacing: { after: 80 },
  });

const keyValue = (key, value) =>
  new Paragraph({
    children: [
      new TextRun({ text: `${key}: `, bold: true, size: 22 }),
      new TextRun({ text: value ?? '-', size: 22 }),
    ],
    spacing: { after: 100 },
  });

const divider = () =>
  new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
    spacing: { before: 200, after: 200 },
  });

// ── main builder ───────────────────────────────────────────────────────────

const buildSections = (content, reportLabel) => {
  const c = content;
  const paras = [];

  // ── Title + score ───────────────────────────────────────────────────────
  paras.push(h1(c.report_title || reportLabel));
  const score = c.security_score ?? c.owasp_score ?? c.compliance_score ?? c.maturity_score;
  const scoreLabel = c.security_score != null ? 'Security Score' : c.owasp_score != null ? 'OWASP Score' : c.compliance_score != null ? 'Compliance Score' : 'Maturity Score';
  const risk = c.overall_risk_level || c.overall_compliance_level || c.overall_compliance_status || c.overall_conformity_level;
  if (score != null || risk) {
    paras.push(new Paragraph({
      children: [
        score != null ? new TextRun({ text: `${scoreLabel}: ${score}/100`, bold: true, size: 26 }) : new TextRun({ text: '' }),
        risk ? new TextRun({ text: `   Status: ${risk}`, size: 22 }) : new TextRun({ text: '' }),
      ],
      spacing: { after: 200 },
    }));
  }

  // ── Executive summary ───────────────────────────────────────────────────
  if (c.executive_summary) {
    paras.push(h2('Executive Summary'));
    paras.push(body(c.executive_summary));
  }

  // ── Generic Security ────────────────────────────────────────────────────
  if (c.vulnerability_categories?.length) {
    paras.push(divider());
    paras.push(h2('Vulnerability Categories'));
    c.vulnerability_categories.forEach(cat => {
      paras.push(new Paragraph({
        children: [
          new TextRun({ text: cat.category, bold: true, size: 24 }),
          new TextRun({ text: `  [${cat.severity}]  ${cat.findings_count} finding(s)`, size: 20, color: '888888' }),
        ],
        spacing: { before: 160, after: 80 },
      }));
      if (cat.description) paras.push(body(cat.description));
      cat.findings?.forEach(f => paras.push(bullet(f)));
      if (cat.recommendations?.length) {
        paras.push(new Paragraph({ children: [new TextRun({ text: 'Recommendations:', bold: true, size: 22 })], spacing: { after: 60 } }));
        cat.recommendations.forEach(r => paras.push(bullet(r)));
      }
    });
  }
  if (c.best_practices_assessment?.length) {
    paras.push(divider());
    paras.push(h2('Best Practices Assessment'));
    c.best_practices_assessment.forEach(bp => paras.push(keyValue(bp.practice, `${bp.status}: ${bp.details}`)));
  }
  if (c.recommendations_summary?.length) {
    paras.push(divider());
    paras.push(h2('Recommendations'));
    c.recommendations_summary.forEach(r => {
      paras.push(new Paragraph({
        children: [new TextRun({ text: `[${r.priority}] `, bold: true, size: 22 }), new TextRun({ text: r.recommendation, size: 22 })],
        spacing: { after: 60 },
      }));
      if (r.impact) paras.push(body(`Impact: ${r.impact}`));
    });
  }
  if (c.remediation_roadmap?.length) {
    paras.push(divider());
    paras.push(h2('Remediation Roadmap'));
    c.remediation_roadmap.forEach(phase => {
      paras.push(new Paragraph({ children: [new TextRun({ text: phase.phase, bold: true, size: 22 })], spacing: { before: 120, after: 60 } }));
      phase.actions?.forEach(a => paras.push(bullet(a)));
    });
  }

  // ── OWASP Top 10 ────────────────────────────────────────────────────────
  if (c.owasp_categories?.length) {
    paras.push(divider());
    paras.push(h2('OWASP Top 10 Categories'));
    c.owasp_categories.forEach(cat => {
      paras.push(new Paragraph({
        children: [
          new TextRun({ text: `${cat.id}: ${cat.name}`, bold: true, size: 22 }),
          new TextRun({ text: `  [${cat.risk_level}] ${cat.status}`, size: 20, color: '888888' }),
        ],
        spacing: { before: 140, after: 60 },
      }));
      cat.findings?.forEach(f => paras.push(bullet(f)));
      cat.recommendations?.forEach(r => paras.push(bullet(`→ ${r}`)));
    });
  }
  if (c.remediation_priority?.length) {
    paras.push(divider());
    paras.push(h2('Remediation Priority'));
    c.remediation_priority.forEach(item => {
      paras.push(new Paragraph({ children: [new TextRun({ text: `[${item.priority}] ${item.owasp_category}`, bold: true, size: 22 })], spacing: { before: 100, after: 60 } }));
      item.actions?.forEach(a => paras.push(bullet(a)));
    });
  }

  // ── PCI DSS ──────────────────────────────────────────────────────────────
  if (c.high_risk_areas?.length) {
    paras.push(divider());
    paras.push(h2('High Risk Areas'));
    c.high_risk_areas.forEach(area => paras.push(bullet(area)));
  }
  if (c.requirements_assessment?.length) {
    paras.push(divider());
    paras.push(h2('Requirements Assessment'));
    c.requirements_assessment.forEach(req => {
      paras.push(new Paragraph({
        children: [
          new TextRun({ text: `${req.requirement_id}: ${req.requirement_name}`, bold: true, size: 22 }),
          new TextRun({ text: `  [${req.status}]`, size: 20, color: '888888' }),
        ],
        spacing: { before: 140, after: 60 },
      }));
      req.findings?.forEach(f => paras.push(bullet(f)));
      req.recommendations?.forEach(r => paras.push(bullet(`→ ${r}`)));
    });
  }
  if (c.remediation_plan?.length) {
    paras.push(divider());
    paras.push(h2('Remediation Plan'));
    c.remediation_plan.forEach(item => {
      paras.push(new Paragraph({
        children: [
          new TextRun({ text: `[${item.priority}] ${item.requirement}`, bold: true, size: 22 }),
          new TextRun({ text: `  · ${item.timeline}`, size: 20, color: '888888' }),
        ],
        spacing: { before: 100, after: 60 },
      }));
      paras.push(body(item.action));
    });
  }

  // ── ISO 27001 ─────────────────────────────────────────────────────────────
  if (c.annex_a_controls?.length) {
    paras.push(divider());
    paras.push(h2('Annex A Controls'));
    c.annex_a_controls.forEach(ctrl => {
      paras.push(new Paragraph({
        children: [
          new TextRun({ text: ctrl.control_domain, bold: true, size: 22 }),
          new TextRun({ text: `  [${ctrl.conformity_status}]`, size: 20, color: '888888' }),
        ],
        spacing: { before: 140, after: 60 },
      }));
      if (ctrl.observations) paras.push(body(ctrl.observations));
      ctrl.findings?.forEach(f => paras.push(bullet(f)));
      ctrl.recommendations?.forEach(r => paras.push(bullet(`→ ${r}`)));
    });
  }
  if (c.risk_assessment?.length) {
    paras.push(divider());
    paras.push(h2('Risk Assessment'));
    c.risk_assessment.forEach(r => {
      paras.push(new Paragraph({
        children: [
          new TextRun({ text: r.risk_area, bold: true, size: 22 }),
          new TextRun({ text: `  [${r.risk_level} Risk]  Likelihood: ${r.likelihood}  Impact: ${r.impact}`, size: 20, color: '888888' }),
        ],
        spacing: { before: 120, after: 60 },
      }));
      if (r.mitigation) paras.push(body(`Mitigation: ${r.mitigation}`));
    });
  }
  if (c.non_conformities?.length) {
    paras.push(divider());
    paras.push(h2('Non-Conformities'));
    c.non_conformities.forEach(nc => {
      paras.push(new Paragraph({
        children: [
          new TextRun({ text: `${nc.id} [${nc.type}]  `, bold: true, size: 22 }),
          new TextRun({ text: nc.description, size: 22 }),
          new TextRun({ text: `  (Ref: ${nc.control_reference})`, size: 20, color: '888888' }),
        ],
        spacing: { before: 100, after: 60 },
      }));
      if (nc.corrective_action) paras.push(body(`Corrective Action: ${nc.corrective_action}`));
    });
  }
  if (c.continual_improvement_opportunities?.length) {
    paras.push(divider());
    paras.push(h2('Continual Improvement Opportunities'));
    c.continual_improvement_opportunities.forEach(opp => paras.push(bullet(opp)));
  }

  return paras;
};

// ── public API ─────────────────────────────────────────────────────────────

/**
 * Generates and triggers a .docx download for a single security report.
 * @param {object} report  - one entry from analysisResult.report.security_reports[key]
 * @param {string} projectName
 */
export const generateReportDocx = async (report, projectName) => {
  const doc = new Document({
    creator: 'Mira AI',
    title: report.report_label,
    description: `Security report for ${projectName}`,
    sections: [
      {
        children: buildSections(report.content, report.report_label),
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const slug = (report.report_type || 'report').replace(/_/g, '-');
  const project = (projectName || 'project').replace(/\s+/g, '_').toLowerCase();
  saveAs(blob, `${project}_${slug}.docx`);
};

// Dev: Arafat Uddin - 2026-06-29
