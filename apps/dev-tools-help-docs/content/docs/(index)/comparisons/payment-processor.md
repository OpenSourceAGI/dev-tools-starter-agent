---
title: 💳 Payment Processors
---

3dday: Stripe is the top choice—$1 fee to send B2B payments, $5 to request; Melio and Astra may be free but require membership.

instant: Melio and Astra provide instant transfers for a 1% fee.


### Key Features

- **Account Verification & Payments**
  - Instant and manual account linking for ACH, RTP, and FedNow transfers
  - Automated bill pay and vendor onboarding
  - Real-time account verification analytics and fraud detection
  - Expanded support for business accounts and cash management accounts
  - Automated sandbox simulations for pre-launch testing
  - Multiple ledgers (virtual accounts) for tracking fund flows
  - Immediate refunds if sufficient balance is available
  - Branded payment links and recurring payment support
  - QuickBooks and other accounting integrations[1][2][3][4]

- **Fraud & Risk Management**
  - Deeper fraud and credit risk signals
  - Smarter fraud tools and device verification (Silent Network Authentication)
  - Enhanced error reporting and troubleshooting for API calls[1][2][4]

- **Credit Underwriting**
  - Consumer Report for secure sharing of bank data
  - Insights like primary account flag, historical balances, future income prediction, and categorized spending
  - Streamlined user experience with pre-filled data and faster report generation[2][4]

- **Developer Experience**
  - Improved dashboard for configuring Auth methods and Identity Match rules
  - Real-time support via AI chat (Claude)
  - Enhanced API documentation and changelogs[1][2][4]

### Pricing Structure

Plaid uses several pricing models, depending on the product:

| Product Type         | Pricing Model         | Details                                                                 |
|----------------------|----------------------|-------------------------------------------------------------------------|
| Auth, Identity, Income | One-time fee         | Charged once per connected account, regardless of API call volume       |
| Transactions, Liabilities, Investments | Subscription fee      | Monthly fee per connected account (Item)                                 |
| Balance, Transaction Refresh, Asset Report Audit Copy, Asset Report PDF, Signal | Flat per-request fee   | Charged per successful API request                                       |
| Asset Report (create), Enrich | Flexible per-request fee | Pricing depends on transaction history days or number of transactions    |

- **ACH Transfers:** Not free for production use; pricing varies by volume and use case.
- **Sandbox/Testing:** Free for development and testing environments.
- **Production:** Requires a commercial agreement; contact Plaid for specific rates[5].

> For the most accurate and current pricing, consult Plaid's official documentation or sales team, as terms may change[5].

### Summary Table

| Feature Area         | Highlights (2025)                                                                 |
|----------------------|-----------------------------------------------------------------------------------|
| Account Verification | Instant/manual linking, analytics, business/cash account support                  |
| Payments             | ACH, RTP, FedNow, multiple ledgers, immediate refunds, branded links              |
| Fraud/Risk           | Advanced fraud signals, device verification, error transparency                   |
| Credit Underwriting  | Consumer Report, cash flow insights, faster processing                            |
| Developer Tools      | Dashboard config, AI support, sandbox simulations                                 |
| Cost                 | One-time, subscription, or per-request fees; ACH not free in production           |

Plaid remains a leading choice for fintechs and platforms needing advanced bank connectivity, robust fraud tools, and flexible payment APIs, but it is not a free solution for production ACH transfers[1][2][3][4][5].

[1] https://plaid.com/blog/product-updates-june-2025/
[2] https://plaid.com/blog/product-updates-may-2025/
[3] https://plaid.com/blog/product-updates-march-2025/
[4] https://plaid.com/blog/product-updates-april-2025/
[5] https://support.plaid.com/hc/en-us/articles/16194632655895-How-much-does-Plaid-cost-and-what-are-the-pricing-models
[6] https://plaid.com/events/effects/
[7] https://www.youtube.com/watch?v=GPcW6Htrl5o
[8] https://www.pymnts.com/data/2025/plaid-ceo-says-its-next-five-years-will-look-a-lot-different-than-the-last-five/
[9] https://www.fintegrationfs.com/post/plaid-pricing-and-plaid-pricing-calculator-for-fintech-apps
[10] https://docs.itstripe.com/payment-methods/ach-debit-plaid-link-integration/


