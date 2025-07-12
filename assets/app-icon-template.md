# App Icon Template voor RijFlow

## Vereiste Format

### App Store Icon
- **Formaat**: 1024x1024 pixels
- **Bestandstype**: PNG
- **Achtergrond**: Geen transparantie
- **Hoeken**: Vierkant (Apple voegt afgeronde hoeken toe)

### App Icon Design

Gebruik het bestaande RijFlow logo:
- **Kleur**: #2563EB (blauw)
- **Icoon**: Auto/auto icoon
- **Tekst**: "RijFlow" (optioneel)

### Icon Sizes voor iOS

Naast de 1024x1024 App Store icon, heb je ook deze formaten nodig:

```
AppIcon.appiconset/
├── icon-20@2x.png (40x40)
├── icon-20@3x.png (60x60)
├── icon-29@2x.png (58x58)
├── icon-29@3x.png (87x87)
├── icon-40@2x.png (80x80)
├── icon-40@3x.png (120x120)
├── icon-60@2x.png (120x120)
├── icon-60@3x.png (180x180)
├── icon-76.png (76x76)
├── icon-76@2x.png (152x152)
├── icon-83.5@2x.png (167x167)
└── icon-1024.png (1024x1024)
```

## Tools voor Icon Generatie

### Online Tools
- [App Icon Generator](https://appicon.co/)
- [MakeAppIcon](https://makeappicon.com/)
- [Icon Kitchen](https://icon.kitchen/)

### Design Tools
- **Figma**: Gratis online design tool
- **Sketch**: Mac-only design tool
- **Adobe Illustrator**: Professioneel design tool

## Icon Design Tips

1. **Simpel en herkenbaar**: Het icoon moet ook klein goed zichtbaar zijn
2. **Consistent branding**: Gebruik dezelfde kleuren als je app
3. **Geen tekst**: Vermijd tekst in het icoon
4. **Uniek**: Zorg dat het niet lijkt op andere app icons
5. **Test**: Bekijk het icoon op verschillende achtergronden

## Voorbeeld Icon Concept

```
┌─────────────────┐
│                 │
│    🚗 RijFlow   │
│                 │
│  [Auto icoon]   │
│                 │
└─────────────────┘
```

## Plaatsing in Project

Plaats de gegenereerde icons in:
```
ios/App/App/Assets.xcassets/AppIcon.appiconset/
```

## Controle Checklist

- [ ] 1024x1024 App Store icon gemaakt
- [ ] Alle iOS formaten gegenereerd
- [ ] Geen transparantie in App Store icon
- [ ] Icoon ziet er goed uit op witte achtergrond
- [ ] Icoon ziet er goed uit op donkere achtergrond
- [ ] Icoon is uniek en herkenbaar
- [ ] Alle bestanden zijn PNG formaat 