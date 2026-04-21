export enum ScanRiskLevel {
  Critical = "CRITICAL",
  High = "HIGH",
  Medium = "MEDIUM",
  Low = "LOW",
  Info = "INFORMATIONAL",
}

export enum PortState {
  Open = "OPEN",
  Closed = "CLOSED",
  Filtered = "FILTERED",
}

export enum ServiceState {
  Running = "RUNNING",
  Stopped = "STOPPED",
  Unknown = "UNKNOWN",
}

export interface OpenPort {
  portNumber: number;
  serviceName: string;
  state: PortState;
  riskLevel: ScanRiskLevel;
  description?: string;
}

export interface SSHConfig {
  passwordAuthEnabled: boolean;
  rootLoginAllowed: boolean;
  keyBasedAuthAvailable: boolean;
  protocolVersion: string;
  riskItems: string[];
}

export interface FirewallRule {
  source: string;
  destination: string;
  action: string;
  description: string;
}

export interface FirewallConfig {
  isActive: boolean;
  defaultPolicies: {
    input: string;
    output: string;
    forward: string;
  };
  ruleCount: number;
  rulesList: FirewallRule[];
}

export interface SystemUpdate {
  totalPackages: number;
  upgradableCount: number;
  criticalUpdatesAvailable: boolean;
  packageList: string[];
}

export interface RunningService {
  serviceName: string;
  currentState: ServiceState;
  enabledAtBoot: boolean;
  riskLevel: ScanRiskLevel;
  description?: string;
}

export interface FilePermission {
  path: string;
  currentPermissions: string;
  expectedPermissions: string;
  isVulnerable: boolean;
  reason?: string;
}

export interface ScanCategories {
  openPorts: OpenPort[];
  sshConfig: SSHConfig;
  firewallConfig: FirewallConfig;
  systemUpdates: SystemUpdate;
  runningServices: RunningService[];
  filePermissions: FilePermission[];
}

export interface ScanResult {
  hostname: string;
  os: string;
  kernel: string;
  scanDate: string;
  categories: ScanCategories;
  overallScore: number;
  riskLevel: ScanRiskLevel;
}
