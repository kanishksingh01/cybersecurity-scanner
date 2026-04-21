const gradeColors: Record<string, string> = {
  A: "text-green-400 border-green-400",
  B: "text-lime-400 border-lime-400",
  C: "text-yellow-400 border-yellow-400",
  D: "text-orange-400 border-orange-400",
  F: "text-red-400 border-red-400",
};

interface GradeCardProps {
  grade: string;
  score: number;
  maxScore: number;
  url: string;
  scannedAt: string;
}

export default function GradeCard({ grade, score, maxScore, url, scannedAt }: GradeCardProps) {
  const colors = gradeColors[grade] || gradeColors.F;

  return (
    <div className="flex flex-col items-center gap-4 p-8 bg-gray-900 rounded-xl border border-gray-800">
      <div className={`w-28 h-28 rounded-full border-4 ${colors} flex items-center justify-center`}>
        <span className={`text-5xl font-bold ${colors.split(" ")[0]}`}>{grade}</span>
      </div>
      <div className="text-center">
        <p className="text-2xl font-semibold text-gray-100">
          {score} <span className="text-gray-500">/ {maxScore}</span>
        </p>
        <p className="text-sm text-gray-400 font-mono mt-2 break-all">{url}</p>
        <p className="text-xs text-gray-600 mt-1">
          {new Date(scannedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
