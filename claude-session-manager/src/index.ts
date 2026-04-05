#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { sessionManager } from './session-manager';
import { tagManager } from './tag-manager';
import { execSync } from 'child_process';

const program = new Command();

program
  .name('cs')
  .description('Manage Claude Code sessions')
  .version('1.0.0');

// List sessions (running by default)
program
  .command('list')
  .description('List running sessions (use --all for history)')
  .option('-a, --all', 'List all history sessions instead of running ones')
  .option('-t, --tag <tag>', 'Filter by tag')
  .option('-p, --project <path>', 'Filter by project')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    try {
      if (options.all) {
        // List all history sessions
        let sessions = await sessionManager.getAllSessions();

        if (options.tag) {
          const taggedSessions = tagManager.getSessionsByTag(options.tag);
          sessions = sessions.filter(s => taggedSessions.includes(s.sessionId));
        }

        if (options.project) {
          sessions = sessions.filter(s => s.project.includes(options.project));
        }

        if (sessions.length === 0) {
          console.log('No sessions found.');
          return;
        }

        sessions.sort((a, b) => b.timestamp - a.timestamp);

        for (const session of sessions) {
          const tags = tagManager.getTags(session.sessionId);
          console.log(sessionManager.formatSession(session, tags));
        }
      } else {
        // List running sessions
        const running = await sessionManager.getRunningSessions();

        if (running.length === 0) {
          console.log('No running sessions.');
          return;
        }

        if (options.json) {
          // JSON output for programmatic use
          const sessionsWithDetails = await Promise.all(
            running.map(async (session) => {
              const tags = tagManager.getTags(session.sessionId);
              const summary = await sessionManager.getSessionSummary(session.sessionId, session.cwd);
              return {
                id: session.sessionId.substring(0, 8),
                sessionId: session.sessionId,
                name: session.slug || session.cwd.split('/').pop() || 'Untitled',
                cwd: session.cwd.replace(process.env.HOME || '', '~'),
                tags,
                summary
              };
            })
          );
          console.log(JSON.stringify(sessionsWithDetails, null, 2));
          return;
        }

        // Pretty output with colors
        console.log(chalk.bold(`\n  Running Sessions (${running.length})\n`));

        for (const session of running) {
          const tags = tagManager.getTags(session.sessionId);
          const summary = await sessionManager.getSessionSummary(session.sessionId, session.cwd);
          const name = session.slug || session.cwd.split('/').pop() || 'Untitled';
          const shortId = session.sessionId.substring(0, 8);
          const cwd = session.cwd.replace(process.env.HOME || '', '~');

          console.log(`  ${chalk.cyan(shortId)}  ${chalk.bold(name)}`);
          console.log(`  ${chalk.gray('cwd:')} ${cwd}`);

          if (tags.length > 0) {
            console.log(`  ${chalk.gray('tags:')} ${chalk.yellow(tags.join(', '))}`);
          }

          if (summary) {
            console.log(`  ${chalk.gray('summary:')} ${chalk.italic(summary)}`);
          }

          console.log();
        }
      }
    } catch (error) {
      console.error('Error listing sessions:', error);
      process.exit(1);
    }
  });

// Switch to a session
program
  .command('switch <session-id>')
  .description('Switch to a session by resuming it (or "new" for fresh session)')
  .action((sessionId) => {
    try {
      if (sessionId === 'new') {
        // Open new session - detach and don't wait
        const { spawn } = require('child_process');
        spawn('claude', [], {
          detached: true,
          stdio: 'ignore'
        });
        console.log('Opening new Claude session...');
      } else {
        console.log(`Switching to ${sessionId.substring(0, 8)}...`);
        const { spawn } = require('child_process');
        spawn('claude', ['-r', sessionId], {
          detached: true,
          stdio: 'ignore'
        });
      }
    } catch (error) {
      console.error('Error switching session:', error);
      process.exit(1);
    }
  });

// Delete a session
program
  .command('delete <session-id>')
  .description('Delete a session from history')
  .action(async (sessionId) => {
    try {
      await sessionManager.deleteSession(sessionId);
      console.log(`Deleted session ${sessionId}`);
    } catch (error) {
      console.error('Error deleting session:', error);
      process.exit(1);
    }
  });

// Tag a session
program
  .command('tag <session-id> <tags...>')
  .description('Add tags to a session')
  .action((sessionId, tags) => {
    try {
      for (const tag of tags) {
        tagManager.addTag(sessionId, tag);
      }
      console.log(`Added tags [${tags.join(', ')}] to session ${sessionId.substring(0, 8)}`);
    } catch (error) {
      console.error('Error tagging session:', error);
      process.exit(1);
    }
  });

// Untag a session
program
  .command('untag <session-id> <tag>')
  .description('Remove a tag from a session')
  .action((sessionId, tag) => {
    try {
      tagManager.removeTag(sessionId, tag);
      console.log(`Removed tag '${tag}' from session ${sessionId.substring(0, 8)}`);
    } catch (error) {
      console.error('Error untagging session:', error);
      process.exit(1);
    }
  });

// List tags
program
  .command('tags')
  .description('List all tags and their sessions')
  .action(() => {
    try {
      const store = tagManager.loadTags();
      const entries = Object.entries(store.sessionTags);

      if (entries.length === 0) {
        console.log('No tags found.');
        return;
      }

      for (const [sessionId, tags] of entries) {
        console.log(`${sessionId.substring(0, 8)}: [${tags.join(', ')}]`);
      }
    } catch (error) {
      console.error('Error listing tags:', error);
      process.exit(1);
    }
  });

// List groups
program
  .command('groups')
  .description('List all session groups')
  .action(() => {
    try {
      const groups = tagManager.listGroups();
      const entries = Object.entries(groups);

      if (entries.length === 0) {
        console.log('No groups found.');
        return;
      }

      for (const [name, sessionIds] of entries) {
        console.log(`${name}: ${sessionIds.map(id => id.substring(0, 8)).join(', ')}`);
      }
    } catch (error) {
      console.error('Error listing groups:', error);
      process.exit(1);
    }
  });

// Create group
program
  .command('group-create <name> <session-ids...>')
  .description('Create a session group')
  .action((name, sessionIds) => {
    try {
      tagManager.createGroup(name, sessionIds);
      console.log(`Created group '${name}' with ${sessionIds.length} sessions`);
    } catch (error) {
      console.error('Error creating group:', error);
      process.exit(1);
    }
  });

// Delete group
program
  .command('group-delete <name>')
  .description('Delete a session group')
  .action((name) => {
    try {
      tagManager.deleteGroup(name);
      console.log(`Deleted group '${name}'`);
    } catch (error) {
      console.error('Error deleting group:', error);
      process.exit(1);
    }
  });

program.parse();
