"use client";

import { useState } from "react";
import type {
  ScanResult,
  OpenPort,
  SSHConfig,
  FirewallConfig,
  SystemUpdate,
  RunningService,
  FilePermission,
} from "@/app/types";
import { ScanRiskLevel } from "@/app/types";

const riskColor: Record<string, string> = {
  CRITICAL: "text-red-400",
  HIGH: "text-orange-400",
  MEDIUM: "text-yellow-400",
  LOW: "text-green-400",
  INFORMATIONAL: "text-cyan-400",
};

const scoreBg = (s: number) =>
  s >= 80 ? "border-green-500 text-green-400" :
  s >= 60 ? "border-yellow-500 text-yellow-400" :
  s >= 40 ? "border-orange-500 text-orange-400" :
  "border-red-500 text-red-400";

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
        <span className="text-cyan-400">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function ScoreRing({ score, riskLevel }: { score: number; riskLevel: ScanRiskLevel }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4 p-8 bg-gray-900 rounded-xl border border-gray-800">
      <div className="relative w-36 h-36">
        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#1f2937" strokeWidth="8" />
          <circle
            cx="60" cy="60" r="54" fill="none"
            strokeWidth="8" strokeLinecap="round"
            className={scoreBg(score).split(" ")[0].replace("border", "stroke")}
            stroke="currentColor"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
              transition: "stroke-dashoffset 1s ease-out",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold ${scoreBg(score).split(" ")[1]}`}>{score}</span>
          <span className="text-xs text-gray-500">/100</span>
        </div>
      </div>
      <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${
        riskLevel === ScanRiskLevel.Low ? "border-green-700 bg-green-900/30 text-green-400" :
        riskLevel === ScanRiskLevel.Medium ? "border-yellow-700 bg-yellow-900/30 text-yellow-400" :
        riskLevel === ScanRiskLevel.High ? "border-orange-700 bg-orange-900/30 text-orange-400" :
        "border-red-700 bg-red-900/30 text-red-400"
      }`}>
        {riskLevel} RISK
      </span>
    </div>
  );
}

function SystemInfo({ hostname, os, kernel, scanDate }: { hostname: string; os: string; kernel: string; scanDate: string }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
      {[
        ["Hostname", hostname],
        ["OS", os],
        ["Kernel", kernel],
        ["Scanned", new Date(scanDate).toLocaleString()],
      ].map(([label, value]) => (
        <div key={label}>
          <p className="text-gray-500 text-xs uppercase tracking-wider">{label}</p>
          <p className="text-gray-200 font-mono truncate">{value}</p>
        </div>
      ))}
    </div>
  );
}

