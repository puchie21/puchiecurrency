import { Handler } from '@netlify/functions';
import { Router } from 'itty-router';
import { auth } from '../../server/auth';
import { storage } from '../../server/storage';
import axios from 'axios';

const router = Router();

// Auth routes
router.post('/register', async (request) => {
  const body = await request.json();
  const user = await auth.register(body.username, body.password);
  return new Response(JSON.stringify(user), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
});

router.post('/login', async (request) => {
  const body = await request.json();
  const user = await auth.login(body.username, body.password);
  return new Response(JSON.stringify(user), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

router.get('/user', async (request) => {
  const session = request.headers.get('cookie');
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }
  const user = await auth.getUser(session);
  return new Response(JSON.stringify(user), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

// Conversion routes
router.get('/conversions', async (request) => {
  const session = request.headers.get('cookie');
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }
  const user = await auth.getUser(session);
  const conversions = await storage.getConversions(user.id);
  return new Response(JSON.stringify({ conversions, totalCount: conversions.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

router.post('/conversions', async (request) => {
  const session = request.headers.get('cookie');
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }
  const user = await auth.getUser(session);
  const body = await request.json();
  const conversion = await storage.addConversion(user.id, body);
  return new Response(JSON.stringify(conversion), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
});

// Exchange rates
router.get('/rates', async () => {
  const API_KEY = process.env.EXCHANGE_RATE_API_KEY;
  if (!API_KEY) {
    // Return sample rates if no API key
    return new Response(JSON.stringify({
      rates: {
        USD: 1,
        EUR: 0.85,
        GBP: 0.73,
        JPY: 110.0,
        AUD: 1.35,
        CAD: 1.25,
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await axios.get(`https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`);
    return new Response(JSON.stringify(response.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response('Error fetching exchange rates', { status: 500 });
  }
});

// 404 for everything else
router.all('*', () => new Response('Not Found', { status: 404 }));

export const handler: Handler = async (event) => {
  const request = new Request(event.rawUrl, {
    method: event.httpMethod,
    headers: event.headers as HeadersInit,
    body: event.body,
  });

  try {
    const response = await router.handle(request, event.path.replace('/.netlify/functions/api', ''));
    return {
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text(),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
}; 