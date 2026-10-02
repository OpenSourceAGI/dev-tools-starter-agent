export const plans: Plan[] = [
  {
    id: 1,
    name: "Pro",
    priceId: "price_1Sf25tD6sln9a8JlVfI0B6WR",
    limits: {
      tokens: 1000
    },
    features: [
      "Unlimited research",
      "Advanced strategies",
      "Unlimited API calls",
      "Priority support",
    ],
    price: 19.99,
    trialDays: 7,
    paymentURL: "https://buy.stripe.com/5kQfZgcMng3a6Xebelcs800"
  },
  {
    id: 2,
    name: "Team",
    priceId: "price_1SfItcD6sln9a8JlFRR4o83g",
    limits: {
      tokens: 10000,
      proMembers: 15
    },
    features: [
      "15 Pro member spots included",
      "Team sharing & collaboration",
      "Custom data access",
      "Custom integrations",
    ],
    price: 299,
    trialDays: 3,
    paymentURL: "https://buy.stripe.com/eVqdR87s32ck4P6gyFcs801"
  }
]

export interface Plan {
  /** Unique identifier for the plan. */
  id: number;
  /** Display name of the plan. */
  name: string;
  /** The payment provider's price identifier. */
  priceId: string;
  /** Resource usage limits associated with the plan. */
  limits: any;
  /** List of features included in the plan. */
  features: string[];
  /** Numeric price of the plan. */
  price: number;
  /** Number of trial days offered for this plan. */
  trialDays: number;
  /** Direct link to the payment checkout page. */
  paymentURL: string;
}
