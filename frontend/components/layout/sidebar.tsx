"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  ClipboardList,
  Settings,
  Shield,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  Briefcase,
  Package,
  FileText,
  ShoppingCart,
  Receipt,
  CreditCard,
  BookMarked,
  Repeat,
  Landmark,
  ArrowDownRight,
  ArrowUpRight,
  Scale,
  BarChart3,
  PanelLeft,
  Lock,
  Calculator,
  Hash,
  CheckSquare,
  Wrench,
  PieChart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MenuItem {
  key: string;
  label: string;
  href?: string;
  icon: LucideIcon;
  featureKey?: string;
  requireJournalEntries?: boolean;
  ownershipItem?: boolean; // conditionally labeled/hidden based on business_type
  children?: MenuItem[];
}

// ---------------------------------------------------------------------------
// Full menu definition
// ---------------------------------------------------------------------------

const menuDefinition: MenuItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    key: "organization",
    label: "Organization",
    icon: Building2,
    children: [
      { key: "company-profile", label: "Company Profile", href: "/organization/company-profile", icon: Building2 },
      { key: "clients", label: "Clients", href: "/organization/clients", icon: Users },
      { key: "suppliers", label: "Suppliers", href: "/organization/suppliers", icon: UserCheck },
      { key: "employees", label: "Employees", href: "/organization/employees", icon: Briefcase },
      { key: "owners", label: "Partners / Stockholders", href: "/organization/owners", icon: Users, ownershipItem: true },
      { key: "items", label: "Items & Services", href: "/organization/items", icon: Package, featureKey: "items_catalog" },
    ],
  },
  {
    key: "accounting",
    label: "Accounting",
    icon: BookOpen,
    children: [
      { key: "chart-of-accounts", label: "Chart of Accounts", href: "/accounting/chart-of-accounts", icon: BookMarked },
      { key: "sales", label: "Sales", href: "/accounting/sales", icon: FileText },
      { key: "purchases", label: "Purchases", href: "/accounting/purchases", icon: ShoppingCart },
      { key: "receipts", label: "Receipts", href: "/accounting/receipts", icon: Receipt },
      { key: "disbursements", label: "Disbursements", href: "/accounting/disbursements", icon: CreditCard },
      { key: "journal-entries", label: "Journal Entries", href: "/accounting/journal-entries", icon: ClipboardList, requireJournalEntries: true },
      { key: "recurring", label: "Recurring", href: "/accounting/recurring", icon: Repeat },
      { key: "general-ledger", label: "General Ledger", href: "/accounting/general-ledger", icon: Landmark },
      { key: "receivables", label: "Receivables", href: "/accounting/receivables", icon: ArrowDownRight },
      { key: "payables", label: "Payables", href: "/accounting/payables", icon: ArrowUpRight },
      { key: "trial-balance", label: "Trial Balance", href: "/accounting/trial-balance", icon: Scale },
      {
        key: "financial-statements",
        label: "Financial Statements",
        icon: BarChart3,
        children: [
          { key: "balance-sheet", label: "Balance Sheet", href: "/accounting/financial-statements/balance-sheet", icon: PieChart },
          { key: "income-statement", label: "Income Statement", href: "/accounting/financial-statements/income-statement", icon: BarChart3 },
        ],
      },
    ],
  },
  {
    key: "audit-trail",
    label: "Audit Trail",
    href: "/audit-trail",
    icon: Shield,
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    children: [
      { key: "users", label: "Users", href: "/settings/users", icon: Users },
      { key: "roles", label: "Roles & Permissions", href: "/settings/roles", icon: Shield },
      { key: "company", label: "Company Settings", href: "/settings/company", icon: Building2 },
      { key: "lock-dates", label: "Lock Dates", href: "/settings/lock-dates", icon: Lock },
      { key: "tax", label: "Tax Configuration", href: "/settings/tax", icon: Calculator },
      { key: "document-numbering", label: "Document Numbering", href: "/settings/document-numbering", icon: Hash },
      { key: "approval-workflows", label: "Approval Workflows", href: "/settings/approval-workflows", icon: CheckSquare },
      { key: "setup-mode", label: "Setup Mode", href: "/settings/setup-mode", icon: Wrench },
    ],
  },
];

// ---------------------------------------------------------------------------
// Sidebar component
// ---------------------------------------------------------------------------

const SIDEBAR_COLLAPSED_KEY = "nebo-sidebar-collapsed";

