"use client";

import { useState } from "react";

interface VoidPurchaseDialogProps {
  documentNumber: string;
  requiresJustification: boolean;
  onConfirm: (voidReason: string, overrideJustification: string | null) => Promise<void>;
  onCancel: () => void;
}

export default function VoidPurchaseDialog({
  documentNumber,
  requiresJustification,
  onConfirm,
  onCancel,
}: VoidPurchaseDialogProps) {
  const [voidReason, setVoidReason] = useState("");
  const [overrideJustification, setOverrideJustification] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleConfirm = async () => {
    const errs: Record<string, string> = {};
    if (!voidReason.trim()) errs.void_reason = "Void reason is required.";
    if (requiresJustification && !overrideJustification.trim()) {
      errs.override_justification = "Override justification is required.";
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setVoiding(true);
    try {
      await onConfirm(
        voidReason.trim(),
        requiresJustification ? overrideJustification.trim() : null
      );
    } finally {
      setVoiding(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Void Purchase</h3>
          <p className="text-sm text-gray-600">
            Void purchase voucher <strong>{documentNumber}</strong>? This will
            create a reversing journal entry and cannot be undone.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Void Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={voidReason}
              onChange={(e) => {
                setVoidReason(e.target.value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.void_reason;
                  return next;
                });
              }}
              rows={2}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 resize-none ${
                errors.void_reason
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              }`}
              placeholder="Reason for voiding this purchase..."
            />
            {errors.void_reason && (
              <p className="text-xs text-red-500 mt-1">{errors.void_reason}</p>
            )}
          </div>

          {requiresJustification && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Override Justification <span className="text-red-500">*</span>
              </label>
              <textarea
                value={overrideJustification}
                onChange={(e) => {
                  setOverrideJustification(e.target.value);
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.override_justification;
                    return next;
                  });
                }}
                rows={2}
                className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 resize-none ${
                  errors.override_justification
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
                placeholder="Justification for overriding lock date..."
              />
              {errors.override_justification && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.override_justification}
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              disabled={voiding}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={voiding}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-red-400"
            >
              {voiding ? "Voiding..." : "Void Purchase"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
