# Rowing Championships - Results Website

A web application to publish and manage rowing/dragon boat championship results.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the public site.

## Admin Panel

Go to [http://localhost:3000/admin/login](http://localhost:3000/admin/login) to access the admin panel.

**Default credentials:**
- Username: `admin`
- Password: `admin123`

Change these in `.env.local`:
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
JWT_SECRET=your-secret-key
```

## How to Use

1. **Create a Championship** - From the admin dashboard, click "New Championship" and enter the name, date, and location.
2. **Add Events** - Click "Manage Events" on a championship, then add events (e.g. "200m Girls Kayak", "Premier Open 2000m Final").
3. **Add Participants** - Within each event, click "+ Add Participant" and enter their place, name, boat number, lane, and finishing time.

The public site will automatically display all championships and their results.

## Tech Stack

- **Next.js 15** with App Router
- **JSON file store** (stored in `data/db.json`)
- **Tailwind CSS 4** for styling
- **JWT authentication** for admin access
