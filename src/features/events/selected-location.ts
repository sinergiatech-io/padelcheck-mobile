export const DEFAULT_LOCATION_ID = 'buenos-aires'

let selectedLocationId = DEFAULT_LOCATION_ID

export function getSelectedLocationId(): string {
  return selectedLocationId
}

export function setSelectedLocationId(locationId: string): void {
  selectedLocationId = locationId
}