export default function Sidebar() {
  const pathname = usePathname();
  const { authUser } = useAuth();

  // Collapsed state (icon-only mode)
  const [collapsed, setCollapsed] = useState(false);

  // Which top-level submenus are open (by key)
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());

  // Feature configs and entity labels from database
  const [disabledFeatures, setDisabledFeatures] = useState<Set<string>>(new Set());
  const [entityLabels, setEntityLabels] = useState<Record<string, string>>({});

  // Load collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  // Auto-open submenu for the current active path
  useEffect(() => {
    for (const item of menuDefinition) {
      if (item.children) {
        const isActive = item.children.some(
          (child) =>
            child.href === pathname ||
            (child.children && child.children.some((sub) => sub.href === pathname))
        );
        if (isActive) {
          setOpenMenus((prev) => new Set(prev).add(item.key));
          // Check nested submenus too
          for (const child of item.children) {
            if (child.children?.some((sub) => sub.href === pathname)) {
              setOpenMenus((prev) => new Set(prev).add(child.key));
            }
          }
        }
      }
    }
  }, [pathname]);

  // Fetch feature_configs and entity_labels
  useEffect(() => {
    if (!authUser) return;
    const supabase = createClient();
    const entityId = authUser.entity.id;

    // Fetch disabled features
    supabase
      .from("feature_configs")
      .select("feature_key, is_enabled")
      .eq("entity_id", entityId)
      .eq("is_enabled", false)
      .then(({ data }) => {
        if (data) {
          setDisabledFeatures(new Set(data.map((r) => r.feature_key)));
        }
      });

    // Fetch entity labels
    supabase
      .from("entity_labels")
      .select("entity_key, custom_label")
      .eq("entity_id", entityId)
      .then(({ data }) => {
        if (data) {
          const labels: Record<string, string> = {};
          for (const row of data) {
            labels[row.entity_key] = row.custom_label;
          }
          setEntityLabels(labels);
        }
      });
  }, [authUser]);

  // Toggle a submenu open/closed
  function toggleMenu(key: string) {
    setOpenMenus((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Get the label for a menu item, considering entity_labels overrides
  function getLabel(item: MenuItem): string {
    // Check entity_labels first
    if (entityLabels[item.key]) return entityLabels[item.key];

    // Handle ownership item label based on business_type
    if (item.ownershipItem && authUser) {
      const bt = authUser.entity.businessType;
      if (bt === "partnership") return "Partners";
      if (bt === "corporation") return "Stockholders";
      return item.label; // fallback
    }

    return item.label;
  }

  // Filter menu items based on visibility rules
  const filteredMenu = useMemo(() => {
    function filterItems(items: MenuItem[]): MenuItem[] {
      return items
        .filter((item) => {
          // Feature config: hide if explicitly disabled
          if (item.featureKey && disabledFeatures.has(item.featureKey)) return false;

          // Journal Entries: only show if role allows
          if (item.requireJournalEntries && authUser && !authUser.role.canViewJournalEntries) return false;

          // Ownership item: hide for sole_proprietor
          if (item.ownershipItem && authUser?.entity.businessType === "sole_proprietor") return false;

          return true;
        })
        .map((item) => ({
          ...item,
          children: item.children ? filterItems(item.children) : undefined,
        }));
    }
    return filterItems(menuDefinition);
  }, [disabledFeatures, authUser]);

  // Check if a path is active (exact or starts with for parent menus)
  function isActive(href?: string) {
    if (!href) return false;
    return pathname === href;
  }

  function isParentActive(item: MenuItem): boolean {
    if (item.href && pathname === item.href) return true;
    if (item.children) return item.children.some((child) => isParentActive(child));
    return false;
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function renderMenuItem(item: MenuItem, depth: number = 0) {
    const hasChildren = item.children && item.children.length > 0;
    const active = isActive(item.href);
    const parentActive = isParentActive(item);
    const isOpen = openMenus.has(item.key);
    const Icon = item.icon;
    const label = getLabel(item);

    if (hasChildren) {
      return (
        <div key={item.key}>
          <button
            onClick={() => toggleMenu(item.key)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              parentActive
                ? "bg-white/10 text-white"
                : "text-gray-300 hover:bg-white/5 hover:text-white"
            } ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? label : undefined}
          >
            <Icon size={20} className="shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{label}</span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </>
            )}
          </button>
          {!collapsed && isOpen && (
            <div className="ml-3 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
              {item.children!.map((child) => renderMenuItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.key}
        href={item.href!}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? "bg-white/15 text-white"
            : "text-gray-300 hover:bg-white/5 hover:text-white"
        } ${collapsed ? "justify-center" : ""} ${active ? "border-l-2 border-white -ml-[2px]" : ""}`}
        title={collapsed ? label : undefined}
      >
        <Icon size={depth > 0 ? 16 : 20} className="shrink-0" />
        {!collapsed && <span>{label}</span>}
      </Link>
    );
  }

  return (
    <aside
      className={`flex h-screen flex-col bg-[#0f0f1a] transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo + collapse toggle */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <PanelLeft size={18} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-raleway)" }}>
              Nebo Flow
            </h1>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`flex items-center justify-center rounded-lg p-1.5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors ${
            collapsed ? "mx-auto" : ""
          }`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {filteredMenu.map((item) => renderMenuItem(item))}
      </nav>
    </aside>
  );
}
