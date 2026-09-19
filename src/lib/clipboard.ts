/**
 * Safely copy text to clipboard with fallback for iFrames and unfocused documents.
 * Returns true if copy was successful, false otherwise.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try modern async Clipboard API if available and document is focused
  if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      if (typeof document !== "undefined" && document.hasFocus && document.hasFocus()) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      // Fallback silently if document is not focused or clipboard permission denied
      console.debug("navigator.clipboard.writeText failed, attempting fallback:", err);
    }
  }

  // 2. Fallback using temporary textarea element and document.execCommand('copy')
  if (typeof document !== "undefined") {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      // Ensure element is off-screen and invisible to layout
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "-9999px";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      textArea.setAttribute("readonly", "");

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, textArea.value.length);

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    } catch (fallbackErr) {
      console.warn("Fallback clipboard copy failed:", fallbackErr);
      return false;
    }
  }

  return false;
}
