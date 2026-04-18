import React from 'react';
import boatImage from '@/assets/boat.png';

const Boat: React.FC = () => {
  return (
    <div className="relative">
      <img src={boatImage} alt="Boat" className="h-auto w-72 object-contain drop-shadow-[2px_4px_8px_rgba(0,0,0,0.3)]" />
      <div className="absolute -bottom-4 left-1/2 h-12 w-80 -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse,rgba(0,20,40,0.6)_0%,rgba(0,40,60,0.4)_30%,rgba(0,60,80,0.2)_50%,transparent_70%)] blur-[5px]" />
    </div>
  );
};

export default Boat;
