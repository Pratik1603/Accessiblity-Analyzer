import React from 'react';

export default function ResolveButton({ onClick }) {
  return (
    <div
      className="rounded-r-xl absolute top-0 right-0 h-full w-full bg-blue-600 flex items-center justify-center gap-2 text-white font-semibold text-lg transition-transform duration-300 ease-in-out translate-x-full group-hover:translate-x-0 cursor-pointer z-20"
      style={{width: '40%', height: '100%'}}
      onClick={onClick}
    >
      →
      Resolve
    </div>
  );
}