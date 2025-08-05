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
  };
}

export async function GET() {
  const planCards: PlanCard[] = [
    {
      type: 'basic',
      name: 'Basis',
      description: 'Perfect voor startende rijscholen',
      features: [
        'Onbeperkt aantal leerlingen',
        'Lesplanning en agenda',
        'Voortgangsnotities',
        'SMS notificaties',
        'Basis support'
      ],
      monthly: {
        id: 'basic-monthly',
        price: '€29,99',
        period: 'per maand',
        stripePriceId: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID!
      },
      yearly: {
        id: 'basic-yearly',
        price: '€299,99',
        period: 'per jaar (2 maanden gratis)',
        stripePriceId: process.env.STRIPE_BASIC_YEARLY_PRICE_ID!,
        popular: true
      }
    },
    {
      type: 'premium',
      name: 'Premium',
      description: 'Voor groeiende rijscholen met geavanceerde behoeften',
      features: [
        'Alles uit Basis',
        'AI-geassisteerde planning',
        'Geavanceerde rapportages',
        'Prioriteit support',
        'API toegang'
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
        period: 'per jaar',
        stripePriceId: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID!
      }
    }
  ];

  return NextResponse.json({ planCards });
} 