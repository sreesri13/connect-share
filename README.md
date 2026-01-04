# Connect HUB  
## Smart Digital Profile & QR-Based Networking Platform

Connect HUB is a fully functional web application that enables users to create structured digital profiles using custom categories and items, and share selected information instantly through dynamically generated QR codes and public URLs.

The platform eliminates traditional, unorganized networking methods and introduces a modern, selective, and secure digital profile exchange system.

---

## Theme

Social Media & Communication

---

## Problem Overview

In professional and social interactions, people still rely on:

- Manual contact sharing  
- Searching social media profiles  
- Physical visiting cards  

These methods are slow, inefficient, unstructured, and often result in lost connections.  
There is no unified platform that allows instant, organized, and selective sharing of digital profiles.

---

## Solution

Connect HUB provides a category-first digital profile system where users can:

- Organize information logically  
- Select only what they want to share  
- Generate QR codes linked to dynamic public pages  
- Allow access without login for viewers  

Each QR code points to a unique page, preserving previous versions and preventing data overwrite.

---

## Key Features

### Authentication

- Secure user login and signup  
- Profile management restricted to authenticated users  

---

### Category-Based Profile Structure

- Users must create at least one category before adding items  
- Categories are fully customizable and user-defined  
- Supports multiple categories for organized content  

---

### Item Management

Each item includes:

- Title (unique within category)  
- Type selection:
  - URL  
  - Text  
  - PDF  
  - Images  
  - Video  
  - MP3  

- Dynamic input rendering based on selected type  
- Text input for text and URLs  
- File upload for media types  

Additional capabilities:

- Edit items at any time  
- Reorder items  
- Add multiple items per category  
- Prevent duplicate titles and links  

---

### QR Code & Public Page Generation

Users can select:

- Individual items  
- Multiple items across categories  
- All items  

On clicking **Generate QR**:

- A new public page is created automatically  
- Page contains only selected items  
- A unique QR code and public URL are generated  

QR codes can be:

- Downloaded  
- Shared via URL  

Previously generated pages remain preserved.

---

### Public Viewer Access

- No authentication required  
- Clean, responsive, read-only interface  
- Displays only creator-approved content  
- Works on all devices  

---

## Working Flow

1. User signs up or logs in  
2. User creates categories  
3. User adds items inside categories  
4. User selects specific items  
5. System generates:
   - New public page  
   - QR code  
   - Shareable URL  
6. Viewer scans QR and is redirected to the public page without login  

---

## Algorithms and Logic Used

### Core Algorithms

- **Unique Validation Algorithm**  
  - Prevents duplicate category names  
  - Prevents duplicate item titles and links within categories  

- **Dynamic Page Generation Logic**  
  - Creates a new page instance per QR generation  
  - Preserves previously generated pages  

- **QR Code Generation Algorithm**  
  - Encodes unique public URLs  
  - Ensures each QR maps to a specific data snapshot  

- **Conditional Rendering Logic**  
  - Displays inputs based on selected item type  
  - Dynamically renders selected items on public pages  

- **Ordered Data Rendering**  
  - Maintains category and item sequence as defined by the user  

---

## Technologies Used

### Frontend

- React.js  
- TypeScript  
- Vite  
- Material UI (MUI)  
- CSS / PostCSS  
- Progressive Web App (PWA) Service Worker  
- Google Translate (client-side)  

---

### Backend

- PostgreSQL  
- Authentication  
- Edge Functions  

---

### Hosting

- Vercel  

---

## Algorithms Used in the Project

1. Dynamic QR Redirection Algorithm  
2. Content Selection and Page Generation Algorithm  
3. QR Customization Rendering Algorithm  
4. Access Control Algorithm  
5. Product Selection and Pricing Algorithm (QR Business)  
6. UPI QR Encoding Algorithm (QR Payments)  
7. Location Validation Algorithm  
8. Duplicate Detection Algorithm  
9. Offline Caching Algorithm  
10. Analytics and Tracking Algorithm  

---

## Storage

- Structured storage for users, categories, items, and pages  
- Cloud file storage for PDFs, images, videos, and audio files  

---

## Security Considerations

- Authentication required for content creation  
- Public pages are strictly read-only  
- No exposure of private user credentials  
- Controlled access to uploaded media  
- Secure URL-based content delivery  

---

## Future Scope

- QR scan analytics and insights  
- Expiring QR links  
- Encrypted item sharing  
- NFC card integration  
- Custom profile themes and branding  
- Multi-language and accessibility support  
- AI-based profile suggestions  

---

## Use Cases

- Professional networking  
- Conferences and meetups  
- Campus profiles  
- Business card replacement  
- Portfolio sharing  
- Community and organization profiles  

---

## Conclusion

Connect HUB is a production-ready, scalable digital networking platform that modernizes profile sharing through structured data, dynamic QR pages, and user-controlled visibility.  
It provides a powerful alternative to traditional contact exchange methods.
