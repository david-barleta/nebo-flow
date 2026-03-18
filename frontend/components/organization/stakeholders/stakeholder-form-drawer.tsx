"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import type {
  Stakeholder,
  StakeholderMode,
  StakeholderType,
} from "@/lib/stakeholders/types";
import { getStakeholderDisplayName } from "@/lib/stakeholders/types";
import {
  createStakeholder,
  updateStakeholder,
  logAuditEntry,
} from "@/lib/stakeholders/queries";

interface StakeholderFormDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editStakeholder: Stakeholder | null; // null = create mode
  mode: StakeholderMode;
}

export default function StakeholderFormDrawer({
  open,
  onClose,
  onSaved,
  editStakeholder,
  mode,
}: StakeholderFormDrawerProps) {
  const { authUser } = useAuth();
  const isEditMode = editStakeholder !== null;

  // Form state
  const [stakeholderType, setStakeholderType] =
    useState<StakeholderType>("non_individual");
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [registeredName, setRegisteredName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [tin, setTin] = useState("");
  const [isClient, setIsClient] = useState(mode === "client");
  const [isSupplier, setIsSupplier] = useState(mode === "supplier");
  const [saving, setSaving] = useState(false);

  // Validation errors
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [roleError, setRoleError] = useState("");

  // Reset form when opening
  useEffect(() => {
    if (!open) return;

    if (editStakeholder) {
      setStakeholderType(editStakeholder.stakeholder_type);
      setLastName(editStakeholder.last_name || "");
      setFirstName(editStakeholder.first_name || "");
      setMiddleName(editStakeholder.middle_name || "");
      setRegisteredName(editStakeholder.registered_name || "");
      setContactPerson(editStakeholder.contact_person || "");
      setEmail(editStakeholder.email || "");
      setPhone(editStakeholder.phone || "");
      setAddress(editStakeholder.address || "");
      setTin(editStakeholder.tin || "");
      setIsClient(editStakeholder.is_client);
      setIsSupplier(editStakeholder.is_supplier);
    } else {
      setStakeholderType("non_individual");
      setLastName("");
      setFirstName("");
      setMiddleName("");
      setRegisteredName("");
      setContactPerson("");
      setEmail("");
      setPhone("");
      setAddress("");
      setTin("");
      setIsClient(mode === "client");
      setIsSupplier(mode === "supplier");
    }
    setNameError("");
    setEmailError("");
    setRoleError("");
  }, [open, editStakeholder, mode]);

  const handleSave = async () => {
    if (!authUser) return;

    // Validate
    setNameError("");
    setEmailError("");
    setRoleError("");

    let hasError = false;

    if (stakeholderType === "individual") {
      if (!lastName.trim()) {
        setNameError("Last name is required for individuals.");
        hasError = true;
      }
    } else {
      if (!registeredName.trim()) {
        setNameError("Registered name is required for non-individuals.");
        hasError = true;
      }
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Please enter a valid email address.");
      hasError = true;
    }

    if (!isClient && !isSupplier) {
      setRoleError(
        "A stakeholder must be either a client, a supplier, or both."
      );
      hasError = true;
    }

    if (hasError) return;

    setSaving(true);
    try {
      const payload = {
        stakeholder_type: stakeholderType,
        last_name:
          stakeholderType === "individual" ? lastName.trim() || null : null,
        first_name:
          stakeholderType === "individual" ? firstName.trim() || null : null,
        middle_name:
          stakeholderType === "individual" ? middleName.trim() || null : null,
        registered_name:
          stakeholderType === "non_individual"
            ? registeredName.trim() || null
            : null,
        contact_person: contactPerson.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        tin: tin.trim() || null,
        is_client: isClient,
        is_supplier: isSupplier,
      };

      // Build a display name for toast messages
      const displayName =
        stakeholderType === "individual"
          ? `${lastName.trim()}${firstName.trim() ? `, ${firstName.trim()}` : ""}`
          : registeredName.trim();

      if (isEditMode) {
        const oldValues = {
          stakeholder_type: editStakeholder!.stakeholder_type,
          last_name: editStakeholder!.last_name,
          first_name: editStakeholder!.first_name,
          middle_name: editStakeholder!.middle_name,
          registered_name: editStakeholder!.registered_name,
          contact_person: editStakeholder!.contact_person,
          email: editStakeholder!.email,
          phone: editStakeholder!.phone,
          address: editStakeholder!.address,
          tin: editStakeholder!.tin,
          is_client: editStakeholder!.is_client,
          is_supplier: editStakeholder!.is_supplier,
        };

        await updateStakeholder(editStakeholder!.id, payload);

        await logAuditEntry({
          entity_id: authUser.entity.id,
          user_id: authUser.user.id,
          action: "edit",
          entity_type: "stakeholder",
          entity_record_id: editStakeholder!.id,
          old_values: oldValues,
          new_values: payload,
        });

        toast.success(`"${displayName}" updated.`);
      } else {
        const newStakeholder = await createStakeholder({
          entity_id: authUser.entity.id,
          ...payload,
          is_active: true,
        });

        const roleLabel = mode === "client" ? "client" : "supplier";

        await logAuditEntry({
          entity_id: authUser.entity.id,
          user_id: authUser.user.id,
          action: "create",
          entity_type: "stakeholder",
          entity_record_id: newStakeholder.id,
          old_values: null,
          new_values: {
            stakeholder_type: stakeholderType,
            ...(stakeholderType === "individual"
              ? { last_name: lastName.trim(), first_name: firstName.trim() }
              : { registered_name: registeredName.trim() }),
            is_client: isClient,
            is_supplier: isSupplier,
          },
        });

        toast.success(`${displayName} added as ${roleLabel}.`);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const title = isEditMode
    ? "Edit Stakeholder"
    : mode === "client"
      ? "Add Client"
      : "Add Supplier";

  // In create mode: show a single "also a..." toggle
  // In edit mode: show both toggles
  const crossLabel =
    mode === "client"
      ? "This client is also a supplier"
      : "This supplier is also a client";

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Stakeholder Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStakeholderType("non_individual");
                  setNameError("");
                }}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  stakeholderType === "non_individual"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Business / Organization
              </button>
              <button
                type="button"
                onClick={() => {
                  setStakeholderType("individual");
                  setNameError("");
                }}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  stakeholderType === "individual"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Individual
              </button>
            </div>
          </div>

          {/* Conditional Name Fields */}
          {stakeholderType === "non_individual" ? (
            /* Non-individual: Registered Name */
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registered Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={registeredName}
                onChange={(e) => {
                  setRegisteredName(e.target.value);
                  setNameError("");
                }}
                maxLength={255}
                className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 ${
                  nameError
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
                placeholder="SEC/DTI-registered company name"
              />
              {nameError && (
                <p className="text-xs text-red-500 mt-1">{nameError}</p>
              )}
            </div>
          ) : (
            /* Individual: Last Name, First Name, Middle Name */
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    setNameError("");
                  }}
                  maxLength={255}
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 ${
                    nameError
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                  placeholder="Last name"
                />
                {nameError && (
                  <p className="text-xs text-red-500 mt-1">{nameError}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  maxLength={255}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  maxLength={255}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Middle name (optional)"
                />
              </div>
            </>
          )}

          {/* Contact Person */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Person
            </label>
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              maxLength={255}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Primary contact at the company"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError("");
              }}
              maxLength={255}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 ${
                emailError
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              }`}
              placeholder="email@example.com"
            />
            {emailError && (
              <p className="text-xs text-red-500 mt-1">{emailError}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={50}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="09XX XXX XXXX"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              placeholder="Full address"
            />
          </div>

          {/* TIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              TIN
            </label>
            <input
              type="text"
              value={tin}
              onChange={(e) => setTin(e.target.value)}
              maxLength={20}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="XXX-XXX-XXX-XXX"
            />
            <p className="text-xs text-gray-400 mt-1">
              Format: XXX-XXX-XXX-XXX
            </p>
          </div>

          {/* Role toggles */}
          {isEditMode ? (
            <>
              {/* Edit mode: show both toggles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Is a Client
                  </label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isClient}
                    onClick={() => {
                      setIsClient(!isClient);
                      setRoleError("");
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                      isClient ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                        isClient ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Is a Supplier
                  </label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isSupplier}
                    onClick={() => {
                      setIsSupplier(!isSupplier);
                      setRoleError("");
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                      isSupplier ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                        isSupplier ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Create mode: single cross-role toggle */
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  {crossLabel}
                </label>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={
                  mode === "client" ? isSupplier : isClient
                }
                onClick={() => {
                  if (mode === "client") {
                    setIsSupplier(!isSupplier);
                  } else {
                    setIsClient(!isClient);
                  }
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  (mode === "client" ? isSupplier : isClient)
                    ? "bg-blue-600"
                    : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    (mode === "client" ? isSupplier : isClient)
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          )}

          {roleError && (
            <p className="text-xs text-red-500">{roleError}</p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400"
          >
            {saving
              ? "Saving..."
              : isEditMode
                ? "Save Changes"
                : mode === "client"
                  ? "Add Client"
                  : "Add Supplier"}
          </button>
        </div>
      </div>
    </>
  );
}
