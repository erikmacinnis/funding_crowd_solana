import * as anchor from "@project-serum/anchor";
const {SystemProgram, Keypair} = anchor.web3;
import { utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import assert from "assert";
import { FundingCrowd } from "../target/types/funding_crowd";
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";

describe("funding_crowd", () => {

  // local I think means that it is using a local wallet
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);
  const program = anchor.workspace.FundingCrowd as anchor.Program<FundingCrowd>;
  // const userKeypair = Keypair.generate()
  const fundingCrowdPDA = Keypair.generate()
  // const [fundingCrowdPDA, _] = findProgramAddressSync(
  //   [
  //     utf8.encode("CAMPAIGN_DEMO"),
  //     userKeypair.publicKey.toBuffer()
  //   ], 
  //   program.programId
  // );

  it("Creates a campaign", async () => {
    // Add your test here.
    const tx = await program.methods.create("game", "fun game")
    .accounts({
      campaign: fundingCrowdPDA.publicKey,
      user: provider.publicKey,
      systemProgram: SystemProgram.programId
    })
    // fundingCrowdPDA can be used to sign cuz it is the owner 
    // This is a good way to test the logic before coding
    .signers([fundingCrowdPDA])
    .rpc();
    
    console.log("Your transaction signature", tx);

    // grabbing the account
    const fundingCrowdAccount = await program.account.campaign.fetch(fundingCrowdPDA.publicKey)
    assert.ok(fundingCrowdAccount.name.match("game"))
    assert.ok(fundingCrowdAccount.description.match("fun game"))
  });
});
