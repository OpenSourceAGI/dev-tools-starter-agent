# SMS Verification API Server

<p align="center">
    <a href="https://www.npmjs.com/package/verify-phone-sms"><img src="https://img.shields.io/npm/dm/verify-phone-sms.svg" alt="NPM Monthly Downloads" /></a>
    <a href="https://www.npmjs.com/package/verify-phone-sms"><img src="https://img.shields.io/npm/dt/verify-phone-sms.svg" alt="NPM Total Downloads" /></a>
    <a href="https://www.npmjs.com/package/verify-phone-sms"><img src="https://img.shields.io/npm/v/verify-phone-sms.svg" alt="npm version" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/blob/master/LICENSE.md"><img src="https://img.shields.io/npm/l/verify-phone-sms.svg" alt="license" /></a>
</p>

A complete Hono-based server for SMS verification using AWS SNS. Built for Cloudflare Workers with comprehensive API documentation and security features.

## Features

- ✅ **SMS Verification**: Send verification codes via AWS SNS
- ✅ **VoIP Blocking**: Optional blocking of VoIP numbers
- ✅ **API Authentication**: Secure API key-based authentication
- ✅ **Rate Limiting**: Built-in rate limiting protection
- ✅ **OpenAPI Documentation**: Auto-generated API documentation
- ✅ **CORS Support**: Cross-origin resource sharing enabled
- ✅ **Security Headers**: Secure headers middleware
- ✅ **Error Handling**: Comprehensive error handling
- ✅ **Health Checks**: Built-in health monitoring
- ✅ **General SMS**: Send custom SMS messages



## Other Verifications

- add with persona api inergration $250/month (includes 166 verification )

- auto-sign in api with phone of registered users
- sell corps ability to verify their customers are real
- past addresses are better than legal id which can be ai-gen or reused
- demographic info for ads

