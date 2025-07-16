# Folder Authentication System

## Overview

This system adds an extra layer of security to verify that users can only access their own folders by using unique folder tokens. This prevents unauthorized access even if someone gains access to user credentials.

## How It Works

### 1. Token Generation

- When a user account is created or first logs in, a unique 256-bit folder token is generated
- This token is stored in the database (`User.folderToken` field)
- The token is also saved in a `USRINF.INF` file within the user's folder

### 2. Folder Structure

```
uploads/
├── 1/
│   ├── USRINF.INF (contains user info + folder token)
│   ├── file1.txt
│   └── folder1/
├── 2/
│   ├── USRINF.INF
│   └── ...
```

### 3. Authentication Process

Every file operation now includes:

1. **Session verification** (existing) - Verify user is logged in
2. **Database verification** (existing) - Verify file ownership in database
3. **Folder token verification** (NEW) - Verify folder token matches

### 4. Verification Steps

1. Get user's folder token from database
2. Read `USRINF.INF` file from user's folder
3. Compare tokens - must match exactly
4. Also verify user ID matches
5. Only proceed if all checks pass

## Protected APIs

The following APIs now include folder authentication:

- `/api/files/edit` - File editing
- `/api/files/download` - File downloads  
- `/api/files` - File listing and operations

## USRINF.INF File Format

```json
{
  "id": 1,
  "email": "user@example.com", 
  "folderToken": "a1b2c3d4e5f6...",
  "createdAt": "2025-07-14T09:29:46.000Z"
}
```

## Benefits

1. **Prevents folder tampering** - Even if someone moves/copies folders, tokens won't match
2. **Detects unauthorized access** - If someone accesses files outside the app, tokens protect integrity
3. **Folder ownership proof** - Each folder cryptographically proves which user owns it
4. **Migration safety** - Folders can be safely moved between servers while maintaining ownership

## Error Codes

- `folder_auth_failed` - Token verification failed
- `file_not_found` - File doesn't exist in database or filesystem
- `unauthorized` - User not logged in

## Automatic Initialization

- New users: Token created during account creation
- Existing users: Token created on first login after update
- Manual trigger: `/api/admin/initialize-folders` endpoint

## Security Notes

- Tokens are 256-bit random values (cryptographically secure)
- Each user has a unique token
- Tokens are stored both in database and filesystem
- All file operations verify token before proceeding
- System fails securely (denies access if verification fails)
