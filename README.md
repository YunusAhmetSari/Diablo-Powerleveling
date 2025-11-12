# Diablo Powerleveling Calculator

A web-based calculator for estimating experience, time, and cost for powerleveling characters in **Diablo 4** and **Diablo 2 Resurrected**.

## Features

### Game Support

- **Diablo 4**: Calculate powerleveling costs and time for levels 1-300
- **Diablo 2 Resurrected**: Calculate powerleveling costs and time for levels 1-99 with party size and bonus options

### Key Functionality

- **Experience Calculator**: Enter level ranges (e.g., "1-60") and calculate required runs
- **Cost Estimation**: Calculate total forum gold (fg) cost based on cost per run
- **Time Estimation**: Calculate total time needed based on duration per run
- **Multiple Level Ranges**: Add multiple level range rows to calculate different powerleveling scenarios
- **State Persistence**: Calculator state is saved in the URL hash, allowing you to bookmark or share specific configurations
- **Share Links**: Generate shareable links that display results in a read-only view

### Diablo 2 Resurrected Specific Features

- **Party Size Selection**: Choose party size from 1-8 players (affects experience calculations)
- **Anni Bonus**: Select Annihilus charm bonus (0-10%)
- **Experience Shrine**: Toggle 50% experience bonus from shrines
- **Ondal's Wisdom**: Toggle 5% experience bonus from Ondal's Wisdom

## Usage

1. **Select Game**: Choose between Diablo 4 or Diablo 2 Resurrected
2. **Configure Settings**:
   - Enter experience per run (D4 only - D2R uses built-in data)
   - Enter cost per run in forum gold (fg)
   - Enter duration per run in minutes
   - For D2R: Configure party size, anni bonus, and other bonuses
3. **Add Level Ranges**: Enter level ranges in the format "X-Y" (e.g., "1-60")
4. **Calculate**: Press Enter on a level range input to calculate
5. **View Results**: See required runs, total cost, and time to complete for each range
6. **Share**: Click the "Share Link" button to generate a shareable URL

## Project Structure

```
Diablo-Powerleveling/
├── index.html          # Main calculator page
├── calculator.js       # Calculator logic and UI interactions
├── diabloData.js       # Level data for D4 and D2R
├── diablo.css          # Custom styling (dark theme with neon green accents)
├── random-sig.html     # Random signature GIF redirector
├── icon.ico            # Diablo game icon
├── *.gif               # Signature GIF files
└── src/                # TypeScript components (appears to be unused/legacy)
    ├── components/
    │   ├── Calculator.tsx
    │   └── GameSelector.tsx
    └── data/
        └── gameData.ts
```
