# Requirements Document

## Introduction

Habby Landing Page is a standalone pre-registration website (separate from the Habby mobile app codebase) designed to capture early interest, showcase the app's unique features, and collect email addresses from users who want to be notified at launch. The site is a modern, conversion-focused single-page experience built with Next.js (static export) for easy deployment to Vercel, Netlify, or any static host.

## Glossary

- **Landing_Page**: The standalone pre-registration website for the Habby app
- **Visitor**: A person browsing the Landing_Page
- **Email_Form**: The input component where Visitors submit their email address for launch notifications
- **Hero_Section**: The top-fold area containing the primary headline, value proposition, mascot, and primary CTA
- **Feature_Section**: A content block showcasing a specific Habby app feature with visuals and copy
- **Card_Showcase**: A section displaying the collectible pixel-art card system with sample card artwork
- **Social_Proof_Section**: A section displaying metrics, testimonials, or trust signals to build credibility
- **CTA_Section**: A call-to-action block containing an Email_Form and persuasive copy
- **App_Preview**: A visual mockup or screenshot of the Habby app displayed on the Landing_Page
- **Mascot**: The Habby brand character displayed in the Hero_Section and throughout the page
- **Backend**: A serverless function or third-party service (e.g., Supabase, Mailchimp, or Resend) that stores submitted email addresses
- **Toast_Notification**: A brief, non-blocking message shown to the Visitor after form submission

## Requirements

### Requirement 1: Hero Section with Primary CTA

**User Story:** As a Visitor, I want to immediately understand what Habby is and how to sign up for launch notifications, so that I can decide within seconds whether to register.

#### Acceptance Criteria

1. WHEN the Landing_Page loads, THE Hero_Section SHALL display the headline "Build habits that stick — one jar at a time" in a text element with a maximum length of 60 characters
2. WHEN the Landing_Page loads, THE Hero_Section SHALL display the Mascot illustration alongside an App_Preview mockup, where each image has a minimum rendered dimension of 80×80 pixels and includes descriptive alt text
3. WHEN the Landing_Page loads, THE Hero_Section SHALL display an Email_Form containing a single email text input (maximum 254 characters) with a visible label or placeholder indicating email address, and a "Notify Me" submit button
4. THE Hero_Section SHALL render the headline, Mascot illustration, App_Preview mockup, and Email_Form fully above the fold without vertical scrolling on viewports 375px wide and larger and at least 667px tall
5. WHEN a Visitor submits a valid email address via the Hero_Section Email_Form, THE Landing_Page SHALL store the email in the Backend and display a success Toast_Notification within 3 seconds of submission
6. IF a Visitor submits the Email_Form with an empty input or an email address that does not conform to a standard email format, THEN THE Landing_Page SHALL display an inline validation error message adjacent to the email input indicating the required format, without submitting to the Backend
7. IF the Backend fails to store the email or does not respond within 5 seconds, THEN THE Landing_Page SHALL display an error Toast_Notification indicating the submission could not be completed and SHALL preserve the entered email address in the input field

### Requirement 2: Feature Sections

**User Story:** As a Visitor, I want to learn about Habby's unique features before registering, so that I understand the value of the app.

#### Acceptance Criteria

1. THE Landing_Page SHALL display a Feature_Section for the jar-filling system containing a heading, a description explaining that each habit is a glass jar that fills with animated water as progress is logged, and a static illustration of a jar in a partially-filled state
2. THE Landing_Page SHALL display a Feature_Section for the crack-and-heal mechanic containing a heading, a description explaining that neglected habits develop visible cracks which heal when the user returns, and a static illustration showing a cracked jar alongside a healed jar
3. THE Landing_Page SHALL display a Feature_Section for the streak system containing a heading, a description explaining daily streak tracking with visual fire indicators, and a static illustration of a streak flame with a day counter
4. THE Landing_Page SHALL display a Feature_Section for the collectible card system containing a heading, a description explaining that milestone achievements unlock pixel-art cards with rarity tiers (Common, Uncommon, Rare, Legendary), and a static illustration showing example cards
5. THE Landing_Page SHALL render the Feature_Sections in the following top-to-bottom order: jar-filling system, crack-and-heal mechanic, streak system, collectible card system
6. WHEN a Visitor scrolls a Feature_Section into the viewport such that at least 20% of the section is visible, THE Landing_Page SHALL animate the section content into view using a fade-up transition that completes within 400 milliseconds
7. IF a Visitor has reduced-motion preferences enabled at the operating system level, THEN THE Landing_Page SHALL display the Feature_Section content immediately without animation

### Requirement 3: Card Showcase

**User Story:** As a Visitor, I want to preview the collectible cards available in the app, so that I feel motivated to sign up and start collecting.

#### Acceptance Criteria

