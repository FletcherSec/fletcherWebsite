// Maps a writeup's freeform `platform` string to a short badge key + label.
// Add a case here when a new platform is introduced; unknown platforms fall
// back to a generic "Other" badge rather than breaking the build.
export type PlatformKey = 'HTB' | 'PG' | 'Other';

export function platformKey(platform: string): PlatformKey {
  if (platform === 'Hack The Box') return 'HTB';
  if (platform === 'Proving Grounds') return 'PG';
  return 'Other';
}
