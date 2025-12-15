# StreamWizard API - Usage Guide

## Environment Variables

Add the following to your `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key  # NEW: Required for SSR authentication

# Twitch Configuration
TWITCH_CLIENT_ID=your-client-id
TWITCH_CLIENT_SECRET=your-client-secret
TWITCH_WEBHOOK_SECRET=your-webhook-secret

# Environment
NODE_ENV=development  # or production
```

## API Endpoints

### 1. Trigger Clips Sync

**Endpoint:** `POST /api/clips/sync`

**Authentication:** Required (Supabase JWT)

**Description:** Triggers a Twitch clips sync for the authenticated user.

#### Request

```typescript
// Headers
{
  "Authorization": "Bearer <supabase_jwt_token>",
  "Content-Type": "application/json"
}

// Body (optional)
{
  "skipRecentCheck": false  // Set to true to bypass 1-hour cooldown
}
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "clipsCount": 150,
  "message": "Successfully synced 150 clips"
}
```

**Skipped (200):**
```json
{
  "success": true,
  "skipped": true,
  "message": "Sync skipped. Last sync was less than an hour ago."
}
```

**Errors:**
- `401`: Not authenticated
- `404`: Twitch integration not found
- `500`: Sync failed

---

### 2. Get Sync Status

**Endpoint:** `GET /api/clips/sync-status`

**Authentication:** Required (Supabase JWT)

**Description:** Get the current sync status for the authenticated user.

#### Request

```typescript
// Headers
{
  "Authorization": "Bearer <supabase_jwt_token>"
}
```

#### Response

**Success (200):**
```json
{
  "status": "completed",  // or "syncing", "failed", "never_synced"
  "lastSync": "2025-12-15T10:30:00Z",
  "clipCount": 150
}
```

**Never Synced (200):**
```json
{
  "message": "No sync history found",
  "status": "never_synced"
}
```

---

## Frontend Integration Examples

### Using with Supabase Auth (React/Next.js)

```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Initialize Supabase client
const supabase = createClientComponentClient()

// Trigger clips sync
async function syncTwitchClips() {
  try {
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      console.error('Not authenticated')
      return
    }

    const response = await fetch('http://localhost:8000/api/clips/sync', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        skipRecentCheck: false
      })
    })

    const result = await response.json()
    
    if (result.success) {
      if (result.skipped) {
        console.log('Sync skipped:', result.message)
      } else {
        console.log('Synced clips:', result.clipsCount)
      }
    }
  } catch (error) {
    console.error('Sync error:', error)
  }
}

// Get sync status
async function getSyncStatus() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      console.error('Not authenticated')
      return
    }

    const response = await fetch('http://localhost:8000/api/clips/sync-status', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    })

    const status = await response.json()
    console.log('Sync status:', status)
    
    return status
  } catch (error) {
    console.error('Status error:', error)
  }
}
```

### Using with Cookie-based Auth

If your website shares cookies with the API (same domain or proper CORS):

```typescript
// The Supabase auth cookies are automatically sent
// No need to manually add Authorization header

async function syncTwitchClips() {
  const response = await fetch('http://localhost:8000/api/clips/sync', {
    method: 'POST',
    credentials: 'include',  // Important: Include cookies
    headers: {
      'Content-Type': 'application/json'
    }
  })

  const result = await response.json()
  console.log(result)
}
```

### React Component Example

```tsx
import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function ClipsSyncButton() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const supabase = createClientComponentClient()

  const handleSync = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        alert('Please sign in first')
        return
      }

      const response = await fetch('http://localhost:8000/api/clips/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()
      
      if (result.success) {
        if (result.skipped) {
          alert(result.message)
        } else {
          alert(`Successfully synced ${result.clipsCount} clips!`)
        }
        
        // Refresh status
        await getStatus()
      } else {
        alert(result.error || 'Sync failed')
      }
    } catch (error) {
      console.error('Sync error:', error)
      alert('Failed to sync clips')
    } finally {
      setLoading(false)
    }
  }

  const getStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) return

      const response = await fetch('http://localhost:8000/api/clips/sync-status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const statusData = await response.json()
      setStatus(statusData)
    } catch (error) {
      console.error('Status error:', error)
    }
  }

  return (
    <div>
      <button 
        onClick={handleSync} 
        disabled={loading}
        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
      >
        {loading ? 'Syncing...' : 'Sync Twitch Clips'}
      </button>
      
      {status && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <p><strong>Status:</strong> {status.status}</p>
          <p><strong>Last Sync:</strong> {status.lastSync ? new Date(status.lastSync).toLocaleString() : 'Never'}</p>
          <p><strong>Clips Count:</strong> {status.clipCount || 0}</p>
        </div>
      )}
      
      <button 
        onClick={getStatus}
        className="mt-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
      >
        Refresh Status
      </button>
    </div>
  )
}
```

---

## How It Works

### Authentication Flow

1. **Supabase Middleware** (`supabaseMiddleware()`):
   - Applied to all `/api/*` routes
   - Creates a Supabase SSR client with proper cookie handling
   - Handles cookie reading and writing automatically
   - Sets the Supabase client in context

2. **Auth Middleware** (`supabaseAuth()`):
   - Applied to protected routes
   - Verifies the user's JWT token
   - Gets the authenticated user from Supabase
   - Sets the user object in context
   - Returns 401 if not authenticated

3. **Route Handlers**:
   - Access the authenticated user via `c.get("user")`
   - User is guaranteed to exist (TypeScript safe)
   - Can access Supabase client via `c.get("supabase")`

### Sync Protection

- **1-Hour Cooldown**: Prevents syncing more than once per hour (in production)
- **Skip Option**: Use `skipRecentCheck: true` to bypass cooldown
- **Status Tracking**: Tracks sync status in database (`syncing`, `completed`, `failed`)

---

## CORS Configuration (Optional)

If your frontend is on a different domain, add CORS middleware:

```typescript
import { cors } from 'hono/cors'

app.use('/api/*', cors({
  origin: 'https://your-frontend-domain.com',
  credentials: true,  // Important for cookies
}))
```

---

## Testing with cURL

```bash
# Get JWT token from Supabase first
TOKEN="your-jwt-token"

# Trigger sync
curl -X POST http://localhost:8000/api/clips/sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Get sync status
curl http://localhost:8000/api/clips/sync-status \
  -H "Authorization: Bearer $TOKEN"
```

---

## Troubleshooting

### "Authentication required" error
- Make sure you're passing the JWT token in the Authorization header
- Check that the token hasn't expired
- Verify SUPABASE_ANON_KEY is set correctly

### "Twitch integration not found" error
- User needs to connect their Twitch account first
- Check the `integrations_twitch` table in Supabase

### Sync skipped message
- Last sync was less than 1 hour ago
- Use `skipRecentCheck: true` to force sync
- Only applies in production environment

