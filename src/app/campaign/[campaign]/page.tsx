import { CampaignPublicFeature } from '@/components/claimspot/campaign-public-feature'

export default async function CampaignPage({ params }: { params: Promise<{ campaign: string }> }) {
  const { campaign } = await params
  return <CampaignPublicFeature campaignAddress={campaign} />
}
