Alle functies in de app:

Dashboard met:
✅✅✅✅✅- Dag overzicht
✅✅✅✅✅- Week overzicht
✅✅✅✅✅- Leerling overzicht

Dag overzicht:
✅✅✅✅✅- Per les begintijd, eindtijd, leerling, google maps extensie
✅✅✅✅✅- Klikken op een les laat algemene notities van leerling zien
✅✅✅✅✅- Klikken op een les laat notitie geschiedenis voor die leerling zien
✅✅✅✅✅- Klikken op een les laat notities voor die les zien
✅✅✅✅✅- Klikken op een les heeft nieuw inputfield voor nieuwe lesnotities
✅✅✅✅✅- Snelkoppeling naar leerling in lessen van dagoverzicht
✅✅✅✅✅- Knoppen naar vorige en volgende dag

Weekoverzicht:
✅✅✅✅✅- Nieuwe lessen toevoegen
✅✅✅✅✅- Lessen bewerken
✅✅✅✅✅- Lessen verwijderen
✅✅✅✅✅- Lessen dupliceren
- Weekplanning kopiëren naar andere weken
- Zoekbalk voor filteren van lessen: Bijvoorbeeld een naam intypen en alle lessen van die leerling te zien krijgen

Leerling overzicht:
✅✅✅✅✅- Nieuwe leerlingen aanmaken
✅✅✅✅✅- Leerlingen bewerken
✅✅✅✅✅- Leerlingen verwijderen

Chatgpt om een systeem vragen om dit zo makkelijk mogelijk te doen
- Nieuwe implementatie voor beschikbaarheid van leerlingen:
- Link sturen waarbij op een of andere manier een leerling een inputfield te zien krijgt met een lijst van Maandag t/m Zondag voor een bepaalde week. Deze moet de leerling dan bewerken en versturen. Dit moet de rij instructeur vervolgens te zien krijgen

Specifieke leerling overzicht:
✅✅✅✅✅- Adres, telefoonnummer, emailadres, algemene notities
✅✅✅✅✅- Geschiedenis van lesnotities
✅✅✅✅✅- Aantal lessen gehad
✅✅✅✅✅- Aantal lessen ingepland
✅✅✅✅✅- Standaard lesuren per week
✅✅✅✅✅- Standaard minuten per les

Rooster Instellingen
✅✅✅✅✅- Standaard dagen per week dat instructeur beschikbaar is
- Standaard uren per week dat instructeur beschikbaar is

AI Rooster
✅✅✅✅✅● Instructeur klikt op "AI rooster" en gaat naar de pagina
✅✅✅✅✅● Instructeur kan zijn eigen beschikbaarheid voor de week intypen
✅✅✅✅✅● Beschikbaarheid dagen staat automatisch goed
- Beschikbaarheid uren staat automatisch goed
✅✅✅✅✅● Instructeur gaat vervolgens langs de beschikbaarheid van elke leerling. 
✅✅✅✅✅● Elke leerling heeft een beschikbaarheid voor de week ingevuld in zijn notities, een AI prompt maakt deze notities netjes en overzichtelijk
- Voor elke leerling staat de correcte standaarduren en standaardminuten per les
✅✅✅✅✅● Per leerling kan de instructeur invullen hoeveel lessen die leerling krijgt voor die week en hoeveel minuten per les dat zijn voor die leerling
- Scherm voor andere notities:
- pauzes
- locatieplanning
- Meldingen sturen naar leerlingen
● Al deze gegevens voor de instructeur en leerling verwerken naar een goede prompt voor chatgpt
● Chatgpt een prompt sturen en vragen voor een json bestand of csv bestand
● Een overzicht van wat chatgpt gaat toevoegen
● Per les in dit overzicht kunnen selecteren of het wordt toegevoegd (Voor het bewerken van de lessen staat er een tekst: Bewerken kan na het toevoegen van lessen)
● Alle geselecteerde lessen in dit overzicht toevoegen





Voor later / Verbeteringen / Ideeën:
- Badges per leerling voor: Theorie gehaald, examen ingepland (met optie voor datum erbij) (Dit zou aan algemene notities moeten worden toegevoegd)
- Todolist in dashboard (Zoals bijvoorbeeld: factuur sturen naar Leerling X)
- Automatisch naar huidige les scrollen (En uitklappen)
- In dagoverzicht tussen elke 2 lessen de reistijd weergeven
- In dagoverzicht elke les volgorde wisselen: "Student, starttijd - eindtijd" ipv "starttijd - eindtijd, student"
- Simpele wijziging in rooster door middel van een tekst: "Leerling X is ziek deze week, en leerling Y kan toch wel op dinsdag"
- Voortgangsnotities in ander formaat neerzetten
● Voor later: Een 2e overzicht, waarbij de instructeur kan kiezen welke weekplanning het beste lijkt
● Voor later: Rekening houden met afstand tussen plaatsen en extra notities voor praktische zaken (Spits enzo)
- (Voor later) Weekplanning kopiëren 
- Automatisch een email / sms sturen naar leerlingen met hun ingeplande lessen zodra weekplanning gemaakt is
- In overzicht per leerling: Lessen gehad: x, Lessen ingepland: y

