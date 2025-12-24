'use client';

import { Stepper } from "@/components/Stepper";
import { Step1_Config } from "@/components/Step1_Config";
import { Step2_Context } from "@/components/Step2_Context";
import { Step3_Playground } from "@/components/Step3_Playground";
import { Step4_Results } from "@/components/Step4_Results";
import { useProjectStore } from "@/store/useProjectStore";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { currentStep, setCurrentStep, llmConfigs, projectData, results } = useProjectStore();
  const [isHydrated, setIsHydrated] = useState(false);

  // Attendre que le store soit synchronisé avec le localStorage
  useEffect(() => {
    useProjectStore.persist.rehydrate();
    setIsHydrated(true);
  }, []);

  const isStep1Complete = llmConfigs.some(config => config.isValidated);
  const isStep2Complete = !!projectData?.questionColumn && !!projectData?.answerColumn;
  const isStep3Complete = results.length > 0;

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step1_Config />;
      case 2: return <Step2_Context />;
      case 3: return <Step3_Playground />;
      case 4: return <Step4_Results />;
      default: return <Step1_Config />;
    }
  };

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };
  
  const canGoNext = () => {
    if (currentStep === 1) return isStep1Complete;
    if (currentStep === 2) return isStep2Complete;
    if (currentStep === 3) return isStep3Complete;
    return false;
  }
  
  if (!isHydrated) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const containerClass = currentStep === 4 
    ? "container-fluid px-4 md:px-8" 
    : "container";

  return (
    <div className={`${containerClass} mx-auto p-4 md:p-8 min-h-screen`}>
      <div className="text-center">
        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-purple-500 to-indigo-400 text-transparent bg-clip-text">
          RFP Studio
        </h1>
        <p className="text-lg text-muted-foreground mt-2">Générez et validez des réponses avancées à grande échelle.</p>
      </div>

      <Stepper />

      <div className={`mt-12 ${currentStep !== 4 ? 'max-w-4xl mx-auto' : ''}`}>
        {renderStep()}
      </div>
      
      <div className="mt-8 max-w-4xl mx-auto flex justify-between">
        <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 1}>
          &larr; Précédent
        </Button>
        
        {currentStep < 4 && (
          <Button onClick={handleNext} disabled={!canGoNext()}>
            Suivant &rarr;
          </Button>
        )}
      </div>
    </div>
  );
}

