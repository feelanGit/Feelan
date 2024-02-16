// MintNFT.js

import { storeArweave, fetchConversationSummary } from './IrysService';


export const shareNFT = async (web3, contract, conversationId, config) => {
    if (!web3 || !contract) {
      console.log("Web3 or contract not initialized.");
      return;
    }
  
    try {
      const accounts = await web3.eth.getAccounts();
      if (accounts.length === 0) {
        console.log("No accounts found. Make sure MetaMask is connected.");
        return;
      }
  
      //  name, userId, and summary are obtained here
      const name = conversationId; // Adjusted for meaningful NFT names
      const maxSupply = 40;
      const collectionId = parseInt(conversationId.split('-')[1], 10);
      const userId = accounts[0];
  
      const conversation = await fetchConversationSummary(conversationId, userId, config);
      const stringifiedConv = JSON.stringify(conversation, null, 2); // For readability
      const arweaveConv = await storeArweave(stringifiedConv);
      const convURI = arweaveConv.receipt.replace('/graphql', ''); 

      // From retrieved chat
      const summary = conversation.summary; 
  
      // NFT Metadata structure
      const nftMetadata = {
        description: "This is the tokenURI for minting the NFT",
        image: convURI, // This will be arweaveURL
        name: name, // Using conversation name as NFT name
        attributes: [
          {
            userId: userId,
            summary: summary 
          }]
      };
  
      // Stringify and store the NFT metadata on Arweave
      const metadataStringified = JSON.stringify(nftMetadata);
      const arweaveResponse = await storeArweave(metadataStringified);
      const tokenURI = arweaveResponse.receipt.replace('/graphql', ''); // This will be used as tokenURI for minting
  
      // Create Collection (optional, depends on your contract's logic)
      await contract.methods.createCollectionAndMint(collectionId, name, maxSupply, accounts[0], tokenURI).send({ from: accounts[0] });
  
      // Mint NFT
      console.log("NFT minted successfully.");
      return tokenURI;
  
    } catch (error) {
      console.error("Failed to mint NFT:", error);
    }
  };
  