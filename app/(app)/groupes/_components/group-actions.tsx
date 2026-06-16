"use client";

import { deleteGroup, leaveGroup } from "../actions";

export function GroupActions({
  groupId,
  isOwner,
}: {
  groupId: string;
  isOwner: boolean;
}) {
  const action = isOwner ? deleteGroup : leaveGroup;
  const label = isOwner ? "Supprimer le groupe" : "Quitter le groupe";
  const confirmMsg = isOwner
    ? "Supprimer définitivement ce groupe pour tous les membres ?"
    : "Quitter ce groupe ?";

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmMsg)) e.preventDefault();
      }}
    >
      <input type="hidden" name="groupId" value={groupId} />
      <button
        type="submit"
        className="press rounded-lg border border-danger/30 px-3 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
      >
        {label}
      </button>
    </form>
  );
}
