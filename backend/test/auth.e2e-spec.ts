import { type INestApplication } from '@nestjs/common';
import { hash } from 'bcryptjs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/database/prisma.service';
import { createTestApp } from './setup-app';

const origin = 'http://localhost:5173';
const password = 'BezpecneHeslo123!';

function cookieHeader(cookies: unknown): string {
  // Pri ďalších požiadavkách posielame iba dvojice názov=hodnota, nie atribúty Set-Cookie.
  const values = Array.isArray(cookies)
    ? cookies.filter((value): value is string => typeof value === 'string')
    : [];

  return values.map((value) => value.split(';')[0]).join('; ');
}

describe('E2E: Autentifikácia a oprávnenia', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const owner = {
    email: `vlastnik_${Date.now()}@voltask.test`,
    password,
    displayName: 'Testovací vlastník',
  };
  const member = {
    email: `clen_${Date.now()}@voltask.test`,
    password,
    displayName: 'Testovací člen',
  };
  const foreign = {
    email: `cudzi_${Date.now()}@voltask.test`,
    password,
    displayName: 'Vlastník cudzieho tímu',
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
    // Testy vymažú dáta z týchto tabuliek, preto používaj iba samostatnú testovaciu databázu.
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

  it('AUTH-01: úspešne zaregistruje nového používateľa', async () => {
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

  it('AUTH-02: odmietne duplicitnú e-mailovú adresu', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .set('Origin', origin)
      .send(owner);

    expect(response.status).toBe(409);
  });

  it('AUTH-05: odmietne neplatnú e-mailovú adresu', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .set('Origin', origin)
      .send({ ...owner, email: 'abc' });

    expect(response.status).toBe(400);
  });

  it('AUTH-06: odmietne registráciu bez hesla', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .set('Origin', origin)
      .send({ email: `bez_hesla_${Date.now()}@voltask.test`, displayName: 'Používateľ bez hesla' });

    expect(response.status).toBe(400);
  });

  it('AUTH-04: odmietne nesprávne heslo', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', origin)
      .send({ email: owner.email, password: 'NespravneHeslo999!' });

    expect(response.status).toBe(401);
  });

  it('AUTH-03: úspešne prihlási používateľa', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', origin)
      .send({ email: owner.email, password: owner.password, stayLoggedIn: true });

    expect(response.status).toBe(201);
    expect(response.headers['set-cookie']).toBeDefined();
    ownerCookies = cookieHeader(response.headers['set-cookie']);
  });

  it('AUTH-09: odmietne anonymný prístup k chráneným endpointom', async () => {
    const meResponse = await request(app.getHttpServer()).get('/api/auth/me');
    const teamsResponse = await request(app.getHttpServer()).get('/api/teams');

    expect(meResponse.status).toBe(401);
    expect(teamsResponse.status).toBe(401);
  });

  it('AUTH-07 a AUTH-08: vráti prázdny zoznam tímov', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/teams')
      .set('Cookie', ownerCookies);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('AUTH-12: zmení a načíta profilové meno', async () => {
    const updatedName = 'Aktualizovaný vlastník';
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

  it('AUTH-14 a AUTH-13: obnoví reláciu a zachová prihlásenie', async () => {
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

  it('vytvorí účty člena a cudzieho používateľa na testovanie oprávnení', async () => {
    for (const account of [member, foreign]) {
      // Pomocné účty vytvoríme priamo, aby sme nevyčerpali limit registračných požiadaviek.
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

  it('AUTH-10: vlastník vytvorí tím a člen má obmedzené oprávnenia', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/teams')
      .set('Origin', origin)
      .set('Cookie', ownerCookies)
      .send({ name: 'Testovací tím', description: 'Dočasný tím na testovanie' });

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

  it('AUTH-11: odmietne prístup k cudziemu tímu a projektu', async () => {
    const foreignTeamResponse = await request(app.getHttpServer())
      .post('/api/teams')
      .set('Origin', origin)
      .set('Cookie', foreignCookies)
      .send({ name: 'Cudzí tím', description: 'Tím iného používateľa' });
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
      .send({ name: 'Cudzí projekt', description: 'Projekt iného používateľa' });
    expect([201, 200]).toContain(foreignProjectResponse.status);

    const projectResponse = await request(app.getHttpServer())
      .get(`/api/projects/${foreignProjectResponse.body.id}`)
      .set('Cookie', ownerCookies);
    expect([403, 404]).toContain(projectResponse.status);
  });

  it('AUTH-15: vytvorí a odstráni tím', async () => {
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

  it('AUTH-16: odhlási používateľa a zneplatní reláciu', async () => {
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
