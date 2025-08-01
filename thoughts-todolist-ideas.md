# Ideas

- ✅ Make a thing so when you want to download the photo/video/file on your phone than on the pc it shows 2 options when you press download
  1. Download on this pc
  2. Scan qr code to download on phone
  and imo ill make the qr code maybe a temp url as well because the user may be not logged in on the mobile phone
- Auto file backup (like newly taken pictures or smth it automatically uploads it to the cloud in a folder /TelephoneUpload/(the same path that it was on the phone) or if you set photos/videos to go in s3t folders by you that would be also available, same on pc add the upload function (of course only if you want it and you set where to upload from (what folder) if not set then /PCUpload/(the same path) and yeah)
- Ads (maybe very maybe) (i really don't want it)
- Creating files (so it works the same way like in github like the file name setting and preview tab so it formats it correctly to the .type the file was set to
- sharing files/folders

## ✅ QR Code Feature Implementation Complete

### What's been implemented

1. **QR Code Generation API** (`/api/share/qr-generate`)
   - Generates unique tokens with 1-hour expiration
   - Supports both download and upload QR codes
   - Stores token data securely in database

2. **QR Page** (`/qr/[token]`)
   - Mobile-friendly interface for scanned QR codes
   - Handles both file downloads and uploads
   - No login required (works with temporary tokens)

3. **Context Menu Integration**
   - Added "Generate QR for Mobile Download" option
   - Added "Generate QR for Mobile Upload" option
   - Available in both normal and favorites views

4. **Download Options**
   - Modified download action to show choice dialog
   - Direct download OR QR code generation
   - Individual file download or ZIP for multiple files

5. **QR Modal**
   - Beautiful modal displaying QR code
   - Shows expiration time (1 hour)
   - Lists files to be downloaded
   - Instructions for mobile users

6. **Database Schema**
   - Added `QrToken` model with token, type, data, and expiration
   - Auto-cleanup of expired tokens

7. **Fixed Inline Rename**
   - Removed all prompt() usage for renaming
   - Files/folders can only be renamed inline (Windows Explorer style)
   - Multi-rename support maintained

### How it works

1. Right-click on files/folders → Choose QR option
2. QR code generated with 1-hour expiration token
3. Mobile user scans QR code
4. Redirected to mobile-friendly page (/qr/[token])
5. Can download files or upload to folder
6. No login required on mobile device
7. Token expires automatically after 1 hour
