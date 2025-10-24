import jwt from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';

const JWT_SECRET = process.env.JWT_SECRET || 'um-segredo-forte';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email } = req.body;

  const code = jwt.sign({ user: email }, JWT_SECRET, { expiresIn: '5m' });

  res.status(200).json({ code });
}
