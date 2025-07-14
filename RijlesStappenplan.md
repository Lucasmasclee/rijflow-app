STAPPENPLAN: Van idee naar je eerste klant
FASE 1: Voorbereiding (Doel: fundament leggen)
Doelen:
🟡🟡🟡🟡🟡● MVP maken met Cursor. Dit is af zodra ik zelf het volgende kan doen:
✅✅✅✅✅Als rij-instructeur inloggen:
✅✅✅✅✅● Instructeur kan zich registreren / inloggen via e-mail & wachtwoord (Supabase Auth)
✅✅✅✅✅● Na inloggen komt hij op zijn persoonlijke dashboard
✅✅✅✅✅Een rijschool aanmaken:
✅✅✅✅✅● Mogelijkheid om een rijschoolprofiel in te vullen (naam, leerlingen toevoegen en bewerken)
✅✅✅✅✅Leerlingen 'aanmaken' en beheren:
✅✅✅✅✅● Nieuwe leerling toevoegen met:
✅✅✅✅✅○ Voor- en achternaam
✅✅✅✅✅○ E-mailadres
✅✅✅✅✅○ Telefoonnummer
✅✅✅✅✅○ Adres
✅✅✅✅✅● Leerlingen verschijnen in een overzicht (lijst of kaarten)
✅✅✅✅✅● Elke leerling heeft een eigen detailpagina
✅✅✅✅✅Per leerling: voortgang & info bijhouden:

AI Rooster:
✅✅✅✅✅● Instructeur klikt op "AI rooster" en gaat naar de pagina
✅✅✅✅✅● Instructeur kan zijn eigen beschikbaarheid voor de week intypen
✅✅✅✅✅● De beschikbaarheid staat al automatisch goed
✅✅✅✅✅● Instructeur gaat vervolgens langs de beschikbaarheid van elke leerling. 
✅✅✅✅✅● Elke leerling heeft een beschikbaarheid voor de week ingevuld in zijn notities, een AI prompt maakt deze notities netjes en overzichtelijk
✅✅✅✅✅● Per leerling kan de instructeur invullen hoeveel lessen die leerling krijgt voor die week en hoeveel minuten per les dat zijn voor die leerling
● Al deze gegevens voor de instructeur en leerling verwerken naar een goede prompt voor chatgpt
● Chatgpt een prompt sturen en vragen voor een json bestand of csv bestand
● Voor later: Rekening houden met afstand tussen plaatsen en extra notities voor praktische zaken (Spits enzo)

Voor later
Chat per leerling (1:1 chat):
● Elke leerling heeft een aparte chat met zijn instructeur
● Chatgeschiedenis wordt opgeslagen
● Notificatie als er een nieuw bericht is
● (Later uitbreiden met bijlagen / emoji / berichten wissen)

Roosters maken (lesplanning):
● AI roosters laten maken door middel van notities van rijinstructeur + notities van elke leerling
● Instructeur ziet kalenderweergave (dag/week)
● Kan nieuwe lessen toevoegen (datum, tijd, leerling kiezen)
● Kan bestaande lessen verplaatsen (drag & drop)
● Leerling ziet geplande lessen (zie hieronder)
● Instructeur kan notities per leerling toevoegen, bijvoorbeeld per les
● Voortgangsnotities zijn per datum zichtbaar (bijv. een lijst of tijdlijn)
● (Optioneel voor later: automatische herinneringen)
● Google Maps kunnen openen per les
● Automatisch een email sturen naar leerling
● Automatisch een melding sturen naar leerling
● 
● 


Als leerling inloggen:
✅● Leerling kan inloggen met e-mail & wachtwoord (Supabase Auth)
✅● Ziet alleen zijn/haar eigen profiel

Voor later:
● Ziet de chat met eigen instructeur
● Kan zelf berichten sturen

Beschikbaarheid kunnen invullen:
● Leerling kan in een kalender aangeven op welke dagen/tijdstippen hij beschikbaar is
● Instructeur ziet deze beschikbaarheid in zijn eigen rooster

Ik ben nu hetvolgende proces aan het testen:
1. Registreren als rij-instructeur✅
2. Bevestigingsmail openen en account bevestigen✅
3. Inloggen als rij-instructeur✅
4. Een leerling aanmaken✅
5. Een uitnodigingslink naar de leerling sturen✅
6. De uitnodigingslink klikken, en een account aanmaken met email en wachtwoord✅
7. Inloggen als leerling✅
8. Beschikbaarheid invullen als leerling✅
9. Deze beschikbaarheid synchroniseren voor zowel instructeur als leerling✅

Glitches:
Op Macbook: bij inloggen is de tekst soms wit
Op Macbook: beschikbaarheid invullen in student dashboard tekst is wit
Als leerling uitnodigingslink klikt en email en wachtwoord aanmaakt, moet hij een scherm te zien krijgen met "Bevestig je account in email"

App mooi maken en elke pagina checken
App goed laten lijken op telefoon



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