'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function AbonnementPage() {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success) {
      toast.success('Abonnement succesvol gestart!');
    } else if (canceled) {
      toast.error('Betaling geannuleerd.');
    }
  }, [searchParams]);

  const handleStartSubscription = async () => {
    if (!user) {
      toast.error('Je moet ingelogd zijn om een abonnement te starten.');
      return;
    }

    setIsLoading(true);
    
    try {
      // Get current user ID from auth context
      const userId = user.id;
      
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const { sessionId, error } = await response.json();

      if (error) {
        toast.error('Er is een fout opgetreden bij het starten van het abonnement.');
        return;
      }

      const stripe = await stripePromise;
      if (!stripe) {
        toast.error('Stripe kon niet worden geladen.');
        return;
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (stripeError) {
        toast.error(stripeError.message || 'Er is een fout opgetreden.');
      }
    } catch (error) {
      console.error('Error starting subscription:', error);
      toast.error('Er is een fout opgetreden bij het starten van het abonnement.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Start je abonnement
            </h1>
            <p className="text-lg text-gray-600">
              Kies het abonnement dat bij jou past en begin vandaag nog met het gebruik van onze diensten.
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-2">
                Maandelijks Abonnement
              </h2>
              <p className="text-blue-700 mb-4">
                €29,99 per maand
              </p>
              <ul className="text-sm text-blue-700 space-y-2 mb-6">
                <li>• Volledige toegang tot alle functies</li>
                <li>• Onbeperkt aantal lessen</li>
                <li>• Prioriteit support</li>
                <li>• Maandelijks opzegbaar</li>
              </ul>
            </div>

            <button
              onClick={handleStartSubscription}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Bezig met laden...
                </>
              ) : (
                'Start abonnement'
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Door op "Start abonnement" te klikken ga je akkoord met onze{' '}
              <a href="#" className="text-blue-600 hover:underline">Algemene Voorwaarden</a>
              {' '}en{' '}
              <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
