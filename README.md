# Medium Reader

A web-based Medium article reader that bypasses paywalls and provides a distraction-free reading experience.

## Features

- **Paywall Bypass**: Read Medium articles without subscription
- **Multiple Extraction Methods**: Uses 5 different strategies for maximum success rate
- **Clean Reading Experience**: Distraction-free, customizable interface
- **Reading Progress Bar**: Visual indicator showing reading progress at the top
- **Bookmark System**: Save favorite articles separately from reading history
- **Text Customization**: 4 text sizes (S, M, L, XL)
- **Theme Support**: Light, dark, and system themes
- **Reading History**: Local storage of last 20 articles
- **Responsive Design**: Works on all devices

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn-ui + Tailwind CSS
- **State**: React Query + localStorage
- **Article Fetching**: Frontend-only with CORS proxies

## Extraction Strategies

1. **Freedium Primary** - Primary mirror service
2. **Freedium Alternative** - Backup mirror service  
3. **Scribe.rip** - Alternative Medium reader
4. **CORS Proxy** - Direct fetch with proxy
5. **CORS Proxy Alt** - Alternative proxy service

## Getting Started

```bash
npm install
npm run dev
```

## How It Works

The app uses multiple extraction strategies with intelligent fallbacks:

1. Validates Medium URL
2. Tries each extraction method with retries
3. Scores content quality (0-100 points)
4. Returns best available result
5. Displays with customizable interface

## Content Quality Scoring

- **Title quality**: Up to 25 points
- **Author presence**: Up to 15 points  
- **Content length**: Up to 30 points
- **Structure quality**: Up to 20 points
- **Media content**: Up to 10 points

Articles with 70+ points are considered high quality, 35+ points are acceptable with warnings.

## New Features

### Reading Progress Bar
- **Visual Progress**: Fixed progress bar at the top shows reading completion
- **Smooth Animation**: Real-time updates as you scroll through the article
- **Non-intrusive**: Minimal 1px height bar that doesn't interfere with reading

### Bookmark System
- **Save Favorites**: Bookmark articles separately from reading history
- **Organized Storage**: Up to 50 bookmarks with metadata (word count, reading time)
- **Easy Management**: Add/remove bookmarks with one click
- **Tabbed Interface**: Switch between Recent articles and Bookmarks
- **Persistent Storage**: Bookmarks saved locally in browser

## Project Structure

```
src/
├── components/          # UI components
│   ├── ArticleContent.tsx      # Article display with progress bar
│   ├── BookmarksList.tsx       # Bookmark management
│   ├── ReadingProgressBar.tsx  # Progress indicator
│   └── ui/                     # shadcn-ui components
├── hooks/              # Custom React hooks
│   ├── useBookmarks.ts         # Bookmark management
│   ├── useReadingProgress.ts   # Progress tracking
│   └── useArticleHistory.ts    # History management
├── pages/              # Page components
├── services/           # Business logic (ArticleFetcher)
└── lib/                # Utilities
```

## Technologies Used

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- React Query
- React Router