import React, { useState, useEffect, useRef } from 'react';
import './ChatWindow.css';
import axios from 'axios'; // Ensure axios is installed: npm install axios
import { FaPencilAlt } from 'react-icons/fa'; // Make sure to install react-icons using npm or yarn

import { Button } from 'antd';
import { useConnect, useAccount } from 'wagmi';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';

import Prism from 'prismjs';
import 'prismjs/themes/prism.css'; // Default theme

import useLit from './lit_index';
import { fetchIrys, handleSave, fetchConversationSummary } from './IrysService';
import ConversationButton from './ConversationButton'; // Adjust the path as necessary


import Web3 from 'web3';
import { ethers } from 'ethers';
import contractABI from './contractABI.json'; // Adjust path as necessary

import {shareNFT} from './MintNFT'; 


let initialConversations = null;


if (!initialConversations) {
  const savedConversations = sessionStorage.getItem('savedConversations');
  if (savedConversations) {
    initialConversations = JSON.parse(savedConversations);
  } 
}




const ChatWindow = () => {
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [savedConversations, setSavedConversations] = useState(initialConversations); // initialConversations
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null); // Create a ref for the messages end
  const [conversationSummaries, setConversationSummaries] = useState({});
  const [isAITyping, setIsAITyping] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [inputDisabled, setInputDisabled] = useState(true);


  const { encryptFile, decryptFile } = useLit(); // Use the encryptFile function
  const [decryptedText, setDecryptedText] = useState('');


  const { connect, connectors } = useConnect();
  const { address } = useAccount();
  const loginAttempted = useRef(false);

  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const contractAddress = "0xA74E6Ec05A820F9B94354E6B7EAfE4A7B3879374";


  const connectWallet = async () => {
    const metamask = connectors.find(
      (connector) => connector instanceof MetaMaskConnector
    );
    if (metamask) {
      await connect({ connector: metamask });   

    }
  };
  

  useEffect(() => {
    if (window.ethereum) {
      const web3Instance = new Web3(window.ethereum);
      setWeb3(web3Instance);
      const contractInstance = new web3Instance.eth.Contract(contractABI, contractAddress);
      setContract(contractInstance);
    } else {
      console.log('MetaMask is not installed.');
    }
  }, []);


  // Function to update the input field as the user types
  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  // Function to automatically scroll to the bottom of the chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };


  // useEffect hook to scroll to the bottom whenever messages change
  useEffect(() => {
    Prism.highlightAll();
    scrollToBottom();
  }, [messages]);


  // Add a console log in the ChatWindow component to check the address state
  useEffect(() => {
    if (address && !loginAttempted.current){
      loginAttempted.current = true; // Prevent further login attempts

      // Call login function with the user's address
      loginUser(address).then(() => {
        console.log("Logged in successfully");
        setInputDisabled(false);
        // Proceed with any post-login logic here
      }).catch(error => {
        console.error("Login failed:", error);
      });
      }

  }, [address]);
  
  
  useEffect(() => {

    if (accessToken){

      fetchConversations(address).then(conversations => {
        // Handle the fetched conversations
        setSavedConversations(conversations);
        // Similar logic to handle summaries for fetched data
        const summaries = conversations.reduce((acc, conv) => {
        acc[conv.id] = conv.summary || "New Chat";
        return acc;
        }, {});
        setConversationSummaries(summaries);
      });

      // Reset input field and messages
      setInput(''); 
      setMessages([]); 

      console.log("Address:", address);
    }

  }, [accessToken]);


  
  // Save conversations to sessionStorage whenever the savedConversations state changes
  useEffect(() => {
    sessionStorage.setItem('savedConversations', JSON.stringify(savedConversations));
  }, [savedConversations]);

  useEffect(() => {
  // Generate a unique ID for the initial conversation when the component mounts
  const initialConversationId = `conv-${Date.now()}`;
  setCurrentConversationId(initialConversationId);


}, []);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Perform any cleanup or show warning
      // e.g., e.returnValue = "Are you sure you want to exit?";
      console.log("User is leaving the page");

      // Perform any operations you need here (like informing the server)
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const loginUser = async (address) => {
    try {
      setAccessToken(null);
      const { signature, message } = await requestSignature(); // Destructure both signature and message
      const userId = address;
      // Prepare the payload with userId
      const payload = { userId: userId, signature: signature, message: message };
      // Call the login endpoint with Axios
      const response = await axios.post('https://flaskapp-eitf5avxha-uc.a.run.app/api/login', payload);
  
      // Assuming the token is returned in the response body
      const accessToken = response.data.access_token;
      setAccessToken(accessToken);
  
      console.log("Login successful.");
      loginAttempted.current = false; // Allow further login attempts
    
      return accessToken;
  
    } catch (error) {
      console.error("Login failed:", error);
      // Handle login failure (e.g., by showing a message to the user)
    }
  };

  function requestSignature() {
    return new Promise((resolve, reject) => {
      if (!window.ethereum) {
        console.log('MetaMask is not installed!');
        reject(new Error('MetaMask is not installed!'));
        return;
      }
  
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
  
      signer.getAddress()
        .then((address) => {
          const message = `Sign this message to prove you own the address: ${address}`;
          // First, we get the signature
          return signer.signMessage(message).then(signature => ({ signature, message })); // Return an object with both
        })
        .then(({ signature, message }) => {
          console.log('Signed:', signature);
          resolve({ signature, message }); // Resolve the promise with the signature and message
        })
        .catch((error) => {
          console.error('Error signing message:', error);
          reject(error); // Reject the promise if an error occurs
        });
    });
  }

  const fetchConversations = async (address) => {
    try {
      // Add necessary formData entries here
      const userId = address ? address : "addressUnknown";
      const payload = {userId: userId};
      // Include the Authorization header with the Bearer token
      const config = {
        headers: { Authorization: `Bearer ${accessToken}` }
      };
      const response = await axios.post('https://flaskapp-eitf5avxha-uc.a.run.app/api/retrieveAll', payload, config);
  
      if (!response.data.response) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      return await response.data.response; // Assuming the response is in JSON format
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      return []; // Return an empty array in case of an error
    }
  }
  

  const handleConversationSwitch = (conversationId = null) => {
    // If the selected conversation is already the current one, do nothing
    if (conversationId === currentConversationId) return;
  
    // Save the current conversation before switching
    if (currentConversationId && messages.length > 0) {
        const updatedConversations = savedConversations.map(conv => {
            if (conv.id === currentConversationId) {
                // Check if new messages were added
                if (conv.messages.length !== messages.length) {
                    console.log("Updated previous conversation");
                }
                return { ...conv, messages: messages };
            } else {
                return conv;
            }
        });
  
        // Check if the current conversation is a new one that's not in savedConversations
        const currentConversationExists = savedConversations.some(conv => conv.id === currentConversationId);
        if (!currentConversationExists) {
            fetchAndSetSummary(currentConversationId);
            const newConversation = {
                id: currentConversationId,
                messages: messages,
                timestamp: new Date().toISOString(),
                summary: "summary",
                name: "New chat",
                isNFT: false,
                shelved: false,
                tokenURI: "tokenURI",
            };
            updatedConversations.push(newConversation);
            console.log("New conversation completely.");
  
        }
  
        setSavedConversations(updatedConversations);
    }
  
    // Switch to the selected conversation
    if (conversationId) {
        loadConversation(conversationId);
    } else {
        setMessages([]);
        setCurrentConversationId(`conv-${Date.now()}`);
    }
  };

  

