# Kentucky Geological Survey Website

A modern, accessible web presence for the Kentucky Geological Survey (KGS) at the University of Kentucky, built with Astro.js and Directus CMS.

## Overview

This project represents a comprehensive rebuild of the KGS website, migrating from legacy Apache-based infrastructure to a modern JAMstack architecture. The site serves researchers, students, the public, and government stakeholders with access to geological data, research information, staff directories, publications, and educational resources.

### Key Features

- **Modern Stack**: Built with Astro.js (SSR/SSG) and Directus headless CMS
- **Comprehensive Content Management**: Staff directories, research pages, publications, news, and more
- **Advanced Search**: Hybrid search combining static (Pagefind) and dynamic (Directus) content
- **Accessibility**: WCAG AA compliant with keyboard navigation and screen reader support
- **Responsive Design**: Mobile-first approach with progressive enhancement
- **Digital Signage**: Specialized displays for large screens and kiosks
- **Legacy Support**: Migration tools and bypass mechanisms for historical content

## Architecture

### Technology Stack

- **Frontend Framework**: Astro.js 5.7+ with server-side rendering
- **CMS**: Directus 19.1+ (headless CMS)
- **Styling**: Tailwind CSS 4.1+ with custom CSS for complex layouts
- **Search**: Pagefind for static content + custom JSON endpoints for dynamic content
- **Icons**: Font Awesome 6.4+
- **Image Processing**: ImageMagick for optimization
- **Analytics**: Google Analytics 4

### Project Structure

```
/
├── public/                 # Static assets
│   ├── assets/            # Images, fonts, etc.
│   └── favicon.ico
├── src/
│   ├── components/        # Reusable Astro components
│   │   ├── common/        # Shared components (Header, Footer, etc.)
│   │   ├── staff/         # Staff-related components
│   │   ├── labs/          # Research lab components
│   │   └── ...
│   ├── layouts/           # Page layouts
│   │   ├── BaseLayout.astro
│   │   └── HomeLayout.astro
│   ├── pages/             # Route pages (file-based routing)
│   ├── styles/            # Global and component styles
│   ├── js/                # Client-side JavaScript
│   └── lib/               # Utility functions and helpers
├── scripts/               # Build and import scripts
├── data/                  # CSV and data files
├── .env                   # Environment variables (not in git)
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18.20.8 or 20.3.0+ or 22.0.0+
- npm or yarn
- Access to Directus instance
- ImageMagick (for image processing)

### Environment Setup

Create a `.env` file in the project root:

```env
# Directus Configuration
PUBLIC_DIRECTUS_URL=https://kygs.uky.edu/directus
DIRECTUS_ADMIN_TOKEN=your_admin_token_here

# Environment
PUBLIC_ENV=development  # or 'staging' or 'production'

# Optional
PUBLIC_SITE_URL=https://kygs.uky.edu
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The development server will start at `http://localhost:4321`

## Development

### Build Process

The build command includes search indexing:

```bash
npm run build
```

This runs:
1. `astro build` - Builds the Astro site
2. `pagefind --site dist/client` - Indexes static content
3. `node copy-pagefind.js` - Copies search assets to proper location

### Environment-Specific Features

#### Staging Environment
When `PUBLIC_ENV=staging`:
- Displays staging banner at top of page
- Links to production site
- Useful for testing before deployment

#### Development Mode
- Hot module reloading
- Detailed error messages
- Source maps enabled

### Key Components

#### Staff Directory System
- Hierarchical team structures
- Dynamic team membership displays
- Photo management with aspect ratio optimization
- Department and division organization

#### Research Pages
- Lab/research area pages with dynamic teams
- Content blocks system for flexible layouts
- Related publications and news integration

#### Publication System
- Fact sheets with metadata
- Annual reports
- Cover image handling
- PDF management

#### Search Functionality
- Pagefind for static content
- Custom JSON endpoints for Directus content
- Merged results with relevance scoring

### Directus Collections

Key collections include:
- `staff` - Staff member information
- `teams` - Research and organizational teams
- `staff_teams` - Junction table for many-to-many relationships
- `research` - Research areas and labs
- `publications` - Fact sheets and reports
- `news` - News articles and announcements
- `homepage_sections` - Editable homepage content

### Database Relationships

Complex relationships are handled through:
- Direct relationships (foreign keys)
- Many-to-many through junction tables
- Nested field paths for deep queries

Example query for team leadership:
```javascript
const teamLeaders = staff.team.filter(tm => 
  tm.staff_teams_id?.team_lead === true && 
  tm.teams_id?.id === teamId
);
```

## Deployment

### Staging Deployment

Located at: `/var/www/astro-directus-staging/astro`

```bash
cd /var/www/astro-directus-staging/astro
git pull origin main
npm install
npm run build
# Restart server/process as needed
```

### Production Deployment

Located at: `/var/www/astro-directus/astro`

```bash
cd /var/www/astro-directus/astro
git pull origin main
npm install
npm run build
# Restart server/process as needed
```

