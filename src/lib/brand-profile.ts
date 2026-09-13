export type BrandProfile = {
  wallet: string
  name: string
  logoHash: string
  updatedAt: number
}

export function brandProfileMessage(wallet: string, name: string, logoHash: string, timestamp: number) {
  return `Atrium.ads primary brand logo\nWallet: ${wallet}\nBrand: ${name}\nLogo SHA-256: ${logoHash}\nTimestamp: ${timestamp}`
}

export async function fetchBrandProfiles(wallets: string[]): Promise<Record<string, BrandProfile>> {
  if (wallets.length === 0) return {}
  const response = await fetch(`/api/brands?wallets=${encodeURIComponent(wallets.join(','))}`, { cache: 'no-store' })
  if (!response.ok) throw new Error('Brand logos could not be loaded')
  const data = (await response.json()) as { profiles: Record<string, BrandProfile> }
  return data.profiles
}