const startNewConversation = async () => {
  if (currentConversationId) {
    await handleConversationSwitch(null);
  }
  const newId = `conv-${Date.now()}`;
  setCurrentConversationId(newId);
  setMessages([]);
};

  


  // Function to handle loading a conversation
  const loadConversation = (conversationId) => {
    const conversationToLoad = savedConversations.find(conv => conv.id === conversationId);
    if (conversationToLoad) {
      setMessages(conversationToLoad.messages);
      setCurrentConversationId(conversationToLoad.id);
    }
  };

  
const fetchAndSetSummary = async (convId) => {

  const userId = address ? address : "addressUnknown";
  // Include the Authorization header with the Bearer token
  const config = {
    headers: { Authorization: `Bearer ${accessToken}` }
  };
  
  const conversation = await fetchConversationSummary(convId, userId, config);
  const stringifiedObject = JSON.stringify(conversation, null, 2); // For readability

  // Define a timeout promise that resolves with a specific value instead of rejecting
  const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ timeout: true }), 20000)); // 10 seconds timeout for example

  // Attempt to save with a timeout
  setInputDisabled(true);
  let response = await Promise.race([
      handleSave(stringifiedObject, encryptFile, userId),
      timeoutPromise
  ]);
  while (response.timeout) {
    alert("Please sign in once more with MetaMask. Required to safely store data.");
  
    // Recreate the timeoutPromise inside the loop so it resets for each retry
    const newTimeoutPromise = new Promise(resolve => setTimeout(() => resolve({ timeout: true }), 20000)); // 10 seconds timeout
  
    // Attempt to save again with a new timeout
    response = await Promise.race([
      handleSave(stringifiedObject, encryptFile, userId),
      newTimeoutPromise // Use the new timeout promise here
    ]);
  }
  setInputDisabled(false);
  const receiptId = response.receipt.split('/').pop(); // Extracts the last part of the URL



  try {
    const decryptedText = await fetchIrys(receiptId, decryptFile);
    //console.log("Decrypted Text:", decryptedText);

    // Assuming decryptedText is a JSON string, parse it to an object
    const decryptedObject = JSON.parse(decryptedText);

    // Extract the summary field
    const summary = decryptedObject.summary || "No summary available";

    // Update the summary in the conversation summaries state
    setConversationSummaries(prevSummaries => ({
      ...prevSummaries,
      [convId]: summary
    }));

    setSavedConversations(prevConversations => {
      const updatedConversations = prevConversations.map(conv => {
        const maxLength = 42;
        let name = summary.length > maxLength ? summary.substr(0, maxLength - 3) + '...' : summary;
        if (conv.id === convId) {
          return { ...conv, summary: summary, name: name  }; // Updating the name property
        }
        return conv;
      });

      const updatedConversation = updatedConversations.find(conv => conv.id === convId);

      // Call backMetadataUpdate with the updated conversation
      if (updatedConversation) {
          backMetadataUpdate(updatedConversation);
      }

      return updatedConversations; // Return the updated state
  });


  } catch (error) {
    console.error('Error while fetching and decrypting:', error);
    alert('Error fetching files. See console for details.');
  }
};

  


  


  const sendMessage = async (conversationId = null, message = null) => {
    const messageToSend = message || input.trim();
    const convId = conversationId || currentConversationId;
    if (messageToSend) {
      // Add the user's message to the chat
      setMessages(messages => [...messages, { role: 'Me', content: messageToSend }]);
      setInput(''); // Clear the input field
      setIsAITyping(true); // Start showing the typing indicator

  
      try {
        // Construct the payload with conversationId and message
        // Find the current conversation object
        const currentConversation = savedConversations.find(conv => conv.id === convId);
    
        // Extract the timestamp from the current conversation
        const timestamp = currentConversation ? currentConversation.timestamp : new Date().toISOString();
        const userId = address ? address : "addressUnknown";
    
        // Construct the payload with conversationId, message, and timestamp
        const payload = {
          userId: userId,
          conversationId: convId,
          user_message: messageToSend,
          timestamp: timestamp, // Add the timestamp here
          name: currentConversation?.name || "New chat",
          isNFT: currentConversation?.isNFT || false,
          shelved: currentConversation?.shelved || false,
          tokenURI: currentConversation?.tokenURI || "tokenURI",
        };
        // Make a POST request to the Flask backend
        const config = {
          headers: { Authorization: `Bearer ${accessToken}` }
        };
        // Make a POST request to the Flask backend
        const response = await axios.post('https://flaskapp-eitf5avxha-uc.a.run.app/api/send-message', payload, config);
        // console.log('Response from server:', response.data); // Debugging line
        setIsAITyping(false); // Stop showing the typing indicator once the response is received

  
        if (response.data.response) {
          const aiResponse = response.data.response;
          displayProgressiveText(aiResponse); // Call the progressive display function
        } else {
          // Handle case where no response is received
          console.error('No response received from the AI.');
        }
      } catch (error) {
        console.error('Error sending message:', error);
        setIsAITyping(false); // Ensure to stop the indicator even if there's an error

        // Optionally update the UI to inform the user that an error occurred
      }
    }
  };


  const backMetadataUpdate = async (conv) => {
    try {
      
      const { messages, ...payload } = conv;
      payload.userId = address ? address : "addressUnknown";
      const config = {
        headers: { Authorization: `Bearer ${accessToken}` }
      };
      const response = await axios.post('https://flaskapp-eitf5avxha-uc.a.run.app/api/meta-update', payload, config);
      // console.log("Metadata updated successfully", response.data);
    } catch (error) {
      console.error("Failed to update conversation metadata", error);
    }
  };
  

    const handleRename = (conversationId) => {
      const newName = prompt('Rename here:');
      if (newName && newName.trim()) {
        setSavedConversations(conversations => {
          const updatedConversations = conversations.map(conversation => {
            if (conversation.id === conversationId) {
              return { ...conversation, name: newName.trim() }; // Updating the name property
            }
            return conversation;
          });
    
          const updatedConversation = updatedConversations.find(conv => conv.id === conversationId);

          // Call backMetadataUpdate with the updated conversation
          if (updatedConversation) {
              backMetadataUpdate(updatedConversation);
          }
    
          return updatedConversations; // Return the updated conversations array to update the state
        });
      } else {
        console.log("No new name provided.");
      }
    };
    

    const shelveConversation = (conversationId) => {
      setSavedConversations(conversations => {
          const updatedConversations = conversations.map(conv => {
              if (conv.id === conversationId) {
                  // Update the conversation by setting shelved to true
                  return { ...conv, shelved: true };
              }
              return conv;
          });

          // Find the updated conversation right after updating
          // This ensures we are working with the updated state
          const updatedConversation = updatedConversations.find(conv => conv.id === conversationId);

          // Call backMetadataUpdate with the updated conversation
          if (updatedConversation) {
              backMetadataUpdate(updatedConversation);
          }

          return updatedConversations; // Return the updated state
      });
  };


    
    

  const handleMint = async (conversationId) => {
    const config = {
      headers: { Authorization: `Bearer ${accessToken}` }
    };
    // Assuming web3, contract, and address are correctly set up beforehand
    const tokenURI = await shareNFT(web3, contract, conversationId, config);
    console.log("TokenURI:", tokenURI);

    if (tokenURI) {
        // Update the conversation to reflect it's now an NFT, store the tokenURI,
        // and add a new message with the tokenURI
        setSavedConversations(conversations => {
          const updatedConversations = conversations.map(conv => {
              if (conv.id === conversationId) {
                  // Return the updated conversation
                  return { ...conv, isNFT: true, tokenURI: tokenURI};
              }
              return conv;
          });
  
          // Optionally, find and update backend metadata if needed
          // Note: This happens after the state update, consider any asynchronicity issues
          const updatedConversation = updatedConversations.find(conv => conv.id === conversationId);
          if (updatedConversation) {
              backMetadataUpdate(updatedConversation);
          }
  
          return updatedConversations;
      });
      
      
  
      handleConversationSwitch(conversationId);
  
      const message = `Minting NFT of this conversation with \nTokenURI: ${tokenURI}`;
      sendMessage(conversationId, message)
  
    }
  };
  

  const displayProgressiveText = (oText) => {
    const delay = 10; // Time delay in ms between each character display
    // Add an initial AI message entry with empty content
    setMessages(messages => [...messages, { role: 'AI', content: '' }]);
    let index = -1;
  
    // fixing a sort of bug by adding a space 
    const text = " " + oText; 
    console.log("text to rendered:", text);

  
    const progressiveDisplay = setInterval(() => {
      if (index < text.length) {
        
        // Correctly update the last message (AI's message) in the array
        setMessages(currentMessages => {
          const updatedMessages = [...currentMessages];
          const lastMessageIndex = updatedMessages.length - 1;
          updatedMessages[lastMessageIndex] = {
            ...updatedMessages[lastMessageIndex],
            content: updatedMessages[lastMessageIndex].content + text.charAt(index),
          };
          return updatedMessages;
        });
        index++;
      } else {
        clearInterval(progressiveDisplay);
        setIsAITyping(false);
      }
    }, delay);
  };
  
  const renderMessage = (msg, index) => {
    const codeBlockRegex = /```(\w+)\s+([\s\S]*?)```/;
    const match = msg.content.match(codeBlockRegex);
    const isLastMessage = index === messages.length - 1;
  
    return (
      <React.Fragment key={index}>
        <div className={`message message-${msg.role}`}>
          <strong>{msg.role}</strong>
          {match ? (
            <pre><code className={`language-${match[1]}`}>{match[2]}</code></pre>
          ) : (
            <span>{msg.content}</span> // Wrap in a span for better control
          )}
        </div>
        {isLastMessage && isAITyping && (
          <div className="message message-AI typing-indicator">
            <strong>AI</strong>is typing...
          </div>
        )}
      </React.Fragment>
    );
  };
  
  
  

  return (
  
    <div className="chat-container">
      
      <div class="app-name">Feelan</div>
      <div className="conversations-sidebar">
        {/* Adjust the buttons to start lower on the sidebar */}
        <div className="conversations-space"></div>
        {accessToken && savedConversations && Array.isArray(savedConversations) && savedConversations
          .filter(conversation => !conversation.shelved) // Only include non-shelved conversations
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .map(conversation => (
              <ConversationButton
                  key={conversation.id}
                  conversation={conversation}
                  onRename={handleRename} // Implement this function
                  shareNFT={() => handleMint(conversation.id)} // Adjusted to ensure correct id is passed
                  selectConversation={handleConversationSwitch} // Passing loadConversation as selectConversation
                  shelveConversation={() => shelveConversation(conversation.id)}
  
              />
      ))}
  
      </div>
      <div className="chat-window">
        <div className="chat-header">
          <button className="new-conversation-btn" onClick={startNewConversation}>
            <FaPencilAlt /> {/* Pencil icon */}
          </button>
          
          {!accessToken ? (
          <Button type="primary" onClick={connectWallet} style={{ backgroundColor: '#1b72bf' }}>Connect</Button>
        ) : (
          <span style={{ fontSize: '12px' }}>Connected</span>
        )}
        </div>
        <div className="chat-body">
            {messages.map((msg, index) => renderMessage(msg, index))}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-footer">
          <input
            type="text"
            placeholder={!address ? "Connect a MetaMask wallet" : "Write here..."}
            value={input}
            onChange={handleInputChange}
            onKeyPress={event => { if (event.key === 'Enter') sendMessage(); }}
            disabled={inputDisabled}
          />
        <button onClick={sendMessage} style={{ backgroundColor: '#1b72bf' }}>
          <i className="fas fa-paper-plane"></i>
        </button>
        </div>
      </div>
    <div class="bullet-points">
    <h3 class="bullet-points-title">This is a test app:</h3> 
      <ul>
        <li>A second Sign-in is required.</li>
        <li>Chat data stored on testnet.</li>
        <li>NFTs only on Polygon Mumbai testnet.</li>
        <li>Soon it will be possible to view shelved chats.</li>
        <li>Connect to chat with Feelan!</li>
      </ul>
    </div>
  
    </div>
  );
  };

export default ChatWindow;
