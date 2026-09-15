import { STATUS_STYLE } from "@/lib/constants";

export default function StatusBadge({ status, testid }) {
  const cls = STATUS_STYLE[status] || "bg-slate-100 text-slate-600 border-slate-300";
  return (
    <span
      data-testid={testid}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls} transition-colors`}
    >
      {status}
    </span>
  );
}
