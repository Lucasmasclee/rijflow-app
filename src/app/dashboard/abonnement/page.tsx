'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// Debug Supabase configuration
console.log('🔧 Supabase client initialized:', !!supabase);
import { Instructeur } from '@/types/database';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

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

export default function AbonnementPage() {
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(false);
  const [isLoadingYearly, setIsLoadingYearly] = useState(false);
  const [instructorData, setInstructorData] = useState<Instructeur | null>(null);
  const [planCards, setPlanCards] = useState<PlanCard[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [billingCycle, setBillingCycle] = useState<{ [key: string]: 'monthly' | 'yearly' }>({
    basic: 'monthly',
    premium: 'monthly'
  });
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  console.log('🚀 AbonnementPage component initialized');
  console.log('🔧 Current state:', {
    isLoadingMonthly,
    isLoadingYearly,
    instructorData: instructorData ? 'exists' : 'null',
    loadingData,
    error,
    user: user ? 'exists' : 'null'
  });

  // Test function to debug Supabase connection
  const testSupabaseConnection = async () => {
    console.log('🧪 Testing Supabase connection...');
    try {
      const { data, error } = await supabase
        .from('instructors')
        .select('count')
        .limit(1);
      
      console.log('🧪 Test result - data:', data);
      console.log('🧪 Test result - error:', error);
      
      if (error) {
        console.error('🧪 Test failed:', error);
      } else {
        console.log('🧪 Test successful');
      }
    } catch (err) {
      console.error('🧪 Test exception:', err);
    }
  };

  // Test function to debug API routes
  const testApiConnection = async () => {
    console.log('🧪 Testing API connection...');
    try {
      const response = await fetch('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'data' }),
      });
      
      const result = await response.json();
      console.log('🧪 API test result:', result);
      
      if (response.ok) {
        console.log('🧪 API test successful');
      } else {
        console.error('🧪 API test failed:', result);
      }
    } catch (err) {
      console.error('🧪 API test exception:', err);
    }
  };

  // Debug function to test server-side logging
  const testDebugApi = async () => {
    console.log('🔍 Testing debug API...');
    try {
      const response = await fetch('/api/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: user?.id,
          test: 'debug_data' 
        }),
      });
      
      const result = await response.json();
      console.log('🔍 Debug API result:', result);
      
      if (response.ok) {
        console.log('🔍 Debug API successful');
      } else {
        console.error('🔍 Debug API failed:', result);
      }
    } catch (err) {
      console.error('🔍 Debug API exception:', err);
    }
  };

  // Debug function to check database contents
  const testDatabaseDebug = async () => {
    console.log('🔍 Testing database debug...');
    try {
      const response = await fetch('/api/debug-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: user?.id
        }),
      });
      
      const result = await response.json();
      console.log('🔍 Database debug result:', result);
      
      if (response.ok) {
        console.log('🔍 Database debug successful');
      } else {
        console.error('🔍 Database debug failed:', result);
      }
    } catch (err) {
      console.error('🔍 Database debug exception:', err);
    }
  };

  // Run test on component mount
  useEffect(() => {
    testSupabaseConnection();
  }, []);

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success) {
      toast.success('Abonnement succesvol gestart!');
      setShouldRedirect(true);
    } else if (canceled) {
      toast.error('Betaling geannuleerd.');
    }
  }, [searchParams]);

  // Handle redirect after successful subscription
  useEffect(() => {
    if (shouldRedirect) {
      router.push('/dashboard');
    }
  }, [shouldRedirect, router]);

  const fetchPlanData = async () => {
    try {
      const response = await fetch('/api/get-subscription-plans');
      if (response.ok) {
        const data = await response.json();
        setPlanCards(data.planCards);
      } else {
        console.error('Failed to fetch plan data');
      }
    } catch (error) {
      console.error('Error fetching plan data:', error);
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    const fetchInstructorData = async () => {
      console.log('🔍 Starting fetchInstructorData...');
      console.log('👤 User:', user);
      console.log('👤 User type:', typeof user);
      console.log('👤 User keys:', user ? Object.keys(user) : 'null');
      
      if (!user) {
        console.log('❌ No user found, setting loading to false');
        setLoadingData(false);
        return;
      }

      console.log('🆔 User ID:', user.id);
      console.log('📧 User email:', user.email);
      console.log('🔑 User role:', user.user_metadata?.role);
      console.log('🆔 User ID type:', typeof user.id);
      console.log('🆔 User ID length:', user.id?.length);

      // Test Supabase connection first
      try {
        console.log('🔧 Testing Supabase connection...');
        const { data: testData, error: testError } = await supabase
          .from('instructors')
          .select('count')
          .limit(1);
        
        console.log('🔧 Supabase connection test - data:', testData);
        console.log('🔧 Supabase connection test - error:', testError);
        
        if (testError) {
          console.error('🔧 Supabase connection failed:', testError);
          setError(`Supabase connection failed: ${testError.message}`);
          setLoadingData(false);
          return;
        }
        
        console.log('🔧 Supabase connection successful');
      } catch (testError) {
        console.error('🔧 Supabase connection test exception:', testError);
        setError(`Supabase connection test failed: ${testError instanceof Error ? testError.message : 'Unknown error'}`);
        setLoadingData(false);
        return;
      }

      try {
        console.log('🔗 Attempting to fetch instructor data...');
        console.log('🔗 Query: SELECT * FROM instructors WHERE id =', user.id);
        
        const { data, error } = await supabase
          .from('instructors')
          .select('*')
          .eq('id', user.id)
          .single();

        console.log('📊 Supabase response - data:', data);
        console.log('📊 Supabase response - error:', error);
        console.log('📊 Data type:', typeof data);
        console.log('📊 Error type:', typeof error);

        if (error) {
          console.error('❌ Supabase error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            error: error
          });
          
          // Check if it's a "not found" error
          if (error.code === 'PGRST116') {
            console.log('⚠️ Instructor record not found, this might be expected for new users');
            setError('Instructor record not found - this might be normal for new users');
          } else {
            setError(`Failed to fetch instructor data: ${error.message} (Code: ${error.code})`);
          }
          return;
        }

        if (!data) {
          console.log('⚠️ No data returned from Supabase');
          setError('No instructor data found');
          return;
        }

        console.log('✅ Successfully fetched instructor data:', data);
        console.log('✅ Data keys:', Object.keys(data));
        setInstructorData(data);
        setError(null);
      } catch (error) {
        console.error('💥 Caught exception during fetch:', error);
        console.error('💥 Error type:', typeof error);
        console.error('💥 Error constructor:', error?.constructor?.name);
        console.error('💥 Error message:', error instanceof Error ? error.message : 'Unknown error');
        console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack');
        console.error('💥 Full error object:', error);
        setError(`Failed to fetch instructor data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        console.log('🏁 Setting loading to false');
        setLoadingData(false);
      }
    };

    console.log('🔄 useEffect triggered, user changed:', user?.id);
    fetchPlanData();
    fetchInstructorData();
  }, [user]);

  const handleStartSubscription = async (planType: 'basic' | 'premium') => {
    if (!user) {
      toast.error('Je moet ingelogd zijn om een abonnement te starten.');
      return;
    }

    setIsLoadingMonthly(planType === 'basic' ? true : false);
    setIsLoadingYearly(planType === 'premium' ? true : false);
    
    try {
      if (planCards.length === 0) {
        toast.error('Abonnement gegevens zijn nog niet geladen.');
        return;
      }
      
      const planCard = planCards.find(p => p.type === planType);
      if (!planCard) {
        toast.error('Ongeldig abonnement geselecteerd.');
        return;
      }

      const currentCycle = billingCycle[planType];
      const plan = currentCycle === 'monthly' ? planCard.monthly : planCard.yearly;

      // Check if user has had a free trial before
      const hasHadFreeTrial = instructorData?.start_free_trial && 
        new Date(instructorData.start_free_trial) < new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

      // For basic subscriptions, check if user can get free trial
      if (planType === 'basic' && !hasHadFreeTrial) {
        // Start free trial without payment using API
        const response = await fetch('/api/setup-basic-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            userId: user.id,
            planId: plan.id
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('Error starting free trial:', result.error);
          toast.error('Er is een fout opgetreden bij het starten van de proefperiode.');
          return;
        }

        toast.success('Proefperiode van 60 dagen gestart!');
        setShouldRedirect(true);
        return;
      }

      // For all other cases, redirect to Stripe checkout
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: user.id,
          planId: plan.id,
          stripePriceId: plan.stripePriceId
        }),
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
      setIsLoadingMonthly(false);
      setIsLoadingYearly(false);
    }
  };



  if (loadingData || loadingPlans) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  const hasHadFreeTrial = instructorData?.start_free_trial && 
    new Date(instructorData.start_free_trial) < new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  // Functie om te controleren of gebruiker een geldige proefperiode heeft of een abonnement heeft afgesloten
  const hasValidSubscription = () => {
    if (!instructorData) return false;
    
    // Als er geen abonnement is, check proefperiode
    if (!instructorData.abonnement || instructorData.abonnement === 'no_subscription') {
      if (instructorData.start_free_trial) {
        const trialStartDate = new Date(instructorData.start_free_trial);
        const currentDate = new Date();
        const daysSinceTrialStart = Math.floor((currentDate.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Proefperiode is geldig als het minder dan 60 dagen geleden is gestart
        return daysSinceTrialStart <= 60;
      }
      return false;
    }
    
    // Als er een abonnement is, check of het actief is
    if (instructorData.abonnement.startsWith('basic-') || instructorData.abonnement.startsWith('premium-')) {
      // Voor basic abonnementen, check ook proefperiode
      if (instructorData.abonnement.startsWith('basic-') && instructorData.start_free_trial) {
        const trialStartDate = new Date(instructorData.start_free_trial);
        const currentDate = new Date();
        const daysSinceTrialStart = Math.floor((currentDate.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Als proefperiode nog geldig is of abonnement is actief
        return daysSinceTrialStart <= 60 || instructorData.subscription_status === 'active';
      }
      
      // Voor premium abonnementen, check alleen status
      if (instructorData.abonnement.startsWith('premium-')) {
        return instructorData.subscription_status === 'active';
      }
    }
    
    return false;
  };

  // Functie om de huidige abonnement status te bepalen
  const getCurrentSubscriptionStatus = () => {
    if (!instructorData) return null;
    
    // Als er geen abonnement is, check proefperiode
    if (!instructorData.abonnement || instructorData.abonnement === 'no_subscription') {
      if (instructorData.start_free_trial) {
        const trialStartDate = new Date(instructorData.start_free_trial);
        const currentDate = new Date();
        const daysSinceTrialStart = Math.floor((currentDate.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Als proefperiode nog geldig is
        if (daysSinceTrialStart <= 60) {
          const remainingDays = 60 - daysSinceTrialStart;
          return {
            type: 'trial',
            text: `Proefperiode, nog ${remainingDays} dagen gratis`,
            color: 'bg-green-100 text-green-800 border-green-200'
          };
        } else {
          return {
            type: 'expired',
            text: 'Proefperiode verlopen',
            color: 'bg-red-100 text-red-800 border-red-200'
          };
        }
      }
      return null;
    }
    
    // Als er een abonnement is
    if (instructorData.abonnement.startsWith('basic-')) {
      // Voor basic abonnementen, check ook proefperiode
      if (instructorData.start_free_trial) {
        const trialStartDate = new Date(instructorData.start_free_trial);
        const currentDate = new Date();
        const daysSinceTrialStart = Math.floor((currentDate.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Als proefperiode nog geldig is
        if (daysSinceTrialStart <= 60) {
          const remainingDays = 60 - daysSinceTrialStart;
          return {
            type: 'trial',
            text: `Proefperiode, nog ${remainingDays} dagen gratis`,
            color: 'bg-green-100 text-green-800 border-green-200'
          };
        }
      }
      
      // Basic abonnement actief
      if (instructorData.subscription_status === 'active') {
        return {
          type: 'basic',
          text: 'Basic abonnement',
          color: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      }
    }
    
    if (instructorData.abonnement.startsWith('premium-')) {
      if (instructorData.subscription_status === 'active') {
        return {
          type: 'premium',
          text: 'Premium abonnement',
          color: 'bg-purple-100 text-purple-800 border-purple-200'
        };
      }
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
           <h1 className="text-3xl font-bold text-gray-900 mb-4">
             Kies je abonnement
           </h1>
           <p className="text-lg text-gray-600">
             Start vandaag nog met het beheren van je rijschool
           </p>
           
           {/* Huidige abonnement status */}
           {getCurrentSubscriptionStatus() && (
             <div className="mt-6">
               <div className={`inline-flex items-center px-4 py-2 rounded-full border ${getCurrentSubscriptionStatus()?.color} font-medium`}>
                 <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
                 {getCurrentSubscriptionStatus()?.text}
               </div>
             </div>
           )}
           
           {/* Dashboard knop - alleen zichtbaar als gebruiker geldige proefperiode of abonnement heeft */}
           {hasValidSubscription() && (
             <div className="mt-6">
               <button
                 onClick={() => router.push('/dashboard')}
                 className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
               >
                 <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                 </svg>
                 Ga naar Dashboard
               </button>
             </div>
           )}
           
                       {/* Debug Buttons */}
            {/* <div className="mt-4 space-x-2">
              <button
                onClick={testSupabaseConnection}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
              >
                Test Supabase Connection
              </button>
              <button
                onClick={testApiConnection}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                Test API Connection
              </button>
              <button
                onClick={testDebugApi}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
              >
                Test Debug API
              </button>
              <button
                onClick={testDatabaseDebug}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
              >
                Debug Database
              </button>
            </div> */}
         </div>

                 {error && (
           <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
             <p className="text-red-800 font-semibold mb-2">
               Error: {error}
             </p>
             <details className="text-sm text-red-700">
               <summary className="cursor-pointer">Debug Information</summary>
               <div className="mt-2 p-2 bg-red-100 rounded text-xs">
                 <p><strong>User:</strong> {user ? `${user.email} (${user.id})` : 'Not logged in'}</p>
                 <p><strong>Loading:</strong> {loadingData ? 'Yes' : 'No'}</p>
                 <p><strong>Instructor Data:</strong> {instructorData ? 'Loaded' : 'Not loaded'}</p>
                 <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
               </div>
             </details>
           </div>
         )}

         {hasHadFreeTrial && (
           <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
             <p className="text-yellow-800">
               Je hebt al een proefperiode gehad. Voor een nieuw abonnement is betaling vereist.
             </p>
           </div>
         )}

        <div className="grid md:grid-cols-2 gap-8">
          {planCards.map((planCard) => {
                         const currentCycle = billingCycle[planCard.type];
             const currentPlan = currentCycle === 'monthly' ? planCard.monthly : planCard.yearly;
             const isPopular = currentCycle === 'yearly' ? planCard.yearly.popular : false;
            return (
              <div
                key={planCard.type}
                className={`bg-white rounded-lg shadow-lg p-6 border-2 ${
                  isPopular ? 'border-gray-200' : 'border-gray-200'
                }`}
              >
                {/* {isPopular && (
                  <div className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full inline-block mb-4">
                    Meest gekozen
                  </div>
                )} */}
                
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                  {planCard.name}
                </h3>
                
                <p className="text-gray-600 mb-6">
                  {planCard.description}
                </p>

                                 {/* Billing Cycle Toggle */}
                 <div className="bg-gray-100 rounded-lg p-1 mb-6">
                   <div className="flex">
                     <button
                       onClick={() => setBillingCycle(prev => ({
                         ...prev,
                         [planCard.type]: 'monthly'
                       }))}
                       className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                         currentCycle === 'monthly'
                           ? 'bg-white text-gray-900 shadow-sm'
                           : 'text-gray-600 hover:text-gray-900'
                       }`}
                     >
                       Maandelijks
                     </button>
                     <button
                       onClick={() => setBillingCycle(prev => ({
                         ...prev,
                         [planCard.type]: 'yearly'
                       }))}
                       className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                         currentCycle === 'yearly'
                           ? 'bg-white text-gray-900 shadow-sm'
                           : 'text-gray-600 hover:text-gray-900'
                       }`}
                     >
                       Jaarlijks
                     </button>
                   </div>
                 </div>
                
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">{currentPlan.price}</span>
                  <span className="text-gray-600 ml-2">{currentPlan.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {planCard.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <svg className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                                 <button
                   onClick={() => handleStartSubscription(planCard.type)}
                   disabled={(isLoadingMonthly && planCard.type === 'basic') || (isLoadingYearly && planCard.type === 'premium')}
                   className={`w-full py-3 px-4 rounded-lg font-semibold transition duration-200 ${
                     isPopular
                       ? 'bg-blue-600 hover:bg-blue-700 text-white'
                       : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                   } disabled:opacity-50 disabled:cursor-not-allowed`}
                 >
                   {(isLoadingMonthly && planCard.type === 'basic') || (isLoadingYearly && planCard.type === 'premium') ? 'Bezig...' : 
                     planCard.type === 'basic' && !hasHadFreeTrial 
                       ? 'Start proefperiode' 
                       : 'Kies abonnement'
                   }
                 </button>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Door een abonnement te starten ga je akkoord met onze{' '}
            <a href="#" className="text-blue-600 hover:underline">Algemene Voorwaarden</a>
            {' '}en{' '}
            <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
