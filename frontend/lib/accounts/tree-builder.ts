// =============================================================================
// Chart of Accounts — Tree Builder
// =============================================================================
// Transforms a flat list of accounts into a hierarchical tree structure:
//   Level 1: account_type (virtual grouping)
//   Level 2: account_sub_type (virtual grouping)
//   Level 3: header accounts (is_header=true) OR standalone detail accounts
//   Level 4: detail accounts nested under headers
// =============================================================================

import type { Account, AccountType, TypeGroup, SubTypeGroup, AccountTreeNode } from "./types";
import { ACCOUNT_TYPE_ORDER, ACCOUNT_SUB_TYPES } from "./types";

export function buildAccountTree(accounts: Account[]): TypeGroup[] {
  const tree: TypeGroup[] = [];

  for (const type of ACCOUNT_TYPE_ORDER) {
    const typeAccounts = accounts.filter((a) => a.account_type === type);
    if (typeAccounts.length === 0) continue;

    // Collect all sub-types that actually have accounts
    const subTypeSet = new Set<string>();
    for (const a of typeAccounts) {
      subTypeSet.add(a.account_sub_type || "Uncategorized");
    }

    // Order sub-types: known ones first (in defined order), then any extras
    const knownOrder = ACCOUNT_SUB_TYPES[type] || [];
    const orderedSubTypes = [
      ...knownOrder.filter((st) => subTypeSet.has(st)),
      ...[...subTypeSet].filter((st) => !knownOrder.includes(st)),
    ];

    const subTypes: SubTypeGroup[] = [];

    for (const subType of orderedSubTypes) {
      const stAccounts = typeAccounts.filter(
        (a) => (a.account_sub_type || "Uncategorized") === subType
      );

      // Header accounts in this sub-type
      const headers = stAccounts
        .filter((a) => a.is_header)
        .sort((a, b) => a.display_order - b.display_order);

      // Detail accounts with a parent header
      const parentedDetails = stAccounts.filter(
        (a) => !a.is_header && a.parent_account_id != null
      );

      // Detail accounts with no parent (standalone under sub-type)
      const standaloneAccounts = stAccounts
        .filter((a) => !a.is_header && a.parent_account_id == null)
        .sort((a, b) => a.display_order - b.display_order);

      // Build header nodes with their children
      const headerNodes: AccountTreeNode[] = headers.map((header) => ({
        account: header,
        children: parentedDetails
          .filter((d) => d.parent_account_id === header.id)
          .sort((a, b) => a.display_order - b.display_order)
          .map((d) => ({ account: d, children: [] })),
      }));

      subTypes.push({
        subType,
        headers: headerNodes,
        standaloneAccounts,
      });
    }

    tree.push({ type, subTypes });
  }

  return tree;
}

// Filter tree based on search query — preserves parent context for matches
export function filterAccountTree(
  tree: TypeGroup[],
  query: string
): TypeGroup[] {
  const q = query.toLowerCase().trim();
  if (!q) return tree;

  return tree
    .map((typeGroup) => {
      const filteredSubTypes = typeGroup.subTypes
        .map((stGroup) => {
          // Filter standalone accounts
          const matchingStandalone = stGroup.standaloneAccounts.filter(
            (a) =>
              a.account_name.toLowerCase().includes(q) ||
              (a.account_code && a.account_code.toLowerCase().includes(q))
          );

          // Filter headers and their children
          const matchingHeaders = stGroup.headers
            .map((headerNode) => {
              const headerMatches =
                headerNode.account.account_name.toLowerCase().includes(q);

              // If header matches, show all children
              if (headerMatches) return headerNode;

              // Otherwise filter children
              const matchingChildren = headerNode.children.filter(
                (child) =>
                  child.account.account_name.toLowerCase().includes(q) ||
                  (child.account.account_code &&
                    child.account.account_code.toLowerCase().includes(q))
              );

              if (matchingChildren.length === 0) return null;

              return { ...headerNode, children: matchingChildren };
            })
            .filter(Boolean) as AccountTreeNode[];

          if (matchingHeaders.length === 0 && matchingStandalone.length === 0) {
            return null;
          }

          return {
            ...stGroup,
            headers: matchingHeaders,
            standaloneAccounts: matchingStandalone,
          };
        })
        .filter(Boolean) as SubTypeGroup[];

      if (filteredSubTypes.length === 0) return null;

      return { ...typeGroup, subTypes: filteredSubTypes };
    })
    .filter(Boolean) as TypeGroup[];
}
