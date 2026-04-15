import React from 'react';
import boatImage from '@/assets/boat.png';

const Boat: React.FC = () => {
  return (
    <div className="relative">
      {/* Boat image */}
      <img 
        src={boatImage} 
        alt="Boat" 
        className="w-72 h-auto object-contain"
        style={{
          filter: 'drop-shadow(2px 4px 8px rgba(0,0,0,0.3))'
        }}
      />
      
      {/* Boat shadow on water */}
      <div 
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-80 h-12 rounded-[50%]"
        style={{
          background: 'radial-gradient(ellipse, rgba(0,20,40,0.6) 0%, rgba(0,40,60,0.4) 30%, rgba(0,60,80,0.2) 50%, transparent 70%)',
          filter: 'blur(5px)'
        }}
      />
    </div>
  );
};

export default Boat;
