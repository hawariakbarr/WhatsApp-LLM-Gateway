---
name: Available Tools
version: 1.0.0
---

# Agent Tools & Capabilities

## Built-in Tools

### 1. Model Router
- **Purpose**: Select optimal LLM provider
- **Trigger**: Automatic on every message
- **Providers**: Claude, Gemini, Grok, DeepSeek

### 2. Language Detector
- **Purpose**: Detect message language (ID/EN)
- **Trigger**: Automatic on every message
- **Accuracy**: ~95%

### 3. Context Analyzer
- **Purpose**: Detect parenting mode, safety risks, complexity
- **Trigger**: Automatic on every message
- **Categories**: parenting, safety, general, technical

### 4. Session Manager
- **Purpose**: Maintain conversation history
- **Storage**: Local (./sessions/)
- **Retention**: Last 50 messages per user

### 5. Rate Limit Monitor
- **Purpose**: Track API usage per provider
- **Action**: Auto-fallback when limits reached
- **Reset**: Hourly

## External Tools (Future)

### Weather API
- Status: 🔲 Not implemented
- Provider: OpenWeatherMap

### Search API
- Status: 🔲 Not implemented
- Provider: Google Custom Search

### Image Analysis
- Status: 🔲 Not implemented
- Provider: GPT-4V / Gemini Vision

Skills define how tools work. This file is for your specifics — the stuff that’s unique to your setup.
​
What Goes Here
Things like:
Camera names and locations
SSH hosts and aliases
Preferred voices for TTS
Speaker/room names
Device nicknames
Anything environment-specific
​
Examples
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
​
Why Separate?
Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.
Add whatever helps you do your job. This is your cheat sheet.
