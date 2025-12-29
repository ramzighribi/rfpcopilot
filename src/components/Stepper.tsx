'use client';
import { useProjectStore } from '@/store/useProjectStore';
import { useLanguage } from '@/lib/LanguageContext';

export function Stepper() {
  const currentStep = useProjectStore((state) => state.currentStep);
  const { t } = useLanguage();
  
  const steps = [t('step1Label'), t('step2Label'), t('step3Label'), t('step4Label')];

  return (
    <div className="w-full max-w-2xl mx-auto my-8">
      <div className="flex items-center justify-between">
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <div key={label} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${isCompleted ? 'bg-green-500 text-white' : ''}
                    ${isActive ? 'bg-slate-900 text-white' : ''}
                    ${!isCompleted && !isActive ? 'bg-slate-200 text-slate-500' : ''}
                  `}
                >
                  {isCompleted ? '✓' : stepNumber}
                </div>
                <p className={`mt-2 text-xs text-center font-semibold ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                  {label}
                </p>
              </div>
              {stepNumber < steps.length && (
                <div className={`flex-auto border-t-2 mx-4 
                  ${isCompleted ? 'border-green-500' : 'border-slate-200'}`} 
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}