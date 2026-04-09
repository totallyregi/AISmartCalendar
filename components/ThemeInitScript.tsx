import { THEME_STORAGE_KEY } from "@/lib/theme";

/** Runs before paint so the chosen theme matches SSR class on <html> (default: light). */
export function ThemeInitScript() {
  const key = JSON.stringify(THEME_STORAGE_KEY);
  return (
    <script
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var k=${key};if(localStorage.getItem(k)==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`,
      }}
    />
  );
}
