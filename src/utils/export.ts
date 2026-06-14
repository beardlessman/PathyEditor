import JSZip from 'jszip'
import type { TrackPoint } from '../types/track'
import { downloadGpx, serializeGpx } from './gpx'

const SEQUENTIAL_DOWNLOAD_DELAY_MS = 400

export interface ExportTrackPayload {
  points: TrackPoint[]
  originalFileName: string
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function downloadSequential(tracks: ExportTrackPayload[]): void {
  tracks.forEach((track, index) => {
    window.setTimeout(() => {
      downloadGpx(track.points, track.originalFileName)
    }, index * SEQUENTIAL_DOWNLOAD_DELAY_MS)
  })
}

async function downloadZip(tracks: ExportTrackPayload[]): Promise<void> {
  const zip = new JSZip()

  for (const track of tracks) {
    zip.file(track.originalFileName, serializeGpx(track.points))
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, 'processed_tracks.zip')
}

export async function exportSelectedTracks(tracks: ExportTrackPayload[]): Promise<void> {
  if (tracks.length === 0) return

  if (tracks.length <= 3) {
    downloadSequential(tracks)
    return
  }

  await downloadZip(tracks)
}
