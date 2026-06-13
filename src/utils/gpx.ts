import type { TrackPoint } from '../types/track'

export class GpxParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GpxParseError'
  }
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

export function validateGpxExtension(fileName: string): void {
  if (!fileName.toLowerCase().endsWith('.gpx')) {
    throw new GpxParseError('Файл должен иметь расширение .gpx')
  }
}

export function parseGpx(xmlText: string): TrackPoint[] {
  const parser = new DOMParser()
  const document = parser.parseFromString(xmlText, 'application/xml')
  const parseError = document.querySelector('parsererror')

  if (parseError) {
    throw new GpxParseError('Некорректная XML-структура GPX-файла')
  }

  const root = document.documentElement
  if (!root || root.tagName.toLowerCase() !== 'gpx') {
    throw new GpxParseError('Файл не содержит корневой элемент <gpx>')
  }

  const trackPoints = Array.from(document.getElementsByTagName('trkpt'))
  if (trackPoints.length === 0) {
    throw new GpxParseError('В файле не найдены точки трека (<trkpt>)')
  }

  const points: TrackPoint[] = []

  for (const node of trackPoints) {
    const lat = Number.parseFloat(node.getAttribute('lat') ?? '')
    const lon = Number.parseFloat(node.getAttribute('lon') ?? '')

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      throw new GpxParseError('Обнаружены точки с некорректными координатами')
    }

    const eleNode = node.getElementsByTagName('ele')[0]
    const timeNode = node.getElementsByTagName('time')[0]

    const eleText = eleNode?.textContent?.trim()
    const ele = eleText ? Number.parseFloat(eleText) : undefined

    if (eleText && Number.isNaN(ele!)) {
      throw new GpxParseError('Обнаружена точка с некорректной высотой (<ele>)')
    }

    const timeText = timeNode?.textContent?.trim()
    const time = timeText ? new Date(timeText) : undefined

    if (timeText && Number.isNaN(time!.getTime())) {
      throw new GpxParseError('Обнаружена точка с некорректным временем (<time>)')
    }

    points.push({ lat, lon, ele, time })
  }

  return points
}

export function buildExportFileName(points: TrackPoint[]): string {
  const trackTime = points.find((point) => point.time)?.time ?? new Date()
  const month = MONTH_NAMES[trackTime.getMonth()]
  const day = trackTime.getDate()
  const year = trackTime.getFullYear()
  const hours = pad(trackTime.getHours())
  const minutes = pad(trackTime.getMinutes())

  return `${month}_${day}_${year}_at_${hours}:${minutes}.gpx`
}

export function serializeGpx(points: TrackPoint[]): string {
  const trackPoints = points
    .map((point) => {
      const ele = point.ele !== undefined ? `\n        <ele>${point.ele}</ele>` : ''
      const time =
        point.time !== undefined ? `\n        <time>${point.time.toISOString()}</time>` : ''

      return `      <trkpt lat="${point.lat}" lon="${point.lon}">${ele}${time}
      </trkpt>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="PathyEditor" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Exported Route</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>
`
}

export function downloadGpx(points: TrackPoint[], fileName: string): void {
  const content = serializeGpx(points)
  const blob = new Blob([content], { type: 'application/gpx+xml' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