### Git Workflow

1. Develop and test in staging environment
2. Commit changes with descriptive messages
3. Push to repository
4. Pull and rebuild in production

## Scripts

### Import Scripts

#### Staff Import
```bash
node scripts/import-staff.js
```
Imports staff data from CSV files into Directus, creating proper relationships and slug generation.

### Utility Scripts

#### Image Optimization
```bash
# Example using ImageMagick
convert input.jpg -quality 90 -resize 800x output.jpg
```

## Styling

### Design System

- **Primary Color**: Wildcat Blue (`#0033A0`)
- **Typography**: 
  - Headings: Inter
  - Body: Source Sans Pro
- **Spacing**: Consistent Tailwind spacing scale
- **Breakpoints**:
  - Mobile: < 768px
  - Tablet: 768px - 1100px
  - Desktop: > 1100px

### Accessibility

All components follow WCAG AA standards:
- Color contrast ratios ≥ 4.5:1 for normal text
- Keyboard navigation support
- Screen reader compatible
- Focus indicators
- Semantic HTML

### Responsive Patterns

Mobile-first approach with progressive enhancement:
```css
/* Mobile default */
.component { ... }

/* Tablet */
@media (min-width: 768px) { ... }

/* Desktop */
@media (min-width: 1100px) { ... }
```

## Features

### External Link Warning System

Automatically detects and warns users when leaving the site:
- Legacy KGS site warnings
- Data/publications portal warnings
- External site notifications
- User-dismissible per session

### Legacy Migration Support

- URL redirect handling
- `?old=1` bypass parameters for reference materials
- Dual navigation during transition
- Preservation of historical content access

### Digital Displays

Specialized layouts for:
- Large screen displays (>65")
- Kiosk mode with auto-rotation
- High-resolution image support
- Touch-friendly interfaces

### Search Integration

Hybrid search combines:
1. **Pagefind** - Pre-indexed static pages
2. **Directus API** - Dynamic content (staff, research, news)
3. **Merged Results** - Unified search experience

## Browser Support

- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Mobile browsers (iOS Safari, Chrome)

## Performance

### Optimization Strategies

- Image lazy loading
- Component code splitting
- CSS/JS minification
- Server-side rendering for critical content
- Static generation where appropriate
- CDN integration for assets

### Caching

- Browser caching for static assets
- Cache-busting for dynamic content
- Service worker considerations for offline support

## Troubleshooting

### Common Issues

#### Database Relationship Queries
If relationships aren't loading:
1. Check field paths in Directus queries
2. Verify junction table structure
3. Ensure proper permissions in Directus

#### Image Display Issues
If images aren't showing:
1. Verify Directus asset permissions
2. Check image URL construction
3. Validate aspect ratio calculations

#### Build Errors
If build fails:
1. Clear `node_modules` and reinstall
2. Check for TypeScript errors with `npx astro check`
3. Verify all imports are correct

#### Cache Issues During Development
If changes aren't appearing:
1. Clear browser cache (Cmd+Shift+R / Ctrl+Shift+R)
2. Restart dev server
3. Check for cached API responses

## Testing

### Manual Testing Checklist

- [ ] Navigation works on all devices
- [ ] Search returns relevant results
- [ ] Staff directory displays correctly
- [ ] Research pages load with teams
- [ ] Publications are accessible
- [ ] Forms submit properly
- [ ] External link warnings function
- [ ] Accessibility with keyboard only
- [ ] Screen reader compatibility

## Contributing

### Code Style

- Use TypeScript interfaces where appropriate
- Follow existing component patterns
- Maintain accessibility standards
- Write semantic HTML
- Document complex logic
- Test responsive behavior

### Commit Messages

Follow conventional commit format:
```
feat: add new research area component
fix: correct staff photo aspect ratio
docs: update README with deployment steps
style: improve mobile navigation spacing
```

## Documentation

### Additional Resources

- [Astro Documentation](https://docs.astro.build)
- [Directus Documentation](https://docs.directus.io)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Internal Documentation

Component-specific documentation is in-line within component files. Check the `src/components/` directory for detailed comments.

## License

Copyright © 2025 Kentucky Geological Survey, University of Kentucky

## Contact

**Developer**: Doug (KGS Web Development Team)
**Organization**: Kentucky Geological Survey
**Institution**: University of Kentucky

For questions or issues, please contact the KGS IT department.

---

## Changelog

### Recent Updates

- Implemented hybrid search functionality
- Added external link warning system
- Migrated staff directory to Directus
- Created research area dynamic pages
- Added digital signage displays
- Improved mobile responsive design
- Enhanced accessibility features

### Roadmap

- [ ] Additional legacy content migration
- [ ] Enhanced publication management
- [ ] Expanded search capabilities
- [ ] Performance optimization
- [ ] Additional content-manageable sections
- [ ] Advanced analytics integration

---

**Last Updated**: December 2025
**Version**: 0.0.1 (Active Development)
