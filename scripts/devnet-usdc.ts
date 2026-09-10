import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'

export const DEVNET_USDC_MINT = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr')
export const DEVNET_USDC_FAUCET_PROGRAM = new PublicKey('4sN8PnN2ki2W4TFXAfzR645FWs8nimmsYeNtxM8RBK6A')

const AIRDROP_DISCRIMINATOR = [113, 173, 36, 238, 38, 152, 22, 117]

export async function requestDevnetUsdc(connection: Connection, payer: Keypair, receiver: PublicKey, amount: bigint) {
  const [mint, bump] = PublicKey.findProgramAddressSync([Buffer.from('faucet-mint')], DEVNET_USDC_FAUCET_PROGRAM)
  if (!mint.equals(DEVNET_USDC_MINT)) throw new Error('Shared devnet USDC faucet mint derivation changed')

  const destination = getAssociatedTokenAddressSync(mint, receiver)
  const data = Buffer.alloc(17)
  Buffer.from(AIRDROP_DISCRIMINATOR).copy(data, 0)
  data.writeUInt8(bump, 8)
  data.writeBigUInt64LE(amount * 1_000_000n, 9)

  const transaction = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(
      payer.publicKey,
      destination,
      receiver,
      mint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    ),
    new TransactionInstruction({
      programId: DEVNET_USDC_FAUCET_PROGRAM,
      keys: [
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: destination, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: receiver, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ],
      data,
    }),
  )
  const signature = await sendAndConfirmTransaction(connection, transaction, [payer], { commitment: 'confirmed' })
  return { signature, destination }
}
