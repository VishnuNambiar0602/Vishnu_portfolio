
import React from 'react';
import { AppView } from '../types';

interface HeaderProps {
  currentView: AppView;
  setView: (view: AppView) => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, setView }) => {
  return (
    <header className="flex items-center justify-between border-b border-solid border-[#e7f1f3] dark:border-[#2a3a3d] px-6 lg:px-40 py-4 bg-white dark:bg-[#15292c] sticky top-0 z-50">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView(AppView.DASHBOARD)}>
        <div className="size-8 text-primary">
          <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path clipRule="evenodd" d="M47.2426 24L24 47.2426L0.757355 24L24 0.757355L47.2426 24ZM12.2426 21H35.7574L24 9.24264L12.2426 21Z" fillRule="evenodd"></path>
          </svg>
        </div>
        <h2 className="text-lg font-bold leading-tight tracking-tight">Medical AI</h2>
      </div>
      <div className="flex flex-1 justify-end gap-8 items-center">
        <nav className="hidden md:flex items-center gap-8">
          <button 
            onClick={() => setView(AppView.DASHBOARD)} 
            className={`text-sm font-medium transition-colors ${currentView === AppView.DASHBOARD ? 'text-primary' : 'hover:text-primary text-slate-600 dark:text-slate-300'}`}
          >
            Assessments
          </button>
          <button 
            onClick={() => setView(AppView.HISTORY)} 
            className={`text-sm font-medium transition-colors ${currentView === AppView.HISTORY ? 'text-primary' : 'hover:text-primary text-slate-600 dark:text-slate-300'}`}
          >
            History
          </button>
          <button 
            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
          >
            Support
          </button>
        </nav>
        <div 
          className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-primary/20 cursor-pointer hover:border-primary transition-all"
          style={{backgroundImage: 'url("https://picsum.photos/seed/medical-user/200/200")'}}
        ></div>
      </div>
    </header>
  );
};

export default Header;
