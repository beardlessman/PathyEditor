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
  movingAverage: MovingAverageSettings
  rdp: RdpSettings
  chaikin: ChaikinSettings
}

export function createDefaultFilterSettings(): FilterSettings {
  return {
    movingAverage: { enabled: false, windowSize: 5 },
    rdp: { enabled: false, tolerance: 1.0 },
    chaikin: { enabled: false, iterations: 1 },
  }
}

export function cloneFilterSettings(settings: FilterSettings): FilterSettings {
  return {
    movingAverage: { ...settings.movingAverage },
    rdp: { ...settings.rdp },
    chaikin: { ...settings.chaikin },
  }
}
