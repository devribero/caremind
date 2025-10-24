import jwt from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';

const JWT_SECRET = process.env.JWT_SECRET || 'um-segredo-forte';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { code } = req.body;

  try {
    const payload = jwt.verify(code, JWT_SECRET) as { user: string };

    res.json({
      access_token: jwt.sign({ user: payload.user }, JWT_SECRET, { expiresIn: '1h' }),
      token_type: 'Bearer',
      expires_in: 3600
    });
  } catch {
    res.status(400).json({ error: 'invalid_grant' });
  }
}
