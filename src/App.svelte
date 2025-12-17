<script lang="ts">
  import { onMount } from 'svelte';
  import GeneratorTab from './components/GeneratorTab.svelte';
  import ReaderTab from './components/ReaderTab.svelte';

  let activeTab: 'generator' | 'reader' = 'generator';
  let isDark = false;

  onMount(() => {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme();
  });

  function applyTheme() {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  }

  function toggleTheme() {
    isDark = !isDark;
    applyTheme();
  }
</script>

<main>
  <button class="theme-toggle" on:click={toggleTheme} title="Toggle theme">
    {isDark ? '☀' : '●'}
  </button>
  <h1>QR Stream</h1>

  <nav class="tabs">
    <button
      class:active={activeTab === 'generator'}
      on:click={() => (activeTab = 'generator')}
    >
      Generator
    </button>
    <button
      class:active={activeTab === 'reader'}
      on:click={() => (activeTab = 'reader')}
    >
      Reader
    </button>
  </nav>

  <div class="tab-content">
    {#if activeTab === 'generator'}
      <GeneratorTab />
    {:else}
      <ReaderTab />
    {/if}
  </div>
</main>

