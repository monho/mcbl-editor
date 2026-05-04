/** mcbl-core `McblCommand#randomEditorId(10)` 과 동일한 패턴 */
const SESSION_RE = /^[A-Za-z0-9]{10}$/;

export function isValidMcblSessionId(session: string): boolean {
  return SESSION_RE.test(session);
}
