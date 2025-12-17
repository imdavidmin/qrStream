# QR Stream

Stream data through a sequence of QR codes with checksum verification.

## Usage

```bash
npm install
npm run dev
```

## Features

**Generator Mode:**
- Input data (text, JSON, or binary)
- Configurable chunk size and playback interval
- CRC32 or SHA-256 checksum
- Playback controls (play/pause, step through frames)

**Reader Mode:**
- Camera-based QR scanning
- Real-time progress tracking
- Checksum verification
- Error reporting with frame details

## Protocol

- **START frame**: `{ type: "START", dataType, totalFrames, checksum, checksumAlgo }`
- **DATA frames**: `{ index, payload }`
- **END frame**: `{ type: "END", checksum, totalFrames }`

