import { type INestApplication } from '@nestjs/common';
import { hash } from 'bcryptjs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/database/prisma.service';
import { createTestApp } from './setup-app';

const origin = 'http://localhost:5173';
const password = 'SecurePassword123!';

function cookieHeader(cookies: unknown): string {
  // Pri dalsich poziadavkach posielame len par nazov=hodnota, nie atributy Set-Cookie.
  const values = Array.isArray(cookies)
    ? cookies.filter((value): value is string => typeof value === 'string')
    : [];

  return values.map((value) => value.split(';')[0]).join('; ');
}

describe('Auth & Permissions E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const owner = {
    email: `owner_${Date.now()}@voltask.test`,
    password,
    displayName: 'Test Owner',
  };
  const member = {
    email: `member_${Date.now()}@voltask.test`,
    password,
    displayName: 'Test Member',
  };
  const foreign = {
    email: `foreign_${Date.now()}@voltask.test`,
    password,
    displayName: 'Foreign Owner',
  };

  let ownerCookies = '';
  let memberCookies = '';
  let foreignCookies = '';
  let ownerId = '';
  let teamId = '';
  let foreignTeamId = '';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    // Testy vymazu data v tychto tabulkach, preto pouzivaj len samostatnu testovaciu DB.
    await prisma.project.deleteMany();
    await prisma.team.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.project.deleteMany();
      await prisma.team.deleteMany();
      await prisma.user.deleteMany();
    }
    if (app) {
      await app.close();
    }
  });

  it('AUTH-01: registers a new owner', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .set('Origin', origin)
      .send(owner);

    expect(response.status).toBe(201);
    expect(response.body.user).toHaveProperty('id');
    expect(response.body.user.email).toBe(owner.email);
    expect(response.headers['set-cookie']).toBeDefined();
    ownerCookies = cookieHeader(response.headers['set-cookie']);
    ownerId = response.body.user.id;
  });

  it('AUTH-02: rejects a duplicate email', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .set('Origin', origin)
      .send(owner);

    expect(response.status).toBe(409);
  });

  it('AUTH-05: rejects an invalid email', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .set('Origin', origin)
      .send({ ...owner, email: 'abc' });

    expect(response.status).toBe(400);
  });

  it('AUTH-06: rejects registration without a password', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .set('Origin', origin)
      .send({ email: `nopassword_${Date.now()}@voltask.test`, displayName: 'No Password' });

    expect(response.status).toBe(400);
  });

  it('AUTH-04: rejects a wrong password', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', origin)
      .send({ email: owner.email, password: 'WrongPassword999!' });

    expect(response.status).toBe(401);
  });

  it('AUTH-03: logs in successfully', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', origin)
      .send({ email: owner.email, password: owner.password, stayLoggedIn: true });

    expect(response.status).toBe(201);
    expect(response.headers['set-cookie']).toBeDefined();
    ownerCookies = cookieHeader(response.headers['set-cookie']);
  });

  it('AUTH-09: rejects anonymous access to protected endpoints', async () => {
    const meResponse = await request(app.getHttpServer()).get('/api/auth/me');
    const teamsResponse = await request(app.getHttpServer()).get('/api/teams');

    expect(meResponse.status).toBe(401);
    expect(teamsResponse.status).toBe(401);
  });

  it('AUTH-07 and AUTH-08: returns an empty team list', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/teams')
      .set('Cookie', ownerCookies);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('AUTH-12: updates and reads the profile', async () => {
    const updatedName = 'Test Owner Updated';
    const patchResponse = await request(app.getHttpServer())
      .patch('/api/auth/profile')
      .set('Origin', origin)
      .set('Cookie', ownerCookies)
      .send({ displayName: updatedName });

    expect(patchResponse.status).toBe(200);

    const meResponse = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', ownerCookies);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.user.displayName).toBe(updatedName);
  });

  it('AUTH-14 and AUTH-13: refreshes the session and stays logged in', async () => {
    const refreshResponse = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Origin', origin)
      .set('Cookie', ownerCookies);

    expect(refreshResponse.status).toBe(201);
    expect(refreshResponse.headers['set-cookie']).toBeDefined();
    ownerCookies = cookieHeader(refreshResponse.headers['set-cookie']);

    const meResponse = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', ownerCookies);

    expect(meResponse.status).toBe(200);
  });

  it('creates member and foreign accounts for permission tests', async () => {
    for (const account of [member, foreign]) {
      // Pomocne ucty vytvorime priamo, aby sme nevycerpali limit registracnych poziadaviek.
      await prisma.user.create({
        data: {
          email: account.email,
          displayName: account.displayName,
          passwordHash: await hash(account.password, 12),
        },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('Origin', origin)
        .send({ email: account.email, password: account.password });
      expect(loginResponse.status).toBe(201);

      if (account === member) {
        memberCookies = cookieHeader(loginResponse.headers['set-cookie']);
      } else {
        foreignCookies = cookieHeader(loginResponse.headers['set-cookie']);
      }
    }
  });

  it('AUTH-10: owner creates a team and member has limited access', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/teams')
      .set('Origin', origin)
      .set('Cookie', ownerCookies)
      .send({ name: 'Matrix Team', description: 'Temporary test team' });

    expect(createResponse.status).toBe(201);
    teamId = createResponse.body.id;

    const addResponse = await request(app.getHttpServer())
      .post(`/api/teams/${teamId}/members`)
      .set('Origin', origin)
      .set('Cookie', ownerCookies)
      .send({ email: member.email });

    expect(addResponse.status).toBe(201);

    const ownerTeamResponse = await request(app.getHttpServer())
      .get(`/api/teams/${teamId}`)
      .set('Cookie', ownerCookies);
    expect(ownerTeamResponse.status).toBe(200);

    const memberTeamResponse = await request(app.getHttpServer())
      .get(`/api/teams/${teamId}`)
      .set('Cookie', memberCookies);
    expect(memberTeamResponse.status).toBe(200);

    const roleResponse = await request(app.getHttpServer())
      .patch(`/api/teams/${teamId}/members/${ownerId}/role`)
      .set('Origin', origin)
      .set('Cookie', memberCookies)
      .send({ role: 'MEMBER' });
    expect(roleResponse.status).toBe(403);
  });

  it('AUTH-11: rejects access to foreign teams and projects', async () => {
    const foreignTeamResponse = await request(app.getHttpServer())
      .post('/api/teams')
      .set('Origin', origin)
      .set('Cookie', foreignCookies)
      .send({ name: 'Foreign Team', description: 'Forbidden team' });
    expect(foreignTeamResponse.status).toBe(201);
    foreignTeamId = foreignTeamResponse.body.id;

    const teamResponse = await request(app.getHttpServer())
      .get(`/api/teams/${foreignTeamId}`)
      .set('Cookie', ownerCookies);
    expect(teamResponse.status).toBe(404);

    const foreignProjectResponse = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Origin', origin)
      .set('Cookie', foreignCookies)
      .send({ name: 'Foreign Project', description: 'Forbidden project' });
    expect([201, 200]).toContain(foreignProjectResponse.status);

    const projectResponse = await request(app.getHttpServer())
      .get(`/api/projects/${foreignProjectResponse.body.id}`)
      .set('Cookie', ownerCookies);
    expect([403, 404]).toContain(projectResponse.status);
  });

  it('AUTH-15: creates and deletes a team', async () => {
    const deleteResponse = await request(app.getHttpServer())
      .delete(`/api/teams/${teamId}`)
      .set('Origin', origin)
      .set('Cookie', ownerCookies);
    expect(deleteResponse.status).toBe(200);

    const getResponse = await request(app.getHttpServer())
      .get(`/api/teams/${teamId}`)
      .set('Cookie', ownerCookies);
    expect(getResponse.status).toBe(404);
  });

  it('AUTH-16: logs out and invalidates the session', async () => {
    const logoutResponse = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Origin', origin)
      .set('Cookie', ownerCookies);
    expect(logoutResponse.status).toBe(201);

    const meResponse = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', ownerCookies);
    expect(meResponse.status).toBe(401);
  });
});
