import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { createId } from '@paralleldrive/cuid2';
import * as schema from '../src/lib/db/schema';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🌱 Starting database seeding...');
  
  // Create connection
  const client = postgres(databaseUrl, { prepare: false });
  const db = drizzle(client, { schema });

  try {
    // Clear existing data (in reverse dependency order)
    console.log('🧹 Clearing existing data...');
    await db.delete(schema.gameEvents);
    await db.delete(schema.penaltyKicks);
    await db.delete(schema.penaltyShootouts);
    await db.delete(schema.games);
    await db.delete(schema.teamAssignments);
    await db.delete(schema.teams);
    await db.delete(schema.matchdays);
    await db.delete(schema.players);
    await db.delete(schema.groupMembers);
    await db.delete(schema.groups);
    await db.delete(schema.users);
    await db.delete(schema.activityLog);

    // Seed Users
    console.log('👥 Seeding users...');
    const users = await db.insert(schema.users).values([
      {
        id: createId(),
        email: 'admin@stanga.com',
        fullName: 'Admin User',
        isActive: true,
      },
      {
        id: createId(),
        email: 'organizer@stanga.com',
        fullName: 'Match Organizer',
        isActive: true,
      }
    ]).returning();

    const adminUser = users[0];
    const organizerUser = users[1];

    // Seed Default Group
    console.log('🏘️ Seeding default group...');
    const defaultGroup = await db.insert(schema.groups).values({
      id: createId(),
      name: 'FC Yarkon',
      description: 'Default football group',
      inviteCode: 'FCY123',
      isActive: true,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    }).returning();

    const group = defaultGroup[0];

    // Add users as group members
    console.log('👥 Adding group members...');
    await db.insert(schema.groupMembers).values([
      {
        id: createId(),
        groupId: group.id,
        userId: adminUser.id,
        role: 'admin',
        isActive: true,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
      {
        id: createId(),
        groupId: group.id,
        userId: organizerUser.id,
        role: 'admin',
        isActive: true,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      }
    ]);

    // Seed Players
    console.log('⚽ Seeding players...');
    const players = await db.insert(schema.players).values([
      {
        id: createId(),
        groupId: group.id,
        name: 'Lionel Messi',
        isActive: true,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
      {
        id: createId(),
        groupId: group.id,
        name: 'Cristiano Ronaldo',
        isActive: true,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
      {
        id: createId(),
        groupId: group.id,
        name: 'Kevin De Bruyne',
        isActive: true,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
      {
        id: createId(),
        groupId: group.id,
        name: 'Virgil van Dijk',
        isActive: true,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
      {
        id: createId(),
        groupId: group.id,
        name: 'Manuel Neuer',
        isActive: true,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
      {
        id: createId(),
        groupId: group.id,
        name: 'Kylian Mbappé',
        isActive: true,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
      {
        id: createId(),
        groupId: group.id,
        name: 'Luka Modrić',
        isActive: true,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
      {
        id: createId(),
        groupId: group.id,
        name: 'Sergio Ramos',
        isActive: true,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
      {
        id: createId(),
        groupId: group.id,
        name: 'Erling Haaland',
        isActive: true,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
      {
        id: createId(),
        groupId: group.id,
        name: 'Pedri González',
        isActive: true,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
      {
        id: createId(),
        groupId: group.id,
        name: 'Alphonso Davies',
        isActive: true,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
      {
        id: createId(),
        groupId: group.id,
        name: 'Thibaut Courtois',
        isActive: true,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      }
    ]).returning();

    // Default rules for matchdays
    const defaultRules = {
      points: {
        loss: 0,
        draw: 1,
        penalty_bonus_win: 1,
        regulation_win: 3
      },
      penalty_win_weight: 0.5,
      game_duration: 15, // minutes
      max_goals: 5, // early finish threshold
      extra_time_duration: 5 // minutes
    };

    // Seed Matchdays
    console.log('📅 Seeding matchdays...');
    const matchdays = await db.insert(schema.matchdays).values([
      {
        id: createId(),
        groupId: group.id,
        name: 'Sunday League Championship',
        description: 'Weekly football tournament at the local park',
        scheduledAt: new Date('2024-01-21T14:00:00Z'),
        location: 'Central Park Football Field',
        teamSize: 9,
        numberOfTeams: 2,
        status: 'upcoming',
        rules: defaultRules,
        isPublic: true,
        createdBy: organizerUser.id,
        updatedBy: organizerUser.id,
      },
      {
        id: createId(),
        groupId: group.id,
        name: 'Friday Night Lights',
        description: 'Evening matches under the floodlights',
        scheduledAt: new Date('2024-01-19T19:00:00Z'),
        location: 'Sports Complex Arena',
        teamSize: 8,
        numberOfTeams: 2,
        status: 'completed',
        rules: defaultRules,
        isPublic: true,
        createdBy: organizerUser.id,
        updatedBy: organizerUser.id,
      }
    ]).returning();

    const upcomingMatchday = matchdays[0];
    const completedMatchday = matchdays[1];

    // Seed Teams for upcoming matchday
    console.log('🏆 Seeding teams...');
    const teams = await db.insert(schema.teams).values([
      {
        id: createId(),
        matchdayId: upcomingMatchday.id,
        name: 'Blue Team',
        colorToken: 'blue',
        colorHex: '#3b82f6',
        formationJson: { formation: '4-3-3' },
        isActive: true,
        createdBy: organizerUser.id,
        updatedBy: organizerUser.id,
      },
      {
        id: createId(),
        matchdayId: upcomingMatchday.id,
        name: 'Amber Team',
        colorToken: 'amber',
        colorHex: '#f59e0b',
        formationJson: { formation: '4-4-2' },
        isActive: true,
        createdBy: organizerUser.id,
        updatedBy: organizerUser.id,
      },
      {
        id: createId(),
        matchdayId: upcomingMatchday.id,
        name: 'Rose Team',
        colorToken: 'rose',
        colorHex: '#f43f5e',
        formationJson: { formation: '3-5-2' },
        isActive: true,
        createdBy: organizerUser.id,
        updatedBy: organizerUser.id,
      }
    ]).returning();

    // Assign players to teams (first 4 players to each team)
    console.log('👕 Assigning players to teams...');
    const teamAssignments = [];
    
    // Blue Team (first 4 players)
    for (let i = 0; i < 4; i++) {
      teamAssignments.push({
        id: createId(),
        matchdayId: upcomingMatchday.id,
        teamId: teams[0].id,
        playerId: players[i].id,
        // position: players[i].position,
        positionOrder: i + 1,
        isActive: true,
        createdBy: organizerUser.id,
        updatedBy: organizerUser.id,
      });
    }

    // Amber Team (next 4 players)
    for (let i = 4; i < 8; i++) {
      teamAssignments.push({
        id: createId(),
        matchdayId: upcomingMatchday.id,
        teamId: teams[1].id,
        playerId: players[i].id,
        // position: players[i].position,
        positionOrder: i - 3,
        isActive: true,
        createdBy: organizerUser.id,
        updatedBy: organizerUser.id,
      });
    }

    // Rose Team (last 4 players)
    for (let i = 8; i < 12; i++) {
      teamAssignments.push({
        id: createId(),
        matchdayId: upcomingMatchday.id,
        teamId: teams[2].id,
        playerId: players[i].id,
        // position: players[i].position,
        positionOrder: i - 7,
        isActive: true,
        createdBy: organizerUser.id,
        updatedBy: organizerUser.id,
      });
    }

    await db.insert(schema.teamAssignments).values(teamAssignments);

    // Seed some sample games
    console.log('🎮 Seeding games...');
    const games = await db.insert(schema.games).values([
      {
        id: createId(),
        matchdayId: upcomingMatchday.id,
        homeTeamId: teams[0].id, // Blue Team
        awayTeamId: teams[1].id, // Amber Team
        status: 'pending',
        homeScore: 0,
        awayScore: 0,
        queuePosition: 1,
        createdBy: organizerUser.id,
        updatedBy: organizerUser.id,
      },
      {
        id: createId(),
        matchdayId: upcomingMatchday.id,
        homeTeamId: teams[2].id, // Rose Team
        awayTeamId: teams[0].id, // Blue Team
        status: 'pending',
        homeScore: 0,
        awayScore: 0,
        queuePosition: 2,
        createdBy: organizerUser.id,
        updatedBy: organizerUser.id,
      }
    ]).returning();

    console.log('✅ Database seeding completed successfully!');
    console.log(`📊 Seeded:`);
    console.log(`   - ${users.length} users`);
    console.log(`   - ${defaultGroup.length} groups`);
    console.log(`   - 2 group members`);
    console.log(`   - ${players.length} players`);
    console.log(`   - ${matchdays.length} matchdays`);
    console.log(`   - ${teams.length} teams`);
    console.log(`   - ${teamAssignments.length} team assignments`);
    console.log(`   - ${games.length} games`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('❌ Seed script failed:', error);
  process.exit(1);
});
