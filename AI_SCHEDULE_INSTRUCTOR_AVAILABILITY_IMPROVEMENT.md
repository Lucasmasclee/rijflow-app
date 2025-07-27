# AI Schedule Instructor Availability Improvement

## 🎯 Overzicht

De AI schedule pagina is verbeterd om duidelijk te tonen waar de instructeur beschikbaarheid vandaan komt. Het systeem toont nu expliciet of de data afkomstig is van:
- **Bestaande week-specifieke beschikbaarheid** (groen)
- **Standaard beschikbaarheid** (geel) 
- **Standaard tijden** (grijs)

## 🔄 Belangrijkste Verbeteringen

### 1. Duidelijke Data Bron Indicatie

#### Voor: Onduidelijk waar data vandaan komt
- Gebruiker wist niet of data bestaand was of nieuw aangemaakt
- Geen feedback over welke bron gebruikt werd

#### Na: Expliciete bron indicatie
- **Groen bericht**: "✓ Bestaande beschikbaarheid geladen"
- **Geel bericht**: "📅 Standaard beschikbaarheid gebruikt"  
- **Grijs bericht**: "⚙️ Standaard tijden geladen"

### 2. Verbeterde Gebruikerservaring

#### Visuele Feedback
- **Kleurgecodeerde berichten** voor snelle herkenning
- **Loading states** tijdens data ophalen
- **Context-aware success messages**

#### Helpende Links
- **Settings link** verschijnt wanneer standaard beschikbaarheid gebruikt wordt
- **Directe navigatie** naar rooster instellingen pagina

### 3. Technische Verbeteringen

#### API Response
```typescript
{
  success: true,
  data: AIWeekplanningData,
  availabilitySource: 'existing' | 'standard' | 'default',
  message: string
}
```

#### Frontend State Management
```typescript
const [availabilitySource, setAvailabilitySource] = useState<'existing' | 'standard' | 'default'>('default')
```

## 🗄️ Database Logica

### 1. Prioriteitsvolgorde
1. **Week-specifieke beschikbaarheid** (`instructor_availability`)
2. **Standaard beschikbaarheid** (`standard_availability`) 
3. **Standaard tijden** (09:00-17:00)

### 2. Automatische Record Aanmaak
- Als geen week-specifieke data bestaat, wordt automatisch een record aangemaakt
- Data wordt gekopieerd van standaard beschikbaarheid of standaard tijden
- Gebruiker krijgt direct feedback over wat er gebeurd is

## 🎨 UI/UX Verbeteringen

### 1. Instructeur Beschikbaarheid Stap

#### Voor
```
Instructeur Beschikbaarheid
Stel je beschikbare tijden in voor de geselecteerde week
[Week info]
[Availability form]
```

#### Na
```
Instructeur Beschikbaarheid  
Stel je beschikbare tijden in voor de geselecteerde week
[Week info]
[Loading state or colored info box]
[Availability form with loading state]
```

### 2. Informatie Boxen

#### Bestaande Beschikbaarheid (Groen)
```
✓ Bestaande beschikbaarheid geladen
Er was al een beschikbaarheid ingesteld voor deze week. 
Je kunt deze aanpassen indien gewenst.
```

#### Standaard Beschikbaarheid (Geel)
```
📅 Standaard beschikbaarheid gebruikt
Er was nog geen beschikbaarheid voor deze week. 
Je standaard beschikbaarheid is geladen. 
Pas deze aan voor deze specifieke week.

Bekijk/beheer standaard beschikbaarheid →
```

#### Standaard Tijden (Grijs)
```
⚙️ Standaard tijden geladen
Er was nog geen beschikbaarheid ingesteld. 
Standaard tijden (09:00-17:00) zijn geladen. 
Stel je beschikbaarheid in.

Bekijk/beheer standaard beschikbaarheid →
```

## 🧪 Testen

### Test Scenario's

#### Test 1: Bestaande Week-specifieke Beschikbaarheid
1. Maak `instructor_availability` record aan voor specifieke week
2. Laad AI schedule pagina en selecteer die week
3. Verifieer groen succes bericht verschijnt
4. Verifieer beschikbaarheid data geladen wordt van bestaande record

#### Test 2: Standaard Beschikbaarheid Fallback
1. Zorg dat `standard_availability` bestaat voor instructeur
2. Verwijder eventuele `instructor_availability` voor specifieke week
3. Laad AI schedule pagina en selecteer die week
4. Verifieer geel bericht verschijnt
5. Verifieer data komt van `standard_availability`

#### Test 3: Standaard Tijden Fallback
1. Verwijder `standard_availability` voor instructeur
2. Verwijder eventuele `instructor_availability` voor specifieke week
3. Laad AI schedule pagina en selecteer die week
4. Verifieer grijs bericht verschijnt
5. Verifieer standaard tijden (09:00-17:00) geladen worden

#### Test 4: Settings Link Zichtbaarheid
1. Test met bestaande beschikbaarheid - geen settings link
2. Test met standaard beschikbaarheid - settings link moet verschijnen
3. Test met standaard tijden - settings link moet verschijnen

## 📋 Implementatie Checklist

### Backend (API)
- ✅ `availabilitySource` toegevoegd aan API response
- ✅ Logica voor het bepalen van data bron
- ✅ Juiste fallback mechanisme

### Frontend (UI)
- ✅ `availabilitySource` state management
- ✅ Kleurgecodeerde informatie boxen
- ✅ Loading states tijdens data ophalen
- ✅ Settings link wanneer relevant
- ✅ Context-aware success messages

### Database
- ✅ Bestaande `instructor_availability` tabel
- ✅ Bestaande `standard_availability` tabel
- ✅ Juiste RLS policies

## 🚀 Voordelen

### Voor Gebruikers
1. **Duidelijkheid**: Weten altijd waar data vandaan komt
2. **Controle**: Kunnen direct naar settings navigeren
3. **Feedback**: Krijgen bevestiging van wat er gebeurt
4. **Efficiëntie**: Geen verrassingen over data bron

### Voor Ontwikkelaars
1. **Debugging**: Makkelijker om data flow te volgen
2. **Maintenance**: Duidelijke scheiding van verantwoordelijkheden
3. **Testing**: Specifieke test scenario's mogelijk
4. **Documentation**: Zelf-documenterende code

## 🔮 Toekomstige Verbeteringen

### Mogelijke Uitbreidingen
1. **Audit trail**: Bijhouden wanneer data is aangemaakt/aangepast
2. **Bulk operations**: Meerdere weken tegelijk instellen
3. **Templates**: Vooraf gedefinieerde beschikbaarheid patronen
4. **Notifications**: Meldingen bij wijzigingen in beschikbaarheid

### Performance Optimalisaties
1. **Caching**: Cache standaard beschikbaarheid lokaal
2. **Lazy loading**: Alleen data laden wanneer nodig
3. **Optimistic updates**: UI direct updaten, API call op achtergrond 