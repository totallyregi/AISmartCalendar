export const CLASS_SECTIONS_UPDATED_EVENT = "class-sections-updated";

export function notifyClassSectionsUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CLASS_SECTIONS_UPDATED_EVENT));
}
