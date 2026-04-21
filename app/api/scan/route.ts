import { NextResponse } from "next/server";
import { exec as execCb } from "child_process";
import { promisify } from "util";
import { readFile, stat } from "fs/promises";
import type {
  ScanResult,
  OpenPort,
  SSHConfig,
  FirewallConfig,
  SystemUpdate,
  RunningService,
  FilePermission,
} from "@/app/types";
import { ScanRiskLevel, PortState, ServiceState } from "@/app/types";

const exec = promisify(execCb);

async function run(cmd: string): Promise<string> {
  try {
    const { stdout } = await exec(cmd, { timeout: 5000 });
    return stdout.trim();
  } catch {
    return "";
  }
}

const RISKY_PORTS = new Set([21, 23, 25, 110, 143, 445, 3306, 5432, 6379, 27017]);

async function scanPorts(): Promise<OpenPort[]> {
  const output = await run("ss -tlnp 2>/dev/null");
  if (!output) return [];

  const ports: OpenPort[] = [];
  const lines = output.split("\n").slice(1);

  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length < 5) continue;

    const localAddr = parts[3];
    const portStr = localAddr.split(":").pop();
    if (!portStr) continue;

    const portNumber = parseInt(portStr, 10);
    if (isNaN(portNumber)) continue;

    const processMatch = line.match(/users:\(\("([^"]+)"/);
    const serviceName = processMatch?.[1] || "unknown";

    const isRisky = RISKY_PORTS.has(portNumber);

    ports.push({
      portNumber,
      serviceName,
      state: PortState.Open,
      riskLevel: isRisky ? ScanRiskLevel.High : ScanRiskLevel.Low,
      description: isRisky ? `Port ${portNumber} is commonly targeted` : undefined,
    });
  }

  return ports;
}

async function scanSSH(): Promise<SSHConfig> {
  const defaults: SSHConfig = {
    passwordAuthEnabled: true,
    rootLoginAllowed: false,
    keyBasedAuthAvailable: true,
    protocolVersion: "2",
    riskItems: [],
  };

  let content: string;
  try {
    content = await readFile("/etc/ssh/sshd_config", "utf-8");
  } catch {
    defaults.riskItems.push("Could not read SSH config");
    return defaults;
  }

  const lines = content.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));

  for (const line of lines) {
    const [key, ...rest] = line.split(/\s+/);
    const val = rest.join(" ").toLowerCase();

    if (key === "PasswordAuthentication") {
      defaults.passwordAuthEnabled = val !== "no";
    } else if (key === "PermitRootLogin") {
      defaults.rootLoginAllowed = val === "yes";
    } else if (key === "PubkeyAuthentication") {
      defaults.keyBasedAuthAvailable = val !== "no";
    } else if (key === "Protocol") {
      defaults.protocolVersion = val;
    }
  }

  if (defaults.passwordAuthEnabled) defaults.riskItems.push("Password authentication is enabled");
  if (defaults.rootLoginAllowed) defaults.riskItems.push("Root login is allowed");
  if (!defaults.keyBasedAuthAvailable) defaults.riskItems.push("Public key authentication is disabled");

  return defaults;
}

async function scanFirewall(): Promise<FirewallConfig> {
  const result: FirewallConfig = {
    isActive: false,
    defaultPolicies: { input: "UNKNOWN", output: "UNKNOWN", forward: "UNKNOWN" },
    ruleCount: 0,
    rulesList: [],
  };

  const ufwOutput = await run("sudo ufw status verbose 2>/dev/null");

  if (ufwOutput.includes("Status: active")) {
    result.isActive = true;
    const defaultLine = ufwOutput.match(/Default:\s*(.+)/);
    if (defaultLine) {
      const policies = defaultLine[1];
      if (policies.includes("deny (incoming)")) result.defaultPolicies.input = "DENY";
      else if (policies.includes("allow (incoming)")) result.defaultPolicies.input = "ALLOW";
      if (policies.includes("allow (outgoing)")) result.defaultPolicies.output = "ALLOW";
      else if (policies.includes("deny (outgoing)")) result.defaultPolicies.output = "DENY";
      if (policies.includes("deny (routed)")) result.defaultPolicies.forward = "DENY";
      else if (policies.includes("allow (routed)")) result.defaultPolicies.forward = "ALLOW";
    }

    const ruleLines = ufwOutput.split("\n").filter((l) => l.match(/^\d+|^ALLOW|^DENY|^REJECT/i));
    result.ruleCount = ruleLines.length;
    result.rulesList = ruleLines.slice(0, 20).map((l) => ({
      source: "any",
      destination: l.split(/\s+/)[0] || "",
      action: l.includes("ALLOW") ? "ALLOW" : l.includes("DENY") ? "DENY" : "REJECT",
      description: l.trim(),
    }));
    return result;
  }

  const iptOutput = await run("sudo iptables -L -n --line-numbers 2>/dev/null");
  if (iptOutput) {
    result.isActive = true;
    const inputPolicy = iptOutput.match(/Chain INPUT \(policy (\w+)\)/);
    const outputPolicy = iptOutput.match(/Chain OUTPUT \(policy (\w+)\)/);
    const forwardPolicy = iptOutput.match(/Chain FORWARD \(policy (\w+)\)/);
    if (inputPolicy) result.defaultPolicies.input = inputPolicy[1];
    if (outputPolicy) result.defaultPolicies.output = outputPolicy[1];
    if (forwardPolicy) result.defaultPolicies.forward = forwardPolicy[1];

    const ruleLines = iptOutput.split("\n").filter((l) => l.match(/^\d+/));
    result.ruleCount = ruleLines.length;
  }

  return result;
}

