export interface StopFilterSettings {
  enabled: boolean
  radius: number
  durationSeconds: number
}

export interface MovingAverageSettings {
  enabled: boolean
  windowSize: number
}

export interface RdpSettings {
  enabled: boolean
  tolerance: number
}

export interface ChaikinSettings {
  enabled: boolean
  iterations: number
}

export interface FilterSettings {
  stopFilter: StopFilterSettings
  movingAverage: MovingAverageSettings
  rdp: RdpSettings
  chaikin: ChaikinSettings
}

export function createDefaultFilterSettings(): FilterSettings {
  return {
    stopFilter: { enabled: false, radius: 40, durationSeconds: 60 },
    movingAverage: { enabled: false, windowSize: 5 },
    rdp: { enabled: false, tolerance: 1.0 },
    chaikin: { enabled: false, iterations: 1 },
  }
}

export function cloneFilterSettings(settings: FilterSettings): FilterSettings {
  return {
    stopFilter: { ...settings.stopFilter },
    movingAverage: { ...settings.movingAverage },
    rdp: { ...settings.rdp },
    chaikin: { ...settings.chaikin },
  }
}

export function formatStopDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60
    return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}`
  }

  return `${minutes} ${minutes === 1 ? 'минута' : minutes < 5 ? 'минуты' : 'минут'}`
}