1. THE Card_Showcase SHALL display at least 6 and at most 12 sample card images from the Habby card catalog, each showing the card name (truncated with ellipsis at 24 characters) and a star rating (1 to 5 stars, including half-star values rendered via clipped overflow)
2. THE Card_Showcase SHALL display each card with a colored border or background accent corresponding to its rarity tier: Common (#94a3b8 grey), Uncommon (#22c55e green), or Rare (#3b82f6 blue), with at least one card from each rarity tier represented
3. WHEN a Visitor hovers over a card in the Card_Showcase, THE Landing_Page SHALL apply a scale transform of 1.05 and a colored glow shadow matching the card's rarity color, with the animation completing within 200 milliseconds
4. THE Card_Showcase SHALL include at least 2 locked card placeholders displaying the card-back art image (habby bg card.png) with a lock icon overlay and the text "???" in place of the card name, to communicate that more cards exist to discover
5. IF the card images fail to load within 5 seconds, THEN THE Card_Showcase SHALL display a placeholder skeleton matching the card dimensions (1.4 aspect ratio) until the images are available or a static fallback image is shown after 10 seconds

### Requirement 4: Social Proof and Trust

**User Story:** As a Visitor, I want to see evidence that others are interested in Habby, so that I feel confident registering.

#### Acceptance Criteria

1. WHEN the Landing_Page loads, THE Social_Proof_Section SHALL fetch the current registered email count from the Backend and display it as a milestone-based label (e.g., "Join 500+ early supporters") where the milestone rounds down to the nearest 50
2. THE Social_Proof_Section SHALL display at least 3 trust signals including: an App Store availability statement, a spam-policy assurance ("No spam, unsubscribe anytime"), and one additional credibility statement about the team or product
3. IF the Backend is unreachable when fetching the registration count, THEN THE Social_Proof_Section SHALL display a static fallback label ("Join our growing community") instead of a numeric count

### Requirement 5: Email Collection and Storage

**User Story:** As the Habby team, I want to collect and store Visitor emails reliably, so that I can notify them at launch.

#### Acceptance Criteria

1. WHEN a Visitor submits an email, THE Email_Form SHALL validate that the input matches RFC 5322 simplified format (local@domain.tld, maximum 254 characters) before submission
2. IF a Visitor submits an input that does not match the required email format, THEN THE Email_Form SHALL display an inline error message "Please enter a valid email address" below the input field without clearing the input value
3. IF a Visitor submits an email that already exists in the Backend, THEN THE Landing_Page SHALL display a Toast_Notification with the message "You're already on the list!" within 3 seconds of submission
4. WHEN a valid, non-duplicate email is submitted, THE Backend SHALL store the email address with a UTC timestamp and respond within 5 seconds
5. IF the Backend does not respond within 5 seconds or returns a network error during submission, THEN THE Landing_Page SHALL display a Toast_Notification with the message "Something went wrong. Please try again." and retain the email in the input field
6. WHILE the email submission is in progress, THE Email_Form SHALL disable the submit button and display a loading indicator until a response is received or the 5-second timeout elapses
7. WHEN a valid email is successfully stored, THE Landing_Page SHALL display a Toast_Notification with a success message confirming the email was added to the list
8. THE Email_Form SHALL limit the email input field to a maximum length of 254 characters

### Requirement 6: Responsive Design and Performance

**User Story:** As a Visitor on any device, I want the Landing_Page to load quickly and display correctly, so that I have a smooth experience regardless of screen size.

#### Acceptance Criteria

1. WHILE the viewport width is below 768px, THE Landing_Page SHALL render a mobile-optimized layout with vertically stacked sections and touch-friendly tap targets of minimum 44×44px
2. WHILE the viewport width is 768px or above and below 1024px, THE Landing_Page SHALL render a tablet-intermediate layout with stacked sections and tap targets of minimum 44×44px
3. WHILE the viewport width is 1024px or above, THE Landing_Page SHALL render a desktop-optimized layout with side-by-side content in feature sections
4. WHEN the Landing_Page is loaded on a connection with 4G-equivalent throughput (approximately 9 Mbps download), THE Landing_Page SHALL achieve a Largest Contentful Paint (LCP) below 2.5 seconds and a Total Blocking Time (TBT) below 300 milliseconds
5. THE Landing_Page SHALL lazy-load all images positioned below the initial viewport fold to minimize the initial page payload to no more than 1.5 MB of transferred data
6. THE Landing_Page SHALL use the Habby brand color (#6d28d9) as the primary accent for all interactive elements, section headings, and decorative accents
7. IF the Landing_Page fails to load any image resource, THEN THE Landing_Page SHALL display a placeholder element matching the expected image dimensions without breaking the page layout

### Requirement 7: Navigation and Secondary CTAs

**User Story:** As a Visitor who has scrolled through the page, I want additional opportunities to register, so that I do not have to scroll back to the top.

#### Acceptance Criteria

1. THE Landing_Page SHALL display a sticky header that remains fixed at the top of the viewport during scrolling, containing the Habby logo and a "Get Notified" button
2. WHEN a Visitor scrolls past the Hero_Section, THE sticky header SHALL transition from transparent to a solid background with backdrop blur within 200 milliseconds
3. THE Landing_Page SHALL display a final CTA_Section at the bottom of the page containing a secondary Email_Form with a compelling closing headline and a subheading reinforcing urgency
4. WHEN a Visitor clicks the "Get Notified" button in the sticky header, THE Landing_Page SHALL smooth-scroll to the bottom CTA_Section Email_Form within 600 milliseconds and focus the email input field
5. THE sticky header SHALL have a z-index higher than all page sections to remain visible above overlapping content

### Requirement 8: Branding and Visual Identity

**User Story:** As the Habby team, I want the Landing_Page to reflect the app's visual identity, so that brand recognition carries over when the app launches.

#### Acceptance Criteria

1. THE Landing_Page SHALL use #6d28d9 (Habby purple) as the primary brand color for buttons, accents, and interactive elements, and SHALL use #5b21b6 as the pressed/hover state color for those elements
2. THE Landing_Page SHALL use a dark-to-purple gradient background for the Hero_Section, transitioning from #1a0533 at the top to #6d28d9 at the bottom, occupying the full width and a minimum height of 500px (desktop) or 400px (mobile viewports below 768px width)
3. THE Landing_Page SHALL display the Mascot illustration in the Hero_Section with a maximum rendered width of 320px and a maximum height of 320px while preserving its aspect ratio. THE Landing_Page MAY optionally display the Mascot illustration in the CTA_Section at a maximum rendered width of 200px
4. THE Landing_Page SHALL use a sans-serif font stack of `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` for all text elements, with heading weights of 700 or 800 and body text weight of 400
5. THE Landing_Page SHALL include a footer containing: copyright text displaying the current year and "Habby", a text link labeled "Privacy Policy" navigating to a dedicated privacy policy page, and a minimum of 3 social media icon links (placeholders linking to "#" are acceptable for initial launch) each with a minimum tap target of 44×44px
6. IF the Mascot illustration asset fails to load, THEN THE Landing_Page SHALL hide the Mascot element without displaying a broken image indicator or altering the surrounding layout

### Requirement 9: SEO and Meta Configuration

**User Story:** As the Habby team, I want the Landing_Page to be discoverable and shareable, so that organic traffic and social sharing drive registrations.

#### Acceptance Criteria

1. THE Landing_Page SHALL include a meta title of maximum 60 characters, a meta description of maximum 160 characters, and Open Graph tags (og:title, og:description, og:image, og:url, og:type) for optimized search engine indexing and social media sharing
2. THE Landing_Page SHALL include a favicon (32×32 ICO or PNG) and an apple-touch-icon (180×180 PNG) using the Habby brand mark
3. THE Landing_Page SHALL render semantic HTML including proper heading hierarchy (single h1, sequential h2-h6), landmark regions (header, main, footer, nav), and descriptive alt text on all non-decorative images
4. THE Landing_Page SHALL include a JSON-LD script element containing structured data conforming to the SoftwareApplication schema type with name, operatingSystem, applicationCategory, and offers properties

### Requirement 10: Technology and Deployment

**User Story:** As a developer, I want the Landing_Page to be easy to develop, build, and deploy, so that iteration is fast and hosting is simple.

#### Acceptance Criteria

1. THE Landing_Page SHALL be built as a Next.js application with static export (`output: 'export'`) producing a fully static site that generates all pages as pre-rendered HTML files with no server-side runtime dependency
2. THE Landing_Page SHALL live in a separate top-level directory (`habby-landing/`) outside the `habby/` app folder and SHALL NOT share dependencies or build configuration with the `habby/` project
3. THE Landing_Page SHALL use Tailwind CSS for styling to enable rapid iteration and consistent design tokens
4. THE Landing_Page SHALL include a single serverless function endpoint (`/api/register`) for email submission that validates the email address, stores it in Supabase, and returns a response within 3 seconds
5. IF the deployment target does not support serverless functions, THEN THE Landing_Page SHALL fall back to a client-side fetch directly to the Supabase REST API endpoint, performing the same email validation and storage operation as the serverless function
6. IF the `/api/register` endpoint or the Supabase fallback fails to respond within 5 seconds or returns a non-success status, THEN THE Landing_Page SHALL display an error message indicating the submission failed and SHALL preserve the user's entered email address in the input field
7. WHEN a production build is generated via `next build`, THE Landing_Page SHALL complete the build process without errors and produce a static export in an `out/` directory deployable to any static file host