- [Leaderboard](https://pages.nist.gov/frvt/html/frvt11.html)
- [Liveliness Check](https://github.com/Faceplugin-ltd/FaceRecognition-Android)
- [Face Check](https://github.com/DoubangoTelecom/FaceLivenessDetection-SDK)
- [FaceLivenessDetection-SDK](https://github.com/DoubangoTelecom/FaceLivenessDetection-SDK)


## Quick Start

### 1. Install

```bash
npm install verify-phone-sms   # use verifyPhone() from your own backend
```

Or clone the repo and install its dependencies to run the server itself:

```bash
npm install
```

### 2. Set Environment Variables

Create a `.env` file or set environment variables:

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# API Configuration
API_KEY=sms_1234567890abcdef1234567890abcdef
SMS_SENDER_ID=Verify
```

### 3. Run Development Server

```bash
npm run dev
```

The server will be available at `http://localhost:8787`

### 4. Deploy to Cloudflare Workers

```bash
# Deploy API only
npm run deploy

# Deploy docs only
npm run build:docs
npm run deploy:docs

# Deploy both API and docs
npm run deploy:all

# Deploy to specific environments
npm run deploy:staging
npm run deploy:production
npm run deploy:all:staging
npm run deploy:all:production
```

### 5. Quick Deployment Script

```bash
# Deploy everything to default environment
./scripts/deploy.sh

# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production

# Deploy only API
./scripts/deploy.sh default api

# Deploy only docs
./scripts/deploy.sh default docs
```

## Deployment

### Prerequisites

1. **Install Wrangler CLI**:
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

3. **Set Secrets**:
   ```bash
   wrangler secret put AWS_ACCESS_KEY_ID
   wrangler secret put AWS_SECRET_ACCESS_KEY
   wrangler secret put API_KEY
   ```

### Environment Configuration

The project supports multiple deployment environments:

- **Default**: Development/testing environment
- **Staging**: Pre-production testing
- **Production**: Live production environment

Each environment can have its own configuration and secrets.

### Automated Deployment

GitHub Actions workflows are included for automated deployment:

- **Push to `main`**: Deploys to production
- **Push to `staging`**: Deploys to staging
- **Pull Requests**: Runs tests and builds

Required GitHub Secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## API Endpoints

### Health Check

```http
GET /
GET /health
```

### Send Verification Code

```http
POST /api/send
Content-Type: application/json
X-API-Key: your_api_key

{
  "phoneNumber": "+1234567890",
  "code": "123456", // optional, auto-generated if not provided
  "blockVoip": true, // optional, default: false
  "senderId": "MyApp", // optional, default: "Verify"
  "messageTemplate": "Your code is: {code}", // optional
  "smsType": "Transactional" // optional, "Transactional" or "Promotional"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "messageId": "abc123def456",
  "code": "123456",
  "phoneNumber": "+1234567890",
  "expiresIn": 600
}
```

### Verify Code

```http
POST /api/verify
Content-Type: application/json
X-API-Key: your_api_key

{
  "phoneNumber": "+1234567890",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Code verified successfully",
  "verified": true
}
```

### Send General SMS

```http
POST /api/sms
Content-Type: application/json
X-API-Key: your_api_key

{
  "phoneNumber": "+1234567890",
  "message": "Hello from your app!",
  "senderId": "MyApp",
  "smsType": "Transactional"
}
```

**Response:**
```json
{
  "success": true,
  "message": "SMS sent successfully",
  "messageId": "abc123def456",
  "phoneNumber": "+1234567890"
}
```

## API Documentation

Visit `/docs` to see the interactive OpenAPI documentation.

## Authentication

All API endpoints require authentication using an API key. Include the key in the request header:

```http
X-API-Key: your_api_key
```

Or as a Bearer token:

```http
Authorization: Bearer your_api_key
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS Access Key ID | Required |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Access Key | Required |
| `AWS_REGION` | AWS Region | `us-east-1` |
| `API_KEY` | API Key for authentication | Required |
| `SMS_SENDER_ID` | Default SMS sender ID | `Verify` |

### Rate Limiting

- **Window**: 15 minutes
- **Max Requests**: 100 per IP
- **Headers**: Standard rate limit headers included

### Phone Number Validation Options

The API supports two methods for phone number validation and VoIP detection:

#### 1. External API Method (Default)
- Uses external phone lookup service for VoIP detection
- Basic phone number formatting and validation
- Requires internet access for VoIP checks
- More accurate VoIP detection

#### 2. libphonenumber-js Method
- Uses Google's libphonenumber library for local analysis
- Advanced phone number formatting and validation
- No external API calls required
- Heuristic-based VoIP detection
- Smaller bundle size (145 kB vs 550 kB for full libphonenumber)
- Better international number support

#### Usage Examples

```javascript
// Using libphonenumber-js for VoIP detection with full metadata
const result = await verifyPhone({
    phoneNumber: '+1-800-555-0123',
    code: '123456',
    blockVoip: true,
    voipDetectionMethod: 'libphonenumber', // Use local analysis
    useLibPhoneNumber: true, // Use libphonenumber-js for formatting/validation
    metadataType: 'full' // Use full metadata (140KB) for better phone type detection
});

// Using libphonenumber-js for formatting only
const result = await verifyPhone({
    phoneNumber: '555-123-4567', // US number without country code
    code: '789012',
    useLibPhoneNumber: true, // Use libphonenumber-js for formatting/validation
    blockVoip: false // Don't block VoIP numbers
});

// Traditional approach (external API)
const result = await verifyPhone({
    phoneNumber: '+44 20 7946 0958', // UK number
    code: 'ABCDEF',
    blockVoip: true,
    voipDetectionMethod: 'api', // Use external API (default)
    useLibPhoneNumber: false // Use basic formatting/validation
});
```

#### VoIP Detection Methods

**External API (`voipDetectionMethod: 'api'`):**
- Checks carrier information from phone lookup service
- Identifies Bandwidth, VoIP, and mobile line types
- More accurate but requires external API calls

**libphonenumber-js (`voipDetectionMethod: 'libphonenumber'`):**
- Analyzes phone number patterns and structure
- Identifies common VoIP area codes (800, 888, 877, etc.)
- Detects non-geographic numbers
- Recognizes patterns like repeated digits, sequential numbers
- Heuristic-based approach for common VoIP characteristics

#### Metadata Options

**Minimal Metadata (`metadataType: 'minimal'` - Default, 75KB):**
- Uses pattern-based heuristics for VoIP detection
- Smaller bundle size
- Works with all countries
- Less accurate but faster

**Full Metadata (`metadataType: 'full' - 140KB):**
- Uses phone number type detection (MOBILE, FIXED_LINE, VOIP, etc.)
- More accurate VoIP detection
- Larger bundle size (65KB additional)
- Matches Google's libphonenumber behavior
- Phone number types: MOBILE, FIXED_LINE, VOIP, PREMIUM_RATE, TOLL_FREE, SHARED_COST

## Development

### Running Tests

```bash
npm test
npm run test:run
npm run test:ui
```

### Local Development

```bash
npm run dev
```

### Deployment

```bash
# Deploy to production
npm run deploy

# Deploy to staging
npm run deploy:staging

# Deploy to specific environment
npm run deploy:production
```

## Example Usage

### JavaScript/Node.js

```javascript
// Send verification code
const response = await fetch('https://your-api.workers.dev/api/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key'
  },
  body: JSON.stringify({
    phoneNumber: '+1234567890',
    blockVoip: true,
    senderId: 'MyApp'
  })
});

const result = await response.json();
console.log(result);
```

### cURL

```bash
# Send verification code
curl -X POST https://your-api.workers.dev/api/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "phoneNumber": "+1234567890",
    "blockVoip": true,
    "senderId": "MyApp"
  }'

# Verify code
curl -X POST https://your-api.workers.dev/api/verify \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "phoneNumber": "+1234567890",
    "code": "123456"
  }'
```

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad request (invalid input)
- `401`: Unauthorized (invalid API key)
- `429`: Too many requests (rate limited)
- `500`: Internal server error

## Security Features

- ✅ API key authentication
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Secure headers
- ✅ Input validation
- ✅ Error sanitization
- ✅ VoIP number blocking (optional)

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │───▶│  Hono Server    │───▶│   AWS SNS       │
│                 │    │                 │    │                 │
│ - Web App       │    │ - Rate Limiting │    │ - SMS Delivery  │
│ - Mobile App    │    │ - Auth          │    │ - Message ID    │
│ - API Client    │    │ - Validation    │    │ - Error Handling│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details. 

---

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request)

Please star this repo for updates! 🌟
