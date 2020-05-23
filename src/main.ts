process.env.FORCE_COLOR = '1';

import * as chalk from 'chalk';
import * as core from '@actions/core';
import * as githubstatus from './githubstatus';
import {Summary} from './summary';
import * as utilm from './util';

async function run() {
  try {
    const summary: Summary | null = await githubstatus.summary();
    if (summary == null) {
      core.setFailed(`Unable to contact GitHub Status API at this time.`);
      return;
    }

    // Global status
    switch (summary.status.indicator) {
      case 'minor': {
        core.warning(`GitHub Status: ${summary.status.description}`);
        break;
      }
      case 'major': {
        core.error(`GitHub Status: ${summary.status.description}`);
        break;
      }
      case 'critical': {
        core.error(`GitHub Status: ${summary.status.description}`);
        break;
      }
    }

    // Check incidents
    if (summary.incidents != undefined && summary.incidents?.length > 0) {
      core.info(`\nThere are ${summary.incidents.length} on going incidents on GitHub`);

      await utilm.asyncForEach(summary.incidents, async incident => {
        let incol = chalk.keyword('white');
        switch (incident.impact) {
          case 'minor': {
            incol = chalk.keyword('cyan');
            break;
          }
          case 'major': {
            incol = chalk.keyword('yellow');
            break;
          }
          case 'critical': {
            incol = chalk.keyword('red');
            break;
          }
        }
        core.info(incol.bold(`## ${incident.name} (${incident.shortlink})`));

        // Incident updates
        await utilm.asyncForEach(incident.incident_updates, async update => {
          core.info(incol(`[${incident.updated_at}] ${incident.body}`));
        });
      });
    }

    // Components status
    if (summary.components != undefined && summary.components?.length > 0) {
      core.info(chalk.bold(`\n## Components status`));
      await utilm.asyncForEach(summary.components, async component => {
        if (component.name.startsWith('Visit ')) {
          return;
        }
        let compstatus = 'N/A';
        switch (component.status) {
          case 'operational': {
            compstatus = chalk.green('Operational');
            break;
          }
          case 'degraded_performance': {
            compstatus = chalk.magenta('Degraded performance');
            break;
          }
          case 'partial_outage': {
            compstatus = chalk.yellow('Partial outage');
            break;
          }
          case 'major_outage': {
            compstatus = chalk.red('Major outage');
            break;
          }
        }
        core.info(`${compstatus}${new Array(22 - compstatus.length).join(' ')} ${component.name}`);
      });
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
