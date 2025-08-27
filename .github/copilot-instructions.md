# Cloud Storage App - AI Assistant Guidelines

## Project Overview

This is a Next.js 15 full-stack cloud storage application with real-time features via Socket.IO, SQLite database with Prisma ORM, and dual authentication (Google OAuth + credentials). The app enables users to upload, organize, and manage files/folders with mobile-responsive design and QR code sharing.

## Architecture & Core Components

### Server Setup
- **Hybrid server**: Custom Socket.IO server (`server.js`) wrapping Next.js with real-time capabilities
- **Development**: `npm run dev` (Socket.IO + Next.js) or `npm run dev2` (Next.js only with Turbopack)
- **Production**: `npm run start` uses Bun runtime for better performance

### Database & Auth
- **Prisma + SQLite**: Schema in `prisma/schema.prisma` with User, File, Folder, QrToken, UserSettings models
- **Auth patterns**: Server actions in `lib/auth.js`, session management in `lib/session.js`
- **Folder security**: `lib/folderAuth.js` ensures users can only access their files in `uploads/{userId}/`
- **Dual auth**: Credentials (bcrypt) + Google OAuth, managed by `context/AuthProvider.js`

### API Structure
- **RESTful endpoints**: `app/api/{resource}/route.js` pattern
- **File operations**: Upload, download, stream, thumbnail generation in `app/api/files/`
- **QR sharing**: Temporary tokens for mobile file sharing in `app/api/qr/`
- **Real-time sync**: Socket.IO events for folder structure updates

### Frontend Architecture
- **Main app**: `app/page.js` with three-panel layout (FolderTree, FileList, Controls)
- **Responsive design**: `useIsMobile()` hook switches between desktop/mobile layouts
- **Component structure**: Modular components in `components/app/` with CSS modules
- **State management**: React Context for auth, local state for file operations

## Development Patterns

### File System Operations
```javascript
// Always verify folder ownership before file operations
const folderVerification = await verifyFolderOwnership(userId);
if (!folderVerification.isValid) return unauthorized();

// Use absolute paths for file operations
const userFolder = path.join(process.cwd(), "uploads", String(userId));
const targetPath = path.join(userFolder, requestedPath);
```

### API Response Format
```javascript
// Consistent error/success responses
return NextResponse.json({ 
  success: false, 
  code: "specific_error_code",
  message: "Human readable message" 
}, { status: 400 });
```

### Real-time Updates
```javascript
// Emit Socket.IO events after file operations
global.io?.emit("folder-structure-updated", { userId, path: folderPath });
global.io?.emit("file-updated", { userId, action: "delete", path: filePath });
```

### CSS Modules Pattern
- All components use CSS modules (`.module.css`)
- Mobile-first responsive design with breakpoints
- Custom properties for theming in `globals.css`

## Key Commands & Workflows

### Database Operations
```bash
# Prisma workflow
npx prisma migrate dev --name "description"  # Create migration
npx prisma db push                          # Sync schema
npx prisma studio                          # Database GUI
```

### Development Setup
```bash
# Install dependencies
bun install  # or npm install

# Environment setup
# Create .env file with DATABASE_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID/SECRET

# Start development
bun dev    # Full stack with Socket.IO
```

### File Upload Debugging
- Check `uploads/{userId}/` directory structure
- Verify Prisma database entries match filesystem
- Monitor Socket.IO connections in server logs
- Use browser Network tab for API debugging

## Security Considerations

- **Path traversal protection**: All file paths validated in `lib/folderAuth.js`
- **User isolation**: Files stored in `uploads/{userId}/` with ownership verification
- **QR token expiration**: Temporary tokens in database with cleanup job
- **CORS headers**: Configured in `next.config.mjs` for security

## Mobile Features

- **QR code sharing**: Generate tokens for mobile file access
- **Responsive layout**: Different components for mobile/desktop
- **Touch interactions**: Mobile-optimized file selection and operations

## Common Debugging Areas

1. **Socket.IO connection issues**: Check server.js setup and client connection
2. **File upload failures**: Verify user folder permissions and Prisma sync
3. **Auth redirects**: Review AuthProvider.js route protection logic
4. **Mobile layout**: Test responsive breakpoints and touch events

## Code Style Notes

- Use server actions for database operations (`"use server"` directive)
- Prefer absolute imports with `@/` prefix (configured in jsconfig.json)
- Error handling with specific error codes for frontend consumption
- CSS modules with descriptive class names matching component structure
