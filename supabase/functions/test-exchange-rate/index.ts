import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  console.log('Test function invoked!')
  try {
    const apiKey = Deno.env.get("EXCHANGERATE_API_KEY")
    if (!apiKey) {
      throw new Error('Secret EXCHANGERATE_API_KEY not found!')
    }
    console.log('API Key found.')

    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`
    console.log(`Fetching URL: ${url}`)

    const response = await fetch(url)
    const data = await response.json()

    console.log('API Response:', data)

    if (!response.ok || data.result !== 'success') {
      throw new Error(data['error-type'] || 'Failed to fetch from API')
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in test function:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
