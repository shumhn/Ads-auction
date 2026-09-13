import { StudioFeature } from '@/components/claimspot/studio-feature'

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string | string[] }>
}) {
  const { campaign } = await searchParams
  const campaignAddress = typeof campaign === 'string' ? campaign : undefined

  return <StudioFeature mode="operations" campaignAddress={campaignAddress} />
}
