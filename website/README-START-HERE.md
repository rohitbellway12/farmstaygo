# FarmStayGo Website Starter

## 1. Copy the files

Extract this ZIP inside the `website` project root and allow it to merge/replace the matching files.

## 2. Create `.env.local`

Copy `.env.local.example` to `.env.local`.

Default local values:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_PORTAL_URL=http://localhost:5173
```

## 3. Run backend

The backend must be running on port 5000 and the public APIs must work.

## 4. Run website

```powershell
cd C:\Users\LENOVO\OneDrive\Desktop\FarmStay\website
npm run dev
```

Open:

http://localhost:3000

## 5. Build

```powershell
npm run build
```

## Included

- Central Tailwind v4 website theme
- FarmStayGo metadata and Inter font
- Responsive header/mobile navigation
- Dark green footer
- Dynamic hero image from featured property
- Search form
- Dynamic categories
- Dynamic featured property cards
- Custom-stay section
- Trust strip
- Become-a-host CTA

## Next module

- `/properties` search/listing page
- `/properties/[publicId]` property details page
- Live availability UI
