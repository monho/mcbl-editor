import { EditorShell } from "@/components/editor-shell";
import { InvalidSession } from "@/components/invalid-session";
import { isValidMcblSessionId } from "@/lib/mcbl-session";

type Props = { params: Promise<{ session: string }> };

export default async function SessionPage({ params }: Props) {
  const { session } = await params;
  const decoded = decodeURIComponent(session);

  if (!isValidMcblSessionId(decoded)) {
    return <InvalidSession session={decoded} />;
  }

  return <EditorShell sessionId={decoded} />;
}
