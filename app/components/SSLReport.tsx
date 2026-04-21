import type { SSLResult } from "@/app/types";

interface SSLReportProps {
  ssl: SSLResult | null;
}

export default function SSLReport({ ssl }: SSLReportProps) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        SSL / TLS Certificate
      </h3>
      {ssl ? (
        <div className="space-y-3">
          <Row label="Subject" value={ssl.subject} />
          <Row label="Issuer" value={ssl.issuer} />
          <Row label="Protocol" value={ssl.protocol} />
          <Row label="Valid From" value={ssl.validFrom} />
          <Row label="Valid To" value={ssl.validTo} />
          <div className="flex justify-between items-center py-2 border-b border-gray-800">
            <span className="text-sm text-gray-400">Days Until Expiry</span>
            <span
              className={`text-sm font-mono font-semibold ${
                ssl.daysUntilExpiry > 60
                  ? "text-green-400"
                  : ssl.daysUntilExpiry > 30
                  ? "text-yellow-400"
                  : "text-red-400"
              }`}
            >
              {ssl.daysUntilExpiry}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">SSL certificate information unavailable.</p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-800">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm text-gray-200 font-mono text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
