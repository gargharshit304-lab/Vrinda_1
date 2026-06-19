const TOAST_EVENT_NAME = "vrinda-toast";

export const showToast = (message, tone = "neutral") => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT_NAME, {
      detail: {
        message,
        tone
      }
    })
  );
};

export const getToastEventName = () => TOAST_EVENT_NAME;