<script lang="ts">
  import { onMount } from 'svelte';
  import { Moon, Sun } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';

  const storageKey = 'course-atlas-theme';
  let dark = $state(document.documentElement.classList.contains('dark'));
  let preference: 'light' | 'dark' | null = null;
  const label = $derived(dark ? '切换到浅色模式' : '切换到深色模式');

  function applyTheme(isDark: boolean) {
    dark = isDark;
    document.documentElement.classList.toggle('dark', isDark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#121c17' : '#f7f8f4');
  }

  function toggleTheme() {
    preference = dark ? 'light' : 'dark';
    applyTheme(preference === 'dark');
    try { localStorage.setItem(storageKey, preference); } catch { /* Keep the choice for this visit when storage is unavailable. */ }
  }

  onMount(() => {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'light' || stored === 'dark') preference = stored;
    } catch { /* Follow the system when storage is unavailable. */ }

    const syncTheme = () => applyTheme(preference === null ? systemTheme.matches : preference === 'dark');
    const syncStorage = (event: StorageEvent) => {
      if (event.key !== storageKey && event.key !== null) return;
      preference = event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : null;
      syncTheme();
    };
    syncTheme();
    systemTheme.addEventListener('change', syncTheme);
    window.addEventListener('storage', syncStorage);
    return () => {
      systemTheme.removeEventListener('change', syncTheme);
      window.removeEventListener('storage', syncStorage);
    };
  });
</script>

<Button variant="ghost" size="icon-sm" aria-label={label} title={label} onclick={toggleTheme}>
  {#if dark}<Sun aria-hidden="true" />{:else}<Moon aria-hidden="true" />{/if}
</Button>
