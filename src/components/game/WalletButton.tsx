import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

interface WalletButtonProps {
  isVerified: boolean;
  isVerifying: boolean;
}

const WalletButton: React.FC<WalletButtonProps> = ({ isVerified, isVerifying }) => {
  const { isConnected } = useAccount();

  return (
    <div className="flex items-center gap-2">
      {isConnected && isVerifying && (
        <span className="text-xs text-muted-foreground animate-pulse">
          Signing...
        </span>
      )}
      <ConnectButton 
        chainStatus="icon"
        accountStatus="address"
        showBalance={true}
      />
    </div>
  );
};

export default WalletButton;
