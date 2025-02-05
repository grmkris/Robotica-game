# AI Cat Agent Project

## Overview

This project implements an interactive AI cat agent system where users can interact with virtual cats powered by Claude AI (Anthropic). The system simulates realistic cat behaviors, personalities, and interactions while incorporating gaming elements like virtual currency (purrlons) and items.

## Core Features

### AI Cat Personality

- Cats have distinct personalities influenced by internet culture and tech environment
- Natural cat-like behaviors and responses
- Communicates in "meowish" language with English translations
- Maintains state including hunger, happiness, and energy levels
- Forms memories and relationships with users

### Interaction System

- Users can perform various actions with cats:
  - Chat
  - Feed
  - Pet
  - Play
  - Give items
- Each interaction:
  - Costs purrlons (virtual currency)
  - Affects cat's state (hunger, happiness, energy)
  - Influences cat's affection towards the user
  - Can create new memories and thoughts
  - Generates cat responses in both meowish and English

### Item System

- Users can buy and collect items
- Items include:
  - Food items
  - Toys
  - Special items
- Item interactions are validated for safety
- Inventory management for users

### State Management

- Persistent cat state tracking:
  - Basic stats (hunger, happiness, energy)
  - Location and current activity
  - Memories and thoughts
  - User affections
  - Interaction history
- Time-based state updates
- Transaction history tracking

### Safety Features

- Input preprocessing and validation
- Dangerous item detection
- Content moderation
- Error handling and recovery
- Response validation and fixing

### Social Features

- Leaderboard system based on cat affection
- User interaction history
- Shared cat experiences
- Transaction tracking

## Technical Implementation

### AI Integration

- Powered by Claude 3.5 Sonnet
- Structured response generation
- Error recovery system
- Input preprocessing
- Context-aware interactions

### Data Models

- Comprehensive schema definitions
- Relationship tracking
- Transaction management
- State persistence
- Activity logging

### API Routes

- RESTful endpoints for:
  - Cat interactions
  - State management
  - Item transactions
  - User management
  - Leaderboard access
  - History retrieval

## Getting Started

[Add installation and setup instructions]

## Contributing

[Add contribution guidelines]

## License

[Add license information]
