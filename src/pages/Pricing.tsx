import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StarsBackground from '../components/StarsBackground';
import { Check, Sparkles, Zap, Crown, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

export default function Pricing() {
  const { user, userData, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<any>(null);

  const handleSelectPlan = async (tier: 'free' | 'pro' | 'premium', price: number, planInfo: any) => {
    if (!user) {
      navigate('/signup');
      return;
    }
    
    if (tier === 'free') {
      setLoadingTier(tier);
      try {
        await setDoc(doc(db, 'users', user.uid), {
          tier: tier
        }, { merge: true });
        await refreshUserData();
        navigate('/workbench');
      } catch (e) {
        console.error(e);
        setLoadingTier(null);
      }
    } else {
      setSelectedPlanForPayment(planInfo);
    }
  };

  const handlePaymentSuccess = async (planInfo: any) => {
    try {
      await setDoc(doc(db, 'users', user!.uid), {
        tier: planInfo.tier
      }, { merge: true });
      await refreshUserData();
      navigate('/workbench');
    } catch (e) {
      console.error(e);
    }
  };

  const plans = [
    {
      name: 'Free',
      price: '$0',
      numericPrice: 0,
      period: 'forever',
      icon: <Sparkles className="w-8 h-8 text-slate-400" />,
      features: [
        '1 Free Generation every 4 weeks',
        '2 Chat Bot Help responses every 4 weeks',
        'Standard Quality output'
      ],
      tier: 'free'
    },
    {
      name: 'Pro',
      price: '$12.99',
      numericPrice: 12.99,
      period: 'per month',
      popular: true,
      icon: <Zap className="w-8 h-8 text-blue-400" />,
      features: [
        '7 Free Generations every 4 weeks',
        '800 Chat Bot Help responses',
        'Free download of the Pack',
        'Standard game templates'
      ],
      tier: 'pro'
    },
    {
      name: 'Premium',
      price: '$29.99',
      numericPrice: 29.99,
      period: 'per year',
      icon: <Crown className="w-8 h-8 text-yellow-400" />,
      features: [
        '150+ Generations every 2 weeks',
        '3000+ High Quality Chat Bot answers',
        'Full Game Templates included',
        'High Quality Graphics & Sounds',
        'Priority feature access'
      ],
      tier: 'premium'
    }
  ];

  return (
    <PayPalScriptProvider options={{ clientId: "AVdJaySJZXFm45llCco0H_Y7vEHfLpYMcid_UZJdYZoow3sWq4teRTu_PYjcTs-af516IA0eklgsfpNU", currency: "USD" }}>
      <div className="min-h-screen relative flex items-center justify-center text-white overflow-hidden font-sans p-6">
        <StarsBackground />
        <div className="z-10 max-w-6xl w-full">
          {!selectedPlanForPayment ? (
            <>
              <div className="text-center mb-16">
                <h1 className="text-4xl md:text-6xl font-bold mb-4">Choose Your Power</h1>
                <p className="text-slate-400 text-lg md:text-xl">Scale your game development with AI.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan) => (
                  <div 
                    key={plan.name}
                    className={`relative bg-slate-900/80 backdrop-blur-xl border ${plan.popular ? 'border-blue-500 shadow-2xl shadow-blue-500/20 transform md:-translate-y-4' : 'border-slate-700/50'} p-8 rounded-3xl flex flex-col`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-4 rounded-full">
                        Most Popular
                      </div>
                    )}
                    <div className="mb-6 flex justify-between items-start">
                      <div>
                        <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                        <div className="flex items-end gap-1">
                          <span className="text-4xl font-bold">{plan.price}</span>
                          <span className="text-slate-400 mb-1">/{plan.period}</span>
                        </div>
                      </div>
                      <div className={`p-3 rounded-2xl ${plan.popular ? 'bg-blue-500/20' : 'bg-slate-800'}`}>
                        {plan.icon}
                      </div>
                    </div>

                    <ul className="space-y-4 mb-8 flex-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-slate-300">
                          <Check className="w-5 h-5 text-green-400 shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleSelectPlan(plan.tier as any, plan.numericPrice, plan)}
                      disabled={loadingTier !== null || userData?.tier === plan.tier}
                      className={`w-full py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                        ${userData?.tier === plan.tier 
                          ? 'bg-slate-800 text-slate-400 cursor-not-allowed' 
                          : plan.popular 
                            ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                    >
                      {loadingTier === plan.tier ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                      userData?.tier === plan.tier ? 'Current Plan' : 'Select ' + plan.name}
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="max-w-md mx-auto bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl">
              <button 
                onClick={() => setSelectedPlanForPayment(null)}
                className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Plans
              </button>
              
              <h2 className="text-3xl font-bold mb-2">Upgrade to {selectedPlanForPayment.name}</h2>
              <p className="text-slate-400 mb-8">Total: {selectedPlanForPayment.price} {selectedPlanForPayment.period}</p>
              
              <div className="bg-white rounded-lg p-2">
                <PayPalButtons
                  style={{ layout: "vertical", color: "blue", shape: "rect", label: "pay" }}
                  createOrder={(data, actions) => {
                    return actions.order.create({
                      intent: "CAPTURE",
                      purchase_units: [
                        {
                          description: `LuaForge ${selectedPlanForPayment.name} Plan`,
                          amount: {
                            currency_code: "USD",
                            value: selectedPlanForPayment.numericPrice.toString(),
                          },
                        },
                      ],
                    });
                  }}
                  onApprove={(data, actions) => {
                    return actions.order!.capture().then((details) => {
                      handlePaymentSuccess(selectedPlanForPayment);
                    });
                  }}
                  onError={(err) => {
                    console.error("PayPal Checkout Error", err);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </PayPalScriptProvider>
  );
}
