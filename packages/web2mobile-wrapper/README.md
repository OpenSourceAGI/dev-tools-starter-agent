<p align="center">
    <img src="https://i.imgur.com/QTS1kwk.png" >
</p>

<!-- template-git-repo:badges:start -->
<p align="center">
    <a href="https://starterdocs.vtempest.workers.dev/docs/packages/web2mobile-wrapper"><img src="https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white" alt="Documentation" /></a>
    <br />
    <a href="https://app.codecov.io/gh/OpenSourceAGI/dev-tools-starter-agent/flags"><img src="https://img.shields.io/codecov/c/github/OpenSourceAGI/dev-tools-starter-agent?flag=web2mobile-wrapper&label=web2mobile-wrapper%20coverage&logo=codecov&logoColor=white" alt="Coverage" /></a>
    <br />
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/stargazers"><img src="https://img.shields.io/github/stars/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Stars" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/issues"><img src="https://img.shields.io/github/issues/OpenSourceAGI/dev-tools-starter-agent?logo=github" alt="GitHub Issues" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls"><img src="https://img.shields.io/github/issues-pr/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs" alt="Open Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/pulls?q=is%3Apr+is%3Aclosed"><img src="https://img.shields.io/github/issues-pr-closed/OpenSourceAGI/dev-tools-starter-agent?logo=github&label=PRs%20merged&color=8957e5" alt="Merged Pull Requests" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/discussions"><img src="https://img.shields.io/github/discussions/OpenSourceAGI/dev-tools-starter-agent" alt="GitHub Discussions" /></a>
    <a href="https://github.com/OpenSourceAGI/dev-tools-starter-agent/commits/master/"><img src="https://img.shields.io/github/last-commit/OpenSourceAGI/dev-tools-starter-agent.svg" alt="GitHub last commit" /></a>
    <br />
    <img src="https://img.shields.io/badge/Bun-14151A?logo=bun&logoColor=white" alt="Bun" /> <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=white" alt="React" /> <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
</p>
<!-- template-git-repo:badges:end -->

<!-- skills:install:start -->
**🤖 Agent skill** — `npx skills@latest add https://github.com/OpenSourceAGI/dev-tools-starter-agent --skill web2mobile` ([what it covers](../../skills/web2mobile/SKILL.md))
<!-- skills:install:end -->

> **💍One Code to rule them all — and in the cloud compile them.** 

# Web2Mobile - Easy Mobile App Wrapper for Any Website

Transform your website into a native mobile app in minutes. No coding required.

## Why Your Website Needs a Mobile App

### Boost Your SEO & Customer Discovery

1. **App Store Presence = Free Marketing**

   - Your app appears in Apple App Store and Google Play Store searches
   - Millions of users discover apps through app stores daily
   - New discovery channel beyond Google search
2. **Improved SEO Rankings**

   - Google favors websites with mobile apps in search results
   - App deep links boost your website's domain authority
   - Increased brand signals across multiple platforms (website + app stores)
3. **Higher Customer Engagement**

   - Push notifications keep customers coming back (39% higher retention)
   - Home screen icon = constant brand visibility
   - Faster load times than mobile web browsers
4. **Competitive Advantage**

   - Stand out from competitors who only have websites
   - Professional appearance increases trust and credibility
   - Capture mobile-first users who prefer apps over browsers
5. **Additional Marketing Channels**

   - App Store Optimization (ASO) - like SEO for apps
   - Get featured in app store categories
   - Run app-specific promotions and campaigns

## What This Tool Does

Web2Mobile creates a production-ready mobile app wrapper for your existing website using React Native and Expo. Your website loads inside a native WebView, giving users a seamless native app experience.

**Perfect for:**

- E-commerce stores
- SaaS products
- Content websites & blogs
- Online services
- Portfolio & business websites
- Any responsive website

## Quick Start

### Prerequisites

- Node.js 18+ installed
- Your website must be HTTPS (required for mobile apps)
- A logo/icon image file (PNG, JPG, or SVG)

### Installation

```bash
npm install
```

### Configuration

Create a `config.json` file in the root directory:

```json
{
  "name": "Your App Name",
  "url": "https://yourwebsite.com",
  "icon": "path/to/your/logo.png",
  "packageName": "com.yourcompany.app"
}
```

**Configuration Options:**

- `name`: Your app's display name (shown on home screen) - **Required**
- `url`: Your website URL (must be HTTPS) - **Required**
- `icon`: Path to your logo/icon image (optional - will auto-detect if not provided)
- `packageName`: Unique app identifier in reverse domain format - **Required**

**Icon Auto-Detection:**

If you don't specify an icon path, the tool will automatically search for common icon files in these locations:

