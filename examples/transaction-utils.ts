import {
  clusterApiUrl, Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction
} from '@solana/web3.js';

const environment = process.env.ENVIRONMENT || 'development';

const rpcUrl = process.env.RPC_URL
if (!rpcUrl) {
  throw new Error('RPC_URL is not set');
}

export const connection = new Connection(rpcUrl);

export async function prepareTransaction(
  instructions: TransactionInstruction[],
  payer: PublicKey
) {
  const blockhash = await connection
    .getLatestBlockhash({ commitment: 'max' })
    .then((res) => res.blockhash);
  const messageV0 = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions
  }).compileToV0Message();
  return new VersionedTransaction(messageV0);
}