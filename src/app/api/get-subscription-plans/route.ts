import { NextResponse } from 'next/server';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  stripePriceId: string;
  popular?: boolean;
}

interface PlanCard {
  type: 'basic' | 'premium';
  name: string;
  description: string;
  features: string[];
  monthly: {
    id: string;
    price: string;
    period: string;
    stripePriceId: string;
  };
  yearly: {
    id: string;
    price: string;
    period: string;
    stripePriceId: string;
    popular?: boolean;
    discount?: string;
  };
}

export async function GET() {
  const planCards: PlanCard[] = [
    {
      type: 'basic',
      name: 'Basic',
      description: 'Perfect voor startende rijscholen',
      features: [
        'Onbeperkte leerlingbeheer',
        'Onbeperkte lesplanning',
        'Voortgangsnotities',
        'Overzichtelijke dagplanning',
        'Overzichtelijke weekplanning'
      ],
      monthly: {
        id: 'basic-monthly',
        price: '€19,99',
        period: 'per maand',
        stripePriceId: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID!
      },
      yearly: {
        id: 'basic-yearly',
        price: '€199,99',
        period: 'per jaar (16,66/maand)',
        stripePriceId: process.env.STRIPE_BASIC_YEARLY_PRICE_ID!,
        popular: true,
        discount: '20% korting'
      }
    },
    {
      type: 'premium',
      name: 'Premium',
      description: 'Voor groeiende rijscholen met geavanceerde behoeften',
      features: [
        'Alles uit Basic',
        'Automatische beschikbaarheid',
        'Automatische weekplanning',
        'Automatische meldingen',
        'Automatische herinneringen'
      ],
      monthly: {
        id: 'premium-monthly',
        price: '€49,99',
        period: 'per maand',
        stripePriceId: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID!
      },
      yearly: {
        id: 'premium-yearly',
        price: '€499,99',
        period: 'per jaar (41,66/maand)',
        stripePriceId: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID!,
        discount: '20% korting'
      }
    }
  ];

  return NextResponse.json({ planCards });
} 