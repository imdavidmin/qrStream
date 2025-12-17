<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import jsQR from 'jsqr';
  import type { ReaderState, StartFrame, DataFrame, EndFrame } from '../lib/types';
  import { parseFrame, isStartFrame, isEndFrame, isDataFrame } from '../lib/protocol';
  import { computeChecksum } from '../lib/checksum';

  let video: HTMLVideoElement;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let stream: MediaStream | null = null;
  let animationId: number | null = null;
  let isScanning = false;

  let state: ReaderState = {
    started: false,
    expectedFrames: 0,
    expectedChecksum: '',
    checksumAlgo: 'crc32',
    dataType: 'text',
    receivedFrames: new Map(),
    completed: false,
    error: null,
  };

  let lastScannedData = '';
  let resultData = '';
  let statusMessage = 'Click "Start Scanning" to begin';

  function resetState() {
    state = {
      started: false,
      expectedFrames: 0,
      expectedChecksum: '',
      checksumAlgo: 'crc32',
      dataType: 'text',
      receivedFrames: new Map(),
      completed: false,
      error: null,
    };
    lastScannedData = '';
    resultData = '';
    statusMessage = 'Waiting for START frame...';
  }

  async function startScanning() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      video.srcObject = stream;
      await video.play();
      isScanning = true;
      resetState();
      scanLoop();
    } catch (err) {
      statusMessage = `Camera error: ${err}`;
    }
  }

  function stopScanning() {
    isScanning = false;
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
  }

  function scanLoop() {
    if (!isScanning || !video || !canvas || !ctx) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code && code.data !== lastScannedData) {
        lastScannedData = code.data;
        processFrame(code.data);
      }
    }

    animationId = requestAnimationFrame(scanLoop);
  }

  async function processFrame(raw: string) {
    const frame = parseFrame(raw);
    if (!frame) return;

    if (isStartFrame(frame)) {
      handleStartFrame(frame);
    } else if (isDataFrame(frame)) {
      handleDataFrame(frame);
    } else if (isEndFrame(frame)) {
      await handleEndFrame(frame);
    }
  }

  function handleStartFrame(frame: StartFrame) {
    state.started = true;
    state.expectedFrames = frame.totalFrames;
    state.expectedChecksum = frame.checksum;
    state.checksumAlgo = frame.checksumAlgo;
    state.dataType = frame.dataType;
    state.receivedFrames = new Map();
    state.completed = false;
    state.error = null;
    statusMessage = `Started: expecting ${frame.totalFrames} data frames (${frame.dataType}, ${frame.checksumAlgo})`;
  }

  function handleDataFrame(frame: DataFrame) {
    if (!state.started) {
      statusMessage = 'Received DATA before START frame';
      return;
    }
    if (!state.receivedFrames.has(frame.index)) {
      state.receivedFrames.set(frame.index, frame.payload);
      state.receivedFrames = state.receivedFrames; // trigger reactivity
      updateProgress();
    }
  }

  function updateProgress() {
    const received = state.receivedFrames.size;
    const expected = state.expectedFrames;
    statusMessage = `Received ${received}/${expected} data frames`;
  }

  async function handleEndFrame(frame: EndFrame) {
    if (!state.started) {
      statusMessage = 'Received END before START frame';
      return;
    }

    // Verify frame count matches
    if (frame.totalFrames !== state.expectedFrames) {
      state.error = `Frame count mismatch: START said ${state.expectedFrames}, END said ${frame.totalFrames}`;
      statusMessage = state.error;
      return;
    }

    // Verify checksum matches
    if (frame.checksum !== state.expectedChecksum) {
      state.error = `Checksum mismatch between START and END frames`;
      statusMessage = state.error;
      return;
    }

    // Check if we have all frames
    const missing: number[] = [];
    for (let i = 0; i < state.expectedFrames; i++) {
      if (!state.receivedFrames.has(i)) {
        missing.push(i);
      }
    }

    if (missing.length > 0) {
      state.error = `Missing ${missing.length} frames: ${missing.join(', ')}. Received ${state.receivedFrames.size}/${state.expectedFrames}`;
      statusMessage = state.error;
      return;
    }

    // Reconstruct data
    let reconstructed = '';
    for (let i = 0; i < state.expectedFrames; i++) {
      reconstructed += state.receivedFrames.get(i) ?? '';
    }

    // Verify checksum
    const actualChecksum = await computeChecksum(reconstructed, state.checksumAlgo);
    if (actualChecksum !== state.expectedChecksum) {
      state.error = `Checksum verification failed. Expected: ${state.expectedChecksum}, Got: ${actualChecksum}. Received ${state.receivedFrames.size}/${state.expectedFrames} frames.`;
      statusMessage = state.error;
      return;
    }

    // Success
    state.completed = true;
    resultData = reconstructed;
    statusMessage = `Complete! Received ${state.expectedFrames} frames, checksum verified.`;
    stopScanning();
  }

  onMount(() => {
    ctx = canvas.getContext('2d');
  });

  onDestroy(() => {
    stopScanning();
  });

  $: receivedCount = state.receivedFrames.size;
</script>

<section class="reader">
  <div class="camera-container">
    <video bind:this={video} playsinline muted></video>
    <canvas bind:this={canvas} class="hidden"></canvas>
  </div>

  <div class="status">
    <p class:error={state.error !== null}>{statusMessage}</p>
  </div>

  {#if state.started && !state.completed}
    <div class="progress">
      <div class="progress-bar">
        <div
          class="progress-fill"
          style="width: {(receivedCount / state.expectedFrames) * 100}%"
        ></div>
      </div>
      <span>{receivedCount} / {state.expectedFrames}</span>
    </div>
  {/if}

  <div class="actions">
    {#if !isScanning}
      <button on:click={startScanning}>Start Scanning</button>
    {:else}
      <button on:click={stopScanning}>Stop Scanning</button>
    {/if}
    <button on:click={resetState} disabled={isScanning}>Reset</button>
  </div>

  {#if state.completed}
    <div class="result">
      <h3>Received Data ({state.dataType}):</h3>
      <pre>{resultData}</pre>
    </div>
  {/if}
</section>

