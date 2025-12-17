import type {
  StartFrame,
  DataFrame,
  EndFrame,
  DataType,
  ChecksumAlgo,
} from './types';
import { computeChecksum } from './checksum';

export function createStartFrame(
  dataType: DataType,
  totalFrames: number,
  checksum: string,
  checksumAlgo: ChecksumAlgo
): string {
  const frame: StartFrame = {
    type: 'START',
    dataType,
    totalFrames,
    checksum,
    checksumAlgo,
  };
  return JSON.stringify(frame);
}

export function createDataFrame(index: number, payload: string): string {
  const frame: DataFrame = { index, payload };
  return JSON.stringify(frame);
}

export function createEndFrame(
  checksum: string,
  totalFrames: number
): string {
  const frame: EndFrame = {
    type: 'END',
    checksum,
    totalFrames,
  };
  return JSON.stringify(frame);
}

export function chunkData(data: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }
  return chunks;
}

export async function generateFrames(
  data: string,
  dataType: DataType,
  checksumAlgo: ChecksumAlgo,
  chunkSize: number
): Promise<string[]> {
  const chunks = chunkData(data, chunkSize);
  const checksum = await computeChecksum(data, checksumAlgo);
  const totalDataFrames = chunks.length;

  const frames: string[] = [];

  // START frame
  frames.push(createStartFrame(dataType, totalDataFrames, checksum, checksumAlgo));

  // DATA frames
  for (let i = 0; i < chunks.length; i++) {
    frames.push(createDataFrame(i, chunks[i]));
  }

  // END frame
  frames.push(createEndFrame(checksum, totalDataFrames));

  return frames;
}

export function parseFrame(raw: string): StartFrame | DataFrame | EndFrame | null {
  try {
    const obj = JSON.parse(raw);
    
    // Check if it's a START frame
    if (obj.type === 'START') {
      return obj as StartFrame;
    }
    
    // Check if it's an END frame
    if (obj.type === 'END') {
      return obj as EndFrame;
    }
    
    // Check if it's a DATA frame (has index and payload, no type)
    if (typeof obj.index === 'number' && typeof obj.payload === 'string') {
      return obj as DataFrame;
    }
    
    return null;
  } catch {
    return null;
  }
}

export function isStartFrame(frame: StartFrame | DataFrame | EndFrame): frame is StartFrame {
  return 'type' in frame && frame.type === 'START';
}

export function isEndFrame(frame: StartFrame | DataFrame | EndFrame): frame is EndFrame {
  return 'type' in frame && frame.type === 'END';
}

export function isDataFrame(frame: StartFrame | DataFrame | EndFrame): frame is DataFrame {
  return !('type' in frame) && 'index' in frame && 'payload' in frame;
}

