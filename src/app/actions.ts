'use server';

import OpenAI, { AzureOpenAI } from 'openai';
import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";
import { LLMConfig } from "@/store/useProjectStore";

// Fonction helper pour créer un client Azure OpenAI avec support Entra ID
function createAzureOpenAIClient(config: LLMConfig) {
  const { endpoint, apiKey, apiVersion, deployment } = config;
  
  // Si pas de clé API, utiliser l'authentification Entra ID
  if (!apiKey || apiKey === '') {
    const credential = new DefaultAzureCredential();
    const azureADTokenProvider = getBearerTokenProvider(
      credential,
      "https://cognitiveservices.azure.com/.default"
    );
    return new AzureOpenAI({ 
      endpoint, 
      apiVersion, 
      deployment,
      azureADTokenProvider
    });
  }
  
  // Sinon, utiliser l'authentification par clé API
  return new AzureOpenAI({ endpoint, apiKey, apiVersion, deployment });
}

// ## FONCTION 1 : TEST DE CONNEXION SIMPLE ##
export async function testLLMConnection(config: LLMConfig) {
  if (config.provider !== 'Azure OpenAI') {
    if (config.apiKey.length > 5) return { success: true, message: `Connexion simulée pour ${config.provider} réussie.`};
    return { success: false, message: "Fournisseur non supporté pour un test réel."}
  }
  const { endpoint, apiVersion, deployment } = config;
  if (!endpoint || !apiVersion || !deployment) return { success: false, message: "Endpoint, API version et deployment sont requis pour Azure." };
  
  try {
    const client = createAzureOpenAIClient(config);
    await client.chat.completions.create({
      model: deployment,
      messages: [{ role: "system", content: "Test connection." }],
      max_completion_tokens: 5,
    });
    return { success: true, message: "Connexion à Azure OpenAI réussie !" };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
    
    // Message d'erreur plus détaillé pour le 403
    if (errorMessage.includes('403') || errorMessage.includes('authentication')) {
      return { 
        success: false, 
        message: `Erreur d'authentification : ${errorMessage}. Vérifiez que l'authentification par clé API est activée ou utilisez Entra ID.` 
      };
    }
    
    return { success: false, message: `La connexion a échoué : ${errorMessage}` };
  }
}

// ## FONCTION 2 : DÉBOGAGE DE CONNEXION AVANCÉ ##
export async function debugAzureConnection(config: LLMConfig): Promise<{ success: boolean; logs: string[] }> {
  'use server';
  const logs: string[] = [];
  const { deployment } = config;
  const log = (message: string) => logs.push(`[${new Date().toLocaleTimeString('fr-FR')}] ${message}`);
  log("Début du test de débogage...");
  try {
    log("Initialisation du client AzureOpenAI...");
    const client = createAzureOpenAIClient(config);
    log("Client initialisé avec succès.");
    log("Envoi d'un message de test...");
    const response = await client.chat.completions.create({
      model: deployment,
      messages: [{ role: "user", content: "Quelle est la capitale de la France ?" }],
      max_completion_tokens: 50,
    });
    log("Réponse reçue de l'API !");
    if (response.choices && response.choices.length > 0) {
      const choice = response.choices[0];
      const finishReason = choice.finish_reason;
      log(`Raison de la fin (finish_reason): ${finishReason}`);
      if (finishReason === 'content_filter') {
        log("🔴 DIAGNOSTIC: Le filtre de contenu d'Azure a bloqué la réponse.");
        return { success: false, logs };
      }
      if (choice.message?.content) {
        logs.push("--- DÉBUT DE LA RÉPONSE ---", choice.message.content, "--- FIN DE LA RÉPONSE ---");
        log("✅ TEST RÉUSSI !");
        return { success: true, logs };
      }
    }
    log("⚠️ AVERTISSEMENT: La structure de la réponse est inattendue.");
    return { success: false, logs };
  } catch (error: unknown) {
    log("❌ ERREUR CRITIQUE PENDANT L'APPEL API.");
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    log(`Message: ${errorMessage}`);
    return { success: false, logs };
  }
}

