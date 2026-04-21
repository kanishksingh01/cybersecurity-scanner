"use client";

import { useState } from "react";
import type { ScanResult } from "@/app/types";
import ScanForm from "@/app/components/ScanForm";
import GradeCard from "@/app/components/GradeCard";
import HeadersReport from "@/app/components/HeadersReport";
import SSLReport from "@/app/components/SSLReport";
import DNSReport from "@/app/components/DNSReport";

export default function Home() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleResult(data: ScanResult) {
    setError(null);
    setResult(data);
  }

  function handleError(msg: string) {
    setResult(null);
    setError(msg);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <main className="flex-1 px-4 py-16 max-w-5xl mx-auto w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-100 tracking-tight">
            Cyber<span className="text-cyan-400">Scan</span>
          </h1>
          <p className="text-gray-400 mt-2">Web Security Scanner</p>
        </div>

        <ScanForm onResult={handleResult} onError={handleError} />

        {error && (
          <div className="mt-8 max-w-2xl mx-auto p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-12 space-y-8">
            <GradeCard
              grade={result.grade}
              score={result.score}
              maxScore={result.maxScore}
              url={result.url}
              scannedAt={result.scannedAt}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HeadersReport headers={result.headers} />
              <SSLReport ssl={result.ssl} />
            </div>
            <DNSReport dns={result.dns} />
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-gray-600 text-sm">
        Built by Kanishk Singh
      </footer>
    </div>
  );
}
