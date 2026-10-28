(() => {
  const SERVICE_WORKER_URL = "/service-worker.js";
  const INSTALL_DISMISS_KEY = "agrocanary_install_prompt_dismissed";
  const INSTALL_DISMISS_TIME = 14 * 24 * 60 * 60 * 1000;
  let deferredInstallPrompt = null;
  let installPromptElement = null;

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  const isIos =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  function readDismissedAt() {
    try {
      return Number.parseInt(localStorage.getItem(INSTALL_DISMISS_KEY) || "0", 10);
    } catch {
      return 0;
    }
  }

  function wasDismissedRecently() {
    return Date.now() - readDismissedAt() < INSTALL_DISMISS_TIME;
  }

  function rememberDismissal() {
    try {
      localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
    } catch {
      // The prompt can still be dismissed for this page when storage is unavailable.
    }
  }

  function closeInstallPrompt({ remember = true } = {}) {
    if (remember) rememberDismissal();
    installPromptElement?.remove();
    installPromptElement = null;
  }

  function showInstallPrompt(mode) {
    if (isStandalone || wasDismissedRecently() || installPromptElement) return;

    const isNativePrompt = mode === "native";
    const prompt = document.createElement("aside");
    prompt.className = "install-prompt";
    prompt.setAttribute("aria-label", "Instalar AgroCanary");
    prompt.innerHTML = `
      <div class="install-prompt__copy">
        <strong>Instala AgroCanary</strong>
        <p>${
          isNativePrompt
            ? "Añádela a tu pantalla de inicio para abrirla como una app."
            : "En iPhone: Safari → Compartir → Añadir a pantalla de inicio."
        }</p>
      </div>
      <div class="install-prompt__actions">
        ${isNativePrompt ? '<button class="install-prompt__install" type="button">Instalar</button>' : ""}
        <button class="install-prompt__close" type="button" aria-label="Cerrar indicación de instalación">×</button>
      </div>
    `;

    prompt.querySelector(".install-prompt__close")?.addEventListener("click", () => {
      closeInstallPrompt();
    });

    prompt.querySelector(".install-prompt__install")?.addEventListener("click", async () => {
      const installEvent = deferredInstallPrompt;
      if (!installEvent) return;

      deferredInstallPrompt = null;
      try {
        await installEvent.prompt();
        await installEvent.userChoice.catch(() => null);
      } catch {
        // Some embedded browsers expose the event but cannot open the installer.
      } finally {
        closeInstallPrompt();
      }
    });

    document.body.append(prompt);
    installPromptElement = prompt;
  }

  function initMobileNavigation() {
    const toggle = document.querySelector("[data-nav-toggle]");
    const nav = document.querySelector("#primaryNav");
    if (!toggle || !nav) return;

    const setOpen = (open, { returnFocus = false } = {}) => {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");

      if (open) {
        nav.querySelector("a")?.focus();
      } else if (returnFocus) {
        toggle.focus();
      }
    };

    toggle.addEventListener("click", () => {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("click", (event) => {
      if (toggle.getAttribute("aria-expanded") === "true" && !event.target.closest(".site-header")) {
        setOpen(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false, { returnFocus: true });
      }
    });

    const desktopQuery = window.matchMedia("(min-width: 861px)");
    const closeOnDesktop = (event) => {
      if (event.matches) setOpen(false);
    };
    if (desktopQuery.addEventListener) {
      desktopQuery.addEventListener("change", closeOnDesktop);
    } else {
      desktopQuery.addListener?.(closeOnDesktop);
    }
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    showInstallPrompt("native");
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    closeInstallPrompt();
  });

  window.addEventListener("load", () => {
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register(SERVICE_WORKER_URL, { updateViaCache: "none" }).catch(() => {
        // The website remains fully functional if registration is unavailable.
      });
    }

    if (isIos && !isStandalone && !wasDismissedRecently()) {
      window.setTimeout(() => showInstallPrompt("ios"), 1200);
    }
  });

  initMobileNavigation();
})();
