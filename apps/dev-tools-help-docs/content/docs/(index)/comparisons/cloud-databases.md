---
title: 🗄️ Cloud Database
---

## Cloud Database Providers: Complete Comparison

Comprehensive comparison ranked by estimated monthly cost for a typical 1,000-user application with moderate usage patterns (5-10 GB storage, 100-500K reads/day, 10-50K writes/day, bursty traffic).

### Cost Ranking Table (1K User App)

| Rank | Provider | Type | Est. Monthly Cost | Free Tier | Entry Paid | Scale to Zero | Best For |
|:-----|:---------|:-----|:------------------|:----------|:-----------|:--------------|:---------|
| 1 | **[Cloudflare D1](https://developers.cloudflare.com/d1/)** | Serverless SQLite | **$0-5** | 5 GB storage, 5M rows read/day | [$5/mo](https://developers.cloudflare.com/workers/platform/pricing/) | Yes | Edge apps, transactional workloads, Workers integration |
| 2 | **[Turso](https://turso.tech)** | Distributed SQLite | **$0-5** | 100 DBs, 5 GB storage, 500M rows read/mo | [$4.99/mo](https://turso.tech/pricing) | Yes | Multi-tenant (DB per tenant), edge replication, vector search |
| 3 | **[Firebase Firestore](https://firebase.google.com/docs/firestore)** | NoSQL Document | **$0-10** | 1 GB storage, 50K reads/day, 20K writes/day | [Pay per use](https://cloud.google.com/firestore/pricing) | N/A (serverless) | Mobile/web apps, realtime sync, Firebase ecosystem |
| 4 | **[Neon](https://neon.com)** | Serverless Postgres | **$5-15** | 0.5 GB storage, 100 compute hrs | [$5/mo Launch](https://neon.com/pricing) | Yes | Postgres with bursty traffic, database branching |
| 5 | **[Railway](https://railway.com)** | Managed Postgres/MySQL/Redis/Mongo | **$5-20** | $5 usage credit/mo | [$5/mo Hobby](https://railway.com/pricing) | No | Full-stack deployments, Git integration |
| 6 | **[PlanetScale](https://planetscale.com)** | MySQL (Vitess) | **$5-10** | None | [$5/mo single-node](https://planetscale.com/pricing) | No | MySQL branching, query insights (dev only at $5) |
| 7 | **[Xata](https://xata.io)** | Serverless Postgres | **$10-25** | 15 GB storage, shared compute | [$0.012/hr ~$9/mo](https://xata.io/pricing) | Yes | Postgres branching with copy-on-write, minute billing |
| 8 | **[MongoDB Atlas](https://mongodb.com)** | NoSQL Document | **$0-25** | M0: 512 MB storage | [$9/mo M2, $25/mo M5](https://www.mongodb.com/pricing) | No (Flex caps at $30/mo) | Document DB, complex queries, search/vector search |
| 9 | **[Supabase](https://supabase.com)** | Postgres + BaaS | **$25-50** | 500 MB DB, 1 GB storage, 50K MAU | [$25/mo Pro](https://supabase.com/pricing) | No (Pro+) | Full-stack apps needing auth, storage, realtime, edge functions |
| 10 | **[Amazon RDS](https://aws.amazon.com/rds/)** | Managed Relational | **$15-40** | 750 hrs/mo t2/t3.micro (12 months) | [$15-20/mo t4g.micro](https://aws.amazon.com/rds/pricing/) | No | Enterprise apps, sustained load, full AWS integration |
| 11 | **[CockroachDB Cloud](https://www.cockroachlabs.com)** | Distributed SQL | **$0-130** | Basic: 50M RU/mo, 10 GB storage | [$130/mo Standard 2vCPU](https://www.cockroachlabs.com/pricing/) | Partial (Basic) | Multi-region, high availability, geo-distributed workloads |

---

### Provider Deep Dive

#### Serverless Champions ($0-15/month)

**[Cloudflare D1](https://developers.cloudflare.com/d1/platform/pricing/)** brings serverless SQL to the edge with SQLite semantics. Charges based on rows read/written rather than compute hours. The paid Workers plan ($5/month) includes 25 billion rows read, 50 million rows written, and 5 GB storage—remarkably cost-effective for transactional workloads. No egress fees. Global edge distribution with tight Workers integration.

**[Turso](https://toolquestor.com/vs/neon-vs-turso)** extends SQLite with distributed edge replication and native vector search. Developer plan ($4.99/month) provides unlimited databases (500 monthly active limit), 9 GB storage, and substantial read/write quotas. Exceptionally affordable for multi-tenant architectures where each tenant gets their own database. Achieves sub-10ms read latency globally through edge replication.

**[Firebase Firestore](https://supertokens.com/blog/firebase-pricing)** uses pure consumption-based pricing for document reads, writes, and storage. Generous free tier (1 GB storage, 50K reads/day, 20K writes/day) often covers small to medium applications entirely. Storage costs $0.15/GB-month in US regions. Tightly integrated with Firebase ecosystem including authentication, hosting, and cloud functions.

**[Neon](https://www.vantage.sh/blog/neon-vs-aws-aurora-serverless-postgres-cost-scale-to-zero)** pioneered serverless Postgres with instant provisioning, database branching (like Git), and scale-to-zero capabilities. Launch plan starts at $5/month with usage-based billing for compute hours ($0.14 per compute-hour) and storage ($0.35/GB-month). Excels for applications with bursty traffic patterns—you only pay for active compute time.

#### Budget Postgres & MySQL ($10-30/month)

**[Xata](https://xata.io/blog/neon-vs-supabase-vs-xata-postgres-branching-part-2)** provides serverless Postgres with granular minute billing. Compute billed at $0.024/hour (~$18/month for 2 vCPU instance running 24/7) and storage at $0.30/GB-month. Copy-on-write branching technology makes it extremely cost-effective for scenarios requiring many database branches—branches only pay for changed data rather than duplicating entire dataset.

**[PlanetScale](https://planetscale.com/blog/5-dollar-planetscale-is-here)** offers MySQL hosting built on Vitess with database branching and sophisticated query insights. Starts at $5/month for single-node databases (development suitable) and $30/month for production-ready high-availability three-node clusters. Storage costs $0.50 per GB per instance with minimum of 3 instances for production.

**[Railway](https://docs.railway.com/reference/pricing/plans)** simplifies full-stack deployments with one-click database provisioning for Postgres, MySQL, Redis, and MongoDB. Usage-based pricing at $10/GB RAM/month and $20/vCPU/month. Hobby plan offers $5 in monthly credits. Popular for developers wanting Git-integrated deployments with minimal DevOps overhead.

#### Full-Service Platforms ($25-50/month)

**[Supabase](https://uibakery.io/blog/supabase-pricing)** offers complete backend-as-a-service platform combining Postgres with authentication, file storage, realtime subscriptions, and edge functions. Pro plan costs $25/month base fee (including $10 in compute credits) plus usage-based charges for database size beyond 8 GB, active users over 100K, and bandwidth exceeding 250 GB. Well-suited for full-stack applications needing integrated backend services beyond just a database.

**[MongoDB Atlas](https://www.spendflo.com/blog/mongodb-atlas-pricing-guide)** offers fully managed MongoDB with flexible cluster tiers. Free M0 tier provides 512 MB storage on shared infrastructure. Production starts with M10 dedicated cluster at $0.08/hour (~$57/month). Includes powerful features like [Atlas Search](https://www.mongodb.com/pricing) (relevance-based search), Vector Search for AI applications, and global cluster distribution.

#### Enterprise & Traditional ($40-130+/month)

**[Amazon RDS](https://www.cloudzero.com/blog/rds-pricing/)** remains the enterprise standard for fully managed relational databases supporting PostgreSQL, MySQL, MariaDB, Oracle, and SQL Server. Traditional instance-based pricing where you pay for provisioned compute capacity whether you use it or not. Typically starts around $15-20/month for small instances, scaling to hundreds for production workloads. Strong reliability with Multi-AZ deployments, automated backups, and read replicas. Ideal for sustained high-traffic applications needing full AWS ecosystem integration.

**[CockroachDB Cloud](https://airbyte.com/data-engineering-resources/cockroachdb-pricing)** provides globally distributed, strongly consistent SQL with Postgres compatibility. Basic plan offers 50 million Request Units and 10 GB storage free monthly. Standard plan starts at $0.18/hour for 2 vCPUs (~$130/month for always-on). Designed for multi-region deployments requiring high availability (99.99-99.999% SLA) and horizontal scalability.

---

### Key Insights

**Free Tier Champions:** [Cloudflare D1](https://developers.cloudflare.com/d1/platform/pricing/), [Turso](https://turso.tech/pricing), and [Firebase Firestore](https://cloud.google.com/firestore/pricing) all offer generous free tiers that can comfortably handle 1,000 users with moderate usage patterns. D1's 5 million rows read per day and Turso's 500 million rows read per month typically exceed what 1,000 users would consume.

**Scale-to-Zero Winners:** Serverless options with scale-to-zero ([D1](https://developers.cloudflare.com/d1/), [Turso](https://turso.tech), [Neon](https://neon.com), [Xata](https://xata.io), [Firestore](https://firebase.google.com/pricing)) offer the best cost-to-performance ratio, often running entirely on free tiers or for under $10/month.

**Pricing Models:** Three main philosophies dominate:
- **Traditional provisioned** ([RDS](https://aws.amazon.com/rds/pricing/), [Railway](https://railway.com/pricing)) - pay for reserved capacity regardless of usage
- **Serverless usage-based** ([Neon](https://neon.com/pricing), [Supabase](https://supabase.com/pricing), [Xata](https://xata.io/pricing), [D1](https://developers.cloudflare.com/d1/platform/pricing/), [Turso](https://turso.tech/pricing), [Firestore](https://cloud.google.com/firestore/pricing)) - costs scale with actual compute/operations
- **Hybrid models** ([MongoDB Atlas](https://www.mongodb.com/pricing), [PlanetScale](https://planetscale.com/pricing), [CockroachDB](https://www.cockroachlabs.com/pricing/)) - combine base instance fees with usage-based charges

**Cost Efficiency:** For 1,000-user applications, serverless options typically cost $5-30/month, while traditional always-on instances like RDS easily reach $80-200+/month due to always-on provisioning. Traditional instances become more cost-competitive only at sustained higher loads where compute utilization stays consistently high.

**Notable Features:**
- [Neon](https://www.bytebase.com/blog/postgres-hosting-options-pricing-comparison/) & [Xata](https://xata.io/blog/postgres-free-tier) - Database branching like Git
- [Turso](https://agentskb.com/kb/turso_edge_database/) - Unlimited databases, native vector search, 10ms global reads
- [Cloudflare D1](https://developers.cloudflare.com/d1/) - No egress fees, edge distribution
- [Supabase](https://www.metacto.com/blogs/the-true-cost-of-supabase-a-comprehensive-guide-to-pricing-integration-and-maintenance) - Complete backend with auth, storage, realtime
- [MongoDB Atlas](https://www.mongodb.com/pricing) - Atlas Search, Vector Search
- [CockroachDB](https://www.cockroachlabs.com/blog/improved-cockroachdb-cloud-pricing/) - Multi-region by default, 99.99-99.999% SLA

### Recommendation

For 1,000-user applications, **serverless options with scale-to-zero** offer the best cost-to-performance ratio. Start with [Cloudflare D1](https://developers.cloudflare.com/d1/), [Turso](https://turso.tech), or [Neon](https://neon.com) for ultra-low costs. Consider [Supabase](https://supabase.com) if you need a complete backend platform. Reserve traditional always-on instances like [RDS](https://aws.amazon.com/rds/) for sustained high-load enterprise applications.
