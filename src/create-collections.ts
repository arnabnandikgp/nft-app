import {
  createNft,
  fetchDigitalAsset,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";

import {
  airdropIfRequired,
  getExplorerLink,
  getKeypairFromFile,
} from "@solana-developers/helpers";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";

import { Connection, LAMPORTS_PER_SOL, clusterApiUrl } from "@solana/web3.js";
import {
  generateSigner,
  keypairIdentity,
  percentAmount,
} from "@metaplex-foundation/umi";

async function createCollection() {
  const connection = new Connection(clusterApiUrl("devnet"));

  const user = await getKeypairFromFile();
  // get the user's balance and airdrop if needed
  await airdropIfRequired(
    connection,
    user.publicKey,
    1 * LAMPORTS_PER_SOL,
    0.5 * LAMPORTS_PER_SOL
  );

  // create a Umi instance
  const umi = createUmi(connection.rpcEndpoint);
  umi.use(mplTokenMetadata());

  console.log("Loaded user", user.publicKey.toBase58());
  // create a Umi instance for the user
  const umiUser = umi.eddsa.createKeypairFromSecretKey(user.secretKey);
  umi.use(keypairIdentity(umiUser)); // set the user's keypair as the identity so that we can use it to sign transactions

  console.log("Set up Umi instance for user");
  // a new random signer for the collection mint
  const collectionMint = generateSigner(umi);

  console.log("Collection mint", collectionMint.publicKey);

  // create a new collection nft since the umi instance is passed it actually makes an ATA for
  // for the user and mints the NFT onto that ATA.
  const transaction = await createNft(umi, {
    mint: collectionMint,
    name: "somethingrandom",
    symbol: "MC2",
    uri: "https://raw.githubusercontent.com/arnabnandikgp/nft-app/refs/heads/main/nft-data.json",
    sellerFeeBasisPoints: percentAmount(0),
    isCollection: true,
  });

  console.log(" transaction", transaction);
  const { signature, result } = await transaction.sendAndConfirm(umi, {
    confirm: { commitment: "confirmed" },
  });
  console.log("Transaction sent and confirmed", signature);

  const createdCollectionNft = await fetchDigitalAsset(
    umi,
    collectionMint.publicKey,
    { commitment: "confirmed", minContextSlot: result.context.slot }
  );

  console.log(
    `Created Collection 📦! Address is ${getExplorerLink(
      "address",
      createdCollectionNft.mint.publicKey,
      "devnet"
    )}`
  );
}

createCollection();