async function scanUpdates(): Promise<SystemUpdate> {
  const result: SystemUpdate = {
    totalPackages: 0,
    upgradableCount: 0,
    criticalUpdatesAvailable: false,
    packageList: [],
  };

  const totalOutput = await run("dpkg --list 2>/dev/null | grep '^ii' | wc -l");
  result.totalPackages = parseInt(totalOutput, 10) || 0;

  const output = await run("apt list --upgradable 2>/dev/null");
  if (!output) return result;

  const lines = output.split("\n").filter((l) => l && !l.startsWith("Listing"));
  result.upgradableCount = lines.length;
  result.packageList = lines.slice(0, 25).map((l) => l.split("/")[0]);

  const critical = ["linux-image", "openssl", "openssh", "sudo", "systemd", "glibc", "libc6"];
  result.criticalUpdatesAvailable = lines.some((l) =>
    critical.some((c) => l.toLowerCase().includes(c))
  );

  return result;
}

const RISKY_SERVICES = new Set(["telnetd", "vsftpd", "proftpd", "rsh", "rlogin", "xinetd", "avahi-daemon"]);

async function scanServices(): Promise<RunningService[]> {
  const output = await run("systemctl list-units --type=service --state=running --no-pager --no-legend 2>/dev/null");
  if (!output) return [];

  const services: RunningService[] = [];

  for (const line of output.split("\n")) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 4) continue;

    const name = parts[0].replace(".service", "");
    const isRisky = RISKY_SERVICES.has(name);

    services.push({
      serviceName: name,
      currentState: ServiceState.Running,
      enabledAtBoot: true,
      riskLevel: isRisky ? ScanRiskLevel.High : ScanRiskLevel.Low,
      description: isRisky ? `${name} is a potentially insecure service` : undefined,
    });
  }

  return services;
}

const SENSITIVE_FILES: Array<{ path: string; expected: string }> = [
  { path: "/etc/passwd", expected: "644" },
  { path: "/etc/shadow", expected: "640" },
  { path: "/etc/ssh/sshd_config", expected: "600" },
  { path: "/etc/gshadow", expected: "640" },
  { path: "/etc/crontab", expected: "644" },
];

async function scanFilePermissions(): Promise<FilePermission[]> {
  const results: FilePermission[] = [];

  for (const { path, expected } of SENSITIVE_FILES) {
    try {
      const s = await stat(path);
      const mode = (s.mode & 0o777).toString(8);
      const expectedNum = parseInt(expected, 8);
      const actualNum = parseInt(mode, 8);
      const isVulnerable = actualNum > expectedNum;

      results.push({
        path,
        currentPermissions: mode,
        expectedPermissions: expected,
        isVulnerable,
        reason: isVulnerable ? `Permissions ${mode} are more permissive than expected ${expected}` : undefined,
      });
    } catch {
      results.push({
        path,
        currentPermissions: "N/A",
        expectedPermissions: expected,
        isVulnerable: false,
        reason: "File not accessible",
      });
    }
  }

  return results;
}

function computeScore(
  ports: OpenPort[],
  ssh: SSHConfig,
  firewall: FirewallConfig,
  updates: SystemUpdate,
  services: RunningService[],
  files: FilePermission[]
): { score: number; riskLevel: ScanRiskLevel } {
  let score = 100;

  score -= ports.filter((p) => p.riskLevel === ScanRiskLevel.High).length * 5;

  if (ssh.passwordAuthEnabled) score -= 10;
  if (ssh.rootLoginAllowed) score -= 15;
  if (!ssh.keyBasedAuthAvailable) score -= 5;

  if (!firewall.isActive) score -= 20;
  else if (firewall.defaultPolicies.input === "ACCEPT" || firewall.defaultPolicies.input === "ALLOW")
    score -= 10;

  score -= Math.min(updates.upgradableCount * 2, 20);

  score -= services.filter((s) => s.riskLevel === ScanRiskLevel.High).length * 5;

  score -= files.filter((f) => f.isVulnerable).length * 10;

  score = Math.max(0, score);

  let riskLevel: ScanRiskLevel;
  if (score >= 80) riskLevel = ScanRiskLevel.Low;
  else if (score >= 60) riskLevel = ScanRiskLevel.Medium;
  else if (score >= 40) riskLevel = ScanRiskLevel.High;
  else riskLevel = ScanRiskLevel.Critical;

  return { score, riskLevel };
}

export async function GET() {
  try {
    const [hostname, osInfo, kernel] = await Promise.all([
      run("hostname"),
      run("cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 | tr -d '\"'"),
      run("uname -r"),
    ]);

    const [openPorts, sshConfig, firewallConfig, systemUpdates, runningServices, filePermissions] =
      await Promise.all([
        scanPorts(),
        scanSSH(),
        scanFirewall(),
        scanUpdates(),
        scanServices(),
        scanFilePermissions(),
      ]);

    const { score, riskLevel } = computeScore(
      openPorts,
      sshConfig,
      firewallConfig,
      systemUpdates,
      runningServices,
      filePermissions
    );

    const result: ScanResult = {
      hostname: hostname || "unknown",
      os: osInfo || "Unknown OS",
      kernel: kernel || "unknown",
      scanDate: new Date().toISOString(),
      categories: {
        openPorts,
        sshConfig,
        firewallConfig,
        systemUpdates,
        runningServices,
        filePermissions,
      },
      overallScore: score,
      riskLevel,
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
