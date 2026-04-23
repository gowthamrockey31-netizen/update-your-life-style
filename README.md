# Update Your Lifestyle Dashboard

A lightweight, extremely fast, and completely offline-capable web dashboard for managing your daily routines.

## Features
- **Ultra-Lightweight**: Built with pure Vanilla HTML, CSS, and JS (No external libraries!). Uses minimal memory (<5% RAM usage footprint).
- **Offline Capable**: Uses `LocalStorage` to save your data persistently.
- **Dark Mode**: Beautiful dynamic themes via CSS variables.
- **Smart Reminders**: Automated browser notifications when tasks are due.
- **Performance Driven Animations**: Smooth 60fps CSS animations rather than heavy JS equivalents.
- **Visual Analytics**: Dynamic, completely custom Canvas-based progress rings indicating daily completion rates without the overhead of Chart.js.

## Getting Started

Because this project is built entirely static with no node dependencies, you do not need a complex build pipeline to run it.

### Running Locally
1. Clone this repository or download the source code.
2. Open `index.html` directly in your favorite modern browser.
3. For the best experience (and to allow the LocalStorage/Web Notification APIs to work smoothly), consider using a simple local server. For example:
   - **VS Code**: Install the ["Live Server" extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) and click "Go Live"
   - **Python**: Run `python -m http.server`
   - **Node.js**: Run `npx serve`

### Setup Instructions (GitHub Deployment)

To deploy to GitHub Pages so you can access your dashboard anywhere:

1. **Initialize Git**  
   Open your terminal in the project directory:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Lifestyle Dashboard"
   ```

2. **Create a GitHub Repository**  
   Go to [GitHub](https://github.com/new) and create a new repository. Do not initialize with a README as you already have one.

3. **Push to Remote**  
   Link your local repository and push:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

4. **Enable GitHub Pages**  
   - Go to your repository **Settings** on GitHub.
   - Navigate to **Pages** on the left sidebar.
   - Under "Build and deployment", set the **Source** to `Deploy from a branch`.
   - Select the `main` branch and `/ (root)` folder, then click **Save**.
   - Your site will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME` in a few minutes!

## Technology Stack
| Layer | Tech | Note |
|---|---|---|
| **Structure** | HTML5 | Semantic responsive layout |
| **Styling** | Vanilla CSS | Uses CSS Grid/Flexbox and HSL variables |
| **Logic** | Vanilla JS | Implements a custom localized observer pattern |
| **Storage** | LocalStorage | Serverless persistence |
| **Charts** | HTML Canvas | Zero-dependency radial rings |

## Future Expansion
You can expand this quickly by introducing:
- Weekly / Monthly progress metrics
- XP / Gamification for completing tasks
- PWA Configuration (Service Workers & `manifest.json`) for Mobile installation.