Glitches:
Op Macbook: bij inloggen is de tekst soms wit
Op Macbook: beschikbaarheid invullen in student dashboard tekst is wit
Als leerling uitnodigingslink klikt en email en wachtwoord aanmaakt, moet hij een scherm te zien krijgen met "Bevestig je account in email"
Snelkoppeling naar leerling in lessen van dagoverzicht

App mooi maken en elke pagina checken
App goed laten lijken op telefoon

Wat NIET in de app moet zitten:
- Facturatie
- Betaalsystemen
- Leerlingen verwerven
- Aanmeldingssystemen bij rijscholen
- Een chatfunctie tussen instructeur en leerling
- Administratie










Totale doel van de MVP:
Zodra een instructeur en leerling beiden kunnen inloggen, gegevens kunnen beheren, met elkaar kunnen
chatten, én de instructeur lesplanning en voortgang kan bijhouden, is het MVP klaar voor pilots met
echte klanten.
Eerste versie van de app online krijgen
1. Kies je app-naam
● Kies een naam uit bijv. RijFlow, LesPilot, DriveMate
● Check of de .nl/.com beschikbaar is (via TransIP, Namecheap etc.)
2. Zet je project op in Cursor
● Start een nieuw project: Next.js + Tailwind + Supabase
● Gebruik deze prompt in Cursor:
plaintext
CopyEdit
Maak een dashboard-app voor rijinstructeurs met login (Supabase), lesplanning, leerlingbeheer
en facturatie. Gebruik Next.js, Tailwind en Supabase.
3. Laat Cursor MVP bouwen
● Voeg toe: lesoverzicht, leerlingprofiel, factuurmodule
● Laat Cursor styling doen: "maak het modern en eenvoudig"
● Maak mock-gegevens om te tonen hoe het werkt
4. Deploy je app via Vercel
● Verbind Cursor met Vercel en zet je app online
● Geef je app een duidelijke URL: app.rijflow.nl bijvoorbeeld
FASE 2: Test & feedback (Doel: bewijs dat je iets waardevols hebt)
5. Bouw een mini-landingpagina
● Gebruik Vercel of Framer/Super.so/Notion
● Zet hierop:
○ App demo screenshots
○ Probleem & oplossing
○ CTA: "Meld je aan voor gratis proef"
6. Vind 3 rijinstructeurs in je netwerk of via Google
● Zoek op "rijschool [jouw stad]" in Maps
● Bel of mail (script hieronder)
Bel-/mailscript voorbeeld:
"Hoi, ik ben bezig met een supermakkelijke tool voor rijinstructeurs waarmee je je planning, leerlingen en
administratie op 1 plek doet.
Ik zoek 2-3 mensen die dit gratis willen testen en me eerlijk feedback geven. Zou ik je een demo mogen laten
zien (5-10 min)?"
7. Laat je app zien aan deze testers
● Deel je scherm of stuur de URL
● Vraag: "Zou dit jouw werk makkelijker maken?"
● Noteer elke opmerking of wens (niet verdedigen!)
FASE 3: Verbeter & lanceer (Doel: een gebruiksklare app)
8. Verwerk feedback in je MVP
● Verbeter wat echt ontbreekt (bijv. opslaan werkt niet, lespakket ontbreekt)
● Voeg simpele onboarding toe ("Voeg je eerste leerling toe")
9. Stel een gratis proefperiode in (14 of 30 dagen)
● Maak dit zichtbaar op je landingspagina
● Zet trial-verloopnotificaties klaar via e-mail (bijv. met MailerLite)
FASE 4: Actieve klantenwerving (Doel: je eerste betalende gebruiker)
10. Benader 10 rijinstructeurs persoonlijk
● Gebruik:
○ Facebook-groepen ("Rijinstructeurs onder elkaar")
○ Lokale rijscholen via Maps
○ LinkedIn zoekopdracht
● Stuur DM / e-mail met korte pitch
Voorbeeldtekst:
"Ik heb een tool gebouwd speciaal voor rijinstructeurs om ritplanning en administratie veel makkelijker te
maken.
We zoeken nu een paar gebruikers die het gratis willen testen — zou jij interesse hebben in een korte demo?"
11. Bied ze onboarding aan
● Bel ze of laat een video zien
● Help ze hun eerste leerling invoeren + een les plannen
12. Stel je prijs voor ná de proefperiode in
● €19/maand als startplan is ideaal
● Leg uit: "Na 30 dagen krijg je een mail om te verlengen, als je tevreden bent."
FASE 5: Je eerste klant
13. Stuur betaalverzoek of zet Stripe / Mollie aan
● Gebruik Supabase + Stripe (of handmatig een Tikkie voor eerste klant)
● Geef korting ("Eerste 3 maanden voor €10/maand")
14. Vraag direct om een testimonial / quote
● Vraag: "Mag ik jouw ervaring gebruiken als review?"
● Zet op je landingpagina met foto/logo