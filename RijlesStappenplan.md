STAPPENPLAN: Van idee naar je eerste klant
FASE 1: Voorbereiding (Doel: fundament leggen)
Doelen:
● MVP maken met Cursor. Dit is af zodra ik zelf het volgende kan doen:
Als rij-instructeur inloggen:
● Instructeur kan zich registreren / inloggen via e-mail & wachtwoord (Supabase Auth)
● Na inloggen komt hij op zijn persoonlijke dashboard
Een rijschool aanmaken:
● Mogelijkheid om een rijschoolprofiel in te vullen (naam, locatie, KvK, logo)
● Rijschool is gekoppeld aan de ingelogde instructeur
Leerlingen 'aanmaken' en beheren:
● Nieuwe leerling toevoegen met:
○ Voor- en achternaam
○ E-mailadres
○ Telefoonnummer
○ Adres
● Leerlingen verschijnen in een overzicht (lijst of kaarten)
● Elke leerling heeft een eigen detailpagina
Per leerling: voortgang & info bijhouden:
● Instructeur kan notities per leerling toevoegen, bijvoorbeeld per les
● Voortgangsnotities zijn per datum zichtbaar (bijv. een lijst of tijdlijn)
● (Later: checkboxen voor onderdelen: parkeren, kijkgedrag, enz.)
Chat per leerling (1:1 chat):
● Elke leerling heeft een aparte chat met zijn instructeur
● Chatgeschiedenis wordt opgeslagen
● Notificatie als er een nieuw bericht is
● (Later uitbreiden met bijlagen / emoji / berichten wissen)
Roosters maken (lesplanning):
● Instructeur ziet kalenderweergave (dag/week)
● Kan nieuwe lessen toevoegen (datum, tijd, leerling kiezen)
● Kan bestaande lessen verplaatsen (drag & drop)
● Leerling ziet geplande lessen (zie hieronder)
● (Optioneel voor later: automatische herinneringen)
Als leerling inloggen:
● Leerling kan inloggen met e-mail & wachtwoord (Supabase Auth)
● Ziet alleen zijn/haar eigen profiel
Chat met instructeur:
● Ziet de chat met eigen instructeur
● Kan zelf berichten sturen
Beschikbaarheid kunnen invullen:
● Leerling kan in een kalender aangeven op welke dagen/tijdstippen hij beschikbaar is
● Instructeur ziet deze beschikbaarheid in zijn eigen rooster
● (Later: leerling kan verzoeken om les op bepaalde tijd)
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