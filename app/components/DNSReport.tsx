import type { DNSResult } from "@/app/types";

interface DNSReportProps {
  dns: DNSResult | null;
}

export default function DNSReport({ dns }: DNSReportProps) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        DNS Records
      </h3>
      {dns ? (
        <div className="space-y-4">
          <div className="flex gap-3">
            <Badge label="SPF" present={dns.hasSPF} />
            <Badge label="DMARC" present={dns.hasDMARC} />
          </div>

          {dns.a.length > 0 && (
            <RecordSection label="A Records" values={dns.a} />
          )}
          {dns.aaaa.length > 0 && (
            <RecordSection label="AAAA Records" values={dns.aaaa} />
          )}
          {dns.mx.length > 0 && (
            <RecordSection
              label="MX Records"
              values={dns.mx.map((r) => `${r.exchange} (priority: ${r.priority})`)}
            />
          )}
          {dns.ns.length > 0 && (
            <RecordSection label="NS Records" values={dns.ns} />
          )}
          {dns.txt.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                TXT Records
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1 scrollbar-thin">
                {dns.txt.map((t, i) => (
                  <p key={i} className="text-xs text-gray-400 font-mono break-all bg-gray-800 px-2 py-1 rounded">
                    {t}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">DNS information unavailable.</p>
      )}
    </div>
  );
}

function Badge({ label, present }: { label: string; present: boolean }) {
  return (
    <span
      className={`text-xs font-semibold px-3 py-1 rounded-full ${
        present
          ? "bg-green-900/50 text-green-400 border border-green-700"
          : "bg-red-900/50 text-red-400 border border-red-700"
      }`}
    >
      {label}: {present ? "Found" : "Missing"}
    </span>
  );
}

function RecordSection({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <div className="space-y-1">
        {values.map((v, i) => (
          <p key={i} className="text-sm text-gray-300 font-mono">{v}</p>
        ))}
      </div>
    </div>
  );
}
