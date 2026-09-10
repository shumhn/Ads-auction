/* eslint-disable @typescript-eslint/no-explicit-any -- decoded Anchor accounts use generated runtime shapes */
import { BorshAccountsCoder, Idl } from '@anchor-lang/core'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { Connection, PublicKey } from '@solana/web3.js'
import idl from '../anchor/target/idl/basic.json'

const rpc = process.env.SOLANA_RPC_URL
if (!rpc) throw new Error('SOLANA_RPC_URL is required')

const addresses = {
  campaign: new PublicKey(process.env.CAMPAIGN ?? 'AB9X2BkMXNe52AdipJRfsaUwMPiobsYyVdQsY7827615'),
  creative: new PublicKey(process.env.CREATIVE ?? 'BsVy4yvkq2hU4VEojsJGq9UE7ydRvJ3WJh2y7gfB8qvK'),
  proof: new PublicKey(process.env.PROOF ?? 'EvapCrH2XaUjkjZgvz8sqB66o1uEQPm9TXHoiGpSifos'),
}

function hashFile(hash: string) {
  const bytes = readFileSync(path.join(process.cwd(), '.data', 'uploads', hash))
  return createHash('sha256').update(bytes).digest('hex')
}

async function main() {
  const connection = new Connection(rpc!, 'confirmed')
  const coder = new BorshAccountsCoder(idl as Idl)
  const infos = await connection.getMultipleAccountsInfo(Object.values(addresses), 'confirmed')
  if (infos.some((info) => !info)) throw new Error('One or more campaign artifact accounts are missing')

  const campaign = coder.decode('Campaign', infos[0]!.data) as any
  const creative = coder.decode('CreativeSubmission', infos[1]!.data) as any
  const proof = coder.decode('FulfillmentProof', infos[2]!.data) as any
  const creativeHash = Buffer.from(creative.content_hash).toString('hex')
  const proofHash = Buffer.from(proof.content_hash).toString('hex')

  if (!Object.hasOwn(campaign.status, 'Live') || campaign.accepted_proofs !== 1) {
    throw new Error('Campaign publish/accepted-proof state mismatch')
  }
  if (!Object.hasOwn(creative.status, 'Approved')) throw new Error('Creative is not approved')
  if (!Object.hasOwn(proof.status, 'Accepted')) throw new Error('Proof is not accepted')
  if (hashFile(creativeHash) !== creativeHash) throw new Error('Creative bytes do not match the on-chain hash')
  if (hashFile(proofHash) !== proofHash) throw new Error('Proof bytes do not match the on-chain hash')

  console.log(
    JSON.stringify(
      {
        campaign: addresses.campaign.toBase58(),
        acceptedProofs: campaign.accepted_proofs,
        creative: { account: addresses.creative.toBase58(), hash: creativeHash, bytesVerified: true },
        proof: { account: addresses.proof.toBase58(), hash: proofHash, bytesVerified: true },
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
