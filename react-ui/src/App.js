import './App.css';
import ChatWindow from './ChatWindow';
import { publicProvider } from 'wagmi/providers/public';
import { createConfig, configureChains, mainnet, WagmiConfig } from 'wagmi';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet],
  [publicProvider()]
);

const config = createConfig({
  connectors: [
    new InjectedConnector({ chains }),
    new MetaMaskConnector({
      chains,
      options: {
        shimDisconnect: true,
        UNSTABLE_shimOnConnectSelectAccount: true,
      },
    }),
  ],
  publicClient,
  webSocketPublicClient,
});

const Web3Provider = ({ children }) => {
  return <WagmiConfig config={config}>{children}</WagmiConfig>;
};


function App() {
  return (
    <div className="App">
      {/* Chat window is the main component of the app */}
      <Web3Provider>
      <ChatWindow />
      </Web3Provider>
      

      {/* Optional: Any additional content or components */}
      {/* You can remove or modify this part according to your app's needs */}
      <footer className="App-footer">
      </footer>
    </div>
  );
}

export default App;
