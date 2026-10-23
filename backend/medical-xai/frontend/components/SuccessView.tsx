
import React from 'react';
import { AppView } from '../types';

interface SuccessViewProps {
  userEmail: string;
  onNewAssessment: () => void;
  onGoHome: () => void;
}

const SuccessView: React.FC<SuccessViewProps> = ({ userEmail, onNewAssessment, onGoHome }) => {
  return (
    <div className="max-w-[520px] w-full flex flex-col items-center">
      {/* Success Card */}
      <div className="w-full bg-white dark:bg-[#15292c] rounded-xl shadow-lg border border-[#e7f1f3] dark:border-[#2a3a3d] p-8 md:p-12 text-center animate-in fade-in zoom-in duration-500">
        {/* Success Icon Wrapper */}
        <div className="mb-8 flex justify-center">
          <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-primary !text-5xl fill-icon">
              check_circle
            </span>
          </div>
        </div>
        
        {/* Heading */}
        <h1 className="text-[#0d191b] dark:text-white tracking-tight text-3xl font-bold leading-tight mb-4">
          Report Sent!
        </h1>
        
        {/* Message Body */}
        <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-8">
          Your medical assessment report has been successfully sent to 
          <span className="font-semibold text-[#0d191b] dark:text-white ml-1">{userEmail}</span>. 
          Please check your inbox. If you don't see it within a few minutes, remember to check your spam folder.
        </p>
        
        {/* Action Buttons */}
        <div className="flex flex-col gap-4 w-full">
          <button 
            onClick={onNewAssessment}
            className="flex w-full items-center justify-center rounded-lg h-14 px-6 bg-primary hover:bg-primary/90 text-[#0d191b] text-base font-bold leading-normal tracking-wide transition-all shadow-md shadow-primary/10"
          >
            Start New Assessment
          </button>
          <button 
            onClick={onGoHome}
            className="inline-flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm font-medium hover:text-primary dark:hover:text-primary transition-colors py-2 gap-2"
          >
            <span className="material-symbols-outlined !text-lg">arrow_back</span>
            Back to Home
          </button>
        </div>
      </div>
      
      {/* Subtle Help Text */}
      <div className="mt-8 text-center text-slate-400 dark:text-slate-500 text-xs">
        Need help? <a className="underline hover:text-primary transition-colors" href="#">Contact our support team</a>
      </div>
    </div>
  );
};

export default SuccessView;