// ## FONCTION 3 : GÉNÉRATION DE RÉPONSE UNIQUE (AVEC LOGIQUE POUR ANTHROPIC) ##
export async function generateSingleLLMResponse(
  question: string,
  llmConfigs: LLMConfig[],
  generationParams: Record<string, string>
): Promise<{ result: Record<string, string>, logs: string[] }> {
  'use server';

  const logs: string[] = [];
  const log = (message: string) => logs.push(`[${new Date().toLocaleTimeString('fr-FR')}] ${message}`);
  const startTime = performance.now();

  if (!question) throw new Error("La question est vide.");
  const validatedConfigs = llmConfigs.filter(c => c.isValidated);
  if (validatedConfigs.length === 0) throw new Error("Aucun LLM n'a été validé.");

  const rowResult: Record<string, string> = { question: question, status: 'Refusée' };

  let lengthInstruction = '';
  switch (generationParams.responseLength) {
    case 'Courte': lengthInstruction = 'Ta réponse doit être très courte, concise, et ne faire que 1 à 2 lignes au maximum.'; break;
    case 'Moyenne': lengthInstruction = 'Ta réponse doit être de taille moyenne, entre 3 et 5 lignes.'; break;
    case 'Longue': lengthInstruction = 'Ta réponse doit être longue, détaillée, et faire plus de 5 lignes.'; break;
  }
  const languageInstruction = generationParams.language === 'Français' ? 'Réponds impérativement et exclusivement en Français.' : 'Answer imperatively and exclusively in English.';
  const systemPrompt = `Agissez en tant que : ${generationParams.persona}. ${languageInstruction} ${lengthInstruction} ${generationParams.instructions}`;
  
  for (const config of validatedConfigs) {
    const providerStartTime = performance.now();
    log(`  [${config.provider}] Début du traitement.`);
    try {
      if (config.provider === 'Google') {
        const GOOGLE_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
        const requestBody = { contents: [{ parts: [{ text: systemPrompt + "\n\n" + question }] }] };
        
        log(`  [${config.provider}] Envoi de la requête à l'API...`);
        const apiStartTime = performance.now();
        const response = await fetch(GOOGLE_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        const apiEndTime = performance.now();
        log(`  [${config.provider}] Réponse reçue en ${Math.round(apiEndTime - apiStartTime)}ms.`);

        if (!response.ok) {
          const errorBody = await response.json();
          throw new Error(`Erreur API Google: ${response.status} - ${errorBody.error.message}`);
        }
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (data.promptFeedback?.blockReason) {
          rowResult[config.provider] = `ERREUR: Bloqué par le filtre de contenu. Raison: ${data.promptFeedback.blockReason}`;
        } else if (text) {
          rowResult[config.provider] = text;
          rowResult.status = 'Validée';
        } else {
          rowResult[config.provider] = "ERREUR: La réponse de Google était vide ou mal formée.";
        }
      } else {
        let client: OpenAI | AzureOpenAI;
        let modelName: string;
        const completionPayload: Record<string, unknown> = { messages: [{ role: "system", content: systemPrompt }, { role: "user", content: question }] };

        switch(config.provider) {
          case 'Azure OpenAI': 
            client = createAzureOpenAIClient(config); 
            modelName = config.deployment; 
            completionPayload.max_completion_tokens = 4096; 
            break;
          case 'OpenAI': client = new OpenAI({ apiKey: config.apiKey, timeout: 60 * 1000 }); modelName = 'gpt-4o'; completionPayload.max_tokens = 4096; break;
          case 'Anthropic':
            client = new OpenAI({
              apiKey: config.apiKey,
              baseURL: 'https://api.anthropic.com/v1',
              timeout: 60 * 1000,
              defaultHeaders: { 'x-anthropic-version': '2023-06-01', 'max-tokens': '4096' }
            });
            modelName = 'claude-3-opus-20240229';
            // Pour Anthropic, le system prompt est un paramètre de premier niveau
            completionPayload.system = systemPrompt;
            completionPayload.messages = [{ role: "user", content: question }]; // On ne garde que le message user
            break;
          case 'Mistral': client = new OpenAI({ apiKey: config.apiKey, baseURL: 'https://api.mistral.ai/v1', timeout: 60 * 1000 }); modelName = 'mistral-large-latest'; completionPayload.max_tokens = 4096; break;
          default: rowResult[config.provider] = `[Fournisseur non implémenté]`; continue;
        }
        
        completionPayload.model = modelName;
        log(`  [${config.provider}] Envoi de la requête à l'API...`);
        const apiStartTime = performance.now();
        const response = await client.chat.completions.create(completionPayload as any);
        const apiEndTime = performance.now();
        log(`  [${config.provider}] Réponse reçue en ${Math.round(apiEndTime - apiStartTime)}ms.`);
        
        const choice = response.choices[0];
        if (choice && choice.message?.content) {
          rowResult[config.provider] = choice.message.content;
          rowResult.status = 'Validée';
        } else {
          rowResult[config.provider] = `ERREUR: Réponse vide. Raison: ${choice?.finish_reason || 'inconnue'}.`;
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      rowResult[config.provider] = `ERREUR: ${errorMessage}`;
    }
    const providerEndTime = performance.now();
    log(`  [${config.provider}] Traitement terminé en ${Math.round(providerEndTime - providerStartTime)}ms.`);
  }
  
  const totalEndTime = performance.now();
  log(`Traitement total de la question terminé en ${Math.round(totalEndTime - startTime)}ms.`);
  
  return { result: rowResult, logs };
}

