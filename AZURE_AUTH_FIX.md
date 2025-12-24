# Guide de résolution du problème d'authentification Azure OpenAI

## Problème
Erreur : `403 - Key based authentication is disabled for this resource`

## Solutions

### Option 1 : Activer l'authentification par clé API (Recommandé pour le développement)

1. **Via le portail Azure :**
   - Connectez-vous à https://portal.azure.com
   - Allez dans votre ressource Azure OpenAI
   - Dans le menu de gauche, sélectionnez **"Keys and Endpoint"**
   - En haut, cliquez sur **"Access control"** ou **"Authentication"**
   - Activez **"API Key Authentication"**
   - Copiez votre clé API

2. **Via Azure CLI :**
   ```bash
   # Lister vos ressources Azure OpenAI
   az cognitiveservices account list --query "[?kind=='OpenAI']" -o table
   
   # Activer l'authentification par clé
   az cognitiveservices account update \
     --name <nom-ressource> \
     --resource-group <nom-resource-group> \
     --custom-domain <custom-domain> \
     --identity-type SystemAssigned
   ```

3. **Ajouter la clé à Azure App Service :**
   ```bash
   az webapp config appsettings set \
     --name rfpcopilot-app \
     --resource-group rfpcopilot-rg \
     --settings AZURE_OPENAI_API_KEY="votre_cle_api"
   ```

### Option 2 : Utiliser Entra ID (Azure AD) - Plus sécurisé pour la production

L'application a été mise à jour pour supporter cette méthode automatiquement.

1. **Configurer l'identité managée sur Azure App Service :**
   ```bash
   az webapp identity assign \
     --name rfpcopilot-app \
     --resource-group rfpcopilot-rg
   ```

2. **Donner les permissions à l'identité managée :**
   ```bash
   # Récupérer l'ID de l'identité
   PRINCIPAL_ID=$(az webapp identity show \
     --name rfpcopilot-app \
     --resource-group rfpcopilot-rg \
     --query principalId -o tsv)
   
   # Attribuer le rôle "Cognitive Services OpenAI User"
   az role assignment create \
     --assignee $PRINCIPAL_ID \
     --role "Cognitive Services OpenAI User" \
     --scope /subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.CognitiveServices/accounts/<openai-resource-name>
   ```

3. **Dans l'application, laissez le champ API Key vide** - l'authentification se fera automatiquement via Entra ID

### Option 3 : Variables d'environnement pour l'application

Après avoir configuré votre méthode d'authentification, ajoutez les variables d'environnement :

```bash
az webapp config appsettings set \
  --name rfpcopilot-app \
  --resource-group rfpcopilot-rg \
  --settings \
    AZURE_OPENAI_ENDPOINT="https://votre-ressource.openai.azure.com/" \
    AZURE_OPENAI_API_VERSION="2024-02-15-preview" \
    AZURE_OPENAI_DEPLOYMENT="nom-deployment"
```

## Vérification

Après avoir appliqué une des solutions, redémarrez l'application :

```bash
az webapp restart --name rfpcopilot-app --resource-group rfpcopilot-rg
```

Puis testez la connexion depuis l'interface web.