| Processor | ACH Fees \& Features | In-Person CC Fees \& Features | Online CC Fees \& Features | Chargeback Fees | Notable Features \& Integrations |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **Helcim** | 0.5% + 25¢; transparent pricing | Interchange + 0.3% + 8¢; POS | Interchange + 0.5% + 25¢; online | \$15 (refunded if resolved in favor) | No monthly fee, B2B tools, scalable |
| **Stripe** | 0.8% (max \$5); API, recurring, fast ACH | 2.7% + 5¢ per swipe; POS integration | 2.9% + 30¢; invoicing, subscriptions | \$15 per dispute (non-refundable) | Advanced API, multi-currency, global reach |
| **Melio** | Free ACH; 2-day delivery, international \$20 | Not primary; limited | 2.9% for cards; invoice payments | N/A (B2B payments, minimal risk) | Free ACH, bill pay, QuickBooks/Xero sync |
| **Square** | 1% (min \$1); easy setup, recurring | 2.6% + 10¢ per swipe; POS hardware | 2.9% + 30¢; virtual terminal, invoicing | \$0 (no chargeback fees) | Omnichannel, inventory, analytics |
| **Stax** | 1% (max \$10); subscription model | Interchange + 8¢; POS, terminals | Interchange + 15¢; e-comm, invoicing | \$20-\$50 typical (varies) | Subscription pricing, robust dashboard |
| **PaymentCloud** | Custom pricing; high-risk support | Custom; supports high-risk | Custom; high-risk, e-commerce | \$25-\$50 (higher for high-risk) | High-risk industries, flexible solutions |

### Key Updates \& Additional Melio Information

**Melio Detailed Features:**

- **Completely free ACH payments** with no transaction fees[^1][^2]
- **2-day ACH delivery** (faster than standard 3-day processing)[^1]
- **Same-day ACH available** for 1% fee (max \$30 per transaction)[^2]
- **International payments** supported with \$20 flat fee for USD transfers[^3]
- **Credit card payments** available at 2.9% fee, even to vendors who don't accept cards[^4]
- **Mobile app** with bill scanning and payment approval features[^5]
- **Automatic bill capture** from Gmail and invoice scanning[^1]
- **QuickBooks Online and Xero integration** for seamless accounting[^4]
- **Payment links** for getting paid by customers[^6]
- **W-9 collection and 1099 sync** for tax preparation[^1][^6]
- **Pay over time** feature allowing split payments over 12 months[^1]

**Melio Limitations:**

- **B2B payments only** - not designed for consumer transactions[^4]
- **30-day expiration** on single-use virtual cards[^7]
- **Limited in-person processing** capabilities compared to traditional processors[^8]
- **Credit card fees** still apply at 2.9% when paying with cards[^4]


### Chargeback Fee Breakdown

**Chargeback costs vary significantly by processor:**

- **Square** offers the best value with **\$0 chargeback fees** and even refunds processing fees if you win disputes[^9][^10]
- **Stripe** charges **\$15 per chargeback** but does not refund this fee even if you win[^9][^11]
- **Helcim** charges **\$15 per chargeback** but **refunds the fee if you win** the dispute[^12][^13]
- **GoCardless** has **variable chargeback fees** depending on country - fees apply in US, Germany, and Austria only[^14]
- **Stax** typically charges **\$20-\$50 per chargeback** based on merchant agreement[^15][^16]
- **PaymentCloud** charges **\$25-\$50 per chargeback**, with higher fees for high-risk merchants[^17][^18]
- **Melio** has **minimal chargeback risk** due to B2B focus and ACH-heavy processing[^1][^4]


