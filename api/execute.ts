import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Get credentials from environment variables (set in Vercel dashboard)
  const clientId = process.env.JDOODLE_CLIENT_ID
  const clientSecret = process.env.JDOODLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'API credentials not configured' })
  }

  try {
    const { script, stdin, language, versionIndex } = req.body

    const response = await fetch('https://api.jdoodle.com/v1/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId,
        clientSecret,
        script,
        stdin,
        language,
        versionIndex: versionIndex || '0',
      }),
    })

    const data = await response.json()
    return res.status(200).json(data)
  } catch (error) {
    console.error('JDoodle API error:', error)
    return res.status(500).json({
      error: 'Failed to execute code',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
