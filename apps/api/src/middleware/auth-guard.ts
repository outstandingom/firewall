import { FastifyRequest, FastifyReply } from 'fastify';
import supabase from '../lib/supabase.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: string; email: string };
  }
}

export async function authGuard(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing token');
    }
    
    const token = authHeader.split(' ')[1];
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      throw error || new Error('User not found');
    }
    
    request.user = { id: user.id, email: user.email || '' };
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or missing token' });
  }
}

export async function optionalAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (user) {
      request.user = { id: user.id, email: user.email || '' };
    }
  } catch (err) {
    // It's optional, so don't fail
  }
}