### Industry Context

Chargeback fees are becoming increasingly expensive across the industry, with costs expected to grow 24% from 2025 to 2028[^19]. The average chargeback value in the US is \$110, and each dispute costs financial institutions \$9.08-\$10.32 to process[^19]. For merchants, total chargeback costs include not just the fee but also the lost merchandise, administrative time, and potential monitoring program penalties[^20][^21].

**Square's zero chargeback fee policy** makes it particularly attractive for businesses concerned about dispute costs, while **Helcim's refund policy** provides a middle ground. **Melio's B2B focus** naturally reduces chargeback exposure since business-to-business payments have lower dispute rates than consumer transactions.



[^1]: https://meliopayments.com

[^2]: https://meliopayments.com/blog/same-day-ach-wire-and-credit-all-the-ways-to-pay-fast/

[^3]: https://help.melio.com/hc/en-us/articles/4447157077394-Are-there-any-limitations-when-making-a-payment-to-an-international-vendor

[^4]: https://meliopayments.com/business-expenses/business-expense-payments/

[^5]: https://help.melio.com/hc/en-us/articles/8203004028828-What-is-Melio

[^6]: https://meliopayments.com/blog/7-melio-features-to-help-you-pay-and-get-paid-faster/

[^7]: https://help.melio.com/hc/en-us/articles/4446781898898-Are-there-any-limitations-to-using-a-single-use-virtual-card

[^8]: https://www.unitedcapitalsource.com/blog/what-is-melio-payments/

[^9]: https://www.chargeback.io/blog/stripe-chargeback-fee

[^10]: https://help.getbento.com/en/articles/417537

[^11]: https://chargebacks911.com/stripe-chargeback-fees/

[^12]: https://learn.helcim.com/docs/what-is-a-chargeback

[^13]: https://legal.helcim.com/us/fee-disclosures/

[^14]: https://support.gocardless.com/hc/en-us/articles/360038646634-Transaction-Fees

[^15]: https://staxpayments.com/blog/credit-card-chargebacks-explained-what-merchants-need-to-know/

[^16]: https://staxpayments.com/blog/merchant-credit-card-fee/

[^17]: https://paymentcloudinc.com/blog/chargeback-fee/

[^18]: https://paymentcloudinc.com/blog/high-risk-merchant-account-fees/

[^19]: https://b2b.mastercard.com/news-and-insights/blog/what-s-the-true-cost-of-a-chargeback-in-2025/

[^20]: https://justt.ai/blog/merchant-chargeback-fee/

[^21]: https://chargebacks911.com/chargeback-costs/

[^22]: https://ramp.com/blog/ach-processing-fees

[^23]: https://meliopayments.com/blog/top-melio-features-upgrades-2023/

[^24]: https://groups.google.com/g/idtracker-users/c/MZmBVM2Dapo

[^25]: https://support.paystand.com/hc/en-us/articles/13621511148443-What-is-an-ACH-Chargeback

[^26]: https://www.chargeflow.io/blog/chargeback-fees

[^27]: https://resolvepay.com/blog/post/understanding-ach-dispute-codes/

[^28]: https://www.clearlypayments.com/blog/the-hidden-costs-of-payment-processing-no-one-talks-about/

[^29]: https://support.freeagent.com/hc/en-gb/articles/22497839692178-Record-GoCardless-chargebacks

[^30]: https://staxpayments.com/blog/how-much-do-credit-card-companies-charge-merchants/

[^31]: https://www.helcim.com/guides/dispute-credit-card-chargeback/

[^32]: https://paymentcloudinc.com/blog/merchant-account-fees/

[^33]: https://meliopayments.com/partners/

[^34]: https://wise.com/us/blog/what-is-melio

[^35]: https://gocardless.com/en-us/guides/ach/ach-fees-how-much-does-ach-cost/

[^36]: https://www.helcim.com/guides/processors-with-the-lowest-credit-card-processing-fees/

