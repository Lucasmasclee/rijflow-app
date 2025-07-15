# AI Schedule Setup Guide

## 🚀 Overzicht

De AI Schedule functionaliteit is nu volledig geïmplementeerd! Deze functie gebruikt ChatGPT om automatisch een optimaal lesrooster te genereren op basis van:

- Instructeur beschikbaarheid
- Leerling voorkeuren en notities
- Planning instellingen (pauzes, locaties, etc.)

## 🔧 Setup Vereisten

### 1. OpenAI API Key

Je hebt een OpenAI API key nodig voor de ChatGPT functionaliteit:

1. Ga naar [OpenAI Platform](https://platform.openai.com/)
2. Maak een account of log in
3. Ga naar "API Keys" in het dashboard
4. Klik op "Create new secret key"
5. Kopieer de API key

### 2. Environment Variables

Voeg de volgende environment variables toe aan je `.env.local` bestand:

```env
# Bestaande Supabase configuratie
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Nieuwe OpenAI configuratie
OPENAI_API_KEY=your_openai_api_key
```

### 3. Dependencies

De volgende dependencies zijn toegevoegd:

```bash
npm install openai
```

## 🎯 Functionaliteiten

### ✅ Geïmplementeerde Features

1. **Instructeur Beschikbaarheid**
   - Configureer beschikbare dagen en tijden
   - Automatisch opgeslagen in database

2. **Leerling Instellingen**
   - Aantal lessen en minuten per week
   - AI notities voor speciale instructies
   - Reset naar standaard waarden

3. **Planning Instellingen**
   - Locatie verbinding
   - Pauze configuratie
   - Extra specificaties

4. **AI Planning**
   - ChatGPT integratie
   - Intelligente rooster generatie
   - JSON response parsing

5. **Les Selectie**
   - Overzicht van gegenereerde lessen
   - Individuele en bulk selectie
   - Waarschuwingen en samenvatting

6. **Les Toevoeging**
   - Bulk toevoeging aan database
   - Succes feedback
   - Link naar weekoverzicht

## 🔄 Workflow

1. **Instructeur gaat naar AI Schedule pagina**
2. **Configureert eigen beschikbaarheid**
3. **Past leerling instellingen aan**
4. **Stelt planning parameters in**
5. **Start AI Planning**
6. **Selecteert gewenste lessen**
7. **Voegt lessen toe aan rooster**

## 🛠 Technische Details

### API Endpoints

- `POST /api/ai-schedule` - Genereert AI rooster
- `POST /api/lessons/bulk` - Voegt lessen toe aan database

### Database Tabellen

- `instructor_availability` - Instructeur beschikbaarheid
- `lessons` - Geplande lessen
- `students` - Leerling informatie

### AI Prompt Structuur

De AI krijgt een gestructureerde prompt met:
- Instructeur beschikbaarheid per dag
- Leerling informatie (naam, lessen, notities)
- Planning instellingen
- Specifieke instructies voor JSON output

## 🎨 UI/UX Features

- **Progress Steps** - Duidelijke voortgangsindicator
- **Loading States** - Feedback tijdens AI processing
- **Error Handling** - Gebruiksvriendelijke foutmeldingen
- **Responsive Design** - Werkt op alle schermformaten
- **Toast Notifications** - Succes en fout feedback

## 🔍 Troubleshooting

### Veelvoorkomende Problemen

1. **"Fout bij het genereren van het rooster"**
   - Controleer of OPENAI_API_KEY is ingesteld
   - Controleer of je OpenAI account credits heeft

2. **"Geen leerlingen opgegeven"**
   - Zorg ervoor dat er leerlingen zijn toegevoegd
   - Controleer of leerlingen correct zijn geladen

3. **"Instructeur is niet beschikbaar"**
   - Zorg ervoor dat ten minste één dag is geselecteerd
   - Controleer de beschikbare tijden

### Debug Tips

- Open browser developer tools voor console logs
- Controleer network tab voor API responses
- Verifieer environment variables in Vercel dashboard

## 🚀 Deployment

### Vercel

1. Voeg environment variables toe in Vercel dashboard
2. Deploy de applicatie
3. Test de AI functionaliteit

### Lokale Development

1. Maak `.env.local` bestand aan
2. Voeg alle environment variables toe
3. Start development server: `npm run dev`

## 💰 Kosten

- **OpenAI API**: ~$0.03 per rooster generatie (GPT-4)
- **Supabase**: Gratis tier voor meeste gebruik
- **Vercel**: Gratis tier voor hosting

## 🔮 Toekomstige Verbeteringen

- [ ] Meerdere rooster opties
- [ ] Reistijd berekening
- [ ] Automatische notificaties
- [ ] Integratie met Google Calendar
- [ ] Machine learning voor betere planning

---

**AI Schedule is nu klaar voor gebruik!** 🎉 