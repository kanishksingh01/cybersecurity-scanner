import { NextRequest, NextResponse } from "next/server";
import * as tls from "tls";
import * as dns from "dns/promises";
import type { HeadersResult, SSLResult, DNSResult, ScanResult } from "@/app/types";

const SECURITY_HEADERS = [
  "strict-transport-security",
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
  "x-xss-protection",
  "referrer-policy",
  "permissions-policy",
];

function normalizeUrl(input: string): URL {
  let raw = input.trim();
  if (!/^https?:\/\//i.test(raw)) {
    raw = "https://" + raw;
  }
  return new URL(raw);
}

async function checkHeaders(url: URL): Promise<HeadersResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url.toString(), {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });

    const result: HeadersResult = {};
    for (const name of SECURITY_HEADERS) {
      const value = res.headers.get(name);
      result[name] = { present: value !== null, value };
    }
    return result;
  } catch {
    const result: HeadersResult = {};
    for (const name of SECURITY_HEADERS) {
      result[name] = { present: false, value: null };
    }
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

async function checkSSL(hostname: string): Promise<SSLResult | null> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host: hostname, port: 443, servername: hostname, timeout: 5000 },
      () => {
        try {
          const cert = socket.getPeerCertificate();
          const protocol = socket.getProtocol() || "unknown";

          if (!cert || !cert.subject) {
            socket.destroy();
            resolve(null);
            return;
          }

          const validTo = new Date(cert.valid_to);
          const daysUntilExpiry = Math.floor(
            (validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );

          resolve({
            issuer: String(cert.issuer?.O || cert.issuer?.CN || "Unknown"),
            subject: String(cert.subject?.CN || "Unknown"),
            validFrom: cert.valid_from,
            validTo: cert.valid_to,
            daysUntilExpiry,
            protocol,
          });
        } catch {
          resolve(null);
        } finally {
          socket.destroy();
        }
      }
    );

    socket.on("error", () => {
      socket.destroy();
      resolve(null);
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve(null);
    });
  });
}

async function checkDNS(hostname: string): Promise<DNSResult | null> {
  const resolver = new dns.Resolver();
  resolver.setServers(["8.8.8.8", "1.1.1.1"]);

  const withTimeout = <T>(promise: Promise<T>, fallback: T): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 3000)),
    ]);

  try {
    const [a, aaaa, mx, ns, txt] = await Promise.all([
      withTimeout(resolver.resolve4(hostname).catch(() => []), []),
      withTimeout(resolver.resolve6(hostname).catch(() => []), []),
      withTimeout(resolver.resolveMx(hostname).catch(() => []), []),
      withTimeout(resolver.resolveNs(hostname).catch(() => []), []),
      withTimeout(resolver.resolveTxt(hostname).catch(() => []), []),
    ]);

    const flatTxt = txt.map((parts) => parts.join(""));
    const hasSPF = flatTxt.some((t) => t.startsWith("v=spf1"));
    const hasDMARC = await withTimeout(
      resolver
        .resolveTxt(`_dmarc.${hostname}`)
        .then((records) =>
          records.some((parts) => parts.join("").startsWith("v=DMARC1"))
        )
        .catch(() => false),
      false
    );

    return {
      a,
      aaaa,
      mx: mx.map((r) => ({ exchange: r.exchange, priority: r.priority })),
      ns,
      txt: flatTxt,
      hasSPF,
      hasDMARC,
    };
  } catch {
    return null;
  }
}

function computeGrade(
  headers: HeadersResult,
  ssl: SSLResult | null,
  dnsResult: DNSResult | null
): { grade: string; score: number; maxScore: number } {
  let score = 0;
  const maxScore = 12;

  for (const name of SECURITY_HEADERS) {
    if (headers[name]?.present) score++;
  }

  if (ssl) {
    score++;
    if (ssl.daysUntilExpiry > 30) score++;
    if (ssl.protocol && ssl.protocol >= "TLSv1.2") score++;
  }

  if (dnsResult) {
    if (dnsResult.hasSPF) score++;
    if (dnsResult.hasDMARC) score++;
  }

  let grade: string;
  if (score >= 11) grade = "A";
  else if (score >= 9) grade = "B";
  else if (score >= 7) grade = "C";
  else if (score >= 5) grade = "D";
  else grade = "F";

  return { grade, score, maxScore };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url: rawUrl } = body;

    if (!rawUrl || typeof rawUrl !== "string") {
      return NextResponse.json(
        { error: "A valid URL is required" },
        { status: 400 }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = normalizeUrl(rawUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    const hostname = parsedUrl.hostname;

    const [headers, ssl, dnsResult] = await Promise.all([
      checkHeaders(parsedUrl),
      checkSSL(hostname),
      checkDNS(hostname),
    ]);

    const { grade, score, maxScore } = computeGrade(headers, ssl, dnsResult);

    const result: ScanResult = {
      url: parsedUrl.toString(),
      headers,
      ssl,
      dns: dnsResult,
      grade,
      score,
      maxScore,
      scannedAt: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Scan failed. Please try again." },
      { status: 500 }
    );
  }
}
