---
title: 👁️‍🗨️ Best AI Voice — TTS Models & Voice Agent Platforms
---


| Provider / Model | Category | Type | Best For | Key Features | Stars | Size / Infra | Price | Free? | Front-end only? | Realism / Quality | Notes |
|---|---|---|---|---|---:|---|---|---|---|---|---|
| **Kokoro-82M** ([taylorchu/kokoro-onnx](https://github.com/taylorchu/kokoro-onnx)) | TTS | Free / open | Lightweight browser TTS | ONNX/GGUF builds, compact | 7.9k [repo](https://github.com/hexgrad/kokoro) | 88–330 MB (quantized) | Free | Yes | Yes | Very good for size; realistic but not ultra-expressive | Best lightweight pick |
| **KittenTTS** ([KittenML/KittenTTS](https://github.com/KittenML/KittenTTS)) | TTS | Free / open | Tiny deployments | 15M–80M params | 9k | 25–80 MB | Free | Yes | Likely yes | Smallest good-quality option; some artifacts, usable | Strong for tiny deployments |
| **SpeechT5** ([microsoft/SpeechT5](https://github.com/microsoft/SpeechT5), [ONNX](https://huggingface.co/Xenova/speecht5_tts/tree/main/onnx)) | TTS | Free / open | Browser-friendly classic TTS | Quantized ONNX files | 1.4k | 27.8–49.4 MB quantized; 3.16 GB full ONNX folder | Free | Yes | Yes | Good classic TTS, less natural than newer leaders | Browser-friendly path |
| **Piper** ([piper-onnx](https://github.com/thewh1teagle/piper-onnx), [piper-tts-web](https://github.com/Mintplex-Labs/piper-tts-web)) | TTS | Free / open | Offline / browser | Voice-pack based | — | Voice-pack dependent | Free | Yes | Yes | Efficient, more robotic than top neural models | Practical offline option |
| **ElevenLabs Turbo v2.5** | TTS | Paid cloud | Expressive, emotional voices | Lifelike synthesis, voice cloning, multi-language, API-first | — | Cloud | $0.050 / 1K chars; plans from $5/mo | Free tier: 10K chars/mo | No | Very realistic / top-tier | Best-known premium quality; pair with agent logic |
| **PlayHT** | TTS | Paid cloud | Lifelike conversations | Real-time human-like speech, strong NLP, multi-language | — | Cloud | See provider | No | No | Very natural | Easy business integration |
| **OpenAI TTS / Voice Agent SDK** | TTS + Agent | Paid cloud | End-to-end automation | whisper-1 (STT) + tts-1 (TTS), context management, workflow handoffs | — | Cloud | $15 / 1M chars (TTS) | No | No | High quality | Good if already on OpenAI |
| **Google Cloud TTS** | TTS | Paid cloud | Multilingual coverage | Neural voices, broad language support | — | Cloud | $16 / 1M chars (neural) | No | No | Strong multilingual quality | Broad language coverage |
| **Amazon Polly** | TTS | Paid cloud | AWS-native TTS | Neural voices, consistent API | — | Cloud | $16 / 1M chars (neural) | No | No | Solid, developer-friendly | Great AWS-native choice |
| **Microsoft Azure TTS** | TTS | Paid cloud | Enterprise customization | Custom voices, many voice types | — | Cloud | Varies by voice type | No | No | Very strong, customizable | Best for enterprise |
| **Speechmatics TTS** | TTS | Paid cloud | Production value | Real-time optimized | — | Cloud | $0.011 / 1K chars | No | No | Natural, real-time | Best value for production agents |
| **Cartesia Sonic** | TTS | Paid cloud | Voice agents (latency) | Extremely low latency, conversational | — | Cloud | ~$0.05 / 1K chars | No | No | Conversational, fast | Best for voice agents |
| **Rime** | TTS | Paid (enterprise) | Conversational prosody | Cloud / on-prem | — | Cloud / on-prem | Custom enterprise | No | No | Very human prosody | Enterprise-only pricing |
| **Hume Octave** | TTS | Paid cloud | Emotional expression | Emotionally expressive, context-aware | — | Cloud | Usage-based | No | No | Emotion-rich | Creative / emotion use cases |
| **MiniMax TTS** | TTS | Paid cloud | Long-form content | Long-form + multilingual | — | Cloud | $50 / 1M chars | No | No | Good long-form | Strong for long content |
| **IBM Watson TTS** | TTS | Paid cloud | Compliance / enterprise | Cloud or containerized on-prem | — | Cloud / on-prem | $0.02 / 1K chars | No | No | Natural, enterprise-focused | Compliance-friendly |
| **Deepgram (Aura / Voice Agent API)** | STT + TTS | Paid cloud | Speech-to-text & analysis | Fast accurate STT, real-time transcription, multi-language, flexible API | — | Cloud | Not verified | No | No | Natural, production-focused | Good low-latency API option |
| **Lindy** | Voice agent platform | Paid SaaS | Overall best no-code agent | Real phone calls, drag-and-drop flows, call summaries, follow-ups, Slack alerts, DB updates mid-call, concurrent calls | — | Cloud | Free: 400 tasks/mo; Pro $49.99/mo (5K tasks, call features); Business $299.99/mo (30K tasks) | Free tier (no calls) | No | Sounds genuinely human | Calls need paid plan + phone number |
| **Vapi** | Voice agent platform | Paid API | Developers / omnichannel | API-first, BYO models (STT/TTS/LLM), low latency, interruption handling, scales to 1M+ concurrent calls | — | Cloud | $0.05/min platform fee (per-second billing) + $2/mo numbers + model usage; $10 free credits | Trial credits | No | Depends on chosen models | Not beginner-friendly; costs stack at volume |
| **Retell AI** | Voice agent platform | Paid | Full agent lifecycle | Build, test, deploy, monitor; SIP integration | — | Cloud | $0.07/min, no platform fees | No | No | Production-ready | Pay-as-you-go |
| **Plivo** | Voice agent + telephony | Paid | Customizable business agents | Choose LLM/TTS, 30ms real-time response, 99.99% uptime, OpenAI/ElevenLabs integration | — | Cloud | $0.003/min per stream | No | No | Depends on chosen models | Strong uptime SLA |
| **AgentStation** | Agent logic | Paid | Custom LLM agents | GPT-4 agents, Twilio/SignalWire integration | — | Cloud | See provider | No | No | Depends on stack | High customization |
| **Infobip** | Telephony / IVR | Paid | Voice, IVR, routing | Voice calls, IVR, recording, multi-channel messaging | — | Cloud | From $0.002/min | No | No | N/A (infra) | High customization |
| **Twilio / Vonage / MessageBird** | Telephony | Paid | Programmable voice infra | Global coverage, call control, TTS, STT, analytics | — | Cloud | See provider | No | No | N/A (infra) | Strong developer ecosystem |

---

# Quick Picks

**By use case:**
- **Overall best platform**: Lindy (no-code, full-featured phone agents)
- **Developer-focused agent stack**: Vapi (API-first, BYO models, massive concurrency)
- **Voice quality**: ElevenLabs, PlayHT, Hume, Cartesia
- **Best free / browser-friendly TTS**: Kokoro-82M, KittenTTS, SpeechT5
- **Best paid value TTS**: Speechmatics, Google Cloud TTS, Amazon Polly
- **End-to-end platform**: OpenAI SDK, Retell AI, Plivo
- **Speech recognition (STT)**: Deepgram
- **Telephony infrastructure**: Twilio, Vonage, Plivo, Infobip
- **Best free premium demo tier**: ElevenLabs free (10K chars/mo)

---

# Platform Deep Dives

## Lindy — Best overall (no-code)
No-code voice agent platform that takes calls, holds real conversations, qualifies leads, sends follow-ups, and updates systems without human input. Built with drag-and-drop flows. Suited to sales calls, support, recruiting, and client onboarding.

- Built-in call summaries, follow-ups, Slack alerts
- Searches internal docs and updates databases mid-call
- Multiple simultaneous calls; automatic conversation logging
- **Cons**: call features excluded from free plan; needs a paid phone number
- **Pricing**: Free (400 tasks/mo, 1M char KB) · Pro $49.99/mo (5K tasks, calls, 20M char KB) · Business $299.99/mo (30K tasks, premium call automation, priority support)

## Vapi — Best for developers / omnichannel
Developer-focused voice AI platform for highly customizable agents. Suited to businesses needing deep customization, existing-system integration, and high concurrent call volumes.

- API-first; bring your own STT, TTS, and LLM models
- Real-time call handling, impressively low latency
- Routes calls, handles mid-sentence interruptions, passes context to external APIs
- Scales past a million concurrent calls
- **Cons**: you own frontend and call logic; not beginner-friendly; costs add up at volume
- **Pricing**: $10 free credits · $0.05/min platform fee (per-second) · $2/mo phone numbers · plus third-party model usage (OpenAI, ElevenLabs, etc.)

---

# Reality Notes

- **Stars ≠ quality** — a model can be good with few stars or mediocre with many.
- **File size varies by format** — raw weights, ONNX, GGUF, and quantized builds differ substantially.
- **Browser-only practicality drops fast** past small open models; paid cloud models are API-first, not front-end-only.
- Voice agent platforms (Lindy, Vapi, Retell) bundle telephony + agent logic; TTS providers (ElevenLabs, PlayHT) need pairing with agent logic and call infrastructure.