- Current directory: `icon.png`, `logo.png`, `app-icon.png`
- `assets/`, `public/`, `static/`, `images/`, `img/` folders
- Supports: `.png`, `.jpg`, `.jpeg`, `.svg` formats

### Generate Your App

```bash
npm run generate
```

Or directly:

```bash
node src/generate.js
```

This will:

1. Auto-detect your icon or use the specified path
2. Generate all required icon sizes (iOS, Android, web) in `mobile-app/assets/`
3. Create splash screens
4. Configure app settings in `mobile-app/`
5. Set up the WebView wrapper

All generated files are placed in the `mobile-app/` directory.

### Test Your App

```bash
npm start
```

Then:

- Scan the QR code with the Expo Go app on your phone
- Test on iOS: Press `i` to open iOS simulator
- Test on Android: Press `a` to open Android emulator

## Building for Production

The project includes built-in scripts for building and submitting your app using Expo EAS (Expo Application Services).

### First-Time Setup

1. Create an Expo account at [expo.dev](https://expo.dev)
2. Login via CLI:

```bash
npx eas-cli login
```

3. Configure your project:

```bash
cd mobile-app
npx eas build:configure
```

### Build Commands

From the project root, use these npm scripts:

**Android Build:**

```bash
npm run build:android
```

**iOS Build:**

```bash
npm run build:ios
```

**Build Both Platforms:**

```bash
npm run build:all
```

**Production Build (with auto-increment):**

```bash
npm run build:production
```

### Submission Commands

After building, submit to app stores:

**Submit to Google Play:**

```bash
npm run submit:android
```

**Submit to App Store:**

```bash
npm run submit:ios
```

**Submit to Both:**

```bash
npm run submit:all
```

### EAS Configuration

The `mobile-app/eas.json` file includes three build profiles:

- **development**: For internal testing with development client
- **preview**: For creating APK files for testing
- **production**: For app store releases with auto-increment version

For detailed setup and store submission, follow the [Expo EAS Build documentation](https://docs.expo.dev/build/setup/).

## Features

### Built-in Capabilities

- **Full Website Functionality**: All your website features work seamlessly
- **JavaScript Enabled**: Interactive features, forms, and scripts work perfectly
- **Local Storage**: User sessions and data persist across app launches
- **Native Performance**: Optimized WebView with native app speed
- **Status Bar**: Automatically styled for iOS and Android
- **Safe Areas**: Respects device notches and home indicators
- **Responsive**: Adapts to all screen sizes and orientations

### Automatic Asset Generation

The tool automatically creates all assets in `mobile-app/assets/`:

- App icons (1024x1024 for iOS and Android)
- Adaptive icons for modern Android devices
- Splash screens (2048x2048)
- Favicons for web version (48x48)
- Auto-detects icons from common locations
- Creates placeholder icons if none found

**Generated Files:**

```
mobile-app/
├── assets/
│   ├── icon.png          (1024x1024 - iOS & Android)
│   ├── adaptive-icon.png (1024x1024 - Android adaptive)
│   ├── splash.png        (2048x2048 - Splash screen)
│   └── favicon.png       (48x48 - Web favicon)
├── App.js                (WebView wrapper)
├── app.json              (Expo configuration)
├── package.json          (Mobile app dependencies)
└── eas.json              (Build configuration)
```

## SEO Benefits in Detail

### App Store Optimization (ASO)

Having an app unlocks App Store Optimization, which works alongside your website SEO:

1. **Keyword Rankings**: Rank for keywords in app stores
2. **Visual Search**: Users discover apps through screenshots and icons
3. **Category Placement**: Get listed in relevant app categories
4. **Ratings & Reviews**: Social proof increases downloads
5. **Update Visibility**: Regular updates show active development

### Cross-Platform Authority

Search engines recognize brands with:

- A website
- An iOS app
- An Android app
- Consistent branding across all platforms

This multi-platform presence signals legitimacy and boosts your overall SEO.

### Mobile-First Indexing

Google prioritizes mobile experiences. A native app:

- Loads faster than mobile web
- Provides better user experience
- Reduces bounce rates
- Increases session duration

All of these signals improve your website's SEO rankings.

## Customer Discovery Benefits

### Reach New Audiences

**App Store Users**:

- 230+ billion app downloads annually
- Users specifically browsing for solutions in app stores
- High-intent users ready to engage

**Referrals & Sharing**:

- "Download our app" is easier than "visit our website"
- App links share cleanly on social media
- Users share apps more frequently than websites

**Offline Discovery**:

- App stays installed on home screen
- No need to remember your URL
- One-tap access increases usage

### Brand Visibility

- Home screen icon = 24/7 brand exposure
- Push notifications (optional, can be added)
- Badge notifications for updates
- Native sharing capabilities

## Customization

### Modify the WebView Behavior

Edit `mobile-app/App.js` after generation to customize:

- Loading states and progress indicators
- Error handling and offline messages
- Navigation behavior (back button, external links)
- Custom HTTP headers
- JavaScript injection scripts
- User agent customization

Example customizations:

```javascript
<WebView
  source={{ uri: 'https://yoursite.com' }}
  onLoadStart={() => console.log('Loading...')}
  onError={(syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.warn('WebView error: ', nativeEvent);
  }}
  // Add custom headers
  injectedJavaScript={`
    // Custom JavaScript to run in the page
    console.log('Mobile app loaded');
  `}
/>
```

### Change App Appearance

Edit `mobile-app/app.json` after generation to modify:

- Splash screen background color
- Status bar style (light/dark)
- Orientation settings (portrait/landscape)
- Platform-specific configurations
- App name and slug

### Modify Build Configuration

Edit `mobile-app/eas.json` to customize:

- Build profiles (development, preview, production)
- Auto-submit settings
- Version management
- Platform-specific build options

## Common Use Cases

### E-Commerce Stores

Convert your Shopify, WooCommerce, or custom store into an app for:

- Push notifications for sales and promotions
- Easy reordering from purchase history
- One-tap checkout

### SaaS Products

Give users a dedicated app for:

- Professional appearance
- Desktop-like experience on mobile
- Better engagement metrics

### Content Platforms

Blogs, news sites, and media companies benefit from:

- Higher time-on-site
- Push notifications for new content
- Offline reading (with additional configuration)

### Service Businesses

Restaurants, salons, gyms get:

- Easy booking through the app
- Loyalty program integration
- Direct communication channel

## Technical Details

### Built With

- [React Native](https://reactnative.dev/) - Cross-platform mobile framework
- [Expo](https://expo.dev/) - Development and build platform
- [React Native WebView](https://github.com/react-native-webview/react-native-webview) - Native WebView component
- [Sharp](https://sharp.pixelplumbing.com/) - Image processing

### Requirements

- Website must use HTTPS
- Website should be mobile-responsive
- Modern browsers supported

### Limitations

- Apps must comply with App Store guidelines
- Some web features may not work (e.g., browser extensions)
- Camera/location require additional configuration

## Project Structure

```
web2mobile/
├── src/
│   ├── generate.js           # Main generation script
│   ├── App.template.js       # WebView template
│   ├── app.template.json     # Expo config template
│   └── eas.template.json     # Build config template
├── mobile-app/               # Generated app (created after running generate)
│   ├── assets/              # Auto-generated icons
│   ├── App.js               # Generated WebView wrapper
│   ├── app.json             # Generated Expo config
│   ├── package.json         # Mobile app dependencies
│   └── eas.json             # Build configuration
├── config.json              # Your app configuration
├── package.json             # Build scripts & dependencies
└── README.md                # This file
```

## Troubleshooting

### Website Doesn't Load

- Verify your URL is HTTPS (required for mobile apps)
- Check if your website blocks iframes/embedding (some sites use X-Frame-Options)
- Test the URL in a mobile browser first
- Check CORS settings on your website

### Icons Look Wrong

- Provide a square image (1:1 aspect ratio works best)
- Use PNG with transparent background for best results
- Minimum 512x512px, recommended 1024x1024px or larger
- The tool will auto-resize and center your icon

### Build Fails

- Ensure dependencies are installed: `cd mobile-app && npm install`
- Check Node.js version (18+ required)
- Verify your `config.json` is valid JSON
- Make sure you're logged in to Expo: `npx eas-cli login`
- Check the [Expo EAS Build](https://docs.expo.dev/build/setup/) documentation

### Icon Not Found

- Verify the icon path in `config.json` is correct
- Use relative paths from the project root
- Supported formats: PNG, JPG, JPEG, SVG
- Let the tool auto-detect by placing icon in common locations

### Generation Errors

- Ensure `config.json` exists with required fields: `name`, `url`, `packageName`
- Check that Sharp can process your icon file
- Verify write permissions for the `mobile-app/` directory

## Next Steps

1. **Test Thoroughly**: Try all website features in the app
2. **Get Feedback**: Share with beta testers before launching
3. **Prepare Store Listings**: Create screenshots and descriptions
4. **Submit to Stores**: Follow Apple and Google submission guidelines
5. **Market Your App**: Promote on your website and social media

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Guidelines](https://play.google.com/about/developer-content-policy/)
- [ASO Best Practices](https://developer.apple.com/app-store/product-page/)

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review Expo documentation
3. Ensure your website works properly on mobile browsers first

## License

MIT License - Feel free to use for personal or commercial projects

---

**Ready to boost your SEO and reach millions of app store users?** Generate your mobile app in the next 5 minutes.

---

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request)

Please star this repo for updates! 🌟
