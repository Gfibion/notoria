# Notoria

A modern, full-featured task management and productivity application built with cutting-edge web technologies. Notoria combines elegant design with powerful functionality to help you organize, track, and accomplish your goals efficiently.

## 🎯 What is Notoria?

Notoria is a comprehensive web application designed to streamline your workflow and boost productivity. With features including task management, PDF processing, data visualization, and offline support, Notoria provides everything you need to stay organized and focused.

**Key Highlights:**
- 🎨 Beautiful, responsive UI with dark mode support
- 📋 Comprehensive task management system
- 📊 Real-time data visualization and charts
- 📄 PDF handling and document processing
- 💾 Offline-first architecture with local storage
- ⚡ Lightning-fast performance with optimized build
- 🔄 Real-time data syncing with TanStack Query
- 📱 Progressive Web App (PWA) ready

## 🛠️ Technology Stack

Notoria is built with a modern, production-ready technology stack:

| Technology | Purpose |
|-----------|---------|
| **React 18** | UI library with hooks and concurrent features |
| **TypeScript** | Type-safe, maintainable codebase |
| **Vite** | Ultra-fast build tool and dev server |
| **Tailwind CSS** | Utility-first styling framework |
| **shadcn/ui** | High-quality, customizable component library |
| **React Router v6** | Client-side routing |
| **TanStack Query** | Server state management and caching |
| **React Hook Form** | Performant form management |
| **Zod** | TypeScript-first schema validation |
| **Recharts** | Data visualization and charts |
| **Framer Motion** | Smooth animations and transitions |
| **PDF.js & jsPDF** | PDF rendering and generation |
| **next-themes** | Theme management (light/dark mode) |
| **Sonner** | Toast notifications |

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- **Node.js** (v18 or higher) - [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **npm** or **yarn** (comes with Node.js)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Gfibion/notoria.git
   cd notoria
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

   The application will be available at `http://localhost:5173` (Vite default)

## 📖 Development

### Available Scripts

```bash
# Start development server with hot module replacement
npm run dev

# Build for production
npm run build

# Build in development mode (with source maps)
npm run build:dev

# Preview production build locally
npm run preview

# Run linter
npm run lint
```

### Project Structure

```
src/
├── components/          # Reusable React components
│   ├── ui/             # shadcn/ui components
│   ├── tasks/          # Task-related components
│   └── notoria/        # Application-specific components
├── pages/              # Page components (routes)
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and helpers
├── assets/             # Static assets
├── App.tsx             # Main application component
├── main.tsx            # Entry point
└── index.css           # Global styles
```

### Code Quality

The project includes ESLint configuration to maintain code quality and consistency. Run the linter to check for issues:

```bash
npm run lint
```

## 🎨 Customization

### Theming

Notoria uses `next-themes` for seamless theme switching. Themes are defined in your Tailwind configuration and can be toggled through the UI.

### Styling

All styling is done with Tailwind CSS. Customize colors, spacing, and other design tokens in `tailwind.config.js`.

### Components

Use shadcn/ui components as building blocks. Components are located in `src/components/ui/` and can be easily customized to match your design needs.

## 🔧 Configuration

### Build Settings

Build configuration is handled by Vite. For custom settings, edit `vite.config.ts`.

### TypeScript

TypeScript configuration is in `tsconfig.json`. The project uses strict mode for maximum type safety.

### Linting

ESLint rules are configured in `eslint.config.js`. Customize rules as needed for your project standards.

## 📱 PWA Features

Notoria includes PWA support via `vite-plugin-pwa`. The app can be:
- Installed on home screens
- Used offline with cached assets
- Synced automatically when online

## 🌐 Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Deploy to Your Platform

The built application can be deployed to any static hosting service:

- **Vercel** - Zero-config deployment
- **Netlify** - Drag-and-drop or Git integration
- **GitHub Pages** - Free hosting for static sites
- **AWS S3 + CloudFront** - Scalable CDN solution
- **Any static host** - Simple HTTP server

Example deployment to Vercel:

```bash
npm install -g vercel
vercel
```

## 📚 Feature Highlights

### Task Management
- Create, edit, and organize tasks
- Categorize and filter tasks
- Track progress and completion
- Real-time updates

### Visualizations
- Interactive charts and graphs
- Data analytics dashboard
- Visual task progress tracking

### PDF Support
- View and render PDF documents
- Generate PDFs from application data
- Manage document workflows

### Data Persistence
- LocalStorage integration for offline support
- IndexedDB for larger datasets
- Automatic synchronization

### Performance
- Code splitting and lazy loading
- Optimized bundle size
- Fast page load times
- SWC-based compilation with Vite

## 🐛 Troubleshooting

### Port Already in Use

If port 5173 is already in use:

```bash
npm run dev -- --port 3000
```

### Dependencies Issues

Clear cache and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Build Errors

Ensure TypeScript compilation is clean:

```bash
npx tsc --noEmit
npm run lint
```

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

This project is private. See repository settings for license details.

## 💡 Tips & Best Practices

- **Use the dev tools**: React DevTools and Redux DevTools are compatible
- **Optimize images**: Keep assets in `src/assets/` and optimize before committing
- **Follow conventions**: Maintain consistent naming and file structure
- **Test components**: Consider adding unit tests for critical components
- **Monitor bundle size**: Regularly check build output to catch size regressions

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on [GitHub](https://github.com/Gfibion/notoria/issues)
- Check existing documentation and FAQs

---

**Made with ❤️ by Gfibion**

Happy building! 🚀
