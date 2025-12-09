# Grovefan Staff Panel - Design Guidelines

## Design Approach

**System-Based Approach**: Drawing from Linear's precision, Discord's chat excellence, and Vercel's dashboard clarity. This is a utility-focused staff management platform requiring efficiency, clarity, and professional polish in a dark theme environment.

## Core Design Principles

1. **Dark-First Architecture**: Complete dark theme implementation with careful contrast management for accessibility
2. **Information Density Balance**: Dense data presentation without overwhelming users
3. **Role Differentiation**: Visual hierarchy through role badges and color coding
4. **Real-time Clarity**: Clear indicators for live chat, notifications, and status changes

## Typography System

**Font Stack**: 
- Primary: Inter (via Google Fonts CDN) - exceptional readability at all sizes
- Monospace: JetBrains Mono - for user IDs and technical data

**Hierarchy**:
- Page Titles: text-2xl font-semibold (Dashboard sections, Admin Panel)
- Section Headers: text-lg font-medium (Chat room names, Task categories)
- Body Text: text-sm font-normal (Messages, descriptions, form labels)
- Small Text: text-xs (Timestamps, metadata, helper text)
- Action Text: text-sm font-medium (Buttons, links)

## Layout System

**Spacing Primitives**: Tailwind units of 2, 3, 4, 6, 8, 12
- Component padding: p-4 to p-6
- Section spacing: space-y-4 or space-y-6
- Card gaps: gap-4
- Form field spacing: space-y-3

**Container Strategy**:
- Main dashboard: Three-column layout (Navigation sidebar 64px icons-only, Content sidebar 280px, Main content flex-1)
- Admin panel: Two-column (Sidebar 240px, Content area flex-1)
- Mobile: Stack to single column with collapsible navigation

## Component Library

### Navigation & Layout
**Main Sidebar** (64px width):
- Vertical icon-only navigation with tooltips
- Logo at top (40x40px)
- Navigation items: Dashboard, Chat, Tasks, Attendance, Reports, Profile
- Active state: Subtle accent indicator on left border
- Hover: Background highlight

**Content Sidebar** (280px):
- Context-specific secondary navigation
- Chat: Active conversations list with unread badges
- Tasks: Filter/category selection
- Admin: Quick stats and action buttons

### Authentication
**Login Screen**:
- Centered card (max-w-md) on full-screen dark background
- Logo centered above form (80x80px)
- Form fields with labels above inputs
- "Request Access" link below login button

**Request Access Form**:
- Fields: User ID, Email, Desired Password, Confirm Password
- Clear password strength indicator
- Submit triggers admin approval queue

### Chat Interface
**Message Container**:
- Messages: Left-aligned for others, right-aligned for current user
- Avatar (32x32px rounded-full) on left of messages
- Username with role badge (tick icon with role color) inline
- Timestamp below message (text-xs opacity-60)
- Message bubbles: Rounded-lg with subtle background differentiation
- Media attachments: Preview thumbnails (max 400px width) with expand-on-click
- Delete option: Hover reveals trash icon for own messages

**Chat Input**:
- Fixed bottom bar with input field
- Attachment button (paperclip icon) on left
- Send button on right
- File preview area above input when files selected

### Task Management
**Task Cards**:
- Compact card design (border-l-4 with priority color)
- Task title (font-medium)
- Assignee with small avatar (24x24px)
- Due date badge
- Status indicator (pill-shaped badge)
- Grid layout: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4

**Task Detail Modal**:
- Full description area
- Assignment details with role badges
- Comments section
- Status change controls

### Admin Panel
**Access Requests Queue**:
- Table layout with columns: User ID, Email, Requested Date, Actions
- Approve/Reject buttons inline
- Pending requests highlighted with subtle accent border

**Role Management**:
- Role creation form: Name input, Color picker
- Role list with color swatches
- Assign role interface with user search/select

### Attendance & Reports
**Attendance View**:
- Calendar-style grid or list view toggle
- Clock-in/out button (large, prominent)
- Status indicators: Present (green dot), Absent (red dot), Late (yellow dot)

**Work Reports**:
- Submission form with rich text area
- Report history list with date filters
- Admin view: Pending review badge count

### Profile Section
**Profile Card**:
- Large avatar preview (128x128px) with upload button overlay on hover
- Form fields in clean vertical stack
- Password change: Collapsible section requiring old password verification
- Save changes button at bottom

## Interaction Patterns

**Modals**: Centered overlay with backdrop blur, max-w-2xl for forms
**Notifications**: Toast notifications top-right with auto-dismiss
**Loading States**: Skeleton screens for data-heavy sections, spinners for actions
**Empty States**: Centered illustrations with helpful text and primary action

## Verified Badge System
- Tick icon (checkmark in circle) adjacent to username
- Badge color matches assigned role color
- Size: 16x16px inline with username
- Tooltip on hover showing role name

## Icons
**Library**: Heroicons (outline for navigation, solid for actions)
**Usage**: Consistent 20px or 24px sizing, never mix sizes in same context

## Images
**Logo Placement**: 
- Login screen: Centered, 80x80px
- Main sidebar: Top position, 40x40px
- No hero images (utility dashboard - jump straight to functionality)

**User Avatars**: 
- Profile upload with preview
- Fallback: Initials on colored background (deterministic based on user ID)

**Media in Chat**: 
- Image previews with rounded corners
- Video thumbnails with play overlay
- Link previews with favicon and title

## Accessibility
- Focus states: 2px accent outline with offset
- Keyboard navigation: Full tab order through all interactive elements
- Color contrast: WCAG AA minimum (4.5:1 for text on dark backgrounds)
- Screen reader labels for icon-only buttons
- Form validation with clear error messages below fields

This design creates a professional, efficient staff management platform with sophisticated dark theming and clear visual hierarchy suitable for daily operational use.