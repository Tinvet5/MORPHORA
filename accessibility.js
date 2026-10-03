(() => {
  "use strict";

  const FOCUSABLE_SELECTOR = [
    'a[href]:not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[contenteditable="true"]:not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(",");

  const trapStack = [];
  let announceTimer = null;

  function isVisible(element) {
    if (!(element instanceof HTMLElement)) return false;
    if (element.hidden) return false;
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") return false;
    return element.getClientRects().length > 0;
  }

  function getFocusable(container) {
    if (!(container instanceof HTMLElement)) return [];
    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isVisible);
  }

  function topTrap() {
    return trapStack[trapStack.length - 1] || null;
  }

  function handleTrapKeydown(event) {
    const trap = topTrap();
    if (!trap) return;

    if (event.key === "Escape" && typeof trap.onEscape === "function") {
      event.preventDefault();
      event.stopPropagation();
      trap.onEscape();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = getFocusable(trap.container);
    if (focusable.length === 0) {
      event.preventDefault();
      trap.container.focus({ preventScroll: true });
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !trap.container.contains(active))) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  document.addEventListener("keydown", handleTrapKeydown, true);

  function activateFocusTrap(container, {
    initialFocus = null,
    returnFocus = document.activeElement,
    onEscape = null
  } = {}) {
    if (!(container instanceof HTMLElement)) return null;

    const existingIndex = trapStack.findIndex((trap) => trap.container === container);
    if (existingIndex >= 0) trapStack.splice(existingIndex, 1);

    if (!container.hasAttribute("tabindex")) container.setAttribute("tabindex", "-1");

    const trap = { container, returnFocus, onEscape };
    trapStack.push(trap);
    document.body.classList.add("has-focus-trap");

    requestAnimationFrame(() => {
      const target = initialFocus instanceof HTMLElement && isVisible(initialFocus)
        ? initialFocus
        : getFocusable(container)[0] || container;
      target.focus({ preventScroll: true });
    });

    return trap;
  }

  function releaseFocusTrap(container, { restoreFocus = true } = {}) {
    const index = trapStack.findIndex((trap) => trap.container === container);
    if (index < 0) return;

    const [trap] = trapStack.splice(index, 1);
    if (trapStack.length === 0) document.body.classList.remove("has-focus-trap");

    if (
      restoreFocus &&
      trap.returnFocus instanceof HTMLElement &&
      trap.returnFocus.isConnected &&
      !trap.returnFocus.hasAttribute("disabled")
    ) {
      requestAnimationFrame(() => trap.returnFocus.focus({ preventScroll: true }));
    }
  }

  function announce(message, { assertive = false, delay = 30 } = {}) {
    const region = document.getElementById("globalLiveRegion");
    if (!region || !message) return;

    window.clearTimeout(announceTimer);
    region.setAttribute("aria-live", assertive ? "assertive" : "polite");
    region.textContent = "";
    announceTimer = window.setTimeout(() => {
      region.textContent = String(message);
    }, delay);
  }

  function setExpanded(button, expanded) {
    if (button instanceof HTMLElement) {
      button.setAttribute("aria-expanded", String(Boolean(expanded)));
    }
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function isCoarsePointer() {
    return window.matchMedia("(pointer: coarse)").matches;
  }

  window.MorphoraA11y = Object.freeze({
    activateFocusTrap,
    announce,
    getFocusable,
    isCoarsePointer,
    prefersReducedMotion,
    releaseFocusTrap,
    setExpanded
  });
})();
