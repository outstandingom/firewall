import { FastifyPluginAsync } from 'fastify';
import z from 'zod';
import { hashPassword, verifyPassword } from '../lib/auth.js';
import supabase from '../lib/supabase.js';
import { authGuard } from '../middleware/auth-guard.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/auth/register', async (request, reply) => {
    const parseResult = registerSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Bad Request', details: parseResult.error.format() });
    }

    const { email, password, name } = parseResult.data;

    // Check if email taken
    const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).single();
    if (existingUser) {
      return reply.status(409).send({ error: 'Conflict', message: 'Email already exists' });
    }

    const hashedPassword = await hashPassword(password);

    // Create user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({ email, password_hash: hashedPassword, name })
      .select()
      .single();

    if (userError || !user) {
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to create user' });
    }

    // Create org
    const orgName = `${name}'s Org`;
    const slug = email.split('@')[0] + '-' + Math.random().toString(36).substring(2, 6);
    
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: orgName, slug })
      .select()
      .single();

    if (org && !orgError) {
      await supabase
        .from('organization_members')
        .insert({ organization_id: org.id, user_id: user.id, role: 'owner' });
    }

    const token = fastify.jwt.sign({ id: user.id, email: user.email }, { expiresIn: process.env.JWT_EXPIRY || '7d' });
    
    return reply.status(201).send({
      message: 'User registered successfully',
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  });

  fastify.post('/api/auth/login', async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Bad Request', details: parseResult.error.format() });
    }

    const { email, password } = parseResult.data;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid credentials' });
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid credentials' });
    }

    const token = fastify.jwt.sign({ id: user.id, email: user.email }, { expiresIn: process.env.JWT_EXPIRY || '7d' });

    return reply.send({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  });

  fastify.get('/api/auth/me', { preHandler: [authGuard] }, async (request, reply) => {
    const userId = request.user!.id;
    
    const { data: user } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', userId)
      .single();

    const { data: orgs } = await supabase
      .from('organization_members')
      .select('role, organizations(id, name, slug)')
      .eq('user_id', userId);

    return reply.send({
      user,
      organizations: orgs?.map(o => ({
        ...o.organizations,
        role: o.role
      })) || []
    });
  });
};
