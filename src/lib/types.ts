export type DataType = 'text' | 'binary' | 'json';
export type ChecksumAlgo = 'crc32' | 'sha256';

export interface StartFrame {
  type: 'START';
  dataType: DataType;
  totalFrames: number;
  checksum: string;
  checksumAlgo: ChecksumAlgo;
}

export interface DataFrame {
  index: number;
  payload: string;
}

export interface EndFrame {
  type: 'END';
  checksum: string;
  totalFrames: number;
}

export type Frame = StartFrame | DataFrame | EndFrame;

export interface GeneratorConfig {
  data: string;
  dataType: DataType;
  checksumAlgo: ChecksumAlgo;
  chunkSize: number;
  intervalMs: number;
}

export interface ReaderState {
  started: boolean;
  expectedFrames: number;
  expectedChecksum: string;
  checksumAlgo: ChecksumAlgo;
  dataType: DataType;
  receivedFrames: Map<number, string>;
  completed: boolean;
  error: string | null;
}