[^37]: https://gocardless.com/guides/posts/what-is-a-chargeback/

[^38]: https://www.business.com/articles/stax-vs-stripe/

[^39]: https://www.chargeflow.io/blog/chargeback-statistics-trends-costs-solutions

[^40]: https://paymentcloudinc.com/blog/chargeback/

[^41]: https://ppl-ai-code-interpreter-files.s3.amazonaws.com/web/direct-files/0bb85b5c8c1c16a4b9518b4595467d59/56660a2d-40f3-44d2-95b6-c0eaecead8cd/d0ff56e1.csv



#  Astra Payments 
**Astra Payments** enables instant money transfers primarily by leveraging the **Visa Direct** network and partnerships with financial institutions like Cross River Bank. Here's how it works and what it costs:

- **Push-to-Card Technology:** Astra uses push-to-card payments, which means funds are sent directly from a bank account or card to a recipient's debit card. This is done using the Visa Direct real-time payment rails, enabling funds to appear instantly and be spendable right away[^1][^5][^6].
- **API Integration:** Developers and businesses can embed Astra's payment API into their products, allowing instant transfers between bank accounts and cards without needing to build complex payment infrastructures themselves[^1][^7].
- **No Cut-Off Times:** Transfers are processed instantly, regardless of weekends or holidays, with no waiting for ACH settlement windows[^4].
- **No Prefunding Required:** Astra handles settlement and reconciliation automatically, so businesses don't need to pre-fund accounts or manage operational complexity[^1][^5].
- **Security and Compliance:** The platform includes built-in compliance, fraud detection, and PCI-compliant SDKs for secure transactions[^1][^5].


### Cost Structure

- **Industry-Standard Fee:** For instant "push" payments to external debit cards, Astra typically charges an **industry-standard fee of 1.5% per transaction**[^2].
- **Cost-Plus Pricing:** Astra offers cost-plus pricing designed to scale with customer growth, making it less costly than traditional wire transfers and competitive with other instant payment providers[^5][^3].
- **Custom Fees:** Businesses can optionally apply programmatic fees to each transaction to generate additional revenue[^2].
- **No Additional Infrastructure Fees:** There's no need for additional compliance, capital commitments, or operational overhead for instant payments[^6].


### Summary Table

| Feature | Astra Payments Details |
| :-- | :-- |
| **Speed** | Instant (real-time, 24/7, including weekends/holidays) |
| **Method** | Push-to-card (Visa Direct), API integration |
| **Typical Fee** | 1.5% per transaction (industry standard) |
| **Pricing Model** | Cost-plus, scalable with business growth |
| **Operational Overhead** | No pre-funding, no extra compliance or capital required |
| **Security** | Built-in compliance, fraud detection, PCI-compliant |

**In essence:** Astra achieves instant payments by utilizing debit card rails (Visa Direct), with a typical cost of 1.5% per transaction and a scalable, cost-plus pricing model. The platform is designed for easy integration, security, and operational simplicity, making it attractive for fintechs, marketplaces, and businesses needing rapid, reliable fund movement[^1][^2][^5][^6].



[^1]: https://astrafi.com

[^2]: https://astrafi.com/for-marketplaces/

[^3]: https://www.treasuryprime.com/partners/astra

[^4]: https://unit.co/docs/partnerships/astra/

[^5]: https://www.digitaltransactions.net/astras-instant-payment-api-hits-100-million-in-annualized-payment-volume/

[^6]: https://www.pymnts.com/news/faster-payments/2022/astra-taps-visa-direct-offer-faster-payments/

[^7]: https://finovate.com/blend-teams-up-with-instant-payments-as-a-service-specialist-astra/

[^8]: https://www.linkedin.com/posts/astrainc_ultimate-guide-to-transaction-fees-what-activity-7219755189098983424-i3j4

[^9]: https://docs.astra.finance/docs/card-to-account

[^10]: https://www.reddit.com/r/yotta/comments/szvhn5/astra_is_100_fail/



