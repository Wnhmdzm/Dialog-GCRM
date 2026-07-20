import React from 'react';

interface DialogLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function DialogLogo({ className = '', size = 'md' }: DialogLogoProps) {
  // Define width/height/padding options based on size
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm tracking-wider font-extrabold border-y-2',
    md: 'px-6 py-2 text-lg tracking-widest font-black border-y-2',
    lg: 'px-8 py-3 text-2xl tracking-widest font-black border-y-[3px]',
  };

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      {/* 
        DIALOG Corporate Logo:
        Teal background (#009696 / rgb(0,150,150)), 
        centered bold white text,
        with parallel horizontal white lines top and bottom.
      */}
      <div 
        className={`bg-[#009696] text-white font-sans ${sizeClasses[size]} border-white uppercase select-none text-center shadow-sm flex items-center justify-center`}
        style={{
          minWidth: size === 'sm' ? '100px' : size === 'lg' ? '180px' : '140px',
        }}
      >
        DIALOG
      </div>
    </div>
  );
}
