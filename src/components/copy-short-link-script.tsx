import Script from "next/script";

const copyButtonScript = `
(() => {
  if (window.__trulyGoCopyButtonReady) {
    return;
  }

  window.__trulyGoCopyButtonReady = true;
  const timers = new WeakMap();

  function copyWithTextarea(value) {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.width = "1px";
    textarea.style.height = "1px";
    textarea.style.padding = "0";
    textarea.style.border = "0";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, value.length);

    try {
      return document.execCommand("copy");
    } finally {
      document.body.removeChild(textarea);
      window.getSelection()?.removeAllRanges();
    }
  }

  async function writeClipboard(value) {
    if (copyWithTextarea(value)) {
      return;
    }

    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }

    throw new Error("Clipboard copy failed");
  }

  function setButtonState(button, state) {
    const labels = {
      idle: button.dataset.idleLabel || "Kopyala",
      copying: "Kopyalanıyor...",
      copied: "Kopyalandı",
      failed: "Kopyalanamadı",
    };
    const currentTimer = timers.get(button);

    if (currentTimer) {
      window.clearTimeout(currentTimer);
    }

    button.dataset.copyState = state;
    button.textContent = labels[state];
  }

  async function runCopy(button) {
    const value = button.dataset.copyUrl || "";
    setButtonState(button, "copying");

    try {
      if (!value) {
        throw new Error("Copy value is empty");
      }

      await writeClipboard(value);
      setButtonState(button, "copied");
    } catch (error) {
      console.error("TrulyGo copy failed", { value, error });
      setButtonState(button, "failed");
    }

    timers.set(
      button,
      window.setTimeout(() => {
        setButtonState(button, "idle");
      }, 1800),
    );
  }

  function findCopyButton(target) {
    if (!(target instanceof Element)) {
      return null;
    }

    return target.closest("[data-trulygo-copy-button]");
  }

  document.addEventListener(
    "pointerdown",
    (event) => {
      const button = findCopyButton(event.target);

      if (!button || event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      button.dataset.lastPointerCopyAt = String(Date.now());
      void runCopy(button);
    },
    true,
  );

  document.addEventListener(
    "click",
    (event) => {
      const button = findCopyButton(event.target);

      if (!button) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const lastPointerCopyAt = Number(button.dataset.lastPointerCopyAt || 0);

      if (Date.now() - lastPointerCopyAt < 700) {
        return;
      }

      void runCopy(button);
    },
    true,
  );
})();
`;

export function CopyShortLinkScript() {
  return (
    <Script
      id="trulygo-copy-button"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: copyButtonScript }}
    />
  );
}
