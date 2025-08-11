'use client';

export default function EmptyStateCard({
  icon,
  title,
  subtitle,
  primaryLabel,
  onPrimary,
  onDismiss,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  primaryLabel: string;
  onPrimary: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div className="border rounded-xl p-6 bg-white shadow-sm text-center space-y-3">
      {icon}
      <h3 className="text-lg font-semibold">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      <div className="flex gap-2 justify-center">
        <button
          className="px-3 py-1.5 bg-[#007AFF] text-white rounded"
          onClick={onPrimary}
        >
          {primaryLabel}
        </button>
        {onDismiss && (
          <button
            className="px-3 py-1.5 rounded border"
            onClick={onDismiss}
          >
            Später
          </button>
        )}
      </div>
    </div>
  );
}