import type { HeadersResult } from "@/app/types";

const HEADER_LABELS: Record<string, string> = {
  "strict-transport-security": "Strict-Transport-Security",
  "content-security-policy": "Content-Security-Policy",
  "x-frame-options": "X-Frame-Options",
  "x-content-type-options": "X-Content-Type-Options",
  "x-xss-protection": "X-XSS-Protection",
  "referrer-policy": "Referrer-Policy",
  "permissions-policy": "Permissions-Policy",
};

interface HeadersReportProps {
  headers: HeadersResult;
}

export default function HeadersReport({ headers }: HeadersReportProps) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        HTTP Security Headers
      </h3>
      <div className="space-y-2">
        {Object.entries(headers).map(([key, { present, value }]) => (
          <div key={key} className="flex items-start gap-3 py-2 border-b border-gray-800 last:border-0">
            <span className={`mt-0.5 text-lg ${present ? "text-green-400" : "text-red-400"}`}>
              {present ? "✓" : "✗"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200">
                {HEADER_LABELS[key] || key}
              </p>
              {present && value && (
                <p className="text-xs text-gray-500 font-mono truncate mt-0.5">{value}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
