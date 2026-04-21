export interface HeaderCheck {
  present: boolean;
  value: string | null;
}

export interface HeadersResult {
  [headerName: string]: HeaderCheck;
}

export interface SSLResult {
  issuer: string;
  subject: string;
  validFrom: string;
  validTo: string;
  daysUntilExpiry: number;
  protocol: string;
}

export interface MXRecord {
  exchange: string;
  priority: number;
}

export interface DNSResult {
  a: string[];
  aaaa: string[];
  mx: MXRecord[];
  ns: string[];
  txt: string[];
  hasSPF: boolean;
  hasDMARC: boolean;
}

export interface ScanResult {
  url: string;
  headers: HeadersResult;
  ssl: SSLResult | null;
  dns: DNSResult | null;
  grade: string;
  score: number;
  maxScore: number;
  scannedAt: string;
}
