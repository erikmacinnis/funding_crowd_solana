import {useEffect, useState} from 'react';
import idl from './idl.json'
import {Connection, PublicKey, clusterApiUrl} from "@solana/web3.js";
import {Program, AnchorProvider, web3, utils, BN} from "@project-serum/anchor";
import {Buffer} from "buffer"
window.Buffer = Buffer
const programId = new PublicKey(idl.metadata.address)
const network = clusterApiUrl("devnet")
const opts = {
  // another option is "finalized"
  // This option is a little more secure
  // this signifies how long we will wait for us to say a transacion has gone through
  preflightCommitment: "processed"
}
const {SystemProgram} = web3

const App = () => {

  const [walletAddress, setWalletAddress] = useState(null)
  const [campaigns, setCampaigns] = useState([])

  useEffect(() => {
    const onLoad = async() => {
      await checkWalletConnected();
    }
    window.addEventListener("load", onLoad)
    // this return will clean up the listner 
    return () => window.removeEventListener("load", onLoad);
  }, [])

  //* add listenener for when the user connects their wallet manually
  useEffect(() => {
  }, [walletAddress])

  // Getting authenticated connection to solana (provider)
  const getProvider = () => {
    // const connection = new Connection(network, opts.preflightCommitment)
    // const provider = new AnchorProvider(connection, window.solana, opts.preflightCommitment)
    // return provider
    const rpcHost = "https://api.devnet.solana.com"
    const connection = new Connection(rpcHost)
    const provider = new AnchorProvider(connection, window.solana, opts.preflightCommitment)
    return provider
  }

  const checkWalletConnected = async() => {
    try {
      // solana wallet is in window then it will inject the solana object
      // we can grab the solana object like so
      const {solana} = window;
      if (solana) {
        if (solana.isPhantom) {
          console.log("Found phantom wallet")
          // checking if the user gave us authorization to use their wallet
          const response = await solana.connect({
            // onlyIfTrusted when true means that a user who has already been connected will automatically connect
            onlyIfTrusted: true,
          })
          console.log("Connected with pubkey: ", response.publicKey.toString())
          setWalletAddress(response.publicKey.toString())
        } else {
          alert("Get a Phantom Wallet")
        }
      }
    } catch (error) {
      alert("Solana Object not found! \nGet a Phantom Wallet")
      console.error(error)
    }
  }

  const logging = () => {
    console.log(campaigns)
  }

  const createCampaign = async () => {
    try {
      const provider = getProvider()
      const program = new Program(idl, programId, provider)
      // fetching PDA 
      const [campaign] = await PublicKey.findProgramAddress(
        [
          utils.bytes.utf8.encode("CAMPAIGN_DEMO"),
          provider.wallet.publicKey.toBuffer(),
        ],
      program.programId
      )
      console.log(program)
      await program.methods.create("name", "description")
      .accounts(
        {
          campaign,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId
        }
      ).rpc()
      console.log("Created a new campaign w address: ", campaign.toString())
    } catch(error) {
      console.error("Error creating campaign account: ", error)
    }
  }

  const getCampaigns = async () => {
    const connection = new Connection(network, opts.preflightCommitment)
    console.log(connection)
    const provider = getProvider()
    const program = new Program(idl, programId, provider)
    Promise.all(
      // getProgramAccounts returns an array of promises 
      // Promise.all will wait for all those promises to be settled
      (await connection.getProgramAccounts(programId)).map(
        async (campaign) => ({
          // fetch returns a struct
          // ... adds all the structs into the new struct we're making
          ...(await program.account.campaign.fetch(campaign.pubkey)),
          pubkey: campaign.pubkey
        })
      ) 
    ).then(campaigns => {
      setCampaigns(campaigns)
      console.log(campaigns)  
    })

    //! Leaving this code cuz the promise result is different than the result from the await
    // const c = await connection.getProgramAccounts(programId)
    // console.log(c)

    // const campaigns = (await connection.getProgramAccounts(programId)).map(async (campaign) => ({
    //         // fetch returns a struct 
    //         // we can add all the fields from the struct into the object as well
    //         ...(await program.account.campaign.fetch(campaign.pubkey)),
    //         pubkey: campaign.pubkey
    //       }))
    // console.log(campaigns)
    // setCampaigns(campaigns)
  }

  const renderCampaigns = () => {
   try { 
    const provider = getProvider()
    
    return <>
      {campaigns.map(campaign => (
        <>
          <p>Campaign ID: {campaign.pubkey.toString()}</p>
          <p>Balance: {(campaign.amountDonated / web3.LAMPORTS_PER_SOL).toString()}</p>
          <p>{campaign.name}</p>
          <p>{campaign.description}</p>
          <p>{campaign.admin.toString()}</p>
          {/* <p>{provider}</p> */}
          <button onClick={() => donate(campaign.pubkey)}>Donate 0.2 SOL</button>
          {provider.wallet.publickey === campaign.admin && withdrawButton()}
        </>
        ))}
      </>
    } catch(error) {
      console.error("Coule not render campaigns: ", error)
    }
  }

  const donate = async publicKey => {
    try {
      const provider = getProvider()
      const program = new Program(idl, programId, provider)

      await program.methods.donate(new BN(0.2 * web3.LAMPORTS_PER_SOL))
      .accounts(
        {
          campaign: publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId
        }
      ).rpc()
      console.log("Donated some money to: ", publicKey.toString());
      getCampaigns();
    } catch (error) {
      console.error("Error donating: ", error)
    }
  }

  const withdraw = async publicKey => {
    try {
      const provider = getProvider()
      const program = new Program(idl, programId, provider)

      await program.methods.withdraw(new BN(0.1 * web3.LAMPORTS_PER_SOL))
      .accounts(
        {
          campaign: publicKey,
          user: provider.wallet.publicKey
        }
      ).rpc()
    } catch(error) {
      console.error("Error withdrawing: ", error)
    }
  }

  const withdrawButton = () => {
    return <button onClick={() => withdraw()}>Withdraw from Account</button>
  }

  const connectWallet = async() => {
    const {solana} = window
    if (solana) {
      const response = await solana.connect()
      console.log("Connected with public key: ", response.publicKey.toString())
      setWalletAddress(response.publicKey.toString())
    }
  }

  const connectButton = () => {
    return <button onClick={connectWallet}>Connect to Wallet</button>
  }

  const connectedButtons = () => {
    return <>
      <button onClick={createCampaign}>Create a Campaign</button>
      <button onClick={getCampaigns}>Get Campaigns</button>
      <button onClick={logging}>See campaigns</button>
    </>
  }

  // * Conditional rendering in the comment below 
  // * Says that the walletAddress must be null to show this
  return (
    <div className="App">
      Hello World!
      {!walletAddress && connectButton()}
      {walletAddress && connectedButtons()}
      {campaigns && renderCampaigns()}
    </div>
  );
}

export default App;
