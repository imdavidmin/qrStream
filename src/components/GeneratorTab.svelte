<script lang="ts">
  import QRCode from 'qrcode';
  import type { DataType, ChecksumAlgo } from '../lib/types';
  import { generateFrames } from '../lib/protocol';

  let data = '';
  let dataType: DataType = 'text';
  let checksumAlgo: ChecksumAlgo = 'crc32';
  let chunkSize = 500;
  let intervalMs = 500;

  let frames: string[] = [];
  let currentFrameIndex = 0;
  let isPlaying = false;
  let qrDataUrl = '';
  let intervalId: number | null = null;
  let qrSize = 300;

  async function generateQRFrames() {
    if (!data.trim()) return;
    frames = await generateFrames(data, dataType, checksumAlgo, chunkSize);
    currentFrameIndex = 0;
    await renderCurrentFrame();
  }

  async function renderCurrentFrame() {
    if (frames.length === 0) return;
    qrDataUrl = await QRCode.toDataURL(frames[currentFrameIndex], {
      width: qrSize,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
  }

  function adjustSize(delta: number) {
    qrSize = Math.max(150, Math.min(600, qrSize + delta));
    if (frames.length > 0) {
      renderCurrentFrame();
    }
  }

  function startPlayback() {
    if (frames.length === 0) return;
    isPlaying = true;
    intervalId = window.setInterval(async () => {
      if (currentFrameIndex >= frames.length - 1) {
        // Stop at END frame, don't loop
        stopPlayback();
        return;
      }
      currentFrameIndex++;
      await renderCurrentFrame();
    }, intervalMs);
  }

  function stopPlayback() {
    isPlaying = false;
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function togglePlayback() {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }

  function goToFrame(index: number) {
    stopPlayback();
    currentFrameIndex = index;
    renderCurrentFrame();
  }

  $: frameLabel = frames.length > 0
    ? currentFrameIndex === 0
      ? 'START'
      : currentFrameIndex === frames.length - 1
        ? 'END'
        : `DATA ${currentFrameIndex}/${frames.length - 2}`
    : '';
</script>

<section class="generator">
  <div class="input-group">
    <label class="full-width">
      Data:
      <textarea bind:value={data} rows="6" placeholder="Enter data to encode..."></textarea>
    </label>
  </div>

  <details class="options">
    <summary>Options</summary>
    <div class="options-content">
      <div class="input-group">
        <label>
          Data Type:
          <select bind:value={dataType}>
            <option value="text">Text</option>
            <option value="json">JSON</option>
            <option value="binary">Binary</option>
          </select>
        </label>

        <label>
          Checksum:
          <select bind:value={checksumAlgo}>
            <option value="crc32">CRC32 (fast)</option>
            <option value="sha256">SHA-256 (robust)</option>
          </select>
        </label>

        <label>
          Chunk Size:
          <input type="number" bind:value={chunkSize} min="50" max="2000" step="50" />
        </label>

        <label>
          Interval (ms):
          <input type="number" bind:value={intervalMs} min="100" max="5000" step="100" />
        </label>
      </div>
    </div>
  </details>

  <div class="actions">
    <button on:click={generateQRFrames} disabled={!data.trim()}>
      Generate QR Sequence
    </button>
  </div>

  {#if frames.length > 0}
    <div class="qr-display">
      <div class="qr-container">
        <img src={qrDataUrl} alt="QR Code" />
      </div>

      <div class="frame-info">
        <span class="frame-label">{frameLabel}</span>
        <span class="frame-counter">
          Frame {currentFrameIndex + 1} of {frames.length}
        </span>
      </div>

      <div class="playback-controls">
        <button on:click={() => goToFrame(0)} disabled={currentFrameIndex === 0}>
          ⏮
        </button>
        <button on:click={() => goToFrame(Math.max(0, currentFrameIndex - 1))} disabled={currentFrameIndex === 0}>
          ◀
        </button>
        <button on:click={togglePlayback} class="play-btn">
          {isPlaying ? '⏹' : '▶'}
        </button>
        <button on:click={() => goToFrame(Math.min(frames.length - 1, currentFrameIndex + 1))} disabled={currentFrameIndex === frames.length - 1}>
          ▶
        </button>
        <button on:click={() => goToFrame(frames.length - 1)} disabled={currentFrameIndex === frames.length - 1}>
          ⏭
        </button>
      </div>

      <div class="size-controls">
        <button on:click={() => adjustSize(-50)} disabled={qrSize <= 150}>−</button>
        <span>{qrSize}px</span>
        <button on:click={() => adjustSize(50)} disabled={qrSize >= 600}>+</button>
      </div>
    </div>
  {/if}
</section>

