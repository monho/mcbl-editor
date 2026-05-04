import type { ReactNode } from "react";

import { EditorWorkspace } from "@/components/editor-workspace";

export function EditorShell({
  sessionId,
  children,
}: {
  sessionId: string;
  children?: ReactNode;
}) {
  return <EditorWorkspace sessionId={sessionId}>{children}</EditorWorkspace>;
}
