"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import type { EwtRate } from "@/lib/settings/ewt-types";
import {
  fetchEwtRates,
  createEwtRate,
  updateEwtRate,
  deleteEwtRate,
} from "@/lib/settings/ewt-queries";
import { logAuditEntry } from "@/lib/settings/queries";

export default function EwtRatesPage() {
  const { authUser } = useAuth();
  const [rates, setRates] = useState<EwtRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRate, setEditingRate] = useState<EwtRate | null>(null);

  const loadRates = useCallback(async () => {
    if (!authUser) return;
    try {
      const data = await fetchEwtRates(authUser.entity.id, true);
      setRates(data);
    } catch {
      toast.error("Failed to load EWT rates.");
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const handleDelete = async (rate: EwtRate) => {
    if (!authUser) return;
    if (!confirm(`Delete "${rate.category_name} (${rate.rate}%)"?`)) return;

    try {
      await deleteEwtRate(rate.id);
      await logAuditEntry({
        entity_id: authUser.entity.id,
        user_id: authUser.user.id,
        action: "delete",
        entity_type: "withholding_tax_rate",
        entity_record_id: rate.id,
        old_values: {
          category_name: rate.category_name,
          rate: rate.rate,
        },
        new_values: null,
      });
      toast.success("EWT rate deleted.");
      loadRates();
    } catch {
      toast.error("Failed to delete EWT rate.");
    }
  };

  const handleFormSaved = () => {
    setShowForm(false);
    setEditingRate(null);
    loadRates();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* EWT Rates Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Expanded Withholding Tax (EWT) Rates
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Configure EWT rate categories. These can be assigned to items and
              will be automatically applied on transaction lines.
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => {
                setEditingRate(null);
                setShowForm(true);
              }}
              className="shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={16} />
              Add Rate
            </button>
          )}
        </div>

        {showForm && (
          <EwtRateForm
            editingRate={editingRate}
            entityId={authUser?.entity.id ?? ""}
            userId={authUser?.user.id ?? ""}
            onSaved={handleFormSaved}
            onCancel={() => {
              setShowForm(false);
              setEditingRate(null);
            }}
          />
        )}

        {rates.length === 0 && !showForm ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-500">
              No EWT rates configured yet.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Add your first EWT rate
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                    Rate
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rates.map((rate) => (
                  <tr key={rate.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {rate.category_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                      {rate.rate}%
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          rate.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {rate.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingRate(rate);
                            setShowForm(true);
                          }}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(rate)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EWT Rate Form
// ---------------------------------------------------------------------------

interface EwtRateFormProps {
  editingRate: EwtRate | null;
  entityId: string;
  userId: string;
  onSaved: () => void;
  onCancel: () => void;
}

function EwtRateForm({
  editingRate,
  entityId,
  userId,
  onSaved,
  onCancel,
}: EwtRateFormProps) {
  const [categoryName, setCategoryName] = useState(
    editingRate?.category_name ?? ""
  );
  const [rate, setRate] = useState(
    editingRate ? String(editingRate.rate) : ""
  );
  const [isActive, setIsActive] = useState(editingRate?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!categoryName.trim())
      errs.category_name = "Category name is required.";
    const rateNum = parseFloat(rate);
    if (!rate.trim() || isNaN(rateNum))
      errs.rate = "Rate is required.";
    else if (rateNum <= 0 || rateNum > 100)
      errs.rate = "Rate must be between 0 and 100.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      const rateNum = parseFloat(rate);

      if (editingRate) {
        await updateEwtRate(editingRate.id, {
          category_name: categoryName.trim(),
          rate: rateNum,
          is_active: isActive,
        });
        await logAuditEntry({
          entity_id: entityId,
          user_id: userId,
          action: "edit",
          entity_type: "withholding_tax_rate",
          entity_record_id: editingRate.id,
          old_values: {
            category_name: editingRate.category_name,
            rate: editingRate.rate,
          },
          new_values: {
            category_name: categoryName.trim(),
            rate: rateNum,
          },
        });
        toast.success("EWT rate updated.");
      } else {
        const created = await createEwtRate({
          entity_id: entityId,
          category_name: categoryName.trim(),
          rate: rateNum,
          is_active: true,
        });
        await logAuditEntry({
          entity_id: entityId,
          user_id: userId,
          action: "create",
          entity_type: "withholding_tax_rate",
          entity_record_id: created.id,
          old_values: null,
          new_values: {
            category_name: categoryName.trim(),
            rate: rateNum,
          },
        });
        toast.success("EWT rate added.");
      }
      onSaved();
    } catch {
      toast.error("Failed to save EWT rate.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={categoryName}
            onChange={(e) => {
              setCategoryName(e.target.value);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.category_name;
                return next;
              });
            }}
            placeholder="e.g., Professional Fees, Rental, Services"
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              errors.category_name
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            }`}
          />
          {errors.category_name && (
            <p className="mt-1 text-xs text-red-600">{errors.category_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rate (%) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={rate}
            onChange={(e) => {
              setRate(e.target.value);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.rate;
                return next;
              });
            }}
            placeholder="e.g., 2, 5, 10"
            className={`w-full rounded-lg border px-3 py-2 text-sm text-right focus:outline-none focus:ring-1 ${
              errors.rate
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            }`}
          />
          {errors.rate && (
            <p className="mt-1 text-xs text-red-600">{errors.rate}</p>
          )}
        </div>
      </div>

      {editingRate && (
        <div className="flex items-center gap-3">
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
          </label>
          <span className="text-sm text-gray-700">Active</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : editingRate ? "Update" : "Add"}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