function PortsCard({ ports }: { ports: OpenPort[] }) {
  return (
    <Card title="Open Ports" icon="⚡">
      {ports.length === 0 ? (
        <p className="text-gray-500 text-sm">No listening ports detected.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {ports.map((p) => (
            <div key={p.portNumber} className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
              <div className="flex items-center gap-3">
                <span className="font-mono text-cyan-400 w-16">{p.portNumber}</span>
                <span className="text-gray-300 text-sm">{p.serviceName}</span>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${riskColor[p.riskLevel]}`}>
                {p.riskLevel}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function SSHCard({ config }: { config: SSHConfig }) {
  const checks = [
    { label: "Password Auth Disabled", pass: !config.passwordAuthEnabled },
    { label: "Root Login Blocked", pass: !config.rootLoginAllowed },
    { label: "Key-Based Auth Enabled", pass: config.keyBasedAuthAvailable },
    { label: "Protocol Version 2", pass: config.protocolVersion === "2" },
  ];

  return (
    <Card title="SSH Configuration" icon="🔐">
      <div className="space-y-2">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-3 py-1.5 border-b border-gray-800 last:border-0">
            <span className={c.pass ? "text-green-400" : "text-red-400"}>
              {c.pass ? "✓" : "✗"}
            </span>
            <span className="text-sm text-gray-300">{c.label}</span>
          </div>
        ))}
        {config.riskItems.length > 0 && (
          <div className="mt-3 p-3 bg-red-900/20 rounded-lg border border-red-800">
            <p className="text-xs text-red-400 font-semibold mb-1">Risk Items</p>
            {config.riskItems.map((r, i) => (
              <p key={i} className="text-xs text-red-300">• {r}</p>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function FirewallCard({ config }: { config: FirewallConfig }) {
  return (
    <Card title="Firewall Status" icon="🛡️">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
            config.isActive
              ? "border-green-700 bg-green-900/30 text-green-400"
              : "border-red-700 bg-red-900/30 text-red-400"
          }`}>
            {config.isActive ? "ACTIVE" : "INACTIVE"}
          </span>
          <span className="text-gray-500 text-sm">{config.ruleCount} rules</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {(["input", "output", "forward"] as const).map((dir) => (
            <div key={dir} className="bg-gray-800 rounded-lg p-2">
              <p className="text-xs text-gray-500 uppercase">{dir}</p>
              <p className={`text-sm font-mono font-semibold ${
                config.defaultPolicies[dir] === "DENY" || config.defaultPolicies[dir] === "DROP"
                  ? "text-green-400" : config.defaultPolicies[dir] === "UNKNOWN" ? "text-gray-500" : "text-orange-400"
              }`}>
                {config.defaultPolicies[dir]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function UpdatesCard({ updates }: { updates: SystemUpdate }) {
  return (
    <Card title="System Updates" icon="📦">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Total Packages</span>
          <span className="text-gray-200 font-mono">{updates.totalPackages}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Upgradable</span>
          <span className={`font-mono font-semibold ${updates.upgradableCount > 0 ? "text-yellow-400" : "text-green-400"}`}>
            {updates.upgradableCount}
          </span>
        </div>
        {updates.criticalUpdatesAvailable && (
          <div className="p-2 bg-red-900/20 rounded border border-red-800">
            <p className="text-xs text-red-400 font-semibold">⚠ Critical updates available</p>
          </div>
        )}
        {updates.packageList.length > 0 && (
          <div className="max-h-32 overflow-y-auto space-y-1">
            {updates.packageList.map((p, i) => (
              <p key={i} className="text-xs text-gray-500 font-mono">{p}</p>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function ServicesCard({ services }: { services: RunningService[] }) {
  const risky = services.filter((s) => s.riskLevel !== ScanRiskLevel.Low);
  const safe = services.filter((s) => s.riskLevel === ScanRiskLevel.Low);

  return (
    <Card title="Running Services" icon="⚙️">
      <p className="text-sm text-gray-400 mb-3">{services.length} services running</p>
      {risky.length > 0 && (
        <div className="mb-3 p-3 bg-red-900/20 rounded-lg border border-red-800">
          <p className="text-xs text-red-400 font-semibold mb-1">Risky Services</p>
          {risky.map((s) => (
            <p key={s.serviceName} className="text-xs text-red-300 font-mono">• {s.serviceName}</p>
          ))}
        </div>
      )}
      <div className="max-h-32 overflow-y-auto space-y-1">
        {safe.slice(0, 15).map((s) => (
          <p key={s.serviceName} className="text-xs text-gray-500 font-mono">{s.serviceName}</p>
        ))}
        {safe.length > 15 && (
          <p className="text-xs text-gray-600">...and {safe.length - 15} more</p>
        )}
      </div>
    </Card>
  );
}

function FilePermsCard({ files }: { files: FilePermission[] }) {
  return (
    <Card title="File Permissions" icon="📁">
      <div className="space-y-2">
        {files.map((f) => (
          <div key={f.path} className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-300 font-mono truncate">{f.path}</p>
              <p className="text-xs text-gray-500">
                {f.currentPermissions} {f.currentPermissions !== "N/A" && `(expected: ${f.expectedPermissions})`}
              </p>
            </div>
            <span className={f.isVulnerable ? "text-red-400 text-sm" : "text-green-400 text-sm"}>
              {f.isVulnerable ? "✗" : "✓"}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function Home() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function runScan() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scan");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Scan failed");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <main className="flex-1 px-4 py-12 max-w-6xl mx-auto w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-100 tracking-tight">
            Cyber<span className="text-cyan-400">Scan</span>
          </h1>
          <p className="text-gray-400 mt-2">Local Security Scanner</p>
        </div>

        <div className="max-w-md mx-auto mb-10">
          <button
            onClick={runScan}
            disabled={loading}
            className="w-full py-4 px-6 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-lg font-semibold rounded-xl transition-colors flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Scanning System...
              </>
            ) : (
              "Run Security Scan"
            )}
          </button>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ScoreRing score={result.overallScore} riskLevel={result.riskLevel} />
              <div className="md:col-span-2">
                <SystemInfo
                  hostname={result.hostname}
                  os={result.os}
                  kernel={result.kernel}
                  scanDate={result.scanDate}
                />
                <div className="mt-4 p-4 bg-gray-900 rounded-xl border border-gray-800">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Quick Summary</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-cyan-400">{result.categories.openPorts.length}</p>
                      <p className="text-xs text-gray-500">Open Ports</p>
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${result.categories.systemUpdates.upgradableCount > 0 ? "text-yellow-400" : "text-green-400"}`}>
                        {result.categories.systemUpdates.upgradableCount}
                      </p>
                      <p className="text-xs text-gray-500">Updates Pending</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-cyan-400">{result.categories.runningServices.length}</p>
                      <p className="text-xs text-gray-500">Services</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PortsCard ports={result.categories.openPorts} />
              <SSHCard config={result.categories.sshConfig} />
              <FirewallCard config={result.categories.firewallConfig} />
              <UpdatesCard updates={result.categories.systemUpdates} />
              <ServicesCard services={result.categories.runningServices} />
              <FilePermsCard files={result.categories.filePermissions} />
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-gray-600 text-sm">
        Built by Kanishk Singh
      </footer>
    </div>
  );
}
