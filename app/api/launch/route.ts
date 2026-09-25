import { NextRequest, NextResponse } from "next/server";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  Transaction,
} from "@solana/web3.js";
import { PUMP_SDK } from "@pump-fun/pump-sdk";
import bs58 from "bs58";

export const runtime = "nodejs";
export const maxDuration = 60;

const RPC_URL =
  process.env.SOLANA_RPC ?? "https://api.mainnet-beta.solana.com";

const METADATA_ENDPOINTS = [
  "https://pump.fun/api/ipfs",
  "https://frontend-api.pump.fun/ipfs",
  "https://frontend-api-v3.pump.fun/ipfs",
];

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MIN_BALANCE_SOL = 0.005;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong.";
}

function getDeployer(): Keypair {
  const raw = process.env.SOLANA_PRIVATE_KEY;
  if (!raw) {
    throw new Error(
      "Deployer wallet is not configured. Set SOLANA_PRIVATE_KEY."
    );
  }
  const trimmed = raw.trim();
  const secret = trimmed.startsWith("[")
    ? Uint8Array.from(JSON.parse(trimmed) as number[])
    : bs58.decode(trimmed);
  return Keypair.fromSecretKey(secret);
}

async function uploadMetadata(
  name: string,
  symbol: string,
  image: File
): Promise<string> {
  let lastError: unknown = null;
  for (const endpoint of METADATA_ENDPOINTS) {
    try {
      const form = new FormData();
      form.append("file", image, image.name || "token.png");
      form.append("name", name);
      form.append("symbol", symbol);
      form.append("description", "");
      form.append("showName", "true");
      const res = await fetch(endpoint, { method: "POST", body: form });
      if (!res.ok) throw new Error(`metadata upload failed (${res.status})`);
      const data = (await res.json()) as { metadataUri?: string };
      if (!data.metadataUri) throw new Error("metadata upload returned no URI");
      return data.metadataUri;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Metadata upload failed.");
}

export async function GET() {
  try {
    const deployer = getDeployer();
    const connection = new Connection(RPC_URL, "confirmed");
    const lamports = await connection.getBalance(deployer.publicKey);
    return NextResponse.json({
      address: deployer.publicKey.toBase58(),
      balanceSol: lamports / LAMPORTS_PER_SOL,
    });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const name = String(form.get("name") ?? "").trim();
    const symbol = String(form.get("symbol") ?? "")
      .trim()
      .toUpperCase();
    const image = form.get("image");

    if (!name || name.length > 32) {
      return NextResponse.json(
        { error: "Name is required (max 32 characters)." },
        { status: 400 }
      );
    }
    if (!symbol || symbol.length > 10) {
      return NextResponse.json(
        { error: "Ticker is required (max 10 characters)." },
        { status: 400 }
      );
    }
    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json({ error: "Image is required." }, { status: 400 });
    }
    if (image.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Image must be under 10 MB." },
        { status: 400 }
      );
    }

    const deployer = getDeployer();
    const connection = new Connection(RPC_URL, "confirmed");

    const balance = await connection.getBalance(deployer.publicKey);
    if (balance < MIN_BALANCE_SOL * LAMPORTS_PER_SOL) {
      return NextResponse.json(
        {
          error: `Deployer wallet is out of SOL. Send SOL to ${deployer.publicKey.toBase58()} and try again.`,
        },
        { status: 402 }
      );
    }

    const uri = await uploadMetadata(name, symbol, image);

    const mint = Keypair.generate();
    const createIx = await PUMP_SDK.createV2Instruction({
      mint: mint.publicKey,
      name,
      symbol,
      uri,
      creator: deployer.publicKey,
      user: deployer.publicKey,
      mayhemMode: false,
    });

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    const tx = new Transaction({
      feePayer: deployer.publicKey,
      blockhash,
      lastValidBlockHeight,
    });
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
    tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }));
    tx.add(createIx);
    tx.sign(deployer, mint);

    const signature = await connection.sendRawTransaction(tx.serialize(), {
      maxRetries: 3,
    });
    await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed"
    );

    return NextResponse.json({
      mint: mint.publicKey.toBase58(),
      signature,
      pumpUrl: `https://pump.fun/${mint.publicKey.toBase58()}`,
      solscanUrl: `https://solscan.io/tx/${signature}`,
    });
  } catch (err) {
    let message = errorMessage(err);
    if (/insufficient|no record of a prior credit|custom":\s*1\b/i.test(message)) {
      try {
        message = `Deployer wallet is out of SOL. Send SOL to ${getDeployer().publicKey.toBase58()} and try again.`;
      } catch {
        // keep original message
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
